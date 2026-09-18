import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { AudienceStrip } from "@/components/landing/AudienceStrip";
import { ArtGallery } from "@/components/landing/ArtGallery";
import { ToolShowcase } from "@/components/landing/ToolShowcase";
import { ChurchSection } from "@/components/landing/ChurchSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { FinalCta } from "@/components/landing/FinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <Hero />
      <AudienceStrip />
      <ArtGallery />
      <ToolShowcase />
      <ChurchSection />
      <ComparisonSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}
