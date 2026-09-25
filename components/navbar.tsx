"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "@/components/icons";

const links = [["Home", "/"], ["About", "/about"], ["Services", "/services"], ["Products", "/products"], ["Solutions", "/solutions"], ["Training", "https://training.assetmatrixenergy.com/"], ["News", "/news"], ["Contact", "/contact"]];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return <header className={`site-header ${scrolled ? "header-scrolled" : ""}`}><Link className="brand" href="/" aria-label="Asset Matrix Energy home"><Image className="brand-logo" src="/Asset%20Matrix%20Energy%20logo.png" alt="Asset Matrix Energy" width={2044} height={375} priority /></Link><button className="menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>{open ? <X /> : <Menu />}</button><nav className={open ? "main-nav nav-open" : "main-nav"} aria-label="Main navigation">{links.map(([label, href]) => <a href={href} key={label} onClick={() => setOpen(false)}>{label}</a>)}</nav></header>;
}
