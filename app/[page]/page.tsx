import type { Metadata } from "next";

import Grid from "components/grid";
import ProductGridItems from "components/layout/product-grid-items";
import Prose from "components/prose";
import { defaultSort, sorting } from "lib/constants";
import { getCollection, getCollectionProducts, getPage } from "lib/store";
import { notFound } from "next/navigation";

export async function generateMetadata(props: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = await getPage(params.page);

  if (page) {
    return {
      title: page.seo?.title || page.title,
      description: page.seo?.description || page.bodySummary,
      openGraph: {
        publishedTime: page.createdAt,
        modifiedTime: page.updatedAt,
        type: "article",
      },
    };
  }

  const collection = await getCollection(params.page);

  if (!collection) return notFound();

  return {
    title: collection.seo?.title || collection.title,
    description:
      collection.seo?.description || collection.description || `${collection.title} products`,
  };
}

export default async function Page(props: {
  params: Promise<{ page: string }>;
}) {
  const params = await props.params;
  const page = await getPage(params.page);

  if (page) {
    return (
      <>
        <h1 className="mb-8 text-5xl font-bold">{page.title}</h1>
        <Prose className="mb-8" html={page.body} />
        <p className="text-sm italic">
          {`This document was last updated on ${new Intl.DateTimeFormat(
            undefined,
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          ).format(new Date(page.updatedAt))}.`}
        </p>
      </>
    );
  }

  const collection = await getCollection(params.page);

  if (!collection) return notFound();

  const { sortKey, reverse } = defaultSort;
  const sort = sorting.find((item) => item.slug === null) || defaultSort;
  const products = await getCollectionProducts({
    collection: collection.handle,
    sortKey: sort.sortKey,
    reverse: sort.reverse,
  });

  return (
    <section>
      <div className="mb-8 max-w-2xl space-y-3">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{collection.title}</h1>
        {collection.description ? (
          <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {collection.description}
          </p>
        ) : null}
      </div>
      {products.length === 0 ? (
        <p className="py-3 text-lg">No products found in this collection</p>
      ) : (
        <Grid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <ProductGridItems products={products} />
        </Grid>
      )}
    </section>
  );
}
