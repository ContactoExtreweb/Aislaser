"use client";

/**
 * Prepara las tipografías de marca (Mulish y Barlow Condensed) incrustadas en base64
 * para html-to-image. Su detección automática falla con nombres entre comillas
 * ("Barlow Condensed") y la exportación acababa usando una fuente de sustitución.
 */
let cache: Promise<string> | null = null;

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export function getBrandFontCss() {
  cache ??= (async () => {
    const rules: CSSFontFaceRule[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let list: CSSRuleList;
      try {
        list = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(list)) if (rule instanceof CSSFontFaceRule) rules.push(rule);
    }
    const wanted = rules.filter((r) => {
      const family = r.style.getPropertyValue("font-family");
      const range = r.style.getPropertyValue("unicode-range");
      // Sólo el subconjunto latino (incluye á, é, ñ, ¿, ¡, €…), suficiente para el castellano
      return /Mulish|Barlow Condensed/.test(family) && !/Fallback/.test(family) && (!range || /U\+0+-FF\b/i.test(range));
    });
    const parts = await Promise.all(
      wanted.map(async (rule) => {
        let css = rule.cssText;
        const base = rule.parentStyleSheet?.href ?? location.href;
        for (const match of css.matchAll(/url\((["']?)([^"')]+)\1\)/g)) {
          const url = match[2];
          if (url.startsWith("data:")) continue;
          const res = await fetch(new URL(url, base));
          if (!res.ok) throw new Error(`No se pudo cargar la tipografía (${res.status})`);
          css = css.replace(url, await blobToDataUrl(await res.blob()));
        }
        return css;
      }),
    );
    return parts.join("\n");
  })().catch((e) => {
    cache = null;
    throw e;
  });
  return cache;
}
