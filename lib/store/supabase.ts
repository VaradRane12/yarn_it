import { DEFAULT_CURRENCY_CODE } from "lib/constants";
import { toStorageProxyUrlFromSupabaseUrl } from "lib/storage-images";
import { localCatalogData } from "./catalog";
import { CatalogData, CatalogProduct, Collection, Menu, Page, Product } from "./types";

type SupabaseProductRow = {
  id: string;
  handle: string;
  available_for_sale: boolean;
  title: string;
  description: string;
  description_html: string;
  options: Product["options"];
  price_range: unknown;
  variants: Product["variants"];
  featured_image: Product["featuredImage"];
  images: Product["images"];
  seo: Product["seo"];
  tags: string[];
  updated_at: string;
  collection_handles: string[];
  recommendation_ids: string[];
  sales_rank: number;
};

type SupabaseCollectionRow = {
  handle: string;
  title: string;
  description: string;
  seo: Collection["seo"];
  updated_at: string;
  hidden: boolean;
};

type SupabasePageRow = {
  id: string;
  title: string;
  handle: string;
  body: string;
  body_summary: string;
  seo?: Page["seo"];
  created_at: string;
  updated_at: string;
};

type SupabaseMenuRow = {
  handle: string;
  title: string;
  path: string;
  position: number;
};

function hasPlaceholder(value: string | undefined) {
  if (!value) {
    return true;
  }

  return (
    value.includes("your-project.supabase.co") ||
    value.includes("your_service_role_key_here") ||
    value.includes("your_anon_key_here")
  );
}

function createMoney(amount: number, currencyCode = DEFAULT_CURRENCY_CODE) {
  return {
    amount: amount.toFixed(2),
    currencyCode,
  };
}

function isMoneyLike(value: unknown): value is { amount: string; currencyCode: string } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "amount" in value &&
      "currencyCode" in value,
  );
}

function isPriceRangeLike(value: unknown): value is Product["priceRange"] {
  return Boolean(
    value &&
      typeof value === "object" &&
      "minVariantPrice" in value &&
      "maxVariantPrice" in value,
  );
}

function coerceMoney(value: unknown, currencyCode = DEFAULT_CURRENCY_CODE) {
  if (isMoneyLike(value)) {
    return {
      ...value,
      currencyCode: DEFAULT_CURRENCY_CODE,
    };
  }

  const amount = Number(value);
  if (Number.isFinite(amount)) {
    return createMoney(amount, currencyCode);
  }

  return createMoney(0, currencyCode);
}

function normalizePriceRangeValue(value: unknown, currencyCode = DEFAULT_CURRENCY_CODE) {
  if (isPriceRangeLike(value)) {
    return {
      minVariantPrice: coerceMoney(value.minVariantPrice, currencyCode),
      maxVariantPrice: coerceMoney(value.maxVariantPrice, currencyCode),
    };
  }

  if (typeof value === "number" || typeof value === "string") {
    return {
      minVariantPrice: coerceMoney(value, currencyCode),
      maxVariantPrice: coerceMoney(value, currencyCode),
    };
  }

  return undefined;
}

function defaultImage(handle: string, altText: string) {
  return {
    url: `/catalog/${handle}.svg`,
    altText,
    width: 1200,
    height: 1200,
  };
}

function normalizeImageUrl(url: string) {
  return toStorageProxyUrlFromSupabaseUrl(url);
}

function normalizePriceRange(row: SupabaseProductRow): Product["priceRange"] {
  const currencyCode = DEFAULT_CURRENCY_CODE;
  const normalized = normalizePriceRangeValue(row.price_range, currencyCode);

  if (normalized) {
    return normalized;
  }

  const prices = (row.variants || [])
    .map((variant) => Number(variant.price?.amount || 0))
    .filter((price) => Number.isFinite(price));

  if (prices.length === 0) {
    return {
      minVariantPrice: createMoney(0, currencyCode),
      maxVariantPrice: createMoney(0, currencyCode),
    };
  }

  const minAmount = Math.min(...prices);
  const maxAmount = Math.max(...prices);

  return {
    minVariantPrice: createMoney(minAmount, currencyCode),
    maxVariantPrice: createMoney(maxAmount, currencyCode),
  };
}

