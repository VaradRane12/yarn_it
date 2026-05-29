import { CatalogData, Collection, Product } from "./types";

const now = new Date().toISOString();

const image = (name: string, altText: string): Product["featuredImage"] => ({
  url: `/catalog/${name}.svg`,
  altText,
  width: 1200,
  height: 1200,
});

const products: CatalogData["products"] = [
  {
    id: "prod_vintage_tee",
    handle: "vintage-tee",
    availableForSale: true,
    title: "Vintage Tee",
    description: "Soft cotton t-shirt with a washed finish.",
    descriptionHtml:
      "<p>Soft cotton t-shirt with a washed finish and relaxed fit for everyday wear.</p>",
    options: [
      { id: "opt_vintage_tee_size", name: "Size", values: ["S", "M", "L"] },
      {
        id: "opt_vintage_tee_color",
        name: "Color",
        values: ["Stone", "Graphite"],
      },
    ],
    priceRange: {
      minVariantPrice: { amount: "32.00", currencyCode: "INR" },
      maxVariantPrice: { amount: "32.00", currencyCode: "INR" },
    },
    variants: [
      {
        id: "var_vintage_tee_stone_s",
        title: "Stone / S",
        availableForSale: true,
        selectedOptions: [
          { name: "Size", value: "S" },
          { name: "Color", value: "Stone" },
        ],
        price: { amount: "32.00", currencyCode: "INR" },
      },
      {
        id: "var_vintage_tee_stone_m",
        title: "Stone / M",
        availableForSale: true,
        selectedOptions: [
          { name: "Size", value: "M" },
          { name: "Color", value: "Stone" },
        ],
        price: { amount: "32.00", currencyCode: "INR" },
      },
      {
        id: "var_vintage_tee_graphite_l",
        title: "Graphite / L",
        availableForSale: true,
        selectedOptions: [
          { name: "Size", value: "L" },
          { name: "Color", value: "Graphite" },
        ],
        price: { amount: "32.00", currencyCode: "INR" },
      },
    ],
    featuredImage: image("vintage-tee", "Vintage Tee"),
    images: [image("vintage-tee", "Vintage Tee")],
    seo: {
      title: "Vintage Tee",
      description: "A premium washed tee made for daily rotation.",
    },
    tags: ["apparel"],
    updatedAt: now,
    collectionHandles: ["summer-drops", "hidden-homepage-featured-items"],
    recommendationIds: ["prod_city_hoodie", "prod_everyday_cap"],
    salesRank: 90,
  },
  {
    id: "prod_city_hoodie",
    handle: "city-hoodie",
    availableForSale: true,
    title: "City Hoodie",
    description: "Midweight hoodie with structured cuffs.",
    descriptionHtml:
      "<p>Midweight hoodie with structured cuffs and a brushed interior for comfort.</p>",
    options: [
      { id: "opt_city_hoodie_size", name: "Size", values: ["M", "L", "XL"] },
    ],
    priceRange: {
      minVariantPrice: { amount: "68.00", currencyCode: "INR" },
      maxVariantPrice: { amount: "68.00", currencyCode: "INR" },
    },
    variants: [
      {
        id: "var_city_hoodie_m",
        title: "M",
        availableForSale: true,
        selectedOptions: [{ name: "Size", value: "M" }],
        price: { amount: "68.00", currencyCode: "INR" },
      },
      {
        id: "var_city_hoodie_l",
        title: "L",
        availableForSale: true,
        selectedOptions: [{ name: "Size", value: "L" }],
        price: { amount: "68.00", currencyCode: "INR" },
      },
      {
        id: "var_city_hoodie_xl",
        title: "XL",
        availableForSale: true,
        selectedOptions: [{ name: "Size", value: "XL" }],
        price: { amount: "68.00", currencyCode: "INR" },
      },
    ],
    featuredImage: image("city-hoodie", "City Hoodie"),
    images: [image("city-hoodie", "City Hoodie")],
    seo: {
      title: "City Hoodie",
      description: "A clean silhouette hoodie made for cool evenings.",
    },
    tags: ["apparel", "trending"],
    updatedAt: now,
    collectionHandles: ["summer-drops", "hidden-homepage-featured-items"],
    recommendationIds: ["prod_vintage_tee", "prod_studio_notebook"],
    salesRank: 95,
  },
  {
    id: "prod_canvas_tote",
    handle: "canvas-tote",
    availableForSale: true,
    title: "Canvas Tote",
    description: "Structured everyday carry tote.",
    descriptionHtml:
      "<p>Structured everyday carry tote with reinforced straps and internal pocket.</p>",
    options: [
      {
        id: "opt_canvas_tote_color",
        name: "Color",
        values: ["Natural", "Black"],
      },
    ],
    priceRange: {
      minVariantPrice: { amount: "26.00", currencyCode: "INR" },
      maxVariantPrice: { amount: "26.00", currencyCode: "INR" },
    },
    variants: [
      {
        id: "var_canvas_tote_natural",
        title: "Natural",
        availableForSale: true,
        selectedOptions: [{ name: "Color", value: "Natural" }],
        price: { amount: "26.00", currencyCode: "INR" },
      },
      {
        id: "var_canvas_tote_black",
        title: "Black",
        availableForSale: true,
        selectedOptions: [{ name: "Color", value: "Black" }],
        price: { amount: "26.00", currencyCode: "INR" },
      },
    ],
    featuredImage: image("canvas-tote", "Canvas Tote"),
    images: [image("canvas-tote", "Canvas Tote")],
    seo: {
      title: "Canvas Tote",
      description: "Durable tote for daily essentials.",
    },
    tags: ["accessories"],
    updatedAt: now,
    collectionHandles: ["accessories", "hidden-homepage-featured-items"],
    recommendationIds: ["prod_trail_bottle", "prod_everyday_cap"],
    salesRank: 78,
  },
  {
    id: "prod_everyday_cap",
    handle: "everyday-cap",
    availableForSale: true,
    title: "Everyday Cap",
    description: "Low-profile cap with adjustable strap.",
    descriptionHtml:
      "<p>Low-profile cap with adjustable strap and tonal embroidery.</p>",
    options: [{ id: "opt_everyday_cap_size", name: "Size", values: ["One Size"] }],
    priceRange: {
      minVariantPrice: { amount: "24.00", currencyCode: "INR" },
      maxVariantPrice: { amount: "24.00", currencyCode: "INR" },
    },
    variants: [
      {
        id: "var_everyday_cap_onesize",
        title: "One Size",
        availableForSale: true,
        selectedOptions: [{ name: "Size", value: "One Size" }],
        price: { amount: "24.00", currencyCode: "INR" },
      },
    ],
    featuredImage: image("everyday-cap", "Everyday Cap"),
    images: [image("everyday-cap", "Everyday Cap")],
    seo: {
      title: "Everyday Cap",
      description: "Minimal cap for daily fits.",
    },
    tags: ["accessories"],
    updatedAt: now,
    collectionHandles: ["accessories", "hidden-homepage-carousel"],
    recommendationIds: ["prod_canvas_tote", "prod_trail_bottle"],
    salesRank: 73,
  },
  {
    id: "prod_trail_bottle",
    handle: "trail-bottle",
    availableForSale: true,
    title: "Trail Bottle",
    description: "Insulated bottle with powder-coated finish.",
    descriptionHtml:
      "<p>Insulated bottle with powder-coated finish that keeps drinks cold for hours.</p>",
    options: [{ id: "opt_trail_bottle_size", name: "Size", values: ["750ml"] }],
    priceRange: {
      minVariantPrice: { amount: "29.00", currencyCode: "INR" },
      maxVariantPrice: { amount: "29.00", currencyCode: "INR" },
    },
    variants: [
      {
        id: "var_trail_bottle_750",
        title: "750ml",
        availableForSale: true,
        selectedOptions: [{ name: "Size", value: "750ml" }],
        price: { amount: "29.00", currencyCode: "INR" },
      },
    ],
    featuredImage: image("trail-bottle", "Trail Bottle"),
    images: [image("trail-bottle", "Trail Bottle")],
    seo: {
      title: "Trail Bottle",
      description: "Stainless steel bottle for commute and trail.",
    },
    tags: ["accessories", "outdoors"],
    updatedAt: now,
    collectionHandles: ["accessories", "hidden-homepage-carousel"],
    recommendationIds: ["prod_canvas_tote", "prod_studio_notebook"],
    salesRank: 70,
  },
  {
    id: "prod_studio_notebook",
    handle: "studio-notebook",
    availableForSale: true,
    title: "Studio Notebook",
    description: "Hardbound dot-grid notebook.",
    descriptionHtml:
      "<p>Hardbound dot-grid notebook with lay-flat binding and recycled paper stock.</p>",
    options: [
      { id: "opt_studio_notebook_size", name: "Size", values: ["A5"] },
    ],
    priceRange: {
      minVariantPrice: { amount: "18.00", currencyCode: "INR" },
      maxVariantPrice: { amount: "18.00", currencyCode: "INR" },
    },
    variants: [
      {
        id: "var_studio_notebook_a5",
        title: "A5",
        availableForSale: true,
        selectedOptions: [{ name: "Size", value: "A5" }],
        price: { amount: "18.00", currencyCode: "INR" },
      },
    ],
    featuredImage: image("studio-notebook", "Studio Notebook"),
    images: [image("studio-notebook", "Studio Notebook")],
    seo: {
      title: "Studio Notebook",
      description: "A durable notebook for planning and sketching.",
    },
    tags: ["stationery"],
    updatedAt: now,
    collectionHandles: ["hidden-homepage-carousel"],
    recommendationIds: ["prod_trail_bottle", "prod_city_hoodie"],
    salesRank: 60,
  },
];

