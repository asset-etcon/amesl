import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number };
function icon(children: React.ReactNode) {
  return function Icon({ size = 20, strokeWidth = 1.7, ...props }: IconProps) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
  };
}

export const ArrowRight = icon(<><path d="M4 12h15"/><path d="m13 5 7 7-7 7"/></>);
export const ArrowLeft = icon(<><path d="M20 12H5"/><path d="m11 5-7 7 7 7"/></>);
export const ArrowUpRight = icon(<><path d="M7 17 17 7"/><path d="M7 7h10v10"/></>);
export const ArrowDown = icon(<><path d="M12 4v15"/><path d="m5 13 7 7 7-7"/></>);
export const Menu = icon(<><path d="M4 7h16M4 12h16M4 17h16"/></>);
export const X = icon(<><path d="m6 6 12 12M18 6 6 18"/></>);
export const Activity = icon(<><path d="M3 12h4l3-8 4 16 3-8h4"/></>);
export const Gauge = icon(<><path d="M4.5 19a9 9 0 1 1 15 0"/><path d="m12 13 4-4M7 18h10"/></>);
export const ScanLine = icon(<><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M4 12h16"/></>);
export const Radio = icon(<><circle cx="12" cy="12" r="2"/><path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14M8 8a5.5 5.5 0 0 0 0 8M16 8a5.5 5.5 0 0 1 0 8"/></>);
export const GraduationCap = icon(<><path d="m2 10 10-5 10 5-10 5-10-5Z"/><path d="M6 12v5c4 3 8 3 12 0v-5M22 10v6"/></>);
export const Zap = icon(<><path d="m13 2-3 8H5l6 12 3-9h5L13 2Z"/></>);
export const Waves = icon(<><path d="M2 8c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 14c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 20c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/></>);
export const Move3D = icon(<><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="M12 12 4 7.5M12 12v9M12 12l8-4.5"/></>);
export const Thermometer = icon(<><path d="M14 14.8V5a3 3 0 0 0-6 0v9.8a5 5 0 1 0 6 0Z"/><path d="M11 11v7"/></>);
export const Crosshair = icon(<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3"/></>);
export const Settings2 = icon(<><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/></>);
export const Cable = icon(<><path d="M8 7v5a4 4 0 0 0 8 0V7"/><path d="M6 3v4h4V3M14 3v4h4V3M12 16v5"/></>);
export const FlaskConical = icon(<><path d="M9 3h6M10 3v7l-5 9a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2l-5-9V3M8 15h8"/></>);
export const ShieldCheck = icon(<><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>);
export const Globe2 = icon(<><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></>);
export const Wrench = icon(<><path d="M14.7 6.3a5 5 0 0 0-6.9 6.9L3 18a2 2 0 0 0 3 3l4.8-4.8a5 5 0 0 0 6.9-6.9L14 13l-3-3 3.7-3.7Z"/></>);
export const ClipboardCheck = icon(<><rect x="5" y="4" width="14" height="17" rx="1"/><path d="M9 4V2h6v2M8 13l2.5 2.5L16 10"/></>);
export const MapPin = icon(<><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>);
export const Phone = icon(<><path d="M5 3h4l2 5-2.5 1.5a15 15 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2C10 20 4 14 3 5a2 2 0 0 1 2-2Z"/></>);
export const Mail = icon(<><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 7 9 6 9-6"/></>);
export const Download = icon(<><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>);
export const FileText = icon(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></>);
export const Calculator = icon(<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h.01M12.5 11h.01M16 11h.01M9 15h.01M12.5 15h.01M16 15h.01M12.5 19h.01M16 19h.01"/></>);
