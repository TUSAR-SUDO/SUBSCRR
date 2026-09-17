"use client";
import { useEffect, useRef } from "react";

const words = [
  "You", "know", "roughly", "what", "you", "pay", "every", "month.",
  "Roughly", "the", "problem.", "All", "your", "subscriptions.", "We",
  "counted", "ours", "and", "cancelled", "three", "the", "same",
  "evening.", "Subscrr", "turns", "that", "quiet", "leak", "into",
  "one", "honest", "number", "you", "can", "act", "on.",
];

export default function Manifesto() {
  const sectionRef = useRef<HTMLElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height;
      const scrolled = Math.max(0, vh * 0.6 - rect.top);
      const progress = Math.min(1, scrolled / (total * 0.9));
      const lit = Math.floor(progress * words.length);

      wordRefs.current.forEach((el, i) => {
        if (!el) return;
        el.classList.toggle("is-on", i < lit);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="manifesto" ref={sectionRef}>
      <p className="manifesto__text">
        {words.map((w, i) => (
          <span
            key={i}
            className="manifesto__word"
            ref={(el) => { wordRefs.current[i] = el; }}
          >
            {w}{" "}
          </span>
        ))}
      </p>
    </section>
  );
}
