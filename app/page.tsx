import CustomCta from "components/home/custom-cta";
import Hero from "components/home/hero";
import Marquee from "components/home/marquee";
import Showcase from "components/home/showcase";
import Statement from "components/home/statement";
import { toShowcaseItem } from "components/home/types";
import Footer from "components/layout/footer";
import { defaultSort } from "lib/constants";
import { getProducts } from "lib/store";

export const metadata = {
  description:
    "Handmade crochet and knitted products crafted with love. Browse our unique collection of handmade goods and patterns.",
  openGraph: {
    type: "website",
  },
};

export default async function HomePage() {
  const items = (
    await getProducts({
      sortKey: defaultSort.sortKey,
      reverse: defaultSort.reverse,
    })
  ).map(toShowcaseItem);

  return (
    <>
      <Hero items={items} />
      <Marquee />
      <Statement />
      <Showcase items={items.slice(0, 8)} />
      <CustomCta />
      <Footer />
    </>
  );
}
