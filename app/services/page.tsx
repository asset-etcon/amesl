import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowUpRight, ArrowRight, Activity, Gauge, Zap, Waves, Thermometer, ScanLine, Move3D, Crosshair, Wrench, Settings2 } from "@/components/icons";

export const metadata: Metadata = {
  title: "Services | Asset Matrix Energy",
  description: "Condition monitoring, predictive maintenance, electrical testing and diagnostics, vibration analysis, thermography, laser alignment, calibration and more.",
};

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

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <main>
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
          <div className="service-grid">
            {services.map(({ icon: Icon, name, body }, index) => (
              <a className="service-card" href="/contact" key={name}>
                <div className="service-top"><span className="service-icon"><Icon size={21} strokeWidth={1.5} /></span><span className="service-number">{String(index + 1).padStart(2, "0")}</span></div>
                <h3>{name}</h3>
                <p>{body}</p>
                <span className="service-arrow"><ArrowRight size={17} /></span>
              </a>
            ))}
          </div>
        </section>

        <section className="pd-cta">
          <div className="eyebrow eyebrow-light">Looking for a specialist service?</div>
          <h2>Tell us what you need to measure, inspect or maintain — our engineering team will advise.</h2>
          <a className="button button-accent" href="mailto:info@assetmatrixenergy.com">Talk to our team <ArrowUpRight size={16} /></a>
        </section>
      </main>
      <Footer />
    </>
  );
}