export default function Widgets() {
  return (
    <section className="widgets-section" aria-label="Premium · Widgets">
      <div className="widgets__inner">
        <div className="widgets__text">
          <span className="widgets__eyebrow">Premium · Widgets</span>
          <h2 className="widgets__heading reveal-up">
            Your next payment,<br />right on the Home Screen.
          </h2>
          <p className="widgets__desc reveal-up">
            What is due next, on the Home and Lock Screen. You find out without
            opening the app, which is the highest praise an app can get. Comes
            with Premium.
          </p>
        </div>
        <div className="widgets__media">
          <div className="widgets__device-wrap" aria-label="Subscrr widget on the iPhone Home Screen">
            <div className="widgets__phone">
              <video
                src="/assets/widgets-device6.mp4"
                autoPlay
                muted
                loop
                playsInline
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
