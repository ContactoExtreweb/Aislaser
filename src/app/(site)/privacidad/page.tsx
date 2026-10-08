import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { company } from "@/content/company";

export const metadata: Metadata = { title: "Política de privacidad", robots: { index: false }, alternates: { canonical: "/privacidad" } };

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad" updated="octubre de 2026">
      <h2>Responsable del tratamiento</h2>
      <p>
        {company.legalName} · {company.address.street}, {company.address.postalCode} {company.address.city} ({company.address.province}) ·{" "}
        {company.email}
      </p>
      <h2>Qué datos tratamos y para qué</h2>
      <p>
        Cuando nos escribes a través del formulario de contacto tratamos tu nombre, teléfono, email y el mensaje que nos envías con
        la única finalidad de atender tu solicitud y, en su caso, elaborar un presupuesto.
      </p>
      <h2>Legitimación</h2>
      <p>La base legal es tu consentimiento, que otorgas al marcar la casilla de aceptación antes de enviar el formulario.</p>
      <h2>Conservación</h2>
      <p>
        Conservaremos tus datos mientras sea necesario para atender tu solicitud y, posteriormente, durante los plazos legalmente
        exigibles.
      </p>
      <h2>Destinatarios</h2>
      <p>
        No cedemos tus datos a terceros salvo obligación legal. Los datos se almacenan en proveedores tecnológicos que actúan como
        encargados del tratamiento con las garantías exigidas por el RGPD.
      </p>
      <h2>Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a{" "}
        {company.email}. También puedes presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).
      </p>
    </LegalPage>
  );
}
