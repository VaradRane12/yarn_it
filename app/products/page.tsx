import type { Metadata } from "next";

import Grid from "components/grid";
import ProductGridItems from "components/layout/product-grid-items";
import { defaultSort, sorting } from "lib/constants";
import { getProducts } from "lib/store";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse every product in the store.",
};

export default async function ProductsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const { sort } = (searchParams || {}) as { [key: string]: string };
  const { sortKey, reverse } = sorting.find((item) => item.slug === sort) || defaultSort;

  const products = await getProducts({ sortKey, reverse });

  return (
    <section>
      <div className="mb-8 max-w-2xl space-y-3">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">All Products</h1>
        <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Browse the full catalog.
        </p>
      </div>
      {products.length === 0 ? (
        <p className="py-3 text-lg">No products found</p>
      ) : (
        <Grid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <ProductGridItems products={products} />
        </Grid>
      )}
    </section>
  );
}