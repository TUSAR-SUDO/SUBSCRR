"use client";
import { useState } from "react";

const items = [
  {
    q: "Do I have to connect my bank?",
    a: "Never. Subscrr doesn't touch your bank. You add subscriptions yourself. Takes a minute, and nothing sensitive ever leaves your device.",
  },
  {
    q: "Where is my data stored?",
    a: "Your subscriptions sit in your own private iCloud, tied to your Apple ID and synced across your devices. We never see it.",
  },
  {
    q: "Do you track me?",
    a: "Not your money. We use PostHog to count anonymous events like \"opened the app\" or \"added a subscription\". No personal data, no financial data. Full details in our privacy policy.",
  },
  {
    q: "What do I get for free?",
    a: "Up to six subscriptions with full breakdowns, reminders, custom icons and iCloud sync. When six stops being enough, Premium is there.",
  },
  {
    q: "How does AI Spend handle my receipts?",
    a: "AI reads the numbers and forgets the picture. Images are analysed, values extracted, photo discarded. Nothing is stored on our servers.",
  },
  {
    q: "Can I cancel Premium anytime?",
    a: "Yes, in two taps: it's a standard App Store subscription. Your free plan keeps working. No hard feelings.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (i: number) => setOpen(open === i ? null : i);

  return (
    <section className="faq" aria-label="FAQ">
      <div className="faq__head">
        <span className="eyebrow reveal-up">FAQ</span>
        <h2 className="faq__heading reveal-up">
          Good<br />questions.
        </h2>
      </div>
      <ul className="faq__list" role="list">
        {items.map((item, i) => (
          <li
            key={i}
            className={`faq__item${open === i ? " is-active" : ""}`}
            onClick={() => toggle(i)}
          >
            <div className="faq__q" role="button" aria-expanded={open === i}>
              <span>{item.q}</span>
              <span className="faq__icon" aria-hidden="true">+</span>
            </div>
            <div className="faq__a">{item.a}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
