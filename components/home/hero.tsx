"use client";

import { gsap } from "gsap";
import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { ShowcaseItem, YARN_COLORS } from "./types";

const STICKER_SPOTS = [
  "left-[4%] top-[14%] w-[36vw] sm:top-[18%] sm:w-[26vw] max-w-[260px] -rotate-6",
  "right-[5%] top-[24%] w-[30vw] sm:top-[12%] sm:w-[22vw] max-w-[230px] rotate-6",
  "left-[8%] bottom-[24%] w-[28vw] sm:bottom-[20%] sm:w-[18vw] max-w-[210px] rotate-3",
  "right-[6%] bottom-[30%] w-[32vw] sm:bottom-[22%] sm:w-[20vw] max-w-[250px] -rotate-3",
];

export default function Hero({ items }: { items: ShowcaseItem[] }) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.from("[data-hero-char]", {
          yPercent: 120,
          rotate: 8,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.04,
        });
        gsap.from("[data-sticker]", {
          scale: 0,
          rotate: -30,
          duration: 1,
          ease: "back.out(1.8)",
          stagger: 0.12,
          delay: 0.4,
        });
        gsap.from("[data-hero-fade]", { opacity: 0, y: 20, delay: 0.9 });

        // Stickers drift apart and the headline sinks as you scroll away.
        gsap.utils.toArray<HTMLElement>("[data-sticker]").forEach((el, i) => {
          gsap.to(el, {
            y: (i % 2 ? -1 : 1) * 160,
            x: (i < 2 ? -1 : 1) * 60,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              scrub: true,
            },
          });
        });
        gsap.to("[data-hero-title]", {
          yPercent: 30,
          scale: 0.92,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            scrub: true,
          },
        });

        // Stickers lean toward the cursor.
        const movers = gsap.utils
          .toArray<HTMLElement>("[data-sticker-inner]")
          .map((el, i) => ({
            x: gsap.quickTo(el, "x", { duration: 0.8, ease: "power3" }),
            y: gsap.quickTo(el, "y", { duration: 0.8, ease: "power3" }),
            depth: 18 + i * 10,
          }));
        const onMove = (e: PointerEvent) => {
          const dx = e.clientX / window.innerWidth - 0.5;
          const dy = e.clientY / window.innerHeight - 0.5;
          movers.forEach((m) => {
            m.x(dx * m.depth * 2);
            m.y(dy * m.depth * 2);
          });
        };
        window.addEventListener("pointermove", onMove);
        return () => window.removeEventListener("pointermove", onMove);
      },
      root,
    );
    return () => mm.revert();
  }, []);

  const line = (text: string, className = "") => (
    <span className={`flex justify-center overflow-hidden ${className}`}>
      {text.split("").map((ch, i) => (
        <span key={i} data-hero-char className="inline-block">
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );

  return (
    <section
      ref={root}
      className="knit relative flex min-h-[calc(100svh-88px)] items-center justify-center overflow-hidden px-4"
    >
      <h1
        data-hero-title
        className="relative z-10 select-none text-center font-display uppercase leading-[0.82] tracking-tight text-[clamp(4.5rem,19vw,19rem)]"
      >
        {line("Hooked")}
        {line("on you", "text-outline")}
      </h1>

      {items.slice(0, 4).map((item, i) => (
        <Link
          key={item.handle}
          href={`/product/${item.handle}`}
          data-sticker
          className={`absolute z-20 block aspect-square ${STICKER_SPOTS[i]}`}
        >
          <div
            data-sticker-inner
            className={`relative h-full w-full overflow-hidden rounded-[2rem] border-[3px] border-ink shadow-chunky transition-transform duration-300 hover:scale-105 ${YARN_COLORS[i % YARN_COLORS.length]}`}
          >
            {item.image ? (
              <Image
                src={item.image}
                alt={item.title}
                fill
                priority
                sizes="260px"
                className="object-cover"
              />
            ) : null}
          </div>
        </Link>
      ))}

      <div
        data-hero-fade
        className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-3 text-center"
      >
        <p className="max-w-xs text-sm font-medium">
          Handmade crochet, one loop at a time. Soft, weird, and made just for
          you.
        </p>
        <Link
          href="/search"
          className="rounded-full border-[3px] border-ink bg-coral px-7 py-3 font-display text-xl uppercase tracking-wide shadow-chunky transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_0_var(--color-ink)] active:translate-y-0 active:shadow-chunky-sm"
        >
          Shop the drop
        </Link>
      </div>

      <SpinBadge />
    </section>
  );
}

function SpinBadge() {
  return (
    <div className="pointer-events-none absolute bottom-32 left-4 z-30 h-24 w-24 md:left-auto md:right-10 md:bottom-10 md:h-36 md:w-36">
      <svg viewBox="0 0 100 100" className="h-full w-full animate-spin-slow">
        <defs>
          <path
            id="badge-circle"
            d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"
          />
        </defs>
        <circle
          cx="50"
          cy="50"
          r="49"
          className="fill-butter stroke-ink"
          strokeWidth="2"
        />
        <text className="fill-ink font-display text-[11px] uppercase tracking-[0.2em]">
          <textPath href="#badge-circle">
            Made to order • Crocheted by hand •
          </textPath>
        </text>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-3xl">
        🧶
      </span>
    </div>
  );
}
