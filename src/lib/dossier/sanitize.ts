/**
 * Limpia el HTML del editor antes de pintarlo en el documento: sólo deja las etiquetas
 * que produce el editor (párrafos, listas, negrita, cursiva, subrayado) y la alineación.
 * Cualquier otra cosa (scripts, eventos onclick, imágenes, enlaces…) se descarta.
 */
const ALLOWED = new Set(["P", "UL", "OL", "LI", "STRONG", "B", "EM", "I", "U", "BR", "SPAN"]);
const ALIGN = /^(left|center|right|justify)$/;

export function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const children = Array.from(el.childNodes)
    .map((c) => sanitizeNode(c, doc))
    .filter((c): c is Node => c !== null);

  // Etiqueta no permitida: se conserva sólo su texto/contenido permitido
  if (!ALLOWED.has(el.tagName)) {
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE"].includes(el.tagName)) return null;
    const frag = doc.createDocumentFragment();
    children.forEach((c) => frag.appendChild(c));
    return frag;
  }

  const clean = doc.createElement(el.tagName.toLowerCase());
  const align = (el as HTMLElement).style?.textAlign;
  if (align && ALIGN.test(align) && (el.tagName === "P" || el.tagName === "LI")) clean.setAttribute("style", `text-align: ${align}`);
  if (el.tagName === "OL") {
    const start = Number(el.getAttribute("start"));
    if (Number.isInteger(start) && start > 0 && start < 10000) clean.setAttribute("start", String(start));
  }
  children.forEach((c) => clean.appendChild(c));
  return clean;
}

/** Devuelve los nodos de primer nivel ya limpios */
export function sanitizedTopLevel(html: string): Element[] {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild!;
  const out = doc.createElement("div");
  Array.from(root.childNodes).forEach((c) => {
    const clean = sanitizeNode(c, doc);
    if (clean) out.appendChild(clean);
  });
  // Texto suelto de primer nivel se envuelve en un párrafo
  Array.from(out.childNodes).forEach((c) => {
    if (c.nodeType === Node.TEXT_NODE) {
      if (!c.textContent?.trim()) return c.remove();
      const p = doc.createElement("p");
      out.replaceChild(p, c);
      p.appendChild(c);
    }
  });
  return Array.from(out.children);
}
