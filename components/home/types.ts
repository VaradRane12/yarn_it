import type { Product } from "lib/store/types";

// Serializable slice of a product for client-side animated sections.
export type ShowcaseItem = {
  handle: string;
  title: string;
  image: string;
  amount: string;
  currencyCode: string;
};

export function toShowcaseItem(product: Product): ShowcaseItem {
  return {
    handle: product.handle,
    title: product.title,
    image: product.featuredImage?.url ?? "",
    amount: product.priceRange.maxVariantPrice.amount,
    currencyCode: product.priceRange.maxVariantPrice.currencyCode,
  };
}

export const YARN_COLORS = [
  "bg-lilac",
  "bg-butter",
  "bg-mint",
  "bg-coral",
  "bg-sky",
  "bg-bubblegum",
];
