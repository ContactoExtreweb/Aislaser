import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuoteWorkspace } from "@/components/panel/presupuestos/QuoteWorkspace";
import { getBranding } from "@/lib/dossier/branding";
import { LINE_COLUMNS, QUOTE_COLUMNS, hydrateQuote, quoteNumber } from "@/lib/presupuestos/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/panel/presupuestos/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Presupuesto" };
  const supabase = await getSupabaseServer();
  const { data } = await supabase.from("presupuestos").select("anio, numero").eq("id", id).maybeSingle();
  return { title: data ? `Presupuesto ${quoteNumber(data)}` : "Presupuesto" };
}

export default async function EditQuotePage({ params }: PageProps<"/panel/presupuestos/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await getSupabaseServer();
  const [{ data: quote }, { data: lines }, { source }] = await Promise.all([
    supabase.from("presupuestos").select(QUOTE_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("presupuesto_partidas").select(LINE_COLUMNS).eq("presupuesto_id", id).order("orden"),
    getBranding(supabase),
  ]);
  if (!quote) notFound();

  return <QuoteWorkspace key={`${quote.id}:${quote.updated_at}`} initial={hydrateQuote(quote, lines ?? [])} brandingSource={source} />;
}
