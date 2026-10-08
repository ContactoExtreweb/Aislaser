import { LOGO_DARK_PATH, LOGO_VIEWBOX, LOGO_YELLOW_PATH, MARK_DARK_PATH } from "./logo-paths";

type Props = {
  className?: string;
  /** "color": carbón sobre claro · "white": blanco sobre oscuro */
  variant?: "color" | "white";
  title?: string;
};

/** Logotipo oficial de Aislaser en vectorial (el punto amarillo se mantiene siempre) */
export function Logo({ className, variant = "color", title = "Aislaser" }: Props) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} role="img" aria-label={title}>
      <path fill={variant === "white" ? "#ffffff" : "#433f3f"} d={LOGO_DARK_PATH} />
      <path fill="#ffce00" d={LOGO_YELLOW_PATH} />
    </svg>
  );
}

/** Símbolo "Λi" con los tres puntos, para usos reducidos */
export function LogoMark({ className, variant = "color" }: Omit<Props, "title">) {
  return (
    <svg viewBox="0 0 70 62" className={className} aria-hidden="true">
      <path fill={variant === "white" ? "#ffffff" : "#433f3f"} d={MARK_DARK_PATH} />
      <path fill="#ffce00" d={LOGO_YELLOW_PATH} />
    </svg>
  );
}

/** Los tres puntos del logotipo como recurso gráfico */
export function Dots({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const base = tone === "dark" ? "bg-ink-700" : "bg-white/70";
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`} aria-hidden="true">
      <span className={`size-1.5 rounded-full ${base}`} />
      <span className={`size-1.5 rounded-full ${base}`} />
      <span className="size-1.5 rounded-full bg-laser-500" />
    </span>
  );
}
