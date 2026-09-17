import Image from "next/image";

export default function Threads() {
  return (
    <section className="threads" aria-label="Subscrr on Threads">
      <a
        href="https://threads.net/@subscrr"
        className="threads__block"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Subscrr on Threads, @subscrr"
      >
        <Image
          src="/assets/threads-block.webp"
          alt="A person holding an iPhone with the Subscrr profile on Threads"
          width={1220}
          height={815}
          className="threads__shot"
        />
        <div className="threads__overlay" aria-hidden="true" />
        <div className="threads__label">
          <div className="threads__ico">
            <Image
              src="/assets/threads-icon.png"
              alt="Threads"
              width={48}
              height={48}
            />
          </div>
          <p className="threads__name">@subscrr</p>
        </div>
      </a>
    </section>
  );
}
