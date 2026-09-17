import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Subscrr: Subscription Tracker for iPhone and Apple Watch",
  description:
    "Track every subscription on iPhone and Apple Watch. See what you really pay per day, month and year, and get a nudge the day before you're charged.",
  openGraph: {
    title: "Subscrr: Subscription Tracker for iPhone and Apple Watch",
    description:
      "Track every subscription on iPhone and Apple Watch. See what you really pay per day, month and year, and get a nudge the day before you're charged.",
    url: "https://subscrr.app",
    siteName: "Subscrr",
    type: "website",
  },
  icons: { icon: "/assets/Icon.png" },
};

import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
