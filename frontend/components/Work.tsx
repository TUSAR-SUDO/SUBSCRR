import Image from "next/image";

export default function Work() {
  return (
    <section className="work" id="work" aria-label="Overview">
      <div className="lede">
        {/* Media side */}
        <div className="lede__media">
          <Image
            src="/assets/open-app.jpg"
            alt="Subscrr Overview screen on iPhone: monthly and yearly subscription totals"
            width={1800}
            height={1198}
            className="lede__photo"
          />
        </div>

        {/* Text side */}
        <div className="lede__text">
          <span className="eyebrow reveal-up">Overview</span>
          <h2 className="lede__heading reveal-up">
            See how much you<br />really spend.
          </h2>
          <p className="lede__desc reveal-up">
            Open the app and the sums are already done. How many you are paying
            for, what it costs per day, per month and a year, no spreadsheet in
            sight. The next charges line up below, nearest first, so nothing
            sneaks up on you.
          </p>
          <ul className="lede__features">
            <li>Live monthly &amp; yearly totals</li>
            <li>A countdown to every charge</li>
            <li>Any currency, converted at daily rates</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
