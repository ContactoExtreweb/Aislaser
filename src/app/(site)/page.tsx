import type { Metadata } from "next";
import { CtaBand } from "@/components/site/CtaBand";
import { Audience } from "@/components/site/home/Audience";
import { FeaturedProjects } from "@/components/site/home/FeaturedProjects";
import { Hero } from "@/components/site/home/Hero";
import { Intro } from "@/components/site/home/Intro";
import { PolyureaSection } from "@/components/site/home/PolyureaSection";
import { Process } from "@/components/site/home/Process";
import { ReferenceMarquee } from "@/components/site/home/ReferenceMarquee";
import { ServicesBento } from "@/components/site/home/ServicesBento";
import { VideoSection } from "@/components/site/home/VideoSection";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <ReferenceMarquee />
      <Intro />
      <ServicesBento />
      <PolyureaSection />
      <Process />
      <Audience />
      <FeaturedProjects />
      <VideoSection />
      <CtaBand />
    </>
  );
}
