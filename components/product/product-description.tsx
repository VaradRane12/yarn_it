import { AddToCart } from "components/cart/add-to-cart";
import Price from "components/price";
import Prose from "components/prose";
import { Product } from "lib/store/types";
import { VariantSelector } from "./variant-selector";

export function ProductDescription({ product }: { product: Product }) {
  return (
    <>
      <div className="mb-6 flex flex-col border-b-[3px] border-ink pb-6">
        <h1 className="mb-4 font-display text-6xl uppercase leading-[0.9]">
          {product.title}
        </h1>
        <div className="mr-auto w-auto rounded-full border-2 border-ink bg-coral px-4 py-2 text-sm font-bold text-ink shadow-chunky-sm">
          <Price
            amount={product.priceRange.maxVariantPrice.amount}
            currencyCode={product.priceRange.maxVariantPrice.currencyCode}
          />
        </div>
      </div>
      <VariantSelector options={product.options} variants={product.variants} />
      {product.descriptionHtml ? (
        <Prose
          className="mb-6 text-sm leading-relaxed"
          html={product.descriptionHtml}
        />
      ) : null}
      <AddToCart product={product} />
      <ul className="mt-6 space-y-1 text-sm font-medium">
        <li>✓ UPI and cards accepted</li>
        <li>✓ Half pay: pay 50% now, the rest before we ship</li>
      </ul>
    </>
  );
}
