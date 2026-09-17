import Image from "next/image";
import Link from "next/link";

const social = [
  { label: "Threads",   href: "https://threads.net/@subscrr" },
  { label: "Instagram", href: "https://instagram.com/subscrr" },
  { label: "Telegram",  href: "https://t.me/subscrr_app" },
  { label: "X",         href: "https://x.com/subscrr" },
  { label: "TikTok",    href: "https://www.tiktok.com/@subscrr" },
  { label: "YouTube",   href: "https://www.youtube.com/@subscrr_app" },
];

export default function Footer() {
  return (
    <footer className="footer" aria-label="Footer">
      {/* Big CTA */}
      <div className="footer__cta">
        <a
          href="https://apps.apple.com/app/id6757530448?ct=site_footer&mt=8"
          className="footer__cta-line"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download Subscrr to get Started"
        >
          <span>Download</span>
          <span className="footer__cta-s" aria-hidden="true">
            <Image src="/assets/Icon.png" alt="S" width={120} height={120} />
          </span>
          <span>ubscrr</span>
          <br />
          <span>to get Started</span>
        </a>

        <div className="footer__store">
          <a
            href="https://apps.apple.com/app/id6757530448?ct=site_badge&mt=8"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download on the App Store"
          >
            <Image
              src="/assets/appstore-badge.svg"
              alt="Download on the App Store"
              width={135}
              height={40}
              className="footer__badge"
            />
          </a>
          <p className="footer__fine">iPhone · iOS 17+ · Free to start</p>
        </div>
      </div>

      {/* Bottom row */}
      <div className="footer__row">
        <div className="footer__left">
          <Link href="/" className="footer__brand" aria-label="Subscrr home">
            <span className="footer__brand-icon">
              <Image src="/assets/Icon.png" alt="" width={28} height={28} aria-hidden="true" />
            </span>
            <span>Subscrr</span>
          </Link>
          <div className="footer__social">
            {social.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <nav className="footer__links" aria-label="Footer navigation">
          <a href="https://help.subscrr.app" target="_blank" rel="noopener noreferrer">
            Help Center
          </a>
          <a href="mailto:hi@subscrr.app">Contact us</a>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Use</Link>
          <span className="footer__copy">© 2026 Subscrr. All rights reserved.</span>
        </nav>
      </div>

      {/* Maidensail badge */}
      <div className="footer__listed">
        <a
          href="https://maidensail.com/startup/subscrr"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Subscrr on Maidensail"
        >
          <Image
            src="https://maidensail.com/badge/subscrr.svg"
            alt="Listed on Maidensail"
            width={190}
            height={44}
          />
        </a>
      </div>
    </footer>
  );
}
