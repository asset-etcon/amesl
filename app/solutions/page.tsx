import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { WhatsappLink } from "@/components/public/whatsapp-link";
import { ArrowRight, Zap, Activity, Gauge, Settings2, Move3D, GraduationCap } from "@/components/icons";

export const metadata: Metadata = {
  title: "Solutions",
  alternates: { canonical: "/solutions" },
  description: "Diagnostic technologies, engineering methods and process instrumentation to help operators make informed decisions about critical assets.",
};

/** Required because the enquiry CTAs read `site_settings`; without it the number is baked at build time. */
export const dynamic = "force-dynamic";

const solutions = [
  { icon: Zap, title: "Electrical testing and diagnostics", text: "Prove the condition of electrical systems and equipment with specialist test technology." },
  { icon: Move3D, title: "Transformer and motor diagnostics", text: "Apply proven methods to understand the health of transformers and rotating machines." },
  { icon: Activity, title: "Condition monitoring and reliability engineering", text: "Build a picture of asset health through structured measurement and analysis." },
  { icon: Gauge, title: "Instrumentation and process monitoring", text: "Connect process insight with operational control through reliable field instruments." },
  { icon: Settings2, title: "Predictive and preventive maintenance", text: "Plan maintenance around measured equipment condition instead of fixed schedules." },
  { icon: GraduationCap, title: "Technical training and skills transfer", text: "Build local capability through classroom, onsite and virtual reliability training." },
];

export default function SolutionsPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="ab-hero">
          <p className="eyebrow eyebrow-light">Technical solutions</p>
          <h1>Advanced technologies for <em>smarter asset decisions.</em></h1>
          <p>We bring diagnostic technologies, engineering methods and process instrumentation together to help operators make informed decisions about critical assets.</p>
        </section>

        <section className="why section-pad">
          <div className="why-intro">
            <p className="eyebrow"><span />How we help</p>
            <h2>One partner, end to end.</h2>
            <p>From the first measurement to long-term reliability strategy, we combine specialist tools, engineering method and local field capability.</p>
            <WhatsappLink className="text-link" message="Hi, I would like to talk to your team about solutions for our assets. I reached you via the Solutions page." fallbackHref="mailto:info@assetmatrixenergy.com">Talk to our team <ArrowRight size={16} /></WhatsappLink>
          </div>
          <div className="why-grid">
            {solutions.map(({ icon: Icon, title, text }, i) => (
              <article className="why-item" key={title}>
                <span className="why-number">0{i + 1}</span>
                <Icon size={25} strokeWidth={1.5} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pd-cta">
          <div className="eyebrow eyebrow-light">Ready to act on your asset data?</div>
          <h2>Speak with our engineering team about a solution for your operation.</h2>
          <WhatsappLink className="button button-accent" message="Hi, I would like to request a consultation. I reached you via the Solutions page." fallbackHref="mailto:info@assetmatrixenergy.com">Request a consultation <ArrowRight size={16} /></WhatsappLink>
        </section>
      </main>
      <Footer />
    </>
  );
}