import type { Metadata } from "next";
import Grain from "@/components/Grain";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import AnimInit from "@/components/AnimInit";

export const metadata: Metadata = {
  title: "Blog — Subscrr",
  description:
    "Audits, psychology, and honest math about the subscriptions you barely notice. The Subscrr journal.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Grain />
      <AnimInit />
      <Nav />
      <main className="blog-main">{children}</main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
