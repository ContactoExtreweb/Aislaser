"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Sólo etiquetas HTML (con React Three Fiber instalado, ElementType incluye también las de Three.js) */
  as?: "div" | "li" | "ul" | "section" | "article" | "span";
  className?: string;
  delay?: number;
};

/** Hace aparecer el contenido suavemente cuando entra en pantalla */
export function Reveal({ children, as = "div", className, delay = 0 }: Props) {
  // Todas son elementos HTML: para TypeScript basta con tratarlas como un <div>
  const Tag = as as "div";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // También si ya quedó por encima (scroll rápido antes de hidratar)
          if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) {
            el.dataset.reveal = "visible";
            observer.disconnect();
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      className={className}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
