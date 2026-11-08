"use client";

import EstimatorPricing from "components/admin/estimator-pricing";
import { DEFAULT_CURRENCY_CODE } from "lib/constants";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type AdminImage = {
  url: string;
  altText: string;
  width: number;
  height: number;
};
type Api = (
  path: string,
  method?: string,
  body?: unknown,
) => Promise<{ ok: boolean; data: any }>;
type Toast = (message: string, tone?: "ok" | "error") => void;

const TABS = [
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
  { key: "instagram", label: "Instagram" },
  { key: "categories", label: "Categories" },
  { key: "pages", label: "Pages" },
  { key: "estimator", label: "Estimator" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const PASSWORD_KEY = "yi-admin-password";

// ---------- small UI pieces ----------

const btn =
  "inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btn} bg-neutral-900 text-white hover:bg-neutral-700`;
const btnGhost = `${btn} border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50`;
const btnDanger = `${btn} text-red-600 hover:bg-red-50`;
const inputCls =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none";
const card = "rounded-xl border border-neutral-200 bg-white shadow-sm";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-neutral-800">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-neutral-500">{hint}</span>
      ) : null}
    </label>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
      {children}
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: string;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    cancelled: "bg-red-100 text-red-700",
    failed: "bg-red-100 text-red-700",
    muted: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone] || tones.muted}`}
    >
      {children}
    </span>
  );
}

function PhotoDropzone({
  onFiles,
  disabled,
  label = "Drop photos here or click to choose",
  multiple = true,
}: {
  onFiles: (files: File[]) => Promise<void>;
  disabled?: boolean;
  label?: string;
  multiple?: boolean;
}) {
  const [active, setActive] = useState(false);
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition ${
        active
          ? "border-rose-500 bg-rose-50"
          : "border-neutral-300 bg-neutral-50 hover:bg-neutral-100"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setActive(false);
        if (e.dataTransfer.files.length)
          await onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <span className="font-medium text-neutral-800">
        {disabled ? "Uploading…" : label}
      </span>
      <span className="mt-1 text-xs text-neutral-500">
        JPEG works best for Instagram
      </span>
      <input
        className="sr-only"
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled}
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          e.currentTarget.value = "";
          if (files.length) await onFiles(files);
        }}
      />
    </label>
  );
}

// ---------- helpers ----------

async function uploadAdminImage(
  file: File,
  adminPassword: string,
): Promise<AdminImage> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/admin/upload-image", {
    method: "POST",
    headers: { "x-admin-password": adminPassword },
    body: formData,
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error || "Image upload failed");
  return { url: json.url, altText: file.name, width: 1200, height: 1200 };
}

// Instagram feed posts must be JPEG with width/height between 0.8 (4:5) and 1.91.
function instagramRatio(ratio: number) {
  return Math.min(Math.max(ratio, 0.8), 1.91);
}

async function toInstagramJpeg(url: string, adminPassword: string) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  const ratio = img.naturalWidth / img.naturalHeight;
  const target = instagramRatio(ratio);
  // centre-crop to the allowed ratio
  const sw = ratio > target ? img.naturalHeight * target : img.naturalWidth;
  const sh = ratio < target ? img.naturalWidth / target : img.naturalHeight;
  const scale = Math.min(1, 1440 / sw);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    img,
    (img.naturalWidth - sw) / 2,
    (img.naturalHeight - sh) / 2,
    sw,
    sh,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("JPEG conversion failed");
  const file = new File([blob], `instagram-${Date.now()}.jpg`, {
    type: "image/jpeg",
  });
  return (await uploadAdminImage(file, adminPassword)).url;
}

// Existing handles stay untouched so live URLs don't break; new or edited ones get slugified.
function keepOrSlug(handle: string, original?: string) {
  return handle === original ? handle : slugify(handle);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function csvToList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseJsonOr(value: string, fallback: any, label: string) {
  if (!value.trim()) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid JSON for ${label}`);
  }
}

function productPrice(p: any) {
  const amount = Number(p?.price_range?.maxVariantPrice?.amount);
  return Number.isFinite(amount) ? amount : 0;
}

function formatInr(amount: number | string) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function productImages(p: any): AdminImage[] {
  const images = Array.isArray(p?.images)
    ? p.images.filter((i: any) => i?.url)
    : [];
  if (images.length) return images;
  return p?.featured_image?.url ? [p.featured_image] : [];
}

