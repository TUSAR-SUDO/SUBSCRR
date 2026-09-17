"use client";
import { useEffect, useRef } from "react";

export default function AI() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      size: number; alpha: number;
    };

    const particles: Particle[] = [];
    const count = 280;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,37,0,${p.alpha})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="ai-section" id="ai" aria-label="Premium · AI Spend">
      <div className="ai__card">
        <div className="ai__text">
          <span className="ai__eyebrow">Premium · AI Spend</span>
          <h2 className="ai__heading">
            Snap a receipt.<br />Let AI do the math.
          </h2>
          <p className="ai__desc">
            Typing receipts is a chore. Snapping one is a tap. The AI pulls
            out the numbers, files them into categories, and throws the photo
            away.
          </p>
          <div className="ai__particle-wrap">
            <canvas
              ref={canvasRef}
              className="particle-canvas"
              width={770}
              height={120}
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="ai__media">
          <div className="ai__phone" aria-label="AI Spend analyzing a receipt on iPhone">
            <video
              src="/assets/ai-device.mp4"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
