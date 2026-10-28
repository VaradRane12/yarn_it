"use client";

import { gsap } from "gsap";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";

const STEPS = [
  {
    n: "01",
    title: "Dream it",
    body: "Send a photo or an idea. Plushie, pot, bag, anything.",
    color: "bg-mint",
  },
  {
    n: "02",
    title: "Price it",
    body: "Our estimator guesses yarn, hours and cost in seconds.",
    color: "bg-sky",
  },
  {
    n: "03",
    title: "Hug it",
    body: "We crochet it by hand and ship it to your door.",
    color: "bg-bubblegum",
  },
];

export default function CustomCta() {
  const root = useRef<HTMLElement>(null);
  const button = useRef<HTMLAnchorElement>(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.from("[data-step]", {
          y: 120,
          rotate: (i) => (i - 1) * 8,
          opacity: 0,
          duration: 0.9,
          ease: "back.out(1.4)",
          stagger: 0.15,
          scrollTrigger: { trigger: root.current, start: "top 70%" },
        });

        // Magnetic button.
        const el = button.current!;
        const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
        const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          x((e.clientX - r.left - r.width / 2) * 0.35);
          y((e.clientY - r.top - r.height / 2) * 0.35);
        };
        const leave = () => {
          x(0);
          y(0);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        return () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        };
      },
      root,
    );
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} className="knit px-6 py-28 md:py-40">
      <h2 className="text-center font-display text-[clamp(3rem,10vw,9rem)] uppercase leading-[0.85]">
        Got a <span className="text-outline">wild</span> idea?
      </h2>

      <div className="mx-auto mt-16 grid max-w-6xl gap-6 md:grid-cols-3">
        {STEPS.map((s) => (
          <div
            key={s.n}
            data-step
            className={`rounded-[2rem] border-[3px] border-ink p-8 shadow-chunky ${s.color}`}
          >
            <span className="font-display text-6xl">{s.n}</span>
            <h3 className="mt-4 font-display text-4xl uppercase">{s.title}</h3>
            <p className="mt-2 font-medium">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-20 flex justify-center">
        <Link
          ref={button}
          href="/estimate"
          className="flex h-44 w-44 items-center justify-center rounded-full border-[3px] border-ink bg-butter text-center font-display text-2xl uppercase leading-none shadow-chunky transition-colors hover:bg-coral md:h-56 md:w-56 md:text-3xl"
        >
          Get an
          <br />
          estimate
        </Link>
      </div>
    </section>
  );
}