function defaultCaption(p: any) {
  const price = productPrice(p);
  return [
    p.title,
    typeof p.description === "string"
      ? p.description.replace(/<[^>]+>/g, "").trim()
      : "",
    price ? formatInr(price) : "",
    `${window.location.origin}/product/${p.handle}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ---------- page ----------

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabKey>("products");
  const [products, setProducts] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [instagramProductId, setInstagramProductId] = useState<string | null>(
    null,
  );

  const notify: Toast = (message, tone = "ok") =>
    tone === "error" ? toast.error(message) : toast.success(message);

  const api: Api = async (path, method = "GET", body) => {
    const res = await fetch(`/api/admin/${path}`, {
      method,
      headers: {
        "x-admin-password": adminPassword,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: any = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // keep raw text
    }
    return { ok: res.ok, data };
  };

  async function loadAll(password = adminPassword) {
    setLoading(true);
    const headers = { "x-admin-password": password };
    try {
      const [pRes, cRes, pgRes, oRes] = await Promise.all([
        fetch("/api/admin/product", { headers }),
        fetch("/api/admin/collection", { headers }),
        fetch("/api/admin/page", { headers }),
        fetch("/api/admin/order", { headers }),
      ]);
      if (pRes.status === 401) {
        setAuthed(false);
        setLoginError("Wrong password");
        return;
      }
      const asArray = async (r: Response) => {
        const json = r.ok ? await r.json() : [];
        return Array.isArray(json) ? json : [];
      };
      setProducts(await asArray(pRes));
      setCollections(await asArray(cRes));
      setPages(await asArray(pgRes));
      setOrders(await asArray(oRes));
      setAuthed(true);
      setLoginError(null);
      try {
        sessionStorage.setItem(PASSWORD_KEY, password);
      } catch {
        // storage unavailable; user just re-enters password
      }
    } catch {
      setLoginError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(PASSWORD_KEY);
    } catch {
      // ignore
    }
    if (saved) {
      setAdminPassword(saved);
      loadAll(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingOrders = orders.filter(
    (o) => o.payment_status === "pending",
  ).length;

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
        <form
          className={`${card} w-full max-w-sm p-6`}
          onSubmit={(e) => {
            e.preventDefault();
            if (adminPassword) loadAll();
          }}
        >
          <h1 className="text-xl font-semibold text-neutral-900">
            yarn_it admin
          </h1>
          <p className="mb-5 mt-1 text-sm text-neutral-500">
            Enter the admin password to continue.
          </p>
          <Field label="Password">
            <input
              autoFocus
              className={inputCls}
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
          </Field>
          {loginError ? (
            <p className="mt-2 text-sm text-red-600">{loginError}</p>
          ) : null}
          <button
            className={`${btnPrimary} mt-4 w-full`}
            disabled={loading || !adminPassword}
          >
            {loading ? "Checking…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <header className="mt-4 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-lg font-semibold">yarn_it admin</h1>
          <div className="flex gap-2">
            <button
              className={btnGhost}
              onClick={() => loadAll()}
              disabled={loading}
              type="button"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              className={btnGhost}
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem(PASSWORD_KEY);
                } catch {
                  // ignore
                }
                setAdminPassword("");
                setAuthed(false);
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {TABS.map((t) => {
            const count =
              t.key === "products"
                ? products.length
                : t.key === "orders"
                  ? pendingOrders || null
                  : t.key === "categories"
                    ? collections.length
                    : t.key === "pages"
                      ? pages.length
                      : null;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  tab === t.key
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {t.label}
                {count ? (
                  <span
                    className={`rounded-full px-1.5 text-xs ${
                      t.key === "orders"
                        ? "bg-amber-400 text-white"
                        : "bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "products" ? (
          <ProductsTab
            adminPassword={adminPassword}
            api={api}
            collections={collections}
            notify={notify}
            products={products}
            reload={loadAll}
            onInstagram={(id) => {
              setInstagramProductId(id);
              setTab("instagram");
            }}
          />
        ) : null}
        {tab === "orders" ? (
          <OrdersTab
            api={api}
            notify={notify}
            orders={orders}
            reload={loadAll}
          />
        ) : null}
        {tab === "instagram" ? (
          <InstagramTab
            adminPassword={adminPassword}
            api={api}
            initialProductId={instagramProductId}
            notify={notify}
            products={products}
          />
        ) : null}
        {tab === "categories" ? (
          <CategoriesTab
            api={api}
            collections={collections}
            notify={notify}
            reload={loadAll}
          />
        ) : null}
        {tab === "pages" ? (
          <PagesTab
            api={api}
            collections={collections}
            notify={notify}
            pages={pages}
            reload={loadAll}
          />
        ) : null}
        {tab === "estimator" ? (
          <EstimatorPricing adminPassword={adminPassword} />
        ) : null}
      </main>
    </div>
  );
}

// ---------- products ----------

