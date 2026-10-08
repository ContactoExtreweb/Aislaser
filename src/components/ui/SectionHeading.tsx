import { Dots } from "@/components/brand/Logo";
import { Reveal } from "./Reveal";

type Props = {
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
};

export function Eyebrow({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "dark" }) {
  return (
    <span className={`eyebrow ${tone === "dark" ? "text-laser-500" : "text-ink-500"}`}>
      <Dots tone={tone === "dark" ? "light" : "dark"} />
      {children}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, intro, align = "left", tone = "light", className }: Props) {
  const center = align === "center";
  return (
    <Reveal className={`${center ? "mx-auto text-center" : ""} max-w-3xl ${className ?? ""}`}>
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <h2
        className={`mt-5 text-4xl leading-[1.02] font-bold sm:text-5xl lg:text-6xl ${
          tone === "dark" ? "text-white" : "text-ink-900"
        }`}
      >
        {title}
      </h2>
      {intro && (
        <p className={`mt-6 text-lg leading-relaxed ${tone === "dark" ? "text-ink-300" : "text-ink-600"}`}>{intro}</p>
      )}
    </Reveal>
  );
}

/** Subrayado amarillo tipo "trazo láser" para resaltar palabras clave */
export function Mark({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden="true"
        className="absolute inset-x-[-0.08em] bottom-[0.06em] z-0 h-[0.32em] -skew-x-12 rounded-sm bg-laser-500/90"
      />
    </span>
  );
}
