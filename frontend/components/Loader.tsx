"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function Loader() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDone(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`loader${done ? " done" : ""}`} aria-hidden="true">
      <div className="loader__logo">
        <Image src="/assets/Icon.png" alt="" width={64} height={64} priority />
      </div>
    </div>
  );
}
