import Link from "next/link";

export default function NotFound() {
  return (
    <section className="knit flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl">🧶</p>
      <h1 className="mt-4 font-display text-[clamp(4rem,14vw,10rem)] uppercase leading-[0.85]">
        Lost the <span className="text-outline">thread</span>
      </h1>
      <p className="mt-4 max-w-md text-lg font-medium">
        This page unravelled or never existed. Let&apos;s get you back to the
        good stuff.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link href="/" className="btn">
          Take me home
        </Link>
        <Link href="/search" className="btn-ghost">
          Browse the shop
        </Link>
      </div>
    </section>
  );
}
