"use client";
import { useEffect } from "react";

export default function AnimInit() {
  useEffect(() => {
    let lenis: import("lenis").default | null = null;

    const init = async () => {
      const { default: Lenis } = await import("lenis");
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");

      gsap.registerPlugin(ScrollTrigger);

      // Smooth scroll
      lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis?.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);

      // Reveal-up animations
      const revealEls = document.querySelectorAll<HTMLElement>(".reveal-up");
      revealEls.forEach((el) => {
        gsap.fromTo(
          el,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          }
        );
      });

      // Magnetic buttons
      const magneticEls = document.querySelectorAll<HTMLElement>(".magnetic");
      magneticEls.forEach((el) => {
        const onMove = (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = (e.clientX - cx) * 0.3;
          const dy = (e.clientY - cy) * 0.3;
          gsap.to(el, { x: dx, y: dy, duration: 0.3, ease: "power2.out" });
        };
        const onLeave = () => {
          gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,0.4)" });
        };
        el.addEventListener("mousemove", onMove);
        el.addEventListener("mouseleave", onLeave);
      });
    };

    init();

    return () => {
      lenis?.destroy();
    };
  }, []);

  return null;
}
