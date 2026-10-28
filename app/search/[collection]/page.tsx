import { getCollection, getCollectionProducts } from "lib/store";
import { Metadata } from "next";
import { notFound } from "next/navigation";

import Grid from "components/grid";
import ProductGridItems from "components/layout/product-grid-items";
import { defaultSort, sorting } from "lib/constants";

export async function generateMetadata(props: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const collection = await getCollection(params.collection);

  if (!collection) return notFound();

  return {
    title: collection.seo?.title || collection.title,
    description:
      collection.seo?.description ||
      collection.description ||
      `${collection.title} products`,
  };
}

export default async function CategoryPage(props: {
  params: Promise<{ collection: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { sort } = searchParams as { [key: string]: string };
  const { sortKey, reverse } =
    sorting.find((item) => item.slug === sort) || defaultSort;
  const products = await getCollectionProducts({
    collection: params.collection,
    sortKey,
    reverse,
  });

  const collection = await getCollection(params.collection);

  if (!collection) return notFound();

  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6 max-w-2xl space-y-3">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {collection.title}
        </h1>
        {collection.description ? (
          <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {collection.description}
          </p>
        ) : null}
      </div>

      {products.length === 0 ? (
        <p className="py-3 text-lg">{`No products found in this collection`}</p>
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
