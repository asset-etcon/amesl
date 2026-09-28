import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { services, siteSettings } from "@/db/schema";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { WhatsappLink } from "@/components/public/whatsapp-link";
import { ServiceIcon } from "@/components/public/service-icon";
import { JsonLd } from "@/components/public/json-ld";
import { activeServiceWhere, isServiceVisible, serviceOrder } from "@/lib/services";
import { sanitizeRichText } from "@/lib/sanitize";
import { ArrowUpRight, ArrowRight, Phone, Mail, MapPin } from "@/components/icons";

const siteUrl = (process.env.SITE_URL ?? "https://assetmatrixenergy.com").replace(/\/+$/, "");

interface Params {
  slug: string;
}

type ServiceRow = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  icon: string;
  overview: string;
  scope: string;
  method: string;
  deliverables: string;
  image: string;
  image_alt: string;
  status: string;
  seo_title: string;
  seo_description: string;
  updated_at: string;
};

/**
 * Only active services are loadable, so a deactivated service 404s by URL rather
 * than continuing to render from cache. `notFound()` below therefore means the
 * slug genuinely does not exist.
 */
async function loadService(slug: string): Promise<ServiceRow | undefined> {
  const rows = await db
    .select({
      id: services.id,
      name: services.name,
      slug: services.slug,
      summary: services.summary,
      icon: services.icon,
      overview: services.overview,
      scope: services.scope,
      method: services.method,
      deliverables: services.deliverables,
      image: services.image,
      image_alt: services.image_alt,
      status: services.status,
      seo_title: services.seo_title,
      seo_description: services.seo_description,
      updated_at: services.updated_at,
    })
    .from(services)
    .where(and(eq(services.slug, slug), activeServiceWhere()))
    .limit(1);
  return rows[0];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const service = await loadService(slug);
  if (!service) return { title: "Service not found" };

  const title = service.seo_title || service.name;
  const description =
    service.seo_description ||
    service.summary ||
    `${service.name} from Asset Matrix Energy.`;
  const url = `/services/${service.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      images: service.image ? [{ url: service.image, alt: service.image_alt || service.name }] : undefined,
    },
    twitter: {
      card: service.image ? "summary_large_image" : "summary",
      title,
      description,
      images: service.image ? [service.image] : undefined,
    },
  };
}

/** Contact details for the sidebar CTA, mirroring the fallbacks in the footer. */
async function readContact(): Promise<{ phone: string; email: string; address: string }> {
  const wanted = ["phone_primary", "email", "address_operations"] as const;
  const defaults = {
    phone_primary: "+234-7069176001",
    email: "info@assetmatrixenergy.com",
    address_operations: "445 Herbert Macaulay Way, Bio-vaccine Compound, Yaba, Lagos, Nigeria.",
  } as const;

  try {
    const rows = await db
      .select({ key: siteSettings.key, value: siteSettings.value })
      .from(siteSettings)
      .where(inArray(siteSettings.key, [...wanted]));
    const found: Record<string, string> = {};
    for (const row of rows) found[row.key] = row.value;
    return {
      phone: found.phone_primary ?? defaults.phone_primary,
      email: found.email ?? defaults.email,
      address: found.address_operations ?? defaults.address_operations,
    };
  } catch {
    return { phone: defaults.phone_primary, email: defaults.email, address: defaults.address_operations };
  }
}

export default async function ServiceDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const service = await loadService(slug);
  if (!service || !isServiceVisible({ status: service.status })) notFound();

  // Defence in depth: these were sanitised on write, but re-sanitising on read means
  // a row inserted by a migration or a manual fix can never introduce stored XSS.
  const overview = sanitizeRichText(service.overview);
  const scope = sanitizeRichText(service.scope);
  const method = sanitizeRichText(service.method);
  const deliverables = sanitizeRichText(service.deliverables);

  const [contact, others] = await Promise.all([
    readContact(),
    db
      .select({ id: services.id, name: services.name, slug: services.slug, summary: services.summary, icon: services.icon })
      .from(services)
      .where(and(activeServiceWhere(), ne(services.id, service.id)))
      .orderBy(...serviceOrder),
  ]);

  const path = `/services/${service.slug}`;
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.seo_description || service.summary || undefined,
    url: `${siteUrl}${path}`,
    serviceType: service.name,
    image: service.image ? [service.image] : undefined,
    provider: {
      "@type": "Organization",
      name: "Asset Matrix Energy",
      url: siteUrl,
      logo: { "@type": "ImageObject", url: `${siteUrl}/Asset%20Matrix%20Energy%20logo.png` },
      telephone: contact.phone,
      email: contact.email,
    },
    areaServed: "Nigeria and Sub-Saharan Africa",
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Services", item: `${siteUrl}/services` },
      { "@type": "ListItem", position: 3, name: service.name, item: `${siteUrl}${path}` },
    ],
  };

  const sections = [
    { heading: "What this service covers", html: scope },
    { heading: "How we deliver it", html: method },
    { heading: "What you receive", html: deliverables },
  ].filter((section) => section.html !== "");

  return (
    <>
      <Navbar />
      <main>
        <JsonLd data={serviceLd} />
        <JsonLd data={breadcrumbLd} />

        <section className="ab-hero">
          <nav className="pd-breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: 22 }}>
            <Link href="/">Home</Link><span>/</span>
            <Link href="/services">Services</Link><span>/</span>
            <span>{service.name}</span>
          </nav>
          <p className="eyebrow eyebrow-light" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="service-icon sv-hero-icon"><ServiceIcon name={service.icon} size={18} /></span>
            Our services
          </p>
          <h1>{service.name}</h1>
          {service.summary ? <p>{service.summary}</p> : null}
        </section>

        <section className="sv-body section-pad">
          <div className="sv-main">
            {overview ? <div className="pd-rich" dangerouslySetInnerHTML={{ __html: overview }} /> : null}

            {sections.map((section) => (
              <section className="sv-block" key={section.heading}>
                <h2>{section.heading}</h2>
                <div className="pd-rich" dangerouslySetInnerHTML={{ __html: section.html }} />
              </section>
            ))}

            {service.image ? (
              <figure className="sv-figure">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={service.image} alt={service.image_alt || service.name} />
              </figure>
            ) : null}
          </div>

          <aside className="sv-aside">
            <div className="sv-aside-card">
              <p className="eyebrow"><span />Request this service</p>
              <h3>Speak to an engineer about {service.name.toLowerCase()}.</h3>
              <p className="sv-aside-copy">Tell us the equipment and the problem, and we will advise on the right survey, test or correction.</p>
              <WhatsappLink
                className="button button-accent"
                message={`Hi, I would like to talk to your team about ${service.name}. I reached you via the ${service.name} page.`}
                fallbackHref="mailto:info@assetmatrixenergy.com"
              >
                Talk to our team <ArrowUpRight size={16} />
              </WhatsappLink>
              <a className="button button-outline" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>
                <Phone size={16} /> {contact.phone}
              </a>
              <a className="button button-outline" href={`mailto:${contact.email}`}>
                <Mail size={16} /> Email us
              </a>
              <p className="sv-aside-meta">
                <MapPin size={15} />
                <span>{contact.address}</span>
              </p>
            </div>
          </aside>
        </section>

        {others.length > 0 ? (
          <section className="services section-pad" style={{ paddingTop: 0 }}>
            <div className="section-heading">
              <div>
                <p className="eyebrow"><span />Other services</p>
                <h2>Explore the rest of<br />what we do.</h2>
              </div>
              <p><Link className="text-link" href="/services">View all services <ArrowRight size={16} /></Link></p>
            </div>
            <div className="service-grid">
              {others.map((row, index) => (
                <Link className="service-card" href={`/services/${row.slug}`} key={row.id}>
                  <div className="service-top"><span className="service-icon"><ServiceIcon name={row.icon} /></span><span className="service-number">{String(index + 1).padStart(2, "0")}</span></div>
                  <h3>{row.name}</h3>
                  <p>{row.summary}</p>
                  <span className="service-arrow"><ArrowRight size={17} /></span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="pd-cta">
          <div className="eyebrow eyebrow-light">Ready to schedule?</div>
          <h2>Our engineering team will scope the work, agree the survey plan and deliver a clear report you can act on.</h2>
          <WhatsappLink className="button button-accent" message={`Hi, I would like to schedule ${service.name}. I reached you via the ${service.name} page.`} fallbackHref="mailto:info@assetmatrixenergy.com">Request a survey <ArrowRight size={16} /></WhatsappLink>
        </section>
      </main>
      <Footer />
    </>
  );
}
