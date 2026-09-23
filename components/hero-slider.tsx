"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, ArrowLeft } from "@/components/icons";

const SLIDE_DURATION = 3000;

export interface HeroSlideData {
  headline: string;
  subtext: string;
  cta_label: string;
  cta_href: string;
  image: string;
}

const fallbackSlides: HeroSlideData[] = [
  {
    headline: "Keeping Critical Infrastructure Performing.",
    subtext: "We deliver specialized engineering, reliability and technical solutions for power, oil & gas, manufacturing, marine and other asset-intensive industries across Nigeria and Africa.",
    cta_label: "Explore our solutions",
    cta_href: "#solutions",
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=2400&q=85",
  },
  {
    headline: "Engineering Insights for Critical Assets.",
    subtext: "From electrical testing and diagnostics to instrumentation, condition monitoring and predictive maintenance, we provide the technical expertise and solutions needed to make smarter asset decisions.",
    cta_label: "Explore our solutions",
    cta_href: "#solutions",
    image: "/hero/Engineering Insights for Critical Assets.jpg",
  },
  {
    headline: "Maximize Asset Reliability. Minimize Downtime.",
    subtext: "Advanced condition monitoring, testing, diagnostics and reliability solutions that help industries detect problems early, improve equipment performance and protect critical assets.",
    cta_label: "Explore our solutions",
    cta_href: "#solutions",
    image: "/hero/EXXONMOBIL - Training.jpg",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow eyebrow-light"><span />{children}</div>;
}

export function HeroSlider({ slides: provided }: { slides: HeroSlideData[] }) {
  const slides = provided && provided.length ? provided : fallbackSlides;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);

  const next = useCallback(() => setIndex(i => (i + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setIndex(i => (i - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused) return;
    timer.current = window.setInterval(next, SLIDE_DURATION);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [paused, next]);

  const current = slides[Math.min(index, slides.length - 1)];
  const primaryCta = current.cta_label || "Explore our solutions";

  return (
    <section className="hero" id="home" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="hero-progress" key={index} />
      {slides.map((slide, i) => (
        <div className={`hero-slide ${i === index ? "active" : ""}`} key={i} aria-hidden={i !== index}>
          <Image className="hero-image" src={slide.image} alt={i === index ? slide.headline : ""} fill sizes="100vw" priority={i === 0} style={{ objectPosition: "center 53%" }} />
          <div className="hero-overlay" />
          <div className="hero-grid" />
        </div>
      ))}
      <div className="hero-content-wrap">
        <div className="hero-content page-wrap" key={index}>
          <Eyebrow>Engineering confidence. Asset by asset.</Eyebrow>
          <h1>{current.headline}</h1>
          {current.subtext && <p>{current.subtext}</p>}
          <div className="hero-actions">
            {current.cta_href && <a className="button button-accent" href={current.cta_href}>{primaryCta} <ArrowRight size={17} /></a>}
            <a className="button button-outline" href="#contact">Talk to an engineer <ArrowRight size={17} /></a>
          </div>
          <div className="hero-caption"><span className="caption-line" />Supporting the systems industry depends on</div>
        </div>
      </div>
      <div className="hero-index">{String(index + 1).padStart(2, "0")} <span>/</span> {String(slides.length).padStart(2, "0")}</div>
      <div className="hero-arrows" role="group" aria-label="Slide controls">
        <button type="button" className="hero-arrow" onClick={prev} aria-label="Previous slide"><ArrowLeft size={16} /></button>
        <button type="button" className="hero-arrow" onClick={next} aria-label="Next slide"><ArrowRight size={16} /></button>
      </div>
      <div className="hero-dots" role="tablist" aria-label="Choose slide">
        {slides.map((slide, i) => (
          <button type="button" className={`hero-dot ${i === index ? "active" : ""}`} key={i} onClick={() => setIndex(i)} aria-label={`Slide ${i + 1}`} aria-current={i === index} />
        ))}
      </div>
    </section>
  );
}