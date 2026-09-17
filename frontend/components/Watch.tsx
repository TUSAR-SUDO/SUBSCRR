import Image from "next/image";

export default function Watch() {
  return (
    <section className="watch-section" id="watch" aria-label="Apple Watch">
      <div className="watch__text">
        <span className="eyebrow eyebrow--c reveal-up">Apple Watch</span>
        <h2 className="watch__heading reveal-up">
          The next charge,<br />on your wrist.
        </h2>
        <p className="watch__desc reveal-up">
          A complication on the watch face shows what is due next and what it
          costs. Pick its colour right on the watch. The daily affirmation
          lives there too.
        </p>
      </div>
      <div className="watch__grid">
        <div className="watch__card">
          <video
            src="/assets/watch-face.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-label="A raised wrist and Subscrr showing the next charge: ChatGPT Plus on 21 Aug"
          />
        </div>
        <div className="watch__card">
          <Image
            src="/assets/watch-face.jpg"
            alt="Subscrr complication on an Apple Watch face: Netflix Premium due 11 Aug"
            width={960}
            height={1280}
          />
        </div>
      </div>
    </section>
  );
}
