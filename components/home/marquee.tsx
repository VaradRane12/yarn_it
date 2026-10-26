const WORDS = [
  "Handmade",
  "Squishy",
  "One of one",
  "Made to order",
  "Loop by loop",
];

function Row({ reverse }: { reverse?: boolean }) {
  // Two identical halves so translateX(-50%) loops seamlessly.
  const half = WORDS.flatMap((w) => [w, "✺"]);
  return (
    <div className="flex overflow-hidden">
      <div
        className={`flex shrink-0 items-center gap-8 whitespace-nowrap pr-8 font-display text-[clamp(3rem,8vw,7rem)] uppercase leading-none ${
          reverse ? "animate-marquee-reverse" : "animate-marquee"
        }`}
      >
        {[...half, ...half].map((w, i) => (
          <span key={i} className={w === "✺" ? "text-butter" : ""}>
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Marquee() {
  return (
    <section aria-hidden className="relative z-10 -my-6 py-10">
      <div className="-rotate-2 border-y-[3px] border-ink bg-coral py-3 text-ink">
        <Row />
      </div>
      <div className="mt-[-1.25rem] rotate-1 border-y-[3px] border-ink bg-lilac py-3 text-ink">
        <Row reverse />
      </div>
    </section>
  );
}
