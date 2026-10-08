import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoWorkspace } from "@/components/panel/editor/DemoWorkspace";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Demostración del editor" };

/** Disponible mientras Supabase no esté configurado (y siempre en desarrollo local) */
export default function DemoPage() {
  if (isSupabaseConfigured && process.env.NODE_ENV !== "development") notFound();
  return <DemoWorkspace />;
}
