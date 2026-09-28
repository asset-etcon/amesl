import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { services } from "@/db/schema";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { WhatsappLink } from "@/components/public/whatsapp-link";
import { ServiceIcon } from "@/components/public/service-icon";
import { JsonLd } from "@/components/public/json-ld";
import { activeServiceWhere, serviceOrder } from "@/lib/services";
import { ArrowUpRight, ArrowRight } from "@/components/icons";

const siteUrl = (process.env.SITE_URL ?? "https://assetmatrixenergy.com").replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Services",
  alternates: { canonical: "/services" },
  description: "Vibration analysis, thermographic surveys, ultrasound inspection, laser alignment, dynamic balancing, partial discharge analysis, motor analysis, calibration and equipment rental.",
};

/** Required because the page reads `services` and `site_settings`; without it both are baked at build time. */
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  // One query feeds the grid, the ItemList below and the CTA copy. `activeServiceWhere`
  // is the single definition of "listed on the public site" — the same predicate the
  // sitemap and the detail pages use.
  const rows = await db
    .select({
      id: services.id,
      name: services.name,
      slug: services.slug,
      summary: services.summary,
      icon: services.icon,
    })
    .from(services)
    .where(activeServiceWhere())
    .orderBy(...serviceOrder);

  const listLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Asset Matrix Energy services",
    itemListElement: rows.map((row, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: row.name,
        description: row.summary,
        url: `${siteUrl}/services/${row.slug}`,
        provider: { "@type": "Organization", name: "Asset Matrix Energy" },
      },
    })),
  };

  return (
    <>
      <Navbar />
      <main>
        <JsonLd data={listLd} />
        <section className="ab-hero">
          <p className="eyebrow eyebrow-light">Our services</p>
          <h1>Solutions designed around <em>asset performance.</em></h1>
          <p>From precision measurement to on-site engineering, our services help teams understand equipment condition and act with clarity.</p>
        </section>

        <section className="services section-pad">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span />Our expertise</p>
              <h2>Services for every stage<br />of equipment life.</h2>
            </div>
            <p>Routine condition surveys, specialist diagnostics and calibration support — delivered by qualified engineers.</p>
          </div>
          {rows.length > 0 ? (
            <div className="service-grid">
              {rows.map((row, index) => (
                <Link className="service-card" href={`/services/${row.slug}`} key={row.id}>
                  <div className="service-top"><span className="service-icon"><ServiceIcon name={row.icon} /></span><span className="service-number">{String(index + 1).padStart(2, "0")}</span></div>
                  <h3>{row.name}</h3>
                  <p>{row.summary}</p>
                  <span className="service-arrow"><ArrowRight size={17} /></span>
                </Link>
              ))}
            </div>
          ) : (
            <p>Our service list is being updated. Please <Link className="text-link" href="/contact">contact our team</Link> in the meantime.</p>
          )}
        </section>

        <section className="pd-cta">
          <div className="eyebrow eyebrow-light">Looking for a specialist service?</div>
          <h2>Tell us what you need to measure, inspect or maintain — our engineering team will advise.</h2>
          <WhatsappLink className="button button-accent" message="Hi, I would like to talk to your team about a specialist service we need. I reached you via the Services page." fallbackHref="mailto:info@assetmatrixenergy.com">Talk to our team <ArrowUpRight size={16} /></WhatsappLink>
        </section>
      </main>
      <Footer />
    </>
  );
}
