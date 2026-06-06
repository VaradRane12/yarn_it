import { DEFAULT_CURRENCY_CODE, HIDDEN_PRODUCT_TAG, TAGS } from "lib/constants";
import {
    unstable_cacheLife as cacheLife,
    unstable_cacheTag as cacheTag,
    revalidateTag,
} from "next/cache";
import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { localCatalogData } from "./catalog";
import { getCatalogFromSupabase } from "./supabase";
import {
    Cart,
    CartItem,
    CatalogData,
    Collection,
    Menu,
    Page,
    Product,
    ProductVariant,
} from "./types";

const provider = (process.env.COMMERCE_PROVIDER || "local").toLowerCase();

type CartStore = Map<string, Cart>;

type GlobalWithCartStore = typeof globalThis & {
  __commerceCarts?: CartStore;
};

function getCartStore(): CartStore {
  const scope = globalThis as GlobalWithCartStore;
  if (!scope.__commerceCarts) {
    scope.__commerceCarts = new Map<string, Cart>();
  }
  return scope.__commerceCarts;
}

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

function createEmptyCart(cartId?: string): Cart {
  return {
    id: cartId,
    checkoutUrl: "/search?checkout=demo",
    totalQuantity: 0,
    lines: [],
    cost: {
      subtotalAmount: { amount: "0", currencyCode: DEFAULT_CURRENCY_CODE },
      totalAmount: { amount: "0", currencyCode: DEFAULT_CURRENCY_CODE },
      totalTaxAmount: { amount: "0", currencyCode: DEFAULT_CURRENCY_CODE },
    },
  };
}

async function getCatalog(): Promise<CatalogData> {
  if (provider === "supabase") {
    return getCatalogFromSupabase();
  }

  return localCatalogData;
}

function normalizeProduct(product: Product): Product | undefined {
  if (product.tags.includes(HIDDEN_PRODUCT_TAG)) {
    return undefined;
  }

  return product;
}

function normalizeCollections(collections: Collection[]): Collection[] {
  return collections.map((collection) => ({
    ...collection,
    path: collection.handle ? `/${collection.handle}` : "/search",
  }));
}

