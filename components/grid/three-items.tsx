import { GridTileImage } from "components/grid/tile";
import { defaultSort } from "lib/constants";
import { getProducts } from "lib/store";
import type { Product } from "lib/store/types";
import Link from "next/link";

function ThreeItemGridItem({
  item,
  size,
  priority,
}: {
  item: Product;
  size: "full" | "half";
  priority?: boolean;
}) {
  return (
    <div
      className={
        size === "full"
          ? "md:col-span-4 md:row-span-2"
          : "md:col-span-2 md:row-span-1"
      }
    >
      <Link
        className="relative block aspect-square h-full w-full"
        href={`/product/${item.handle}`}
        prefetch={true}
      >
        <GridTileImage
          src={item.featuredImage.url}
          fill
          sizes={
            size === "full"
              ? "(min-width: 768px) 66vw, 100vw"
              : "(min-width: 768px) 33vw, 100vw"
          }
          priority={priority}
          alt={item.title}
          label={{
            position: size === "full" ? "center" : "bottom",
            title: item.title as string,
            amount: item.priceRange.maxVariantPrice.amount,
            currencyCode: item.priceRange.maxVariantPrice.currencyCode,
          }}
        />
      </Link>
    </div>
  );
}

export async function ThreeItemGrid() {
  const visibleItems = (
    await getProducts({
      sortKey: defaultSort.sortKey,
      reverse: defaultSort.reverse,
    })
  ).slice(0, 3);

  if (!visibleItems[0]) return null;

  const [firstProduct, secondProduct, thirdProduct] = visibleItems;

  return (
    <section className="mx-auto grid max-w-(--breakpoint-2xl) gap-4 px-4 pb-4 md:grid-cols-6 md:grid-rows-2 lg:max-h-[calc(100vh-200px)]">
      <ThreeItemGridItem size="full" item={firstProduct} priority={true} />
      {secondProduct ? (
        <ThreeItemGridItem size="half" item={secondProduct} priority={true} />
      ) : null}
      {thirdProduct ? (
        <ThreeItemGridItem size="half" item={thirdProduct} />
      ) : null}
    </section>
  );
}