function ProductsTab({
  adminPassword,
  api,
  collections,
  notify,
  products,
  reload,
  onInstagram,
}: {
  adminPassword: string;
  api: Api;
  collections: any[];
  notify: Toast;
  products: any[];
  reload: () => Promise<void>;
  onInstagram: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!q || `${p.title} ${p.handle}`.toLowerCase().includes(q)) &&
        (!category || (p.collection_handles || []).includes(category)),
    );
  }, [products, query, category]);

  if (editing) {
    const item =
      editing === "new" ? null : products.find((p) => p.id === editing);
    return (
      <ProductForm
        adminPassword={adminPassword}
        api={api}
        collections={collections}
        item={item}
        notify={notify}
        onDone={async (saved) => {
          setEditing(null);
          if (saved) await reload();
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} max-w-xs`}
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className={`${inputCls} max-w-[14rem]`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {collections.map((c) => (
            <option key={c.handle} value={c.handle}>
              {c.title}
            </option>
          ))}
        </select>
        <button
          className={`${btnPrimary} ml-auto`}
          type="button"
          onClick={() => setEditing("new")}
        >
          + New product
        </button>
      </div>

      {filtered.length === 0 ? (
        <Empty>
          {products.length
            ? "No products match."
            : "No products yet. Add your first one."}
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => {
            const image = productImages(p)[0];
            return (
              <div
                key={p.id}
                className={`${card} flex flex-col overflow-hidden`}
              >
                <button
                  type="button"
                  className="relative block aspect-square w-full bg-neutral-100"
                  onClick={() => setEditing(p.id)}
                  aria-label={`Edit ${p.title}`}
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.url}
                      alt={image.altText || p.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-neutral-400">No photo</span>
                  )}
                  {p.available_for_sale === false ? (
                    <span className="absolute left-2 top-2 rounded-full bg-neutral-900/80 px-2 py-0.5 text-xs text-white">
                      Sold out
                    </span>
                  ) : null}
                </button>
                <div className="flex flex-1 flex-col p-3">
                  <p className="line-clamp-2 text-sm font-medium">{p.title}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {formatInr(productPrice(p))}
                  </p>
                  <div className="mt-auto flex gap-1 pt-3">
                    <button
                      className={`${btnGhost} flex-1 px-2`}
                      type="button"
                      onClick={() => setEditing(p.id)}
                    >
                      Edit
                    </button>
                    <button
                      className={`${btnGhost} px-2`}
                      type="button"
                      title="Post to Instagram"
                      onClick={() => onInstagram(p.id)}
                    >
                      IG
                    </button>
                    <button
                      className={`${btnDanger} px-2`}
                      type="button"
                      title="Delete"
                      onClick={async () => {
                        if (
                          !confirm(
                            `Delete "${p.title}"? This cannot be undone.`,
                          )
                        )
                          return;
                        const res = await api("product", "DELETE", {
                          id: p.id,
                        });
                        if (res.ok) {
                          notify("Product deleted");
                          await reload();
                        } else notify("Delete failed", "error");
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductForm({
  adminPassword,
  api,
  collections,
  item,
  notify,
  onDone,
}: {
  adminPassword: string;
  api: Api;
  collections: any[];
  item: any | null;
  notify: Toast;
  onDone: (saved: boolean) => Promise<void>;
}) {
  const isNew = !item;
  const initialPrice = item ? productPrice(item) : 0;
  const [title, setTitle] = useState(item?.title ?? "");
  const [handle, setHandle] = useState(item?.handle ?? "");
  const [handleTouched, setHandleTouched] = useState(!isNew);
  const [price, setPrice] = useState(item ? String(initialPrice) : "");
  const [description, setDescription] = useState(
    typeof item?.description === "string" ? item.description : "",
  );
  const [available, setAvailable] = useState(
    Boolean(item?.available_for_sale ?? true),
  );
  const [cats, setCats] = useState<string[]>(item?.collection_handles || []);
  const [images, setImages] = useState<AdminImage[]>(
    item ? productImages(item) : [],
  );
  const [tags, setTags] = useState((item?.tags || []).join(", "));
  const [salesRank, setSalesRank] = useState(
    item?.sales_rank != null ? String(item.sales_rank) : "",
  );
  const [recommendationIds, setRecommendationIds] = useState(
    (item?.recommendation_ids || []).join(", "),
  );
  const [options, setOptions] = useState(
    JSON.stringify(item?.options ?? [], null, 2),
  );
  const [variants, setVariants] = useState(
    JSON.stringify(item?.variants ?? [], null, 2),
  );
  const [seo, setSeo] = useState(JSON.stringify(item?.seo ?? null, null, 2));
  const [importJson, setImportJson] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(files: File[]) {
    setUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(
        files.map((f) => uploadAdminImage(f, adminPassword)),
      );
      setImages((current) => [...current, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function applyImport() {
    setError(null);
    try {
      const d = JSON.parse(importJson);
      if (!d || typeof d !== "object" || Array.isArray(d))
        throw new Error("Product JSON must be an object");
      if (typeof d.title === "string") setTitle(d.title);
      if (typeof d.handle === "string") {
        setHandle(d.handle);
        setHandleTouched(true);
      }
      if (typeof d.description === "string") setDescription(d.description);
      if (typeof d.available_for_sale === "boolean")
        setAvailable(d.available_for_sale);
      if (Array.isArray(d.collection_handles)) setCats(d.collection_handles);
      if (Array.isArray(d.images))
        setImages(d.images.filter((i: any) => i?.url));
      if (Array.isArray(d.tags)) setTags(d.tags.join(", "));
      if (d.price_range !== undefined) {
        const amount = Number(
          d.price_range?.minVariantPrice?.amount ?? d.price_range,
        );
        if (Number.isFinite(amount)) setPrice(String(amount));
      }
      if (d.options !== undefined)
        setOptions(JSON.stringify(d.options ?? [], null, 2));
      if (d.variants !== undefined)
        setVariants(JSON.stringify(d.variants ?? [], null, 2));
      if (d.seo !== undefined) setSeo(JSON.stringify(d.seo ?? null, null, 2));
      notify("JSON loaded into the form");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceNum = Number(price);
    if (!title.trim()) return setError("Title is required");
    if (!handle.trim()) return setError("Handle is required");
    if (price === "" || !Number.isFinite(priceNum) || priceNum < 0)
      return setError("Enter a valid price");

    let parsed: { options: any; variants: any[]; seo: any };
    try {
      parsed = {
        options: parseJsonOr(options, [], "options"),
        variants: parseJsonOr(variants, [], "variants"),
        seo: parseJsonOr(seo, null, "SEO"),
      };
    } catch (err) {
      return setError(err instanceof Error ? err.message : "Invalid JSON");
    }

    const common = {
      title: title.trim(),
      handle: keepOrSlug(handle, item?.handle),
      description: description || null,
      available_for_sale: available,
      collection_handles: cats,
      images,
      featured_image: images[0] ?? null,
      tags: csvToList(tags),
      recommendation_ids: csvToList(recommendationIds),
      sales_rank: salesRank === "" ? null : Number(salesRank),
      options: parsed.options,
      seo: parsed.seo,
    };

    setSaving(true);
    let res;
    if (isNew) {
      // POST normalises a plain number into price_range + default variant.
      res = await api("product", "POST", {
        ...common,
        price_range: priceNum,
        variants: parsed.variants,
      });
    } else {
      const currencyCode =
        item.price_range?.maxVariantPrice?.currencyCode ||
        DEFAULT_CURRENCY_CODE;
      const money = { amount: priceNum.toFixed(2), currencyCode };
      const priceChanged = priceNum !== initialPrice;
      res = await api("product", "PATCH", {
        id: item.id,
        ...common,
        price_range: { minVariantPrice: money, maxVariantPrice: money },
        variants: parsed.variants.map((v: any) => ({
          ...v,
          availableForSale: available,
          price: priceChanged ? money : v.price,
        })),
      });
    }
    setSaving(false);
    if (!res.ok)
      return setError(
        typeof res.data === "string" ? res.data : JSON.stringify(res.data),
      );
    notify(isNew ? "Product created" : "Product saved");
    await onDone(true);
  }

  const toggleCat = (h: string) =>
    setCats((current) =>
      current.includes(h) ? current.filter((c) => c !== h) : [...current, h],
    );

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <button
          className={btnGhost}
          type="button"
          onClick={() => onDone(false)}
        >
          ← Back
        </button>
        <h2 className="text-lg font-semibold">
          {isNew ? "New product" : `Edit ${item.title}`}
        </h2>
      </div>

      <div className={`${card} space-y-4 p-5`}>
        <Field label="Title">
          <input
            className={inputCls}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!handleTouched) setHandle(slugify(e.target.value));
            }}
            placeholder="Chunky bunny plushie"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price (₹)">
            <input
              className={inputCls}
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field
            label="URL handle"
            hint={
              handle
                ? `/product/${keepOrSlug(handle, item?.handle)}`
                : undefined
            }
          >
            <input
              className={inputCls}
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value);
                setHandleTouched(true);
              }}
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            className={inputCls}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
          />
          In stock / available for sale
        </label>
      </div>

      <div className={`${card} mt-4 p-5`}>
        <h3 className="mb-1 text-sm font-semibold">Photos</h3>
        <p className="mb-3 text-xs text-neutral-500">
          The first photo is the cover.
        </p>
        {images.length ? (
          <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((img, i) => (
              <div
                key={`${img.url}-${i}`}
                className="group relative overflow-hidden rounded-lg border border-neutral-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.altText}
                  className="aspect-square w-full object-cover"
                />
                {i === 0 ? (
                  <span className="absolute left-1 top-1 rounded bg-neutral-900/80 px-1.5 text-[11px] text-white">
                    Cover
                  </span>
                ) : null}
                <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                  {i !== 0 ? (
                    <button
                      type="button"
                      className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-medium shadow"
                      onClick={() =>
                        setImages((cur) => [
                          cur[i]!,
                          ...cur.filter((_, j) => j !== i),
                        ])
                      }
                    >
                      Make cover
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    aria-label="Remove photo"
                    className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-medium text-red-600 shadow"
                    onClick={() =>
                      setImages((cur) => cur.filter((_, j) => j !== i))
                    }
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <PhotoDropzone disabled={uploading} onFiles={addFiles} />
      </div>

      <div className={`${card} mt-4 p-5`}>
        <h3 className="mb-3 text-sm font-semibold">Categories</h3>
        {collections.length ? (
          <div className="flex flex-wrap gap-2">
            {collections.map((c) => (
              <button
                key={c.handle}
                type="button"
                onClick={() => toggleCat(c.handle)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  cats.includes(c.handle)
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 bg-white hover:bg-neutral-50"
                }`}
              >
                {c.title}
                {c.hidden ? " (hidden)" : ""}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            No categories yet. Create them in the Categories tab.
          </p>
        )}
      </div>

      <details className={`${card} mt-4 p-5`}>
        <summary className="cursor-pointer text-sm font-semibold">
          Advanced
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tags" hint="Comma separated">
              <input
                className={inputCls}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </Field>
            <Field label="Sales rank">
              <input
                className={inputCls}
                type="number"
                value={salesRank}
                onChange={(e) => setSalesRank(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Recommended product IDs" hint="Comma separated">
            <input
              className={inputCls}
              value={recommendationIds}
              onChange={(e) => setRecommendationIds(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Options (JSON)">
              <textarea
                className={`${inputCls} font-mono text-xs`}
                rows={5}
                value={options}
                onChange={(e) => setOptions(e.target.value)}
              />
            </Field>
            <Field
              label="Variants (JSON)"
              hint="Prices follow the main price when you change it"
            >
              <textarea
                className={`${inputCls} font-mono text-xs`}
                rows={5}
                value={variants}
                onChange={(e) => setVariants(e.target.value)}
              />
            </Field>
          </div>
          <Field label="SEO (JSON)">
            <textarea
              className={`${inputCls} font-mono text-xs`}
              rows={3}
              value={seo}
              onChange={(e) => setSeo(e.target.value)}
            />
          </Field>
          <Field
            label="Import product JSON"
            hint="Paste JSON and click Load to fill the form"
          >
            <textarea
              className={`${inputCls} font-mono text-xs`}
              rows={4}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='{"title":"...","handle":"...","images":[...]}'
            />
          </Field>
          <button
            className={btnGhost}
            type="button"
            onClick={applyImport}
            disabled={!importJson.trim()}
          >
            Load JSON
          </button>
        </div>
      </details>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 mt-4 flex gap-2 border-t border-neutral-200 bg-neutral-100 py-3">
        <button className={btnPrimary} disabled={saving || uploading}>
          {saving ? "Saving…" : isNew ? "Create product" : "Save changes"}
        </button>
        <button
          className={btnGhost}
          type="button"
          onClick={() => onDone(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------- orders ----------

const ORDER_FILTERS = ["all", "pending", "paid", "cancelled"] as const;

function OrdersTab({
  api,
  notify,
  orders,
  reload,
}: {
  api: Api;
  notify: Toast;
  orders: any[];
  reload: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<(typeof ORDER_FILTERS)[number]>("all");
  const [query, setQuery] = useState("");

  const filtered = orders.filter((o) => {
    const q = query.trim().toLowerCase();
    return (
      (filter === "all" || o.status === filter) &&
      (!q ||
        `${o.id} ${o.shipping_name} ${o.shipping_phone} ${o.customer_email}`
          .toLowerCase()
          .includes(q))
    );
  });

  async function update(id: string, status: string, payment_status: string) {
    const res = await api("order", "PATCH", { id, status, payment_status });
    if (res.ok) {
      notify(`Order marked ${status}`);
      await reload();
    } else notify("Order update failed", "error");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ORDER_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-sm capitalize ${
              filter === f
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white"
            }`}
          >
            {f} (
            {f === "all"
              ? orders.length
              : orders.filter((o) => o.status === f).length}
            )
          </button>
        ))}
        <input
          className={`${inputCls} ml-auto max-w-xs`}
          placeholder="Search id, name, phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Empty>No orders here.</Empty>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const lines: any[] = o.cart_snapshot?.lines || [];
            const address = [
              o.shipping_line1,
              o.shipping_line2,
              o.shipping_city,
              o.shipping_state,
              o.shipping_postal_code,
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <div key={o.id} className={`${card} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-semibold">{o.id}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(o.created_at).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}{" "}
                      IST
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={o.status}>{o.status}</Badge>
                    <Badge tone={o.payment_status}>
                      payment {o.payment_status}
                    </Badge>
                    <span className="text-base font-semibold">
                      {formatInr(o.total_amount)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="font-medium">{o.shipping_name || "—"}</p>
                    {o.shipping_phone ? (
                      <a
                        className="block text-neutral-600 underline"
                        href={`tel:${o.shipping_phone}`}
                      >
                        {o.shipping_phone}
                      </a>
                    ) : null}
                    {o.customer_email ? (
                      <a
                        className="block text-neutral-600 underline"
                        href={`mailto:${o.customer_email}`}
                      >
                        {o.customer_email}
                      </a>
                    ) : null}
                    {address ? (
                      <p className="mt-1 text-neutral-600">{address}</p>
                    ) : null}
                  </div>
                  <ul className="space-y-1 text-neutral-700">
                    {lines.map((l, i) => (
                      <li
                        key={l.id || i}
                        className="flex justify-between gap-2"
                      >
                        <span>
                          {l.quantity} ×{" "}
                          {l.merchandise?.product?.title ||
                            l.merchandise?.title}
                          {l.merchandise?.title &&
                          l.merchandise.title !== "Default Title"
                            ? ` (${l.merchandise.title})`
                            : ""}
                        </span>
                        <span className="text-neutral-500">
                          {formatInr(l.cost?.totalAmount?.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                  {o.status !== "paid" ? (
                    <button
                      className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
                      type="button"
                      onClick={() => update(o.id, "paid", "paid")}
                    >
                      Mark paid
                    </button>
                  ) : null}
                  {o.status !== "pending" ? (
                    <button
                      className={btnGhost}
                      type="button"
                      onClick={() => update(o.id, "pending", "pending")}
                    >
                      Mark pending
                    </button>
                  ) : null}
                  {o.status !== "cancelled" ? (
                    <button
                      className={btnDanger}
                      type="button"
                      onClick={() =>
                        confirm("Cancel this order?") &&
                        update(o.id, "cancelled", "failed")
                      }
                    >
                      Cancel order
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- instagram ----------

function InstagramTab({
  adminPassword,
  api,
  initialProductId,
  notify,
  products,
}: {
  adminPassword: string;
  api: Api;
  initialProductId: string | null;
  notify: Toast;
  products: any[];
}) {
  const [productId, setProductId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  const selected = products.find((p) => p.id === productId);

  function pick(p: any) {
    setProductId(p.id);
    setImageUrl(productImages(p)[0]?.url || "");
    setCaption(defaultCaption(p));
    setResult(null);
  }

  useEffect(() => {
    const p = products.find((x) => x.id === initialProductId);
    if (p) pick(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProductId]);

  const [previewRatio, setPreviewRatio] = useState(1);
  const filtered = products.filter((p) =>
    `${p.title} ${p.handle}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function post() {
    if (!imageUrl || !confirm("Publish this post to Instagram now?")) return;
    setPosting(true);
    setResult(null);
    let url = imageUrl;
    try {
      url = await toInstagramJpeg(imageUrl, adminPassword);
    } catch {
      // conversion failed (e.g. CORS); try the original photo
    }
    const res = await api("instagram", "POST", { imageUrl: url, caption });
    setPosting(false);
    if (res.ok) {
      setResult({ ok: true, message: "Posted to Instagram." });
      notify("Posted to Instagram");
    } else {
      const message = res.data?.error || "Instagram post failed";
      setResult({ ok: false, message });
      notify(message, "error");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div className={`${card} p-5`}>
          <h2 className="mb-1 text-sm font-semibold">1. Pick a product</h2>
          <p className="mb-3 text-xs text-neutral-500">
            Fills in the photo and a caption you can edit.
          </p>
          <input
            className={`${inputCls} mb-3`}
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
            {filtered.map((p) => {
              const img = productImages(p)[0];
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.title}
                  onClick={() => pick(p)}
                  className={`overflow-hidden rounded-lg border-2 ${
                    productId === p.id
                      ? "border-rose-500"
                      : "border-transparent"
                  }`}
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.url}
                      alt={p.title}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-neutral-100 text-[10px] text-neutral-400">
                      {p.title}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {selected && productImages(selected).length > 1 ? (
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-neutral-600">
                Choose which photo to post
              </p>
              <div className="flex gap-2 overflow-x-auto">
                {productImages(selected).map((img) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => setImageUrl(img.url)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded border-2 ${
                      imageUrl === img.url
                        ? "border-rose-500"
                        : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.altText}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-neutral-600">
              …or upload a different photo
            </p>
            <PhotoDropzone
              disabled={uploading}
              multiple={false}
              label="Drop a photo to post"
              onFiles={async (files) => {
                setUploading(true);
                try {
                  const img = await uploadAdminImage(files[0]!, adminPassword);
                  setImageUrl(img.url);
                } catch (e) {
                  notify(
                    e instanceof Error ? e.message : "Upload failed",
                    "error",
                  );
                } finally {
                  setUploading(false);
                }
              }}
            />
          </div>
        </div>

        <div className={`${card} p-5`}>
          <h2 className="mb-3 text-sm font-semibold">2. Write the caption</h2>
          <textarea
            className={inputCls}
            rows={8}
            value={caption}
            maxLength={2200}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption, hashtags…"
          />
          <p className="mt-1 text-right text-xs text-neutral-500">
            {caption.length} / 2200
          </p>
        </div>
      </div>

      <div className="lg:sticky lg:top-28 lg:self-start">
        <h2 className="mb-2 text-sm font-semibold">3. Preview &amp; post</h2>
        <div className={`${card} overflow-hidden`}>
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600" />
            <span className="text-sm font-semibold">yarn_it.co</span>
          </div>
          <div
            className="flex items-center justify-center bg-neutral-100"
            style={{ aspectRatio: imageUrl ? previewRatio : 1 }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Post preview"
                className="h-full w-full object-cover"
                onLoad={(e) =>
                  setPreviewRatio(
                    instagramRatio(
                      e.currentTarget.naturalWidth /
                        e.currentTarget.naturalHeight,
                    ),
                  )
                }
              />
            ) : (
              <span className="text-sm text-neutral-400">
                Pick a product or upload a photo
              </span>
            )}
          </div>
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap px-3 py-3 text-sm">
            <span className="font-semibold">yarn_it.co </span>
            {caption}
          </p>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Photos are converted to JPEG and cropped to Instagram&apos;s allowed
          shape (4:5 to 1.91:1) when you post.
        </p>
        {result ? (
          <p
            className={`mt-2 rounded-lg p-2 text-sm ${
              result.ok
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {result.message}
          </p>
        ) : null}
        <button
          className={`${btn} mt-3 w-full bg-gradient-to-r from-rose-500 to-fuchsia-600 py-3 text-white hover:opacity-90`}
          type="button"
          disabled={!imageUrl || posting || uploading}
          onClick={post}
        >
          {posting ? "Posting…" : "Post to Instagram"}
        </button>
      </div>
    </div>
  );
}

// ---------- categories ----------

function CategoriesTab({
  api,
  collections,
  notify,
  reload,
}: {
  api: Api;
  collections: any[];
  notify: Toast;
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        {collections.length === 0 ? <Empty>No categories yet.</Empty> : null}
        {collections.map((c) => (
          <div key={c.handle} className={`${card} p-4`}>
            {editing === c.handle ? (
              <CollectionFields
                item={c}
                submitLabel="Save"
                onCancel={() => setEditing(null)}
                onSubmit={async (payload) => {
                  const res = await api("collection", "PATCH", {
                    handle: c.handle,
                    ...payload,
                  });
                  if (!res.ok) return notify("Save failed", "error");
                  notify("Category saved");
                  setEditing(null);
                  await reload();
                }}
              />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {c.title}{" "}
                    {c.hidden ? <Badge tone="muted">hidden</Badge> : null}
                  </p>
                  <p className="text-sm text-neutral-500">/{c.handle}</p>
                  {c.description ? (
                    <p className="mt-1 text-sm text-neutral-600">
                      {c.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <button
                    className={btnGhost}
                    type="button"
                    onClick={() => setEditing(c.handle)}
                  >
                    Edit
                  </button>
                  <button
                    className={btnDanger}
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Delete category "${c.title}"?`)) return;
                      const res = await api("collection", "DELETE", {
                        handle: c.handle,
                      });
                      if (!res.ok) return notify("Delete failed", "error");
                      notify("Category deleted");
                      await reload();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={`${card} self-start p-5`}>
        <h2 className="mb-3 text-sm font-semibold">New category</h2>
        <CollectionFields
          key={collections.length}
          submitLabel="Create category"
          onSubmit={async (payload) => {
            const res = await api("collection", "POST", payload);
            if (!res.ok)
              return notify(
                `Create failed: ${JSON.stringify(res.data)}`,
                "error",
              );
            notify("Category created");
            await reload();
          }}
        />
      </div>
    </div>
  );
}

function CollectionFields({
  item,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  item?: any;
  submitLabel: string;
  onSubmit: (payload: any) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [handle, setHandle] = useState(item?.handle ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [hidden, setHidden] = useState(Boolean(item?.hidden));
  const [seo, setSeo] = useState(JSON.stringify(item?.seo ?? null, null, 2));
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (!title.trim() || !handle.trim())
          return setError("Title and handle are required");
        try {
          const payload: any = {
            title,
            handle: keepOrSlug(handle, item?.handle),
            description: description || null,
          };
          if (item)
            Object.assign(payload, {
              hidden,
              seo: parseJsonOr(seo, null, "SEO"),
            });
          await onSubmit(payload);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
        }
      }}
    >
      <Field label="Title">
        <input
          className={inputCls}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!item) setHandle(slugify(e.target.value));
          }}
        />
      </Field>
      <Field label="Handle">
        <input
          className={inputCls}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
        />
      </Field>
      <Field label="Description">
        <textarea
          className={inputCls}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      {item ? (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
            />
            Hidden from the shop
          </label>
          <details>
            <summary className="cursor-pointer text-sm text-neutral-600">
              SEO (JSON)
            </summary>
            <textarea
              className={`${inputCls} mt-2 font-mono text-xs`}
              rows={3}
              value={seo}
              onChange={(e) => setSeo(e.target.value)}
            />
          </details>
        </>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button className={btnPrimary}>{submitLabel}</button>
        {onCancel ? (
          <button className={btnGhost} type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

// ---------- pages ----------

function PagesTab({
  api,
  collections,
  notify,
  pages,
  reload,
}: {
  api: Api;
  collections: any[];
  notify: Toast;
  pages: any[];
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upsertPage(template: {
    handle: string;
    title: string;
    body: string;
    bodySummary: string;
  }) {
    const existing = pages.find((p) => p.handle === template.handle);
    const payload = {
      ...template,
      seo: { title: template.title, description: template.bodySummary },
    };
    const res = existing
      ? await api("page", "PATCH", { id: existing.id, ...payload })
      : await api("page", "POST", {
          id: `page_${template.handle}`,
          ...payload,
        });
    if (!res.ok)
      throw new Error(
        `Failed to save page ${template.handle}: ${JSON.stringify(res.data)}`,
      );
  }

  async function setupCatalogPages() {
    setBusy(true);
    try {
      await upsertPage({
        handle: "products",
        title: "All Products",
        body: '<p>Browse all products in the catalog.</p><p><a href="/search">Open all products</a></p>',
        bodySummary: "Browse all products in one place.",
      });
      for (const c of collections.filter((c) => !c.hidden)) {
        await upsertPage({
          handle: c.handle,
          title: c.title,
          body: `<p>${c.description || `Explore ${c.title}.`}</p><p><a href="/${c.handle}">Open ${c.title}</a></p>`,
          bodySummary: c.description || `Category page for ${c.title}.`,
        });
      }
      notify("Catalog pages ready");
      await reload();
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "Failed to create pages",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeAllPages() {
    if (
      !pages.length ||
      !confirm(`Delete all ${pages.length} pages? This cannot be undone.`)
    )
      return;
    setBusy(true);
    try {
      for (const p of pages) {
        const res = await api("page", "DELETE", { id: p.id });
        if (!res.ok) throw new Error(`Failed to delete page ${p.handle}`);
      }
      notify("All pages deleted");
      await reload();
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "Failed to delete pages",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        {pages.length === 0 ? <Empty>No pages yet.</Empty> : null}
        {pages.map((pg) => (
          <div key={pg.id} className={`${card} p-4`}>
            {editing === pg.id ? (
              <PageFields
                item={pg}
                submitLabel="Save"
                onCancel={() => setEditing(null)}
                onSubmit={async (payload) => {
                  const res = await api("page", "PATCH", {
                    id: pg.id,
                    ...payload,
                  });
                  if (!res.ok) return notify("Save failed", "error");
                  notify("Page saved");
                  setEditing(null);
                  await reload();
                }}
              />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{pg.title}</p>
                  <a
                    className="text-sm text-neutral-500 underline"
                    href={`/${pg.handle}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    /{pg.handle}
                  </a>
                </div>
                <div className="flex gap-1">
                  <button
                    className={btnGhost}
                    type="button"
                    onClick={() => setEditing(pg.id)}
                  >
                    Edit
                  </button>
                  <button
                    className={btnDanger}
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Delete page "${pg.title}"?`)) return;
                      const res = await api("page", "DELETE", { id: pg.id });
                      if (!res.ok) return notify("Delete failed", "error");
                      notify("Page deleted");
                      await reload();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="space-y-4 self-start">
        <div className={`${card} p-5`}>
          <h2 className="mb-3 text-sm font-semibold">New page</h2>
          <PageFields
            key={pages.length}
            submitLabel="Create page"
            onSubmit={async (payload) => {
              const res = await api("page", "POST", payload);
              if (!res.ok)
                return notify(
                  `Create failed: ${JSON.stringify(res.data)}`,
                  "error",
                );
              notify("Page created");
              await reload();
            }}
          />
        </div>
        <div className={`${card} p-5`}>
          <h2 className="mb-1 text-sm font-semibold">Bulk actions</h2>
          <p className="mb-3 text-xs text-neutral-500">
            One All Products page plus one page per visible category.
          </p>
          <div className="flex flex-col gap-2">
            <button
              className={btnGhost}
              type="button"
              disabled={busy}
              onClick={setupCatalogPages}
            >
              Create catalog pages
            </button>
            <button
              className={btnDanger}
              type="button"
              disabled={busy || !pages.length}
              onClick={removeAllPages}
            >
              Delete all pages
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageFields({
  item,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  item?: any;
  submitLabel: string;
  onSubmit: (payload: any) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [handle, setHandle] = useState(item?.handle ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [summary, setSummary] = useState(
    item?.body_summary ?? item?.bodySummary ?? "",
  );
  const [seo, setSeo] = useState(JSON.stringify(item?.seo ?? null, null, 2));
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (!title.trim() || !handle.trim())
          return setError("Title and handle are required");
        try {
          await onSubmit(
            item
              ? {
                  title,
                  handle: keepOrSlug(handle, item?.handle),
                  body,
                  body_summary: summary || null,
                  seo: parseJsonOr(seo, null, "SEO"),
                }
              : {
                  title,
                  handle: keepOrSlug(handle, item?.handle),
                  body,
                  bodySummary:
                    summary || body.replace(/<[^>]+>/g, "").slice(0, 160),
                },
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
        }
      }}
    >
      <Field label="Title">
        <input
          className={inputCls}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!item) setHandle(slugify(e.target.value));
          }}
        />
      </Field>
      <Field label="Handle">
        <input
          className={inputCls}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
        />
      </Field>
      <Field label="Body (HTML)">
        <textarea
          className={`${inputCls} font-mono text-xs`}
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      <Field label="Summary" hint="Short description for search engines">
        <textarea
          className={inputCls}
          rows={2}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </Field>
      {item ? (
        <details>
          <summary className="cursor-pointer text-sm text-neutral-600">
            SEO (JSON)
          </summary>
          <textarea
            className={`${inputCls} mt-2 font-mono text-xs`}
            rows={3}
            value={seo}
            onChange={(e) => setSeo(e.target.value)}
          />
        </details>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button className={btnPrimary}>{submitLabel}</button>
        {onCancel ? (
          <button className={btnGhost} type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
