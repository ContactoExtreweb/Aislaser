// Pasa las obras de la web anterior (src/content/projects.ts, con sus fotos de public/images/obras)
// a la galería de la base de datos, para que se puedan editar desde el panel (/panel/obras).
//
//   ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/importar-obras.mjs [--simular] [--completar]
//
// - Entra con un usuario administrador del panel: no hace falta la clave secreta de Supabase.
// - Sólo importa si la galería está vacía: así nunca recupera obras que se hayan borrado en el
//   panel ni pisa lo editado. Las obras se crean todas a la vez (en borrador), se suben sus fotos
//   y al final se publican juntas: la web nunca enseña una lista a medias.
// - --completar: SÓLO para terminar una importación que se cortó (sin conexión, etc.): crea las
//   obras importadas que falten, sube las fotos que les falten y publica las importadas que se
//   quedaron en borrador. No lo uses después de editar la galería en el panel.
// - Requiere haber ejecutado antes supabase/migrations/004_galeria_web.sql.

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const root = new URL("../", import.meta.url);
const simulate = process.argv.includes("--simular");
const completeOnly = process.argv.includes("--completar");

// Los datos están en TypeScript: Node los lee quitando los tipos (de serie desde Node 22.18)
if (process.features.typescript === false) {
  console.error("Hace falta Node 22.18 o posterior, o ejecutarlo así: node --experimental-strip-types scripts/importar-obras.mjs");
  process.exit(1);
}

