import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowUpRight, MapPin, Phone, Mail } from "@/components/icons";
import { db } from "@/lib/db";
import { siteSettings } from "@/db/schema";

export const metadata: Metadata = {
  title: "Contact | Asset Matrix Energy",
  description: "Contact Asset Matrix Energy Services Limited in Lagos, Nigeria for testing, diagnostics, reliability, instrumentation and maintenance solutions.",
};

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings: Record<string, string> = {};
  try {
    const rows = await db.select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings);
    for (const row of rows) settings[row.key] = row.value;
  } catch {
  }

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
          <p className="eyebrow eyebrow-light">Contact us</p>
          <h1>Let’s talk about <em>your assets.</em></h1>
          <p>Our engineering team is ready to discuss testing, diagnostics, reliability, instrumentation or maintenance solutions for your operation.</p>
        </section>

        <section className="ab-offices">
          <div className="partners-header">
            <div>
              <p className="eyebrow"><span />Get in touch</p>
              <h2>Our offices in Lagos.</h2>
            </div>
            <p>Write, call or email us at either location — we respond within one business day.</p>
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
          <h2>Ready to discuss your testing, diagnostics or reliability needs?</h2>
          <a className="button button-accent" href={`mailto:${email}`}>Email our team <ArrowUpRight size={16} /></a>
        </section>
      </main>
      <Footer />
    </>
  );
}