import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Política de cookies", robots: { index: false }, alternates: { canonical: "/cookies" } };

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies" updated="octubre de 2026">
      <h2>¿Usamos cookies?</h2>
      <p>
        Esta web <strong>no utiliza cookies de análisis ni de publicidad</strong>. Por eso no te mostramos ningún banner de
        consentimiento.
      </p>
      <h2>Cookies técnicas</h2>
      <p>
        Únicamente el área privada (panel de gestión) utiliza cookies técnicas imprescindibles para mantener la sesión iniciada de
        los usuarios autorizados. Están exentas de consentimiento según el artículo 22.2 de la LSSI-CE.
      </p>
      <h2>Contenido de terceros</h2>
      <p>
        El vídeo de YouTube de la página de inicio sólo se carga si pulsas el botón de reproducir, utilizando el modo de privacidad
        mejorada (youtube-nocookie.com). El mapa de la página de contacto procede de OpenStreetMap, que no instala cookies de
        seguimiento.
      </p>
    </LegalPage>
  );
}