// Variables públicas de Supabase: del entorno o de .env.local
async function env(name) {
  if (process.env[name]) return process.env[name];
  const file = await readFile(new URL(".env.local", root), "utf8").catch(() => "");
  return file.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim();
}
const url = await env("NEXT_PUBLIC_SUPABASE_URL");
const key = (await env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")) ?? (await env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
if (!email || !password) throw new Error("Indica ADMIN_EMAIL y ADMIN_PASSWORD de un administrador del panel.");

const { projects } = await import(new URL("src/content/projects.ts", root).href);
const { services } = await import(new URL("src/content/services.ts", root).href);

const supabase = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "galeria";

const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
if (loginError) throw new Error(`No se pudo entrar como ${email}: ${loginError.message}`);
const { data: isAdmin } = await supabase.rpc("is_admin");
if (!isAdmin) throw new Error(`${email} no es administrador del panel.`);

const { data: existing, error: tableError } = await supabase.from("web_obras").select("id, slug, publicada, web_fotos(storage_path)");
if (tableError) throw new Error(`Ejecuta antes supabase/migrations/004_galeria_web.sql (${tableError.message}).`);

const problems = [];
const done = async (code = problems.length ? 1 : 0) => {
  // Sólo esta sesión: sin scope se cerrarían también las del administrador en el panel
  await supabase.auth.signOut({ scope: "local" });
  process.exit(code);
};

if (existing.length > 0 && !completeOnly) {
  console.log(
    `La galería ya tiene ${existing.length} obras: no se importa nada para no recuperar obras borradas ni pisar lo editado en el panel.\n` +
      "Si una importación anterior se cortó, usa --completar.",
  );
  await done(0);
}

const staticSlugs = new Set(projects.map((p) => p.slug));
const isImported = (o) => staticSlugs.has(o.slug) && o.web_fotos.every((f) => f.storage_path.includes("/importada-"));
if (completeOnly && !existing.every(isImported)) {
  console.log("La galería ya tiene obras creadas o editadas en el panel: --completar no se puede usar sin riesgo de pisarlas.");
  await done(1);
}

const row = (p, i) => ({
  slug: p.slug,
  titulo: p.title,
  ubicacion: p.location ?? "",
  sector: p.sector,
  servicios: services.filter((s) => s.projects.includes(p.slug)).map((s) => s.slug),
  destacada: p.featured,
  publicada: false,
  orden: (i + 1) * 10, // el orden de la web de siempre; las obras nuevas del panel salen delante
});

// 1. Las obras que faltan, todas en una sola inserción (o se crean todas o ninguna)
const bySlug = new Map(existing.map((o) => [o.slug, o]));
const missing = projects.map((p, i) => [p, i]).filter(([p]) => !bySlug.has(p.slug));
console.log(`${simulate ? "[simulación] " : ""}Obras a crear: ${missing.length} · ya existentes: ${existing.length}`);
if (missing.length && !simulate) {
  const { data, error } = await supabase
    .from("web_obras")
    .insert(missing.map(([p, i]) => row(p, i)))
    .select("id, slug, publicada");
  if (error) {
    problems.push(`No se pudieron crear las obras: ${error.message}`);
    console.log(`\nProblemas:\n- ${problems.join("\n- ")}`);
    await done(1);
  }
  for (const o of data) bySlug.set(o.slug, { ...o, web_fotos: [] });
}

// 2. Las fotos que falten de cada obra (las rutas importada-NN no se repiten nunca)
let uploaded = 0;
for (const p of projects) {
  const obra = bySlug.get(p.slug);
  const have = new Set((obra?.web_fotos ?? []).map((f) => f.storage_path.split("/").pop()));
  const todo = p.images.map((img, j) => ({ img, j, name: `importada-${String(j + 1).padStart(2, "0")}.webp` })).filter((x) => !have.has(x.name));
  if (!todo.length) continue;
  console.log(`${p.slug}: ${todo.length} foto(s)`);
  if (simulate || !obra) continue;
  for (const { img, j, name } of todo) {
    const path = `${obra.id}/${name}`;
    const file = await readFile(new URL(`public${img.src}`, root));
    // Las fotos se suben tal cual (WebP), sin volver a comprimirlas
    const { error: upError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (upError && !/exists|duplicate/i.test(upError.message)) {
      problems.push(`${p.slug} ${name}: ${upError.message}`);
      continue;
    }
    const { error: rowError } = await supabase
      .from("web_fotos")
      .upsert({ obra_id: obra.id, storage_path: path, ancho: img.width, alto: img.height, orden: j }, { onConflict: "storage_path", ignoreDuplicates: true });
    if (rowError) problems.push(`${p.slug} ${name}: ${rowError.message}`);
    else uploaded++;
  }
}

// 3. Publicar todas juntas las importadas que tengan fotos (para que la web nunca enseñe una lista a medias)
if (!simulate) {
  const { data: drafts, error } = await supabase.from("web_obras").select("id, slug, web_fotos(count)").eq("publicada", false);
  if (error) problems.push(`No se pudo comprobar qué publicar: ${error.message}`);
  const ready = (drafts ?? []).filter((o) => staticSlugs.has(o.slug) && (o.web_fotos[0]?.count ?? 0) > 0).map((o) => o.id);
  (drafts ?? []).filter((o) => staticSlugs.has(o.slug) && !(o.web_fotos[0]?.count > 0)).forEach((o) => problems.push(`${o.slug}: sin fotos, se queda en borrador`));
  if (ready.length) {
    const { error: pubError } = await supabase.from("web_obras").update({ publicada: true }).in("id", ready);
    if (pubError) problems.push(`No se pudieron publicar: ${pubError.message} (quedan en borrador; repite con --completar)`);
  }
}

// Comprobación final: lo que ve un visitante de la web
const anon = createClient(url, key, { auth: { persistSession: false } });
const { data: visible, error: visibleError } = await anon.from("web_obras").select("slug, destacada, web_fotos(storage_path)").eq("publicada", true);
if (visibleError) problems.push(`Comprobación: ${visibleError.message}`);
const visiblePhotos = (visible ?? []).flatMap((o) => o.web_fotos);
const sample = visiblePhotos[0];
if (sample) {
  const res = await fetch(`${url}/storage/v1/object/public/${BUCKET}/${sample.storage_path}`, { method: "HEAD" });
  if (!res.ok) problems.push(`La foto pública ${sample.storage_path} responde ${res.status}`);
}

console.log(`\n${simulate ? "[simulación] " : ""}Obras creadas: ${simulate ? 0 : missing.length} · fotos subidas: ${uploaded}`);
console.log(
  `En la web: ${visible?.length ?? 0} obras · ${visiblePhotos.length} fotos · ${(visible ?? []).filter((o) => o.destacada).length} destacadas`,
);
if (problems.length) console.log(`\nProblemas (${problems.length}):\n- ${problems.join("\n- ")}`);
await done();
