import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { company, siteUrl } from "@/content/company";
import { services } from "@/content/services";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "RoofingContractor",
  "@id": `${siteUrl}/#empresa`,
  name: company.name,
  legalName: company.legalName,
  description: company.description,
  url: siteUrl,
  logo: `${siteUrl}/brand/aislaser-logo.svg`,
  image: `${siteUrl}/og.jpg`,
  telephone: "+34609005163",
  faxNumber: "+34924851823",
  taxID: company.cif,
  email: company.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: company.address.street,
    addressLocality: company.address.city,
    addressRegion: company.address.province,
    postalCode: company.address.postalCode,
    addressCountry: company.address.country,
  },
  areaServed: { "@type": "Country", name: "España" },
  knowsAbout: services.map((s) => s.title),
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Servicios de Aislaser",
    itemListElement: services.map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s.title, url: `${siteUrl}/servicios/${s.slug}` },
    })),
  },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-[60] rounded-full bg-laser-500 px-4 py-2 font-bold text-ink-900 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido">{children}</main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
