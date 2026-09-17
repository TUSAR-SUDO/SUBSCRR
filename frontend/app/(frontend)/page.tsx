import Grain from "@/components/Grain";
import Loader from "@/components/Loader";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Promo from "@/components/Promo";
import Work from "@/components/Work";
import Split from "@/components/Split";
import LiveCalculator from "@/components/LiveCalculator";
import Reminder from "@/components/Reminder";
import Import from "@/components/Import";
import AI from "@/components/AI";
import Widgets from "@/components/Widgets";
import Watch from "@/components/Watch";
import Manifesto from "@/components/Manifesto";
import Privacy from "@/components/Privacy";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import Threads from "@/components/Threads";
import WaitlistLeadSection from "@/components/WaitlistLeadSection";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import AnimInit from "@/components/AnimInit";

export default function Home() {
  return (
    <>
      <Loader />
      <Grain />
      <AnimInit />
      <Nav />
      <main>
        <Hero />
        <Promo />
        <Work />
        <Split />
        <LiveCalculator />
        <Reminder />
        <Import />
        <AI />
        <Widgets />
        <Watch />
        <Manifesto />
        <Privacy />
        <Pricing />
        <FAQ />
        <WaitlistLeadSection />
        <Threads />
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
