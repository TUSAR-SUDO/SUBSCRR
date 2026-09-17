"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, LogIn, Sparkles } from "lucide-react";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { token, user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav${scrolled ? " is-scrolled" : ""}`} id="top">
      <Link href="/" className="nav__brand" aria-label="Subscrr home">
        <span className="nav__brand-icon">
          <Image src="/assets/Icon.png" alt="Subscrr" width={30} height={30} />
        </span>
        <span>Subscrr</span>
      </Link>

      <nav className="nav__links" aria-label="Primary">
        <Link href="#work">Overview</Link>
        <Link href="#ai">AI Spend</Link>
        <Link href="#calculator">Calculator</Link>
        <Link href="#pricing">Pricing</Link>
        <Link href="/blog">Blog</Link>
        <Link href="/dashboard">Web App</Link>
      </nav>

      <div className="flex items-center gap-2">
        {token ? (
          <Link
            href="/dashboard"
            className="btn btn--solid btn--sm flex items-center gap-1.5 !px-4"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
        ) : (
          <>
            {/* Tailwind-only wrapper: the .btn classes are unlayered CSS and
                would defeat a `hidden` utility on the link itself — this span
                makes the Sign In button genuinely hidden below `sm`. */}
            <span className="hidden sm:inline-flex items-center">
              <Link
                href="/login"
                className="btn btn--ghost btn--sm !px-3 items-center gap-1"
              >
                <span>Sign In</span>
              </Link>
            </span>
            <Link
              href="/dashboard"
              className="btn btn--solid btn--sm flex items-center gap-1.5 !px-4"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch App</span>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