function sortProducts(products: Product[], sortKey?: string, reverse?: boolean): Product[] {
  const sorted = [...products];

  if (sortKey === "PRICE") {
    sorted.sort(
      (a, b) =>
        Number(a.priceRange.minVariantPrice.amount) -
        Number(b.priceRange.minVariantPrice.amount),
    );
  } else if (sortKey === "CREATED_AT") {
    sorted.sort(
      (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );
  } else if (sortKey === "BEST_SELLING") {
    sorted.sort((a, b) => {
      const aScore = Number(a.tags.includes("trending"));
      const bScore = Number(b.tags.includes("trending"));
      return aScore - bScore;
    });
  }

  if (reverse) {
    sorted.reverse();
  }

  return sorted;
}

function searchProducts(products: Product[], query?: string): Product[] {
  if (!query) {
    return products;
  }

  const q = query.trim().toLowerCase();
  if (!q) {
    return products;
  }

  return products.filter((product) => {
    const haystack = [
      product.title,
      product.description,
      product.handle,
      ...product.tags,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

function buildVariantMap(products: Product[]): Map<string, { product: Product; variant: ProductVariant }> {
  const map = new Map<string, { product: Product; variant: ProductVariant }>();

  for (const product of products) {
    for (const variant of product.variants) {
      map.set(variant.id, { product, variant });
    }
  }

  return map;
}

function getLineUnitPrice(product: Product, variant: ProductVariant) {
  const variantAmount = Number(variant.price?.amount);
  const fallbackAmount = Number(product.priceRange.maxVariantPrice.amount);
  const amount =
    Number.isFinite(variantAmount) && variantAmount > 0
      ? variantAmount
      : Number.isFinite(fallbackAmount)
        ? fallbackAmount
        : 0;

  const currencyCode = DEFAULT_CURRENCY_CODE;

  return { amount, currencyCode };
}

function normalizeCartCurrency(cart: Cart): Cart {
  return {
    ...cart,
    lines: cart.lines.map((line) => ({
      ...line,
      cost: {
        ...line.cost,
        totalAmount: {
          ...line.cost.totalAmount,
          currencyCode: DEFAULT_CURRENCY_CODE,
        },
      },
    })),
    cost: {
      ...cart.cost,
      subtotalAmount: {
        ...cart.cost.subtotalAmount,
        currencyCode: DEFAULT_CURRENCY_CODE,
      },
      totalAmount: {
        ...cart.cost.totalAmount,
        currencyCode: DEFAULT_CURRENCY_CODE,
      },
      totalTaxAmount: {
        ...cart.cost.totalTaxAmount,
        currencyCode: DEFAULT_CURRENCY_CODE,
      },
    },
  };
}

function recalculateCart(cart: Cart): Cart {
  const totalQuantity = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalAmount = cart.lines.reduce(
    (sum, line) => sum + Number(line.cost.totalAmount.amount),
    0,
  );
  const currencyCode = DEFAULT_CURRENCY_CODE;

  return {
    ...cart,
    totalQuantity,
    cost: {
      subtotalAmount: { amount: totalAmount.toString(), currencyCode },
      totalAmount: { amount: totalAmount.toString(), currencyCode },
      totalTaxAmount: { amount: "0", currencyCode },
    },
  };
}

async function readCartId(): Promise<string | undefined> {
  return (await cookies()).get("cartId")?.value;
}

async function ensureCart(): Promise<Cart> {
  const cartStore = getCartStore();
  const cookieStore = await cookies();
  const cartId = cookieStore.get("cartId")?.value;

  if (cartId && cartStore.has(cartId)) {
    const normalized = normalizeCartCurrency(cartStore.get(cartId)!);
    cartStore.set(cartId, normalized);
    return normalized;
  }

  const newId = generateId("cart");
  const cart = createEmptyCart(newId);
  cartStore.set(newId, cart);
  cookieStore.set("cartId", newId);

  return cart;
}

export async function createCart(): Promise<Cart> {
  const cartStore = getCartStore();
  const cookieStore = await cookies();
  const cartId = generateId("cart");
  const cart = createEmptyCart(cartId);

  cartStore.set(cartId, cart);
  cookieStore.set("cartId", cartId);

  return cart;
}

export async function addToCart(
  lines: { merchandiseId: string; quantity: number }[],
): Promise<Cart> {
  const catalog = await getCatalog();
  const variantMap = buildVariantMap(catalog.products);
  const cartStore = getCartStore();
  const cart = await ensureCart();

  const nextLines = [...cart.lines];

  for (const line of lines) {
    const data = variantMap.get(line.merchandiseId);
    if (!data) {
      continue;
    }

    const existingLine = nextLines.find(
      (item) => item.merchandise.id === line.merchandiseId,
    );

    if (existingLine) {
      const unitPrice = getLineUnitPrice(data.product, data.variant);
      existingLine.quantity += line.quantity;
      existingLine.cost.totalAmount.amount = (
        unitPrice.amount * existingLine.quantity
      ).toString();
      existingLine.cost.totalAmount.currencyCode = unitPrice.currencyCode;
      continue;
    }

    const unitPrice = getLineUnitPrice(data.product, data.variant);

    nextLines.push({
      id: generateId("line"),
      quantity: line.quantity,
      cost: {
        totalAmount: {
          amount: (unitPrice.amount * line.quantity).toString(),
          currencyCode: unitPrice.currencyCode,
        },
      },
      merchandise: {
        id: data.variant.id,
        title: data.variant.title,
        selectedOptions: data.variant.selectedOptions,
        product: {
          id: data.product.id,
          handle: data.product.handle,
          title: data.product.title,
          featuredImage: data.product.featuredImage,
        },
      },
    });
  }

  const updated = recalculateCart({ ...cart, lines: nextLines });
  if (updated.id) {
    cartStore.set(updated.id, updated);
  }

  return updated;
}

export async function removeFromCart(lineIds: string[]): Promise<Cart> {
  const cartStore = getCartStore();
  const cart = await ensureCart();

  const updated = recalculateCart({
    ...cart,
    lines: cart.lines.filter((line) => !line.id || !lineIds.includes(line.id)),
  });

  if (updated.id) {
    cartStore.set(updated.id, updated);
  }

  return updated;
}

export async function updateCart(
  lines: { id: string; merchandiseId: string; quantity: number }[],
): Promise<Cart> {
  const cartStore = getCartStore();
  const cart = await ensureCart();

  const updatedLines = cart.lines
    .map((line) => {
      const mutation = lines.find((entry) => entry.id === line.id);
      if (!mutation) {
        return line;
      }

      if (mutation.quantity <= 0) {
        return null;
      }

      const unitPrice = Number(line.cost.totalAmount.amount) / Math.max(line.quantity, 1);

      return {
        ...line,
        quantity: mutation.quantity,
        cost: {
          ...line.cost,
          totalAmount: {
            ...line.cost.totalAmount,
            currencyCode: DEFAULT_CURRENCY_CODE,
            amount: (unitPrice * mutation.quantity).toString(),
          },
        },
      };
    })
    .filter(Boolean) as CartItem[];

  const updated = recalculateCart({ ...cart, lines: updatedLines });

  if (updated.id) {
    cartStore.set(updated.id, updated);
  }

  return updated;
}

export async function getCart(): Promise<Cart | undefined> {
  "use cache: private";
  cacheTag(TAGS.cart);
  cacheLife("seconds");

  const cartId = await readCartId();
  if (!cartId) {
    return undefined;
  }

  const cart = getCartStore().get(cartId);
  if (!cart) {
    return undefined;
  }

  const normalized = normalizeCartCurrency(cart);
  getCartStore().set(cartId, normalized);
  return normalized;
}

/**
 * Non-cached cart lookup by explicit ID.
 * Use this in Route Handlers where "use cache: private" does not work reliably.
 */
export function getCartById(cartId: string): Cart | undefined {
  if (!cartId) return undefined;
  const cart = getCartStore().get(cartId);
  if (!cart) return undefined;
  return normalizeCartCurrency(cart);
}

export async function getCollection(handle: string): Promise<Collection | undefined> {
  "use cache";
  cacheTag(TAGS.collections);
  cacheLife("days");

  const catalog = await getCatalog();
  const found = catalog.collections.find((collection) => collection.handle === handle);

  return found ? { ...found, path: `/${found.handle}` } : undefined;
}

export async function getCollectionProducts({
  collection,
  reverse,
  sortKey,
}: {
  collection: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  "use cache";
  cacheTag(TAGS.collections, TAGS.products);
  cacheLife("days");

  const catalog = await getCatalog();

  const inCollection = catalog.products.filter((product) =>
    product.collectionHandles.includes(collection),
  );

  const normalized = inCollection
    .map((product) => normalizeProduct(product))
    .filter(Boolean) as Product[];

  return sortProducts(normalized, sortKey, reverse);
}

export async function getCollections(): Promise<Collection[]> {
  "use cache";
  cacheTag(TAGS.collections);
  cacheLife("days");

  const catalog = await getCatalog();
  const visible = normalizeCollections(catalog.collections).filter(
    (collection) => !collection.handle.startsWith("hidden"),
  );

  return [
    {
      handle: "",
      title: "All",
      description: "All products",
      seo: {
        title: "All",
        description: "All products",
      },
      path: "/search",
      updatedAt: new Date().toISOString(),
    },
    ...visible,
  ];
}

export async function getMenu(handle: string): Promise<Menu[]> {
  "use cache";
  cacheTag(TAGS.collections);
  cacheLife("days");

  const catalog = await getCatalog();
  return catalog.menus[handle] || [];
}

export async function getPage(handle: string): Promise<Page | undefined> {
  const catalog = await getCatalog();
  return catalog.pages.find((page) => page.handle === handle);
}

export async function getPages(): Promise<Page[]> {
  const catalog = await getCatalog();
  return catalog.pages;
}

export async function getProduct(handle: string): Promise<Product | undefined> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("days");

  const catalog = await getCatalog();
  const product = catalog.products.find((item) => item.handle === handle);
  if (!product) {
    return undefined;
  }

  if (product.tags.includes(HIDDEN_PRODUCT_TAG)) {
    return product;
  }

  return product;
}

export async function getProductRecommendations(productId: string): Promise<Product[]> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("days");

  const catalog = await getCatalog();
  const current = catalog.products.find((product) => product.id === productId);

  if (!current) {
    return [];
  }

  return current.recommendationIds
    .map((id) => catalog.products.find((product) => product.id === id))
    .filter(Boolean)
    .map((product) => normalizeProduct(product!))
    .filter(Boolean) as Product[];
}

export async function getProducts({
  query,
  collection,
  reverse,
  sortKey,
}: {
  query?: string;
  collection?: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("days");

  const catalog = await getCatalog();
  const filteredByCollection = collection
    ? catalog.products.filter((product) => product.collectionHandles.includes(collection))
    : catalog.products;

  const visible = filteredByCollection
    .map((product) => normalizeProduct(product))
    .filter(Boolean) as Product[];

  return sortProducts(searchProducts(visible, query), sortKey, reverse);
}

export async function revalidate(req: NextRequest): Promise<NextResponse> {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.COMMERCE_REVALIDATION_SECRET || process.env.SHOPIFY_REVALIDATION_SECRET;

  if (!expected || !secret || secret !== expected) {
    return NextResponse.json({ status: 401 });
  }

  const topicHeader = (await headers()).get("x-commerce-topic") || (await headers()).get("x-shopify-topic") || "all";

  if (topicHeader === "collections/update" || topicHeader === "all") {
    revalidateTag(TAGS.collections, "seconds");
  }

  if (topicHeader === "products/update" || topicHeader === "all") {
    revalidateTag(TAGS.products, "seconds");
  }

  revalidateTag(TAGS.cart, "seconds");

  return NextResponse.json({ status: 200, revalidated: true, now: Date.now() });
}
