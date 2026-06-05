// src/app/(marketing)/page.tsx

import Navbar from "@/components/marketing/Navbar";
import Hero from "@/components/marketing/Hero";
import Problem from "@/components/marketing/Problem";
import VolunteerControl from "@/components/marketing/VolunteerControl";
import HowItWorks from "@/components/marketing/HowItWorks";
import Features from "@/components/marketing/Features";
import Pricing from "@/components/marketing/Pricing";
import Audience from "@/components/marketing/Audience";
import FAQ from "@/components/marketing/FAQ";
import CTA from "@/components/marketing/CTA";
import Footer from "@/components/marketing/Footer";

export default function LandingPage() {
  return (
    <main className="bg-[#091510] text-white overflow-x-hidden">
      <Navbar />

      <Hero />

      <Problem />

      <VolunteerControl />

      <HowItWorks />

      <Features />

      <Pricing />

      <Audience />

      <FAQ />

      <CTA />

      <Footer />

    </main>
  );
}