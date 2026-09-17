import Image from "next/image";

export default function Reminder() {
  return (
    <section className="reminder" aria-label="Reminders">
      <span className="eyebrow eyebrow--c reveal-up">Reminders</span>
      <h2 className="reminder__heading reveal-up">
        Never get<br />surprise-charged<br />again.
      </h2>
      <p className="reminder__desc reveal-up">
        The day before the money leaves, a gentle tap on the shoulder. So you
        renew because you meant to, not because you forgot it was there.
      </p>

      <div className="reminder__bg-wrap">
        <Image
          src="/assets/reminder-bg.webp"
          alt=""
          width={2000}
          height={1332}
          className="reminder__bg"
          aria-hidden="true"
        />
      </div>

      <Image
        src="/assets/push-multiple.webp"
        alt="iOS notification: Subscription Reminder: Tomorrow is your Fitness App renewal"
        width={1858}
        height={432}
        className="reminder__push reveal-up"
      />
    </section>
  );
}
