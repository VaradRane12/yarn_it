import Grid from "components/grid";
import ProductGridItems from "components/layout/product-grid-items";
import { defaultSort, sorting } from "lib/constants";
import { getProducts } from "lib/store";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse all products in the store.",
};

export default async function ProductsPage() {
  const sort = sorting.find((item) => item.slug === null) || defaultSort;
  const products = await getProducts({ sortKey: sort.sortKey, reverse: sort.reverse });

  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6 max-w-2xl space-y-3">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Products</h1>
        <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Browse everything currently in the catalog.
        </p>
      </div>

      {products.length === 0 ? (
        <p className="py-3 text-lg">No products found</p>
      ) : (
        <div className="mx-auto max-w-7xl">
          <Grid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <ProductGridItems products={products} />
          </Grid>
        </div>
      )}
    </section>
  );
}