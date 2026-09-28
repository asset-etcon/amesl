import type { SVGProps } from "react";
import {
  Activity,
  Balance,
  Crosshair,
  Gauge,
  Motor,
  ScanLine,
  ShieldCheck,
  Sliders,
  Thermometer,
  Ultrasound,
  Waves,
  Wrench,
  Zap,
} from "@/components/icons";
import { resolveServiceIcon, type ServiceIconKey } from "@/lib/service-icons";

type IconComponent = (props: SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }) => React.JSX.Element;

/**
 * The stored key from `services.icon` to the component that draws it.
 *
 * The value in the database is admin-editable, so it is only ever used as a
 * lookup here — never interpolated into markup. `resolveServiceIcon` narrows an
 * unrecognised or missing value to the default first, so this map is total and
 * the render below never has to handle a miss.
 */
const ICONS: Record<ServiceIconKey, IconComponent> = {
  motor: Motor,
  thermometer: Thermometer,
  ultrasound: Ultrasound,
  crosshair: Crosshair,
  scanline: ScanLine,
  balance: Balance,
  waves: Waves,
  sliders: Sliders,
  wrench: Wrench,
  zap: Zap,
  activity: Activity,
  gauge: Gauge,
  shield: ShieldCheck,
};

export function ServiceIcon({ name, size = 21, strokeWidth = 1.5 }: { name: string | null | undefined; size?: number; strokeWidth?: number }) {
  const Icon = ICONS[resolveServiceIcon(name)];
  return <Icon size={size} strokeWidth={strokeWidth} />;
}
