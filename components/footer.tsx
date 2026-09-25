import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Phone, Mail } from "@/components/icons";
import { db } from "@/lib/db";
import { siteSettings } from "@/db/schema";

const socials: ReadonlyArray<[string, string]> = [
  ["Home", "/"],
  ["About", "/about"],
  ["Services", "/services"],
  ["Products", "/products"],
  ["Solutions", "/solutions"],
  ["Training", "https://training.assetmatrixenergy.com/"],
  ["Contact", "/contact"],
];

async function readSettings(): Promise<Record<string, string>> {
  const settings: Record<string, string> = {};
  try {
    const rows = await db.select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings);
    for (const row of rows) settings[row.key] = row.value;
  } catch {
    return settings;
  }
  return settings;
}

export async function Footer() {
  const settings = await readSettings();

  const company = settings.company_name ?? "Asset Matrix Energy Services Limited";
  const email = settings.email ?? "info@assetmatrixenergy.com";
  const phonePrimary = settings.phone_primary ?? "+234-7069176001";
  const phoneSecondary = settings.phone_secondary ?? "+234-8176153012";
  const addressHead = settings.address_head_office ?? "No. 23, House 13 Osogbo Street, Ogudu, Lagos, Nigeria.";
  const addressOps = settings.address_operations ?? "445 Herbert Macaulay Way, Bio-vaccine Compound, Yaba, Lagos, Nigeria.";
  const footerAbout = settings.footer_about ?? "Specialized engineering, industrial reliability and technical solutions for critical assets in Nigeria and Sub-Saharan Africa.";
  const trainingUrl = settings.training_url ?? "https://training.assetmatrixenergy.com/";
  const copyright = settings.copyright_text ?? company;

  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="brand brand-footer" href="/"><Image className="brand-logo" src="/Asset%20Matrix%20Energy%20logo.png" alt="Asset Matrix Energy" width={2044} height={375} /></Link>
          <p>{footerAbout}</p>
          <a className="footer-email" href={`mailto:${email}`}>{email} <ArrowUpRight size={14} /></a>
        </div>
        <div className="footer-nav">
          <h3>Explore</h3>
          {socials.map(([label, href]) => <a href={href} key={label}>{label}</a>)}
        </div>
        <div className="footer-contact">
          <h3>Get in touch</h3>
          <div><MapPin size={16} /><p><strong>Head Office</strong><br />{addressHead.split(",").slice(0, 3).join(",")}</p></div>
          <div><MapPin size={16} /><p><strong>Operational Office</strong><br />{addressOps}</p></div>
          <div><Phone size={16} /><p><a href="tel:+2347069176001">{phonePrimary}</a><br /><a href="tel:+2348176153012">{phoneSecondary}</a></p></div>
          <div><Mail size={16} /><a href={`mailto:${email}`}>{email}</a></div>
        </div>
        <div className="footer-training">
          <span>Professional development</span>
          <h3>Make reliability<br />part of your practice.</h3>
          <a href={trainingUrl} target="_blank" rel="noopener noreferrer">Visit training portal <ArrowUpRight size={14} /></a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {copyright}</span>
        <span>Nigeria <i /> Sub-Saharan Africa</span>
        <Link href="/">Back to top ↑</Link>
      </div>
    </footer>
  );
}
