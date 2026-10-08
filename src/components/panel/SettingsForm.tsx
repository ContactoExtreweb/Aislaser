"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CircleAlert, CircleCheck, ImageOff, KeyRound, LoaderCircle, RefreshCw, Save } from "lucide-react";
import Link from "next/link";
import { prepareImage, imageFilesFrom } from "@/lib/dossier/image";
import type { AppSettings } from "@/lib/dossier/branding";
import { useBranding } from "@/lib/dossier/useBranding";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { SIGNATURE_BUCKET } from "@/lib/supabase/env";
import { ImageDropzone } from "./editor/ImageDropzone";

type Kind = "stamp" | "signature";
const column: Record<Kind, "stamp_path" | "signature_path"> = { stamp: "stamp_path", signature: "signature_path" };

const field =
  "mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900 focus:ring-4 focus:ring-laser-500/25";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  // Las imágenes se descargan con la sesión (bucket privado), nunca con enlaces públicos
  const { stampUrl, signatureUrl } = useBranding({
    signerName: settings.signer_name,
    signerCompany: settings.signer_company,
    stampPath: settings.stamp_path,
    signaturePath: settings.signature_path,
  });
  const [signerName, setSignerName] = useState(settings.signer_name);
  const [signerCompany, setSignerCompany] = useState(settings.signer_company);
  const [busy, setBusy] = useState<Kind | "names" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [, startRefresh] = useTransition();

  async function run(kind: Kind | "names", task: () => Promise<void>, ok: string) {
    setBusy(kind);
    setMessage(null);
    try {
      await task();
      setMessage({ ok: true, text: ok });
      startRefresh(() => router.refresh());
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  const upload = (kind: Kind, file: File) =>
    run(
      kind,
      async () => {
        const supabase = getSupabaseBrowser();
        // PNG para conservar la transparencia y la nitidez del trazo
        const { blob } = await prepareImage(file, { format: "png", maxSide: 1200 });
        const path = `${kind}/${crypto.randomUUID()}.png`;
        const { error: upErr } = await supabase.storage.from(SIGNATURE_BUCKET).upload(path, blob, { contentType: "image/png" });
        if (upErr) throw new Error(`No se pudo subir la imagen: ${upErr.message}`);
        const { error } = await supabase.from("app_settings").update({ [column[kind]]: path }).eq("id", 1);
        if (error) {
          await supabase.storage.from(SIGNATURE_BUCKET).remove([path]);
          throw new Error(`No se pudo guardar: ${error.message}`);
        }
        const old = settings[column[kind]];
        if (old) await supabase.storage.from(SIGNATURE_BUCKET).remove([old]);
      },
      kind === "stamp" ? "Sello guardado." : "Firma guardada.",
    );

  const remove = (kind: Kind) =>
    run(
      kind,
      async () => {
        const supabase = getSupabaseBrowser();
        const { error } = await supabase.from("app_settings").update({ [column[kind]]: null }).eq("id", 1);
        if (error) throw new Error(error.message);
        const old = settings[column[kind]];
        if (old) await supabase.storage.from(SIGNATURE_BUCKET).remove([old]);
      },
      kind === "stamp" ? "Sello eliminado." : "Firma eliminada.",
    );

  const saveNames = () =>
    run(
      "names",
      async () => {
        const { error } = await getSupabaseBrowser()
          .from("app_settings")
          .update({ signer_name: signerName.trim(), signer_company: signerCompany.trim() })
          .eq("id", 1);
        if (error) throw new Error(error.message);
      },
      "Datos del firmante guardados.",
    );

  return (
    <div className="space-y-6">
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`flex items-start gap-2 rounded-2xl p-4 text-sm font-semibold ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
        >
          {message.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" />}
          {message.text}
        </p>
      )}

      <section className="rounded-[1.75rem] border border-ink-200 bg-white p-5 sm:p-7">
        <h2 className="text-3xl font-bold">Sello y firma</h2>
        <p className="mt-1 text-ink-500">
          Se colocan al final de cada informe, encima de «FDO: …». Sirve una foto o un escaneo sobre fondo blanco; si tienes un PNG con fondo
          transparente, mejor. Se guardan en un almacén privado: sólo se ven con tu sesión dentro del panel y en los documentos que descargues.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <ImageSlot title="Sello de la empresa" url={stampUrl} busy={busy === "stamp"} onFile={(f) => upload("stamp", f)} onRemove={() => remove("stamp")} />
          <ImageSlot title="Firma" url={signatureUrl} busy={busy === "signature"} onFile={(f) => upload("signature", f)} onRemove={() => remove("signature")} />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-ink-200 bg-white p-5 sm:p-7">
        <h2 className="text-3xl font-bold">Firmante por defecto</h2>
        <p className="mt-1 text-ink-500">Se usa en todos los documentos salvo que pongas otro firmante en uno concreto.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-ink-800">Nombre del firmante</span>
            <input value={signerName} onChange={(e) => setSignerName(e.target.value)} className={field} maxLength={120} />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink-800">Empresa (tras «FDO:»)</span>
            <input value={signerCompany} onChange={(e) => setSignerCompany(e.target.value)} className={field} maxLength={120} />
          </label>
        </div>
        <button type="button" onClick={saveNames} disabled={busy === "names"} className="btn-dark mt-5 disabled:opacity-60">
          {busy === "names" ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar
        </button>

        <div className="mt-8 rounded-2xl bg-ink-50 p-5">
          <p className="text-xs font-extrabold tracking-[0.2em] text-ink-400 uppercase">Así queda el cierre</p>
          <div className="mt-4 text-sm text-ink-900">
            <p>Se emite este informe técnico en Campanario a …</p>
            <div className="mt-4 flex h-20 items-end gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {stampUrl ? <img src={stampUrl} alt="Sello" className="h-20 w-auto" /> : <span className="grid h-20 w-16 place-items-center rounded border border-dashed border-ink-300 text-[10px] text-ink-400">Sello</span>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {signatureUrl ? <img src={signatureUrl} alt="Firma" className="h-16 w-auto" /> : <span className="grid h-16 w-28 place-items-center rounded border border-dashed border-ink-300 text-[10px] text-ink-400">Firma</span>}
            </div>
            <p className="mt-2">FDO: {signerCompany || "AISLASER, C.B."}</p>
            <p className="mt-2">{signerName || "Isidro Calvo Gallego"}.</p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-ink-200 bg-white p-5 sm:p-7">
        <div>
          <h2 className="text-2xl font-bold">Contraseña</h2>
          <p className="text-ink-500">Cambia la contraseña de acceso al panel.</p>
        </div>
        <Link href="/panel/nueva-contrasena" className="btn-ghost-dark">
          <KeyRound className="size-4" /> Cambiar contraseña
        </Link>
      </section>
    </div>
  );
}

function ImageSlot({
  title,
  url,
  busy,
  onFile,
  onRemove,
}: {
  title: string;
  url: string | null;
  busy: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const replaceRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="text-sm font-bold text-ink-800">{title}</p>
      <div className="mt-2">
        {url ? (
          <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl border border-ink-200 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={title} className={`max-h-full max-w-full object-contain ${busy ? "opacity-40" : ""}`} />
            {busy && <LoaderCircle className="absolute size-6 animate-spin" />}
            <div className="absolute inset-x-3 bottom-3 flex gap-2">
              <button type="button" disabled={busy} onClick={() => replaceRef.current?.click()} className="btn !px-3 !py-2 flex-1 border border-ink-200 bg-white text-xs text-ink-900 shadow">
                <RefreshCw className="size-3.5" /> Cambiar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (confirm(`¿Quitar ${title.toLowerCase()}?`)) onRemove();
                }}
                className="btn !px-3 !py-2 border border-ink-200 bg-white text-xs text-red-600 shadow"
              >
                <ImageOff className="size-3.5" /> Quitar
              </button>
            </div>
            <input
              ref={replaceRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const [file] = imageFilesFrom(e.target.files);
                if (file) onFile(file);
                e.target.value = "";
              }}
            />
          </div>
        ) : busy ? (
          <div className="grid aspect-[4/3] place-items-center rounded-2xl border-2 border-dashed border-ink-300 bg-ink-50">
            <LoaderCircle className="size-6 animate-spin" />
          </div>
        ) : (
          <ImageDropzone compact label={`Subir ${title.toLowerCase()}`} onFiles={(files) => files[0] && onFile(files[0])} />
        )}
      </div>
    </div>
  );
}
