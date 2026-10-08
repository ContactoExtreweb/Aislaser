import { Anchor, Droplets, Drill, Layers, SprayCan, Thermometer, type LucideProps } from "lucide-react";
import type { Service } from "@/content/services";

const icons = {
  droplets: Droplets,
  spray: SprayCan,
  thermometer: Thermometer,
  drill: Drill,
  layers: Layers,
  anchor: Anchor,
} satisfies Record<Service["icon"], unknown>;

export function ServiceIcon({ name, ...props }: { name: Service["icon"] } & LucideProps) {
  const Icon = icons[name];
  return <Icon strokeWidth={1.6} {...props} />;
}
