import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { HeroSlider, type HeroSlideData } from "@/components/hero-slider";
import { Footer } from "@/components/footer";
import { ProductCard, type CardProduct } from "@/components/public/product-card";
import { db } from "@/lib/db";
import { products, brands, heroSlides as heroSlidesTable, homepageFeaturedProducts, productImages, newsPosts, newsCategories } from "@/db/schema";
import { eq, inArray, asc, desc } from "drizzle-orm";
import { newsOrder, newsPublishedAt, publishedNewsWhere } from "@/lib/news";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Activity, Gauge, ScanLine, Radio, GraduationCap, Zap, Waves, Move3D, Thermometer, Crosshair, Settings2, ShieldCheck, Globe2, Wrench, ClipboardCheck } from "@/components/icons";

type LatestNews = {
  slug: string;
  title: string;
  excerpt: string;
  categoryName: string | null;
  publishedAt: string;
};

// No `title` here on purpose: the root layout's `title.default` is already the
// full homepage title, and adding one would run it through `title.template`.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

const capabilities = [
  { icon: Activity, title: "Asset reliability", text: "Keep critical equipment performing as it should." },
  { icon: ScanLine, title: "Testing & diagnostics", text: "Make confident decisions with better asset data." },
  { icon: Gauge, title: "Condition monitoring", text: "See the early signs of changing equipment health." },
  { icon: Radio, title: "Instrumentation", text: "Connect process insight with operational control." },
  { icon: GraduationCap, title: "Technical training", text: "Build the skills that support reliable operations." },
];

const services = [
  { icon: Activity, name: "Condition Monitoring", body: "Understand asset health through routine measurement and analysis." },
  { icon: Gauge, name: "Predictive Maintenance", body: "Use condition data to plan maintenance around equipment needs." },
  { icon: Zap, name: "Electrical Testing & Diagnostics", body: "Assess electrical systems and equipment with specialist testing." },
  { icon: Waves, name: "Vibration Analysis", body: "Identify rotating machinery faults and changes in operating condition." },
  { icon: Thermometer, name: "Thermographic Inspection", body: "Locate abnormal heat patterns across electrical and mechanical assets." },
  { icon: ScanLine, name: "Partial Discharge Analysis", body: "Evaluate insulation condition in critical high-voltage equipment." },
  { icon: Move3D, name: "Laser Alignment", body: "Improve machine alignment for dependable rotating equipment." },
  { icon: Crosshair, name: "Equipment Calibration", body: "Maintain confidence in measurement and control instruments." },
  { icon: Wrench, name: "Equipment Rental", body: "Access specialist diagnostic tools for planned work and surveys." },
  { icon: Settings2, name: "Instrumentation & Process Control", body: "Support process measurement, monitoring and control systems." },
];

const industries = ["Oil & Gas", "Power & Energy", "Manufacturing", "Mining", "Steel", "Construction", "Marine", "Water & Wastewater", "Renewable Energy"];
const solutionList = ["Electrical testing and diagnostics", "Transformer and motor diagnostics", "Condition monitoring and reliability engineering", "Instrumentation and process monitoring", "Predictive and preventive maintenance"];
const brandLogos = [
  ["adi", "ADI"],
  ["all test pro", "All Test Pro"],
  ["artesis", "Artesis"],
  ["common-SA", "Common SA"],
  ["cs instrument", "CS Instrument"],
  ["db vb", "DB VB"],
  ["dinnteco", "Dinnteco"],
  ["doble", "Doble"],
  ["eagle-eye", "Eagle Eye"],
  ["easy-laser", "Easy-Laser"],
  ["erbessd systems", "Erbessd Systems"],
  ["globecore", "Globecore"],
  ["heinrichs", "Heinrichs"],
  ["hioki", "Hioki"],
  ["kp", "KP"],
  ["lumel", "Lumel"],
  ["luneta", "Luneta"],
  ["ofil", "Ofil"],
  ["pj electronics", "PJ Electronics"],
  ["PMDT", "PMDT"],
  ["prime uv", "Prime UV"],
  ["process insights", "Process Insights"],
  ["satir", "Satir"],
  ["smart sensor", "Smart Sensor"],
  ["sonel", "Sonel"],
  ["synergys-technologies", "Synergy's Technologies"],
  ["ubicquiad", "Ubicquia"],
  ["ue systems", "UE Systems"],
  ["w", "VMI (Vibration Measurement Instruments)"],
].map(([file, name]) => ({ src: `/pics/brands/${file === "sonel" || file === "synergys-technologies" ? file + ".png" : file + ".webp"}`, name })) as { src: string; name: string }[];

