"use client";
import { useState } from "react";

const freeFeatures = [
  "Up to 6 subscriptions",
  "Per day / month / year breakdowns",
  "Renewal reminders",
  "Custom icons & colours",
  "iCloud sync & privacy",
];

const proFeatures = [
  { bold: "Unlimited", rest: " subscriptions" },
  { bold: "AI Spend", rest: ": scan receipts & statements" },
  { bold: "Widgets", rest: " for Home and Lock Screen" },
  { bold: "", rest: "Personal calculation categories" },
  { bold: "", rest: "Everything in Free" },
  { bold: "", rest: "Support an app with zero ads" },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  const monthlyPrice = "$7.99";
  const yearlyPrice = "$2.49";

  return (
    <section className="pricing" id="pricing" aria-label="Pricing">
      <div className="pricing__head">
        <span className="eyebrow reveal-up">Pricing</span>
        <h2 className="pricing__heading reveal-up">
          Free to start.<br />Premium when you grow.
        </h2>
      </div>

      {/* Toggle */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "40px" }}>
        <div className="pricing__toggle" role="tablist" aria-label="Billing period">
          <button
            role="tab"
            aria-selected={!yearly}
            className={`toggle__btn${!yearly ? " is-active" : ""}`}
            onClick={() => setYearly(false)}
          >
            Monthly
          </button>
          <button
            role="tab"
            aria-selected={yearly}
            className={`toggle__btn${yearly ? " is-active" : ""}`}
            onClick={() => setYearly(true)}
          >
            Yearly
            <span className="toggle__badge">−69%</span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="plans">
        {/* Free */}
        <article className="plan card-hover">
          <header>
            <p className="plan__name">Free</p>
          </header>
          <p style={{ fontSize: 14, color: "#7C766C", marginBottom: 24 }}>
            Enough to see the whole picture.
          </p>
          <ul className="plan__features">
            {freeFeatures.map((f) => (
              <li key={f} className="plan__feature">
                <span className="plan__feature-dot" />
                {f}
              </li>
            ))}
          </ul>
          <a
            href="https://apps.apple.com/app/id6757530448?ct=site_plan_free&mt=8"
            className="btn btn--ghost btn--block"
            target="_blank"
            rel="noopener noreferrer"
          >
            Start free
          </a>
        </article>

        {/* Premium */}
        <article className="plan plan--pro card-hover">
          <span className="plan__flag">Most popular</span>
          <header>
            <p className="plan__name">Premium</p>
            <div className="plan__price">
              <span className="plan__amt">
                {yearly ? yearlyPrice : monthlyPrice}
              </span>
              <span className="plan__per">/mo</span>
            </div>
          </header>
          <p className="plan__billing">
            {yearly
              ? "Billed yearly. Cancel anytime."
              : "Billed monthly. Cancel anytime."}
          </p>
          <ul className="plan__features">
            {proFeatures.map((f, i) => (
              <li key={i} className="plan__feature">
                <span className="plan__feature-dot" />
                {f.bold ? <strong>{f.bold}</strong> : null}
                {f.rest}
              </li>
            ))}
          </ul>
          <a
            href="https://apps.apple.com/app/id6757530448?ct=site_plan_premium&mt=8"
            className="btn btn--rise btn--block"
            target="_blank"
            rel="noopener noreferrer"
          >
            Go Premium
          </a>
        </article>
      </div>
    </section>
  );
}
