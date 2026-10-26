"use client";

import { gsap } from "gsap";
import { useLayoutEffect, useRef } from "react";

const TEXT =
  "Every piece is crocheted by hand from soft, happy yarn. No factories, no copies, just loops, patience, and a little bit of chaos.";
const HIGHLIGHT = new Set(["hand", "soft,", "happy", "loops,", "chaos."]);

export default function Statement() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.fromTo(
          "[data-word]",
          { opacity: 0.12 },
          {
            opacity: 1,
            stagger: 0.05,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top 75%",
              end: "bottom 55%",
              scrub: true,
            },
          },
        );
      },
      root,
    );
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} className="mx-auto max-w-6xl px-6 py-32 md:py-48">
      <p className="text-xs font-bold uppercase tracking-[0.3em]">✺ The deal</p>
      <p className="mt-6 font-display text-[clamp(2.4rem,6vw,5.5rem)] uppercase leading-[0.95]">
        {TEXT.split(" ").map((word, i) => (
          <span
            key={i}
            data-word
            className={`mr-[0.25em] inline-block ${
              HIGHLIGHT.has(word) ? "text-coral" : ""
            }`}
          >
            {word}
          </span>
        ))}
      </p>
    </section>
  );
}
