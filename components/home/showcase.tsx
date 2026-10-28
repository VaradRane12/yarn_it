"use client";

import Price from "components/price";
import { gsap } from "gsap";
import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { ShowcaseItem, YARN_COLORS } from "./types";

// Pinned horizontal scroll on desktop; a swipeable strip on phones.
export default function Showcase({ items }: { items: ShowcaseItem[] }) {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
      () => {
        const distance = () =>
          track.current!.scrollWidth - window.innerWidth + 48;
        const tween = gsap.to(track.current, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
        gsap.utils.toArray<HTMLElement>("[data-card]").forEach((card, i) => {
          gsap.fromTo(
            card,
            { rotate: i % 2 ? 6 : -6, y: 60 },
            {
              rotate: i % 2 ? -2 : 2,
              y: 0,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                containerAnimation: tween,
                start: "left right",
                end: "center center",
                scrub: true,
              },
            },
          );
        });
      },
    );
    return () => mm.revert();
  }, []);

  if (!items.length) return null;

  return (
    <section
      ref={root}
      className="relative overflow-hidden bg-ink py-16 text-cream md:flex md:h-screen md:flex-col md:justify-center md:py-0"
    >
      <div className="flex items-end justify-between px-6 md:px-12">
        <h2 className="font-display text-[clamp(3rem,9vw,8rem)] uppercase leading-none">
          Fresh off <span className="text-butter">the hook</span>
        </h2>
        <Link
          href="/search"
          className="mb-3 hidden shrink-0 rounded-full border-2 border-cream px-5 py-2 text-sm font-bold uppercase tracking-widest transition-colors hover:bg-cream hover:text-ink md:block"
        >
          See all →
        </Link>
      </div>

      <div
        ref={track}
        className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-6 md:snap-none md:overflow-visible md:px-12 md:pb-0"
      >
        {items.map((item, i) => (
          <Link
            key={item.handle}
            href={`/product/${item.handle}`}
            data-card
            className={`group relative flex w-[78vw] shrink-0 snap-center flex-col overflow-hidden rounded-[2rem] border-[3px] border-cream text-ink md:w-[28vw] md:min-w-[320px] ${YARN_COLORS[i % YARN_COLORS.length]}`}
          >
            <div className="relative aspect-[4/5] overflow-hidden">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(min-width: 768px) 28vw, 78vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-hover:rotate-2"
                />
              ) : null}
              <span className="absolute left-4 top-4 rounded-full border-2 border-ink bg-cream px-3 py-1 font-display text-lg">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t-[3px] border-ink p-4">
              <h3 className="font-display text-2xl uppercase leading-none md:text-3xl">
                {item.title}
              </h3>
              <Price
                className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-sm font-bold text-cream"
                amount={item.amount}
                currencyCode={item.currencyCode}
                currencyCodeClassName="hidden"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
