const badges = [
  { icon: "☁️", label: "iCloud private sync" },
  { icon: "🚫", label: "No ads in the app" },
  { icon: "🔒", label: "No data sold" },
  { icon: "👤", label: "Anonymous stats only" },
];

export default function Privacy() {
  return (
    <section className="privacy" id="privacy" aria-label="Privacy">
      <span className="privacy__label">Private by Design.</span>
      <h2 className="privacy__title reveal-up">
        What you pay for lives in your own iCloud, not on our servers.
        We never see it, we never sell it, and there are no ads in the
        app. We count anonymous taps to know which screen to fix next.
        That is the entire list.
      </h2>
      <div className="privacy__badges">
        {badges.map((b) => (
          <span key={b.label} className="privacy__badge">
            <span aria-hidden="true">{b.icon}</span>
            {b.label}
          </span>
        ))}
      </div>
    </section>
  );
}
