import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowRight, ArrowUpRight, MapPin, Phone, Mail } from "@/components/icons";
import { db } from "@/lib/db";
import { brands as brandsTable, siteSettings } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const metadata: Metadata = {
  title: "About Us | Asset Matrix Energy",
  description: "Asset Matrix Energy Services Limited is a wholly indigenous Nigerian company providing specialized engineering, industrial reliability and technical solutions across Nigeria and Sub-Saharan Africa.",
};

export const dynamic = "force-dynamic";

const values = [
  {
    title: "Local capacity building",
    text: "Technology transfer and skills development delivered in alliance with a suite of competent technical partners.",
  },
  {
    title: "Integrity in every transaction",
    text: "Professional excellence, honesty and a strong desire to build long-term business relationships.",
  },
  {
    title: "Direct manufacturer partnerships",
    text: "Affiliation with reputable manufacturers so every product is sourced directly from the maker.",
  },
];

export default async function AboutPage() {
  const [brandRows, settingsRows] = await Promise.all([
    db
      .select({ slug: brandsTable.slug, name: brandsTable.name, logo_url: brandsTable.logo_url })
      .from(brandsTable)
      .where(eq(brandsTable.status, "active"))
      .orderBy(asc(brandsTable.name)),
    db.select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings),
  ]);

  const settings: Record<string, string> = {};
  for (const row of settingsRows) settings[row.key] = row.value;

  const email = settings.email ?? "info@assetmatrixenergy.com";
  const phonePrimary = settings.phone_primary ?? "+234-7069176001";
  const phoneSecondary = settings.phone_secondary ?? "+234-8176153012";
  const addressHead = settings.address_head_office ?? "No. 23, House 13 Osogbo Street, Ogudu, Lagos, Nigeria.";
  const addressOps = settings.address_operations ?? "445 Herbert Macaulay Way, Bio-vaccine Compound, Yaba, Lagos, Nigeria.";

  return (
    <>
      <Navbar />
      <main>
        <section className="ab-hero">
          <p className="eyebrow eyebrow-light">About us</p>
          <h1>Best-in-class engineering, delivered <em>across Africa.</em></h1>
          <p>Asset Matrix Energy Services Limited is a wholly indigenous Nigerian company providing specialized engineering, industrial reliability and technical solutions across Nigeria and Sub-Saharan Africa.</p>
        </section>

        <section className="about section-pad">
          <div className="about-visual">
            <Image src="/amels who.webp" alt="AMESL engineers in the field" fill sizes="(max-width: 800px) 100vw, 48vw" />
            <div className="image-label"><span className="label-dot" />Engineering in the field</div>
            <div className="about-mark">AMESL <span> / </span> NIGERIA</div>
          </div>
          <div className="about-copy">
            <p className="eyebrow"><span />Who we are</p>
            <h2>A partner for the life of your equipment.</h2>
            <p>Asset Matrix Energy Services Limited is a wholly indigenous Nigerian company incorporated to provide best-in-class services to clients across the electrical power, oil and gas, refinery, petrochemical and manufacturing industries.</p>
            <p>We offer a complete range of cost-effective services that reflect uncompromising quality, a commitment to cutting-edge technology and attention to detail. From the initial concept of your project through to the execution of the final stages, we remain relevant and ever ready to serve — getting the job done with innovative thinking, expertise and dedication to our clients.</p>
            <p>We are committed to local capacity building and technology transfer while working in alliance with a suite of competent technical partners, ensuring value-added solutions alongside professional excellence, integrity and honesty in all our transactions.</p>
            <p>Through our affiliations with reputable manufacturers, our products are sourced directly from the makers. We have quick access to international markets via our spread and technology, and we hold our customers in the highest esteem.</p>
            <div className="about-note"><span className="note-rule" />From field diagnostics to technical knowledge transfer, our work is centered on dependable operations.</div>
            <Link className="text-link" href="/products">Explore our products <ArrowRight size={16} /></Link>
          </div>
        </section>

        <section className="ab-values">
          <div className="partners-header">
            <div>
              <p className="eyebrow"><span />What guides our work</p>
              <h2>Working for reliable,<br />long-term performance.</h2>
            </div>
            <p>Three commitments shape every project we take on, wherever it is delivered.</p>
          </div>
          <div className="ab-values-grid">
            {values.map((v, i) => (
              <article className="ab-value" key={v.title}>
                <span className="ab-value-no">0{i + 1}</span>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </article>
            ))}
          </div>
        </section>

        {brandRows.length > 0 && (
          <section className="ab-dist">
            <div className="partners-header">
              <div>
                <p className="eyebrow"><span />Our distribution</p>
                <h2>Technology brands<br />we represent.</h2>
              </div>
              <p>Direct affiliations with reputable manufacturers and technology providers across test, measurement, diagnostics and condition monitoring.</p>
            </div>
            <div className="brand-wall-grid">
              {brandRows.map((b) => (
                <Link
                  key={b.slug}
                  href={`/products?brand=${encodeURIComponent(b.slug)}`}
                  title={b.name}
                  aria-label={`View ${b.name} products`}
                  className="brand-wall-logo"
                >
                  {b.logo_url ? (
                    <Image src={b.logo_url} alt={b.name} fill sizes="(max-width: 640px) 50vw, 220px" unoptimized />
                  ) : (
                    <span className="brand-wall-fallback">{b.name.slice(0, 1) || "B"}</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="ab-offices">
          <div className="partners-header">
            <div>
              <p className="eyebrow"><span />Find us</p>
              <h2>Our offices in Lagos.</h2>
            </div>
            <p>Reach our engineering team at either of our office locations — we are happy to discuss your requirements.</p>
          </div>
          <div className="ab-offices-grid">
            <article className="ab-office">
              <h3>Head office</h3>
              <p className="ab-addr"><MapPin size={16} />{addressHead}</p>
              <p><Phone size={16} /><span><a href="tel:+2347069176001">{phonePrimary}</a> · <a href="tel:+2348176153012">{phoneSecondary}</a></span></p>
              <p><Mail size={16} /><a href={`mailto:${email}`}>{email}</a></p>
            </article>
            <article className="ab-office">
              <h3>Operational office</h3>
              <p className="ab-addr"><MapPin size={16} />{addressOps}</p>
              <p><Phone size={16} /><span><a href="tel:+2347069176001">{phonePrimary}</a> · <a href="tel:+2348176153012">{phoneSecondary}</a></span></p>
              <p><Mail size={16} /><a href={`mailto:${email}`}>{email}</a></p>
            </article>
          </div>
        </section>

        <section className="pd-cta">
          <div className="eyebrow eyebrow-light">Start a conversation</div>
          <h2>Ready to talk about testing, diagnostics, reliability or instrumentation?</h2>
          <a className="button button-accent" href={`mailto:${email}`}>Talk to our team <ArrowUpRight size={16} /></a>
        </section>
      </main>
      <Footer />
    </>
  );
}