const partnerRowA = brandLogos.slice(0, 15);
const partnerRowB = brandLogos.slice(15);
const reasons = [
  [ClipboardCheck, "Technical expertise", "Multidisciplinary engineering and technical specialists."],
  [Globe2, "Global technology access", "Solutions drawn from established specialist technology providers."],
  [Wrench, "Field engineering capability", "Practical support for equipment, systems and operating environments."],
  [ShieldCheck, "Lifecycle perspective", "Support spanning diagnostics, maintenance, integration and training."],
];

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <div className={`eyebrow ${light ? "eyebrow-light" : ""}`}><span />{children}</div>;
}

export const dynamic = "force-dynamic";

export default async function Home() {
  let heroSlides: HeroSlideData[] = [];
  let featuredCards: CardProduct[] = [];
  let latestNews: LatestNews[] = [];
  try {
    const [slideRows, featuredRows, newsRows] = await Promise.all([
      db
        .select({
          image_desktop: heroSlidesTable.image_desktop,
          image_mobile: heroSlidesTable.image_mobile,
          headline: heroSlidesTable.headline,
          subtext: heroSlidesTable.subtext,
          cta_label: heroSlidesTable.cta_label,
          cta_href: heroSlidesTable.cta_href,
        })
        .from(heroSlidesTable)
        .where(eq(heroSlidesTable.status, "active"))
        .orderBy(asc(heroSlidesTable.display_order)),
      db
        .select({
          product_id: products.id,
          name: products.name,
          slug: products.slug,
          short_description: products.short_description,
          brand_name: brands.name,
          brand_slug: brands.slug,
        })
        .from(homepageFeaturedProducts)
        .innerJoin(products, eq(homepageFeaturedProducts.product_id, products.id))
        .innerJoin(brands, eq(products.brand_id, brands.id))
        .where(eq(products.status, "published"))
        .orderBy(asc(homepageFeaturedProducts.display_order))
        .limit(8),
      // Uses the same shared visibility predicate as /news, so a draft or a
      // scheduled post can never appear on the homepage.
      db
        .select({
          slug: newsPosts.slug,
          title: newsPosts.title,
          excerpt: newsPosts.excerpt,
          publish_at: newsPosts.publish_at,
          created_at: newsPosts.created_at,
          category_name: newsCategories.name,
        })
        .from(newsPosts)
        .leftJoin(newsCategories, eq(newsPosts.category_id, newsCategories.id))
        .where(publishedNewsWhere())
        .orderBy(...newsOrder)
        .limit(3),
    ]);

    heroSlides = slideRows.map((s) => ({
      headline: s.headline,
      subtext: s.subtext,
      cta_label: s.cta_label,
      cta_href: s.cta_href,
      image: s.image_desktop || s.image_mobile,
    }));

    const featuredIds = featuredRows.map((r) => r.product_id);
    const imageMap = new Map<string, string>();

    if (featuredIds.length) {
      const imageRows = await db
        .select({ product_id: productImages.product_id, url: productImages.url })
        .from(productImages)
        .where(inArray(productImages.product_id, featuredIds))
        .orderBy(desc(productImages.is_primary), asc(productImages.display_order));
      for (const img of imageRows) if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, img.url);
    }
    featuredCards = featuredRows.map((p) => ({
      name: p.name,
      slug: p.slug,
      brandSlug: p.brand_slug ?? "",
      brandName: p.brand_name ?? "",
      categoryName: null,
      shortDescription: p.short_description,
      imageUrl: imageMap.get(p.product_id) ?? null,
    }));

    latestNews = newsRows.map((row) => ({
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      categoryName: row.category_name,
      publishedAt: newsPublishedAt({ publish_at: row.publish_at, created_at: row.created_at }).toISOString(),
    }));
  } catch {
  }

  return (
    <>
      <Navbar />
      <main>
        <HeroSlider slides={heroSlides} />

        <section className="capability-band" id="capabilities">
          <div className="capability-heading"><Eyebrow>What we do</Eyebrow><h2>Engineering solutions<br />built around reliability.</h2></div>
          <div className="capability-items">{capabilities.map(({ icon: Icon, title, text }) => <article className="capability" key={title}><Icon size={23} strokeWidth={1.5} /><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="about section-pad" id="about">
          <div className="about-visual"><Image src="/amels who.webp" alt="AMESL engineers in the field" fill sizes="(max-width: 800px) 100vw, 48vw" /><div className="image-label"><span className="label-dot" />Engineering in the field</div><div className="about-mark">AMESL <span> / </span> NIGERIA</div></div>
          <div className="about-copy"><Eyebrow>Who we are</Eyebrow><h2>Engineering better performance. Building more reliable assets.</h2><p>Asset Matrix Energy Services Limited provides specialized engineering, industrial reliability and technical solutions in Nigeria and Sub-Saharan Africa.</p><p>We work alongside teams in oil and gas, power, manufacturing and other mission-critical industries, combining technical expertise with proven diagnostic methods to support equipment throughout its working life.</p><div className="about-note"><span className="note-rule" />From field diagnostics to technical knowledge transfer, our work is centered on dependable operations.</div><Link href="/about" className="text-link">Learn more about us <ArrowRight size={16} /></Link></div>
        </section>

        <section className="services section-pad" id="services">
          <div className="section-heading"><div><Eyebrow>Our expertise</Eyebrow><h2>Solutions designed around<br />asset performance.</h2></div><p>From precision measurement to on-site engineering, our services help teams understand equipment condition and act with clarity.</p></div>
          <div className="service-grid">{services.map(({ icon: Icon, name, body }, index) => <a className="service-card" href="#contact" key={name}><div className="service-top"><span className="service-icon"><Icon size={21} strokeWidth={1.5} /></span><span className="service-number">{String(index + 1).padStart(2, "0")}</span></div><h3>{name}</h3><p>{body}</p><span className="service-arrow"><ArrowRight size={17} /></span></a>)}</div>
        </section>

        <section className="industries" id="industries"><Image src="https://images.unsplash.com/photo-1516937941344-00b4e0337589?auto=format&fit=crop&w=2200&q=85" alt="Industrial processing facility" fill sizes="100vw" /><div className="industry-shade" /><div className="industry-content"><Eyebrow light>Industries we serve</Eyebrow><h2>Supporting critical<br />industries across Africa.</h2><p>Our experience spans complex infrastructure and the systems that keep essential operations moving.</p><div className="industry-list">{industries.map((industry, i) => <div className="industry-item" key={industry}><span>{String(i + 1).padStart(2, "0")}</span>{industry}<ArrowRight size={14} /></div>)}</div></div><div className="industry-stamp">FIELD<br />READY <span>◈</span></div></section>

        <section className="solutions section-pad" id="solutions"><div className="solution-image"><Image src="/train.jpg" alt="Technician working with diagnostic equipment" fill sizes="(max-width: 800px) 100vw, 50vw" /><div className="image-corner">MEASURE <span> / </span> UNDERSTAND <span> / </span> ACT</div></div><div className="solution-copy"><Eyebrow>Technical solutions</Eyebrow><h2>Advanced technologies for smarter asset decisions.</h2><p>We bring diagnostic technologies, engineering methods and process instrumentation together to help operators make informed decisions about critical assets.</p><ul>{solutionList.map(item => <li key={item}><span>+</span>{item}</li>)}</ul><a className="button button-dark" href="#contact">Explore our solutions <ArrowRight size={16} /></a></div></section>

        {featuredCards.length > 0 && (
          <section className="featured-band">
            <div className="section-heading">
              <div>
                <Eyebrow>Featured products</Eyebrow>
                <h2>Selected equipment<br />from our partners.</h2>
              </div>
              <p>Browse the full catalogue of specialist brands represented by Asset Matrix Energy.</p>
            </div>
            <div className="product-grid">
              {featuredCards.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
            <Link className="text-link" href="/products">View the full catalogue <ArrowRight size={16} /></Link>
          </section>
        )}

        {latestNews.length > 0 && (
          <section className="so-section" style={{ paddingTop: 0 }}>
            <div className="section-heading">
              <div>
                <Eyebrow>Latest news</Eyebrow>
                <h2>News &amp; updates<br />from our team.</h2>
              </div>
              <p>Company announcements, new products, partnerships and training from Asset Matrix Energy.</p>
            </div>
            <div className="nw-list">
              {latestNews.map((item) => (
                <article className="nw-card" key={item.slug}>
                  <span className="nw-chip">{item.categoryName ?? "Update"}</span>
                  <h3><Link href={`/news/${item.slug}`}>{item.title}</Link></h3>
                  {item.excerpt ? <p>{item.excerpt.slice(0, 150)}</p> : null}
                  <div className="nw-meta">
                    <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
                    <Link href={`/news/${item.slug}`} aria-label={`Read ${item.title}`}>Read more <ArrowRight size={14} /></Link>
                  </div>
                </article>
              ))}
            </div>
            <Link className="text-link" href="/news">All news &amp; updates <ArrowRight size={16} /></Link>
          </section>
        )}

        <section className="training" id="training"><div className="training-pattern" /><div className="training-inner"><div className="training-icon"><GraduationCap size={27} strokeWidth={1.4} /></div><div className="training-copy"><Eyebrow light>Technical training</Eyebrow><h2>World-Class Technical Training, Delivered in Partnership with Mobius Institute</h2><p>We offer Classroom, onsite and virtual Training</p><div className="mobius-logos"><Image src="/pics/AEC-Logo-Asset-Matrix-Reliability-Centre-1-768x470.webp" alt="Asset Matrix Energy Reliability Centre logo" width={768} height={470} /><Image src="/pics/ATC-Logo-Asset-Matrix-Reliability-Centre-1-768x334.webp" alt="Asset Matrix Training Centre logo" width={768} height={334} /></div><div className="training-tags"><span>Vibration analysis</span><span>Infrared thermography</span><span>Ultrasound inspection</span><span>Motor diagnostics</span><span>Dissolved gas analysis</span></div></div><div className="training-side"><div className="training-image"><Image src="/pics/Training-1-768x482.webp" alt="Technical training session" width={768} height={482} /></div><a className="button button-accent" href="https://training.assetmatrixenergy.com/" target="_blank" rel="noopener noreferrer">Explore training <ArrowRight size={17} /></a></div></div><div className="training-foot"><span>Training delivered in partnership with</span><strong>Mobius Institute</strong></div></section>

        <section className="partners section-pad"><div className="partners-header"><div><Eyebrow>Technology partners</Eyebrow><h2>Global solutions.<br />Local engineering.</h2></div><p>We collaborate with established technology providers to deliver specialist engineering, measurement and reliability solutions.</p></div><div className="partner-marquee"><div className="partner-track"><div className="partner-track-set">{partnerRowA.map(({ src, name }) => <div className="partner-logo" key={src}><Image src={src} alt={name} fill /></div>)}</div><div className="partner-track-set" aria-hidden="true">{partnerRowA.map(({ src }) => <div className="partner-logo" key={src}><Image src={src} alt="" fill /></div>)}</div></div><div className="partner-track track-reverse"><div className="partner-track-set">{partnerRowB.map(({ src, name }) => <div className="partner-logo" key={src}><Image src={src} alt={name} fill /></div>)}</div><div className="partner-track-set" aria-hidden="true">{partnerRowB.map(({ src }) => <div className="partner-logo" key={src}><Image src={src} alt="" fill /></div>)}</div></div></div><p className="partner-note">Selected technology brands represented by Asset Matrix Energy</p></section>

        <section className="why section-pad" id="why-us"><div className="why-intro"><Eyebrow>Why Asset Matrix Energy</Eyebrow><h2>Engineering support<br />with a reliability focus.</h2><p>We combine regional experience with specialized tools and methods to support critical assets from installation through operation and maintenance.</p><a className="text-link" href="#contact">Meet our team <ArrowRight size={16} /></a></div><div className="why-grid">{reasons.map(([Icon, title, text], i) => { const ReasonIcon = Icon as typeof Activity; return <article className="why-item" key={title as string}><span className="why-number">0{i + 1}</span><ReasonIcon size={25} strokeWidth={1.5} /><h3>{title as string}</h3><p>{text as string}</p></article>; })}</div></section>

        <section className="final-cta" id="contact"><Image src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=2200&q=85" alt="Electricity transmission infrastructure" fill sizes="100vw" /><div className="cta-overlay" /><div className="cta-content"><Eyebrow light>Start a conversation</Eyebrow><h2>Let’s make your critical<br />assets more reliable.</h2><p>Speak with our engineering team about testing, diagnostics, reliability, instrumentation or maintenance solutions for your operation.</p><div className="hero-actions"><a className="button button-accent" href="mailto:info@assetmatrixenergy.com">Request a consultation <ArrowRight size={17} /></a><a className="button button-outline" href="mailto:info@assetmatrixenergy.com">Contact us <ArrowRight size={17} /></a></div></div><div className="cta-side-label">ASSET MATRIX ENERGY SERVICES LIMITED</div></section>
      </main>
      <Footer />
    </>
  );
}
