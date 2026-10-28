import { toShowcaseItem, YARN_COLORS } from "components/home/types";
import Marquee from "components/home/marquee";
import Footer from "components/layout/footer";
import PageHeader from "components/page-header";
import { defaultSort } from "lib/constants";
import { getProducts } from "lib/store";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "About us",
  description:
    "Yarn it is a tiny crochet studio making soft, handmade pieces and custom orders, one loop at a time.",
};

const VALUES = [
  {
    title: "Made by hand",
    body: "No machines, no mass production. Every stitch is worked with a hook and a lot of patience.",
    color: "bg-lilac",
  },
  {
    title: "Small batches",
    body: "We make a few of each thing, so your piece is close to one of a kind.",
    color: "bg-butter",
  },
  {
    title: "Custom orders",
    body: "Have an idea, a photo or a character you love? We'll crochet it for you.",
    color: "bg-mint",
  },
  {
    title: "Soft & safe",
    body: "Cuddly yarns, secure stitching, and pieces built to be hugged, gifted and kept.",
    color: "bg-sky",
  },
];

const ROTATIONS = ["-rotate-3", "rotate-2", "-rotate-1", "rotate-3"];

export default async function AboutPage() {
  const items = (
    await getProducts({
      sortKey: defaultSort.sortKey,
      reverse: defaultSort.reverse,
    })
  )
    .map(toShowcaseItem)
    .filter((item) => item.image)
    .slice(0, 4);

  return (
    <>
      <div className="knit">
        <div className="mx-auto max-w-6xl px-6">
          <PageHeader
            eyebrow="About us"
            title={
              <>
                Hooked on <span className="text-outline">making</span> things
              </>
            }
          >
            Yarn it is a tiny crochet studio. Every piece starts as a ball of
            yarn and a hook and ends up as something squishy, a little silly and
            made to be loved.
          </PageHeader>

          <section className="grid items-center gap-10 pb-20 md:grid-cols-2">
            <div className="space-y-5 text-lg leading-8">
              <p>
                We crochet plushies, keychains, bags and little desk friends. We
                do it slowly and by hand, because that&apos;s where the charm
                lives. Each one takes hours of looping, stuffing, shaping and
                stitching tiny faces until it feels just right.
              </p>
              <p>
                Can&apos;t find what you want? Send us a photo. Our estimator
                gives you a quick price, and we&apos;ll make it for you from
                scratch.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link href="/search" className="btn">
                  Shop the stash
                </Link>
                <Link href="/estimate" className="btn-ghost">
                  Request a custom
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {items.map((item, i) => (
                <Link
                  key={item.handle}
                  href={`/product/${item.handle}`}
                  className={`relative aspect-square overflow-hidden rounded-[1.75rem] border-[3px] border-ink shadow-chunky transition-transform hover:rotate-0 hover:scale-105 ${ROTATIONS[i % ROTATIONS.length]} ${YARN_COLORS[i % YARN_COLORS.length]}`}
                >
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(min-width: 768px) 25vw, 45vw"
                    className="object-cover"
                  />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Marquee />

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-display text-[clamp(2.5rem,7vw,5rem)] uppercase leading-none">
          What we <span className="text-coral">care</span> about
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className={`rounded-[2rem] border-[3px] border-ink p-7 shadow-chunky ${v.color}`}
            >
              <h3 className="font-display text-3xl uppercase leading-none">
                {v.title}
              </h3>
              <p className="mt-3 font-medium leading-6">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
