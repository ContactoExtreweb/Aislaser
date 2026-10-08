import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoWorkspace } from "@/components/panel/editor/DemoWorkspace";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Demostración del editor" };

/** Sólo disponible mientras Supabase no esté configurado */
export default function DemoPage() {
  if (isSupabaseConfigured) notFound();
  return <DemoWorkspace />;
}
