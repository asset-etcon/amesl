import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowUpRight } from "@/components/icons";

export const metadata: Metadata = {
  title: "News & Updates | Asset Matrix Energy",
  description: "Latest updates from Asset Matrix Energy — new products, partnerships, training and company announcements.",
};

const updates = [
  {
    chip: "Catalogue",
    title: "New online product catalogue",
    text: "Browse specialist brands by logo on the new AMESL catalogue, with detailed product pages and instant quote requests.",
  },
  {
    chip: "Training",
    title: "Training partnership with Mobius Institute",
    text: "Classroom, onsite and virtual reliability training delivered in partnership with Mobius Institute — from vibration analysis to motor diagnostics.",
  },
  {
    chip: "Distribution",
    title: "Representing 29 technology brands",
    text: "Featured brands spanning electrical testing, condition monitoring, NDT and process instrumentation across Nigeria and Sub-Saharan Africa.",
  },
];

export default function NewsPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="ab-hero">
          <p className="eyebrow eyebrow-light">News & updates</p>
          <h1>The latest from <em>AMESL.</em></h1>
          <p>New products, partnerships, training and company announcements — all in one place.</p>
        </section>

        <section className="so-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span />Latest updates</p>
              <h2>What’s new at Asset<br />Matrix Energy.</h2>
            </div>
            <p>Keep up with developments across our products, services and training.</p>
          </div>
          <div className="nw-list">
            {updates.map((u) => (
              <article className="nw-card" key={u.title}>
                <span className="nw-chip">{u.chip}</span>
                <h3>{u.title}</h3>
                <p>{u.text}</p>
              </article>
            ))}
          </div>
          <p className="nw-more">More updates are on the way — in the meantime, ask us anything.<a href="mailto:info@assetmatrixenergy.com">Get in touch <ArrowUpRight size={14} /></a></p>
        </section>

        <section className="pd-cta">
          <div className="eyebrow eyebrow-light">Don’t miss the next update</div>
          <h2>Questions about our products, services or training?</h2>
          <a className="button button-accent" href="mailto:info@assetmatrixenergy.com">Email our team <ArrowUpRight size={16} /></a>
        </section>
      </main>
      <Footer />
    </>
  );
}