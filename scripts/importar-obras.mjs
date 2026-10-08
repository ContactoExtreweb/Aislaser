// Pasa las obras de la web anterior (src/content/projects.ts, con sus fotos de public/images/obras)
// a la galería de la base de datos, para que se puedan editar desde el panel (/panel/obras).
//
//   ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/importar-obras.mjs [--simular]
//
// - Entra con un usuario administrador del panel: no hace falta la clave secreta de Supabase.
// - Se puede repetir: las obras que ya existan (por su dirección) no se tocan, así que nunca
//   pisa lo editado en el panel. Sólo completa las que se quedaron a medias.
// - Requiere haber ejecutado antes supabase/migrations/004_galeria_web.sql.

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const root = new URL("../", import.meta.url);
const simulate = process.argv.includes("--simular");

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

// Node 22 lee TypeScript sin compilar (sólo quita los tipos)
const { projects } = await import(new URL("src/content/projects.ts", root).href);
const { services } = await import(new URL("src/content/services.ts", root).href);

const supabase = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "galeria";

const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
if (loginError) throw new Error(`No se pudo entrar como ${email}: ${loginError.message}`);
const { data: isAdmin } = await supabase.rpc("is_admin");
if (!isAdmin) throw new Error(`${email} no es administrador del panel.`);

const { data: existing, error: tableError } = await supabase.from("web_obras").select("id, slug, publicada, web_fotos(count)");
if (tableError) throw new Error(`Ejecuta antes supabase/migrations/004_galeria_web.sql (${tableError.message}).`);
const bySlug = new Map(existing.map((o) => [o.slug, o]));

let created = 0;
let completed = 0;
let skipped = 0;
let photos = 0;
const problems = [];

for (const [i, p] of projects.entries()) {
  const current = bySlug.get(p.slug);
  const photoCount = current?.web_fotos?.[0]?.count ?? 0;
  if (current && photoCount > 0) {
    skipped++;
    continue; // ya importada (y quizá editada en el panel): no se toca
  }
  const servicios = services.filter((s) => s.projects.includes(p.slug)).map((s) => s.slug);
  console.log(`${current ? "Completando" : "Importando"} ${p.slug} (${p.images.length} fotos)`);
  if (simulate) continue;

  // Se crea en borrador y se publica cuando ya tiene sus fotos
  let obraId = current?.id;
  if (!obraId) {
    const { data, error } = await supabase
      .from("web_obras")
      .insert({
        slug: p.slug,
        titulo: p.title,
        ubicacion: p.location ?? "",
        sector: p.sector,
        servicios,
        destacada: p.featured,
        publicada: false,
        orden: (i + 1) * 10, // el orden de la web de siempre; las obras nuevas del panel salen delante
      })
      .select("id")
      .single();
    if (error) {
      problems.push(`${p.slug}: ${error.message}`);
      continue;
    }
    obraId = data.id;
    created++;
  } else {
    completed++;
  }

  let ok = 0;
  for (const [j, img] of p.images.entries()) {
    const nn = String(j + 1).padStart(2, "0");
    const path = `${obraId}/importada-${nn}.webp`;
    const file = await readFile(new URL(`public${img.src}`, root));
    // Las fotos se suben tal cual (WebP), sin volver a comprimirlas
    const { error: upError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (upError && !/exists|duplicate/i.test(upError.message)) {
      problems.push(`${p.slug} foto ${nn}: ${upError.message}`);
      continue;
    }
    const { error: rowError } = await supabase
      .from("web_fotos")
      .upsert({ obra_id: obraId, storage_path: path, ancho: img.width, alto: img.height, orden: j }, { onConflict: "storage_path", ignoreDuplicates: true });
    if (rowError) {
      problems.push(`${p.slug} foto ${nn}: ${rowError.message}`);
      continue;
    }
    ok++;
  }
  photos += ok;

  if (ok > 0) {
    const { error } = await supabase.from("web_obras").update({ publicada: true }).eq("id", obraId);
    if (error) problems.push(`${p.slug}: no se pudo publicar (${error.message})`);
  } else {
    problems.push(`${p.slug}: sin fotos, se queda en borrador`);
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

console.log(
  `\n${simulate ? "[simulación] " : ""}Creadas ${created} · completadas ${completed} · ya estaban ${skipped} · fotos subidas ${photos}`,
);
console.log(
  `En la web: ${visible?.length ?? 0} obras · ${visiblePhotos.length} fotos · ${(visible ?? []).filter((o) => o.destacada).length} destacadas`,
);
if (problems.length) {
  console.log(`\nProblemas (${problems.length}):\n- ${problems.join("\n- ")}`);
  process.exitCode = 1;
}
await supabase.auth.signOut();
