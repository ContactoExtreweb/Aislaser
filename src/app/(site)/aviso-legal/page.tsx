import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { company } from "@/content/company";

export const metadata: Metadata = { title: "Aviso legal", robots: { index: false }, alternates: { canonical: "/aviso-legal" } };

export default function AvisoLegalPage() {
  return (
    <LegalPage title="Aviso legal" updated="octubre de 2026">
      <h2>Titular del sitio web</h2>
      <p>
        En cumplimiento de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se
        informa de que este sitio web es titularidad de:
      </p>
      <ul>
        <li><strong>Razón social:</strong> {company.legalName}</li>
        <li><strong>CIF:</strong> {company.cif}</li>
        <li><strong>Nº de registro:</strong> {company.registry}</li>
        <li>
          <strong>Domicilio:</strong> {company.address.street}, {company.address.postalCode} {company.address.city} ({company.address.province})
        </li>
        <li><strong>Teléfono:</strong> {[company.landline, ...company.phones].map((p) => p.label).join(" · ")}</li>
        <li><strong>Email:</strong> {company.email}</li>
      </ul>
      <h2>Condiciones de uso</h2>
      <p>
        El acceso a este sitio web atribuye la condición de usuario e implica la aceptación de las presentes condiciones. El usuario
        se compromete a hacer un uso adecuado de los contenidos y a no emplearlos para actividades ilícitas o contrarias a la buena fe.
      </p>
      <h2>Propiedad intelectual e industrial</h2>
      <p>
        Todos los contenidos del sitio (textos, fotografías, logotipos, diseño y código) son propiedad de {company.legalName} o de
        terceros que han autorizado su uso, y están protegidos por la normativa de propiedad intelectual e industrial. Queda
        prohibida su reproducción, distribución o transformación sin autorización expresa.
      </p>
      <h2>Responsabilidad</h2>
      <p>
        {company.legalName} no se hace responsable de los daños derivados del uso de la información de este sitio web ni de los
        contenidos de sitios de terceros enlazados desde él.
      </p>
      <h2>Legislación aplicable</h2>
      <p>Las presentes condiciones se rigen por la legislación española.</p>
    </LegalPage>
  );
}