const collection = (
  handle: string,
  title: string,
  description: string,
): Collection => ({
  handle,
  title,
  description,
  seo: { title, description },
  updatedAt: now,
  path: `/${handle}`,
});

const collections: Collection[] = [
  collection(
    "hidden-homepage-featured-items",
    "Featured",
    "Homepage featured products.",
  ),
  collection("hidden-homepage-carousel", "Carousel", "Homepage carousel products."),
];

export const localCatalogData: CatalogData = {
  products,
  collections,
  pages: [
    {
      id: "page_shipping",
      title: "Shipping",
      handle: "shipping",
      body: "<p>Orders ship within 2 business days. Tracking is emailed automatically.</p>",
      bodySummary: "Shipping policy and delivery expectations.",
      seo: {
        title: "Shipping",
        description: "Shipping policy and delivery expectations.",
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "page_shipping",
      title: "Shipping",
      handle: "shipping",
      body: "<p>Orders ship within 2 business days. Tracking is emailed automatically.</p>",
      bodySummary: "Shipping policy and delivery expectations.",
      seo: {
        title: "Shipping",
        description: "Shipping policy and delivery expectations.",
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "page_returns",
      title: "Returns",
      handle: "returns",
      body: "<p>You can return unused items within 30 days of delivery.</p>",
      bodySummary: "Return policy details.",
      seo: {
        title: "Returns",
        description: "Return policy details.",
      },
      createdAt: now,
      updatedAt: now,
    },
  ],
  menus: {
    "next-js-frontend-header-menu": [
      { title: "All Products", path: "/search" },
    ],
    "next-js-frontend-footer-menu": [
      { title: "All Products", path: "/search" },
      { title: "Shipping", path: "/shipping" },
      { title: "Returns", path: "/returns" },
    ],
  },
};
