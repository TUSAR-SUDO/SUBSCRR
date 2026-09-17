"use client";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="hero" aria-label="Hero">
      {/* Left — copy */}
      <div className="hero__content">
        <h1 className="hero__title hero__title--long">
          All your subscriptions. And what they really cost.
        </h1>
        <p className="hero__lead">
          Everything you pay for in one place, the honest total per day, month
          and year, and a quiet nudge the day before the money leaves.
        </p>
        <div className="hero__cta flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="btn btn--solid btn--lg flex items-center gap-2 !bg-[#FF2500]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Web App</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://apps.apple.com/app/id6757530448?ct=site_hero&mt=8"
            className="btn btn--ghost btn--lg"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download on the App Store"
          >
            Download iOS App
          </a>
        </div>
      </div>

      {/* Right — device */}
      <div className="hero__stage">
        <div className="hero__device">
          {/* Screen behind the frame */}
          <div className="hero__screen">
            <video
              src="/assets/hero-screen.mp4"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
            />
          </div>
          {/* Frame on top */}
          <Image
            src="/assets/hero-frame.png"
            alt="Subscrr on iPhone"
            width={1350}
            height={2760}
            className="hero__bezel"
            priority
          />

          {/* QR code floating card */}
          <div className="hero__qr hero__qr-glass">
            <Link
              href="https://apps.apple.com/app/id6757530448?ct=site_hero_qr&mt=8"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Scan to download Subscrr on the App Store"
            >
              <Image
                src="/assets/qr-appstore.svg"
                alt="QR code — download Subscrr on the App Store"
                width={312}
                height={312}
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