function normalizeDescriptionHtml(row: SupabaseProductRow) {
  if (row.description_html) {
    return row.description_html;
  }

  const escapedDescription = (row.description || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return escapedDescription ? `<p>${escapedDescription}</p>` : "";
}

function normalizeVariants(row: SupabaseProductRow): Product["variants"] {
  if (row.variants?.length) {
    return row.variants.map((variant) => ({
      ...variant,
      price: {
        ...variant.price,
        currencyCode: DEFAULT_CURRENCY_CODE,
      },
    }));
  }

  const priceRange = normalizePriceRange(row);
  return [
    {
      id: `${row.id}_default`,
      title: "Default Title",
      availableForSale: row.available_for_sale,
      selectedOptions: [],
      price: priceRange.maxVariantPrice,
    },
  ];
}

function normalizeImages(row: SupabaseProductRow) {
  if (row.images?.length) {
    return row.images.map((image) => ({
      ...image,
      url: normalizeImageUrl(image.url),
    }));
  }

  const fallback = row.featured_image || defaultImage(row.handle, row.title);
  return [fallback];
}

function normalizeFeaturedImage(row: SupabaseProductRow) {
  const image = row.featured_image || row.images?.[0] || defaultImage(row.handle, row.title);
  return {
    ...image,
    url: normalizeImageUrl(image.url),
  };
}

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const hasSupabaseConfig = Boolean(
    supabaseUrl &&
      supabaseKey &&
      !hasPlaceholder(supabaseUrl) &&
      !hasPlaceholder(supabaseKey),
  );

  return { supabaseUrl, supabaseKey, hasSupabaseConfig };
}

function isNextPprBailoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeSymbol = (error as { $$typeof?: unknown }).$$typeof;
  return typeof maybeSymbol === "symbol" && maybeSymbol.toString() === "Symbol(react.postpone)";
}

async function fetchTable<T>(table: string, select: string): Promise<T[]> {
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env vars are not configured.");
  }

  const query = new URLSearchParams({ select });
  const url = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}?${query.toString()}`;

  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase ${table} fetch failed (${response.status}): ${body}`);
  }

  return response.json();
}

function toCatalogProduct(row: SupabaseProductRow): CatalogProduct {
  const featuredImage = normalizeFeaturedImage(row);
  const images = normalizeImages(row);
  const priceRange = normalizePriceRange(row);
  const variants = normalizeVariants(row);

  return {
    id: row.id,
    handle: row.handle,
    availableForSale: row.available_for_sale,
    title: row.title,
    description: row.description,
    descriptionHtml: normalizeDescriptionHtml(row),
    options: row.options || [],
    priceRange,
    variants,
    featuredImage,
    images,
    seo:
      row.seo || {
        title: row.title,
        description: row.description,
      },
    tags: row.tags || [],
    updatedAt: row.updated_at,
    collectionHandles: row.collection_handles || [],
    recommendationIds: row.recommendation_ids || [],
    salesRank: row.sales_rank || 0,
  };
}

function toCollection(row: SupabaseCollectionRow): Collection {
  return {
    handle: row.handle,
    title: row.title,
    description: row.description,
    seo: row.seo,
    updatedAt: row.updated_at,
    path: `/search/${row.handle}`,
  };
}

function toPage(row: SupabasePageRow): Page {
  return {
    id: row.id,
    title: row.title,
    handle: row.handle,
    body: row.body,
    bodySummary: row.body_summary,
    seo: row.seo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCatalogFromSupabase(): Promise<CatalogData> {
  const { hasSupabaseConfig } = getSupabaseEnv();

  if (!hasSupabaseConfig) {
    return localCatalogData;
  }

  try {
    const [productRows, collectionRows, pageRows, menuRows] = await Promise.all([
      fetchTable<SupabaseProductRow>(
        "products",
        "id,handle,available_for_sale,title,description,description_html,options,price_range,variants,featured_image,images,seo,tags,updated_at,collection_handles,recommendation_ids,sales_rank",
      ),
      fetchTable<SupabaseCollectionRow>(
        "collections",
        "handle,title,description,seo,updated_at,hidden",
      ),
      fetchTable<SupabasePageRow>(
        "pages",
        "id,title,handle,body,body_summary,seo,created_at,updated_at",
      ),
      fetchTable<SupabaseMenuRow>(
        "menus",
        "handle,title,path,position",
      ),
    ]);

    const menus = menuRows
      .sort((a, b) => a.position - b.position)
      .reduce<Record<string, Menu[]>>((acc, row) => {
        const group = acc[row.handle] || [];
        group.push({ title: row.title, path: row.path });
        acc[row.handle] = group;
        return acc;
      }, {});

    return {
      products: productRows.map(toCatalogProduct),
      collections: collectionRows.map(toCollection),
      pages: pageRows.map(toPage),
      menus,
    };
  } catch (error) {
    if (isNextPprBailoutError(error)) {
      throw error;
    }

    console.error("Falling back to local catalog because Supabase failed:", error);
    return localCatalogData;
  }
}
