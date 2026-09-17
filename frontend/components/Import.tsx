import Image from "next/image";

const steps = [
  "Open Subscriptions",
  "Take a screenshot",
  "Drop it in here",
];

export default function Import() {
  return (
    <section className="import-section" id="import" aria-label="Setup · One screenshot">
      <div className="import__text">
        <span className="eyebrow reveal-up">Setup · One Screenshot</span>
        <h2 className="import__heading reveal-up">
          Import what<br />Apple already<br />charges you for.
        </h2>
        <p className="import__desc reveal-up">
          Everything on your Apple ID sits on one screen. Screenshot it, drop
          it in, and we read the numbers so you don&rsquo;t have to type them.
        </p>
        <ol className="import__steps">
          {steps.map((step, i) => (
            <li key={step} className="import__step reveal-up">
              <span className="import__step-num">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <div className="import__media">
        <Image
          src="/assets/import-appstore.jpg"
          alt="The Import from App Store screen in Subscrr: three steps to bring in your Apple subscriptions"
          width={1300}
          height={1702}
          className="import__shot reveal-up"
        />
      </div>
    </section>
  );
}
