import type { Metadata } from "next";

import Grid from "components/grid";
import ProductGridItems from "components/layout/product-grid-items";
import PageHeader from "components/page-header";
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
      collection.seo?.description ||
      collection.description ||
      `${collection.title} products`,
  };
}

export default async function Page(props: {
  params: Promise<{ page: string }>;
}) {
  const params = await props.params;
  const page = await getPage(params.page);

  if (page) {
    return (
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <PageHeader eyebrow="Good to know" title={page.title} />
        <div className="card space-y-6">
          <Prose className="text-lg" html={page.body} />
          <p className="text-sm font-medium text-ink/60">
            {`This document was last updated on ${new Intl.DateTimeFormat(
              undefined,
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            ).format(new Date(page.updatedAt))}.`}
          </p>
        </div>
      </section>
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
    <section className="mx-auto max-w-7xl px-4 pb-20">
      <PageHeader eyebrow="Collection" title={collection.title}>
        {collection.description || null}
      </PageHeader>
      {products.length === 0 ? (
        <p className="card text-lg font-medium">
          Nothing here yet. Check back soon!
        </p>
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
