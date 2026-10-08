"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { SIGNATURE_BUCKET } from "@/lib/supabase/env";
import type { Branding, BrandingSource } from "./types";

/** Descarga el sello y la firma del bucket privado con la sesión del usuario y los sirve como blob: */
export function useBranding(source: BrandingSource | null): Branding & { loading: boolean } {
  const [urls, setUrls] = useState<{ stamp: string | null; signature: string | null; loading: boolean }>({
    stamp: null,
    signature: null,
    loading: Boolean(source?.stampPath || source?.signaturePath),
  });
  const stampPath = source?.stampPath ?? null;
  const signaturePath = source?.signaturePath ?? null;

  useEffect(() => {
    if (!stampPath && !signaturePath) {
      setUrls({ stamp: null, signature: null, loading: false });
      return;
    }
    let cancelled = false;
    const created: string[] = [];
    const get = async (path: string | null) => {
      if (!path) return null;
      const { data, error } = await getSupabaseBrowser().storage.from(SIGNATURE_BUCKET).download(path);
      if (error || !data) return null;
      const url = URL.createObjectURL(data);
      created.push(url);
      return url;
    };
    setUrls((u) => ({ ...u, loading: true }));
    void Promise.all([get(stampPath), get(signaturePath)]).then(([stamp, signature]) => {
      if (!cancelled) setUrls({ stamp, signature, loading: false });
    });
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [stampPath, signaturePath]);

  const signerName = source?.signerName ?? "Isidro Calvo Gallego";
  const signerCompany = source?.signerCompany ?? "AISLASER, C.B.";
  // Objeto estable: la vista previa recalcula las páginas cuando cambia
  return useMemo(
    () => ({ signerName, signerCompany, stampUrl: urls.stamp, signatureUrl: urls.signature, loading: urls.loading }),
    [signerName, signerCompany, urls],
  );
}
