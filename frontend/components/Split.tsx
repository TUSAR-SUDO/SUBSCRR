import Image from "next/image";

export default function Split() {
  return (
    <div className="split-wrap">
      <section className="split" aria-label="Breakdown">
        <div className="split__text">
          <span className="eyebrow reveal-up">Breakdown</span>
          <h2 className="split__heading reveal-up">
            Per year.<br />Per month.<br />Per day.
          </h2>
          <p className="split__desc reveal-up">
            That &ldquo;cheap&rdquo; annual plan, divided by 365, is still a
            small daily habit. Subscrr shows the honest per-day number so you
            can decide if it&rsquo;s worth it.
          </p>
        </div>
        <div className="split__media">
          <Image
            src="/assets/Breakdown.jpg"
            alt="Sunlit portrait with pink flowers: calm, editorial Subscrr mood"
            width={1500}
            height={1125}
            className="split__photo"
          />
        </div>
      </section>
    </div>
  );
}
