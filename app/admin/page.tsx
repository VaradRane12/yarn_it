"use client";

import { useState } from "react";

function FormField({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

type AdminImage = {
  url: string;
  altText: string;
  width: number;
  height: number;
};

type ProductDraft = {
  title?: string;
  handle?: string;
  description?: string | null;
  available_for_sale?: boolean;
  options?: unknown;
  price_range?: unknown;
  variants?: unknown;
  featured_image?: unknown;
  images?: unknown;
  seo?: unknown;
  tags?: string[];
  collection_handles?: string[];
  recommendation_ids?: string[];
  sales_rank?: number | null;
};

function imageObjectFromUrl(url: string, altText: string): AdminImage {
  return {
    url,
    altText,
    width: 1200,
    height: 1200,
  };
}

async function uploadAdminImage(file: File, adminPassword: string) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/admin/upload-image", {
    method: "POST",
    headers: {
      "x-admin-password": adminPassword,
    },
    body: formData,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || "Image upload failed");
  }

  return json as { url: string; name?: string };
}

function parseImageArray(value: string): AdminImage[] {
  if (!value.trim()) return [];
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed : [];
}

function appendImages(currentValue: string, nextImages: AdminImage[]) {
  const current = parseImageArray(currentValue);
  return JSON.stringify([...current, ...nextImages], null, 2);
}

function parseProductDraft(value: string): ProductDraft | null {
  if (!value.trim()) return null;

  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Product JSON must be an object");
  }

  return parsed as ProductDraft;
}

function imagePreviewList(images: AdminImage[]) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {images.map((image, index) => (
        <div key={`${image.url}-${index}`} className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="aspect-square bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.altText} className="h-full w-full object-cover" />
          </div>
          <div className="p-2">
            <p className="truncate text-xs font-medium text-neutral-900">{image.altText || "Untitled image"}</p>
            <p className="truncate text-[11px] text-neutral-500">{image.url}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function applyProductDraft(value: string, setDraft: (draft: ProductDraft) => void) {
  const draft = parseProductDraft(value);
  if (!draft) return;
  setDraft(draft);
}

function serializeProductDraft(draft: ProductDraft) {
  return JSON.stringify(draft, null, 2);
}

function PhotoDropzone({
  label,
  helper,
  onFiles,
  disabled,
}: {
  label: string;
  helper?: string;
  onFiles: (files: FileList) => Promise<void>;
  disabled?: boolean;
}) {
  const [dragActive, setDragActive] = useState(false);

  return (
    <div
      className={`rounded-xl border-2 border-dashed p-5 text-sm transition-colors ${
        dragActive ? "border-rose-500 bg-rose-50" : "border-neutral-300 bg-neutral-50"
      } ${disabled ? "opacity-60" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={async (event) => {
        event.preventDefault();
        setDragActive(false);
        if (disabled) return;
        const files = event.dataTransfer.files;
        if (files.length) {
          await onFiles(files);
        }
      }}
    >
      <p className="font-medium text-neutral-900">{label}</p>
      <p className="mt-1 text-neutral-600">{helper || "Drag files here or click to select them."}</p>
      <input
        className="mt-3 block w-full text-sm"
        type="file"
        accept="image/*"
        multiple
        disabled={disabled}
        onChange={async (event) => {
          const files = event.target.files;
          if (files?.length) {
            await onFiles(files);
          }
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingCollectionHandle, setEditingCollectionHandle] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  async function loadAll() {
    if (!adminPassword) return;
    const headers = { 'x-admin-password': adminPassword };
    try {
      const [pRes, cRes, pgRes, oRes] = await Promise.all([
        fetch('/api/admin/product', { headers }),
        fetch('/api/admin/collection', { headers }),
        fetch('/api/admin/page', { headers }),
        fetch('/api/admin/order', { headers }),
      ]);
      if (pRes.ok) setProducts(await pRes.json());
      if (cRes.ok) setCollections(await cRes.json());
      if (pgRes.ok) setPages(await pgRes.json());
      if (oRes.ok) setOrders(await oRes.json());
    } catch (err) {
      // ignore
    }
  }

  async function updateOrder(id: string, payload: any) {
    const res = await fetch('/api/admin/order', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword,
      },
      body: JSON.stringify({ id, ...payload }),
    });

    if (res.ok) {
      setStatus('order updated');
      await loadAll();
    } else {
      setStatus('order update failed');
    }
  }

  async function submit(path: string, data: any) {
    setStatus("working...");
    const res = await fetch(`/api/admin/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPassword,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) setStatus(`error: ${JSON.stringify(json)}`);
    else {
      setStatus("ok");
      await loadAll();
    }
  }

  async function upsertPageByHandle(template: {
    handle: string;
    title: string;
    body: string;
    bodySummary: string;
  }) {
    const existingPage = pages.find((page) => page.handle === template.handle);

    if (existingPage) {
      const response = await fetch("/api/admin/page", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({
          id: existingPage.id,
          title: template.title,
          handle: template.handle,
          body: template.body,
          bodySummary: template.bodySummary,
          seo: {
            title: template.title,
            description: template.bodySummary,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to update page ${template.handle}: ${errorBody}`);
      }

      return;
    }

    const response = await fetch("/api/admin/page", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPassword,
      },
      body: JSON.stringify({
        id: `page_${template.handle}`,
        title: template.title,
        handle: template.handle,
        body: template.body,
        bodySummary: template.bodySummary,
        seo: {
          title: template.title,
          description: template.bodySummary,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to create page ${template.handle}: ${errorBody}`);
    }
  }

  async function setupCatalogPages() {
    if (!adminPassword) {
      setStatus("enter admin password first");
      return;
    }

    setStatus("creating catalog pages...");

    try {
      await upsertPageByHandle({
        handle: "products",
        title: "All Products",
        body: '<p>Browse all products in the catalog.</p><p><a href="/search">Open all products</a></p>',
        bodySummary: "Browse all products in one place.",
      });

      const visibleCollections = collections.filter((collection) => !collection.hidden);
      for (const collection of visibleCollections) {
        await upsertPageByHandle({
          handle: `${collection.handle}`,
          title: `${collection.title}`,
          body: `<p>${collection.description || `Explore ${collection.title}.`}</p><p><a href="/${collection.handle}">Open ${collection.title}</a></p>`,
          bodySummary: `${collection.description || `Category page for ${collection.title}.`}`,
        });
      }

      await loadAll();
      setStatus("catalog pages ready");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "failed to create catalog pages");
    }
  }

  async function removeAllPages() {
    if (!adminPassword) {
      setStatus("enter admin password first");
      return;
    }

    if (!pages.length) {
      setStatus("no pages to delete");
      return;
    }

    if (!confirm("Delete all current pages?")) {
      return;
    }

    setStatus("deleting pages...");

    try {
      for (const page of pages) {
        const response = await fetch("/api/admin/page", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": adminPassword,
          },
          body: JSON.stringify({ id: page.id }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to delete page ${page.handle}: ${errorBody}`);
        }
      }

      await loadAll();
      setStatus("all pages deleted");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "failed to delete pages");
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-2xl font-bold">Admin dashboard</h1>
      <p className="mb-4">Set an `ADMIN_PASSWORD` in your .env.local to protect these endpoints.</p>

      <FormField>
        <label className="block mb-1">Admin password</label>
        <input className="w-full rounded border px-3 py-2" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
        <div className="mt-2">
          <button className="mr-2 rounded bg-gray-200 px-3 py-1" onClick={loadAll} type="button">Load data</button>
        </div>
      </FormField>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Create product</h2>
        <ProductForm
          adminPassword={adminPassword}
          collections={collections}
          onSubmit={(d) => submit("product", d)}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Create category</h2>
        <CollectionForm onSubmit={(d) => submit("collection", d)} />
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Create page</h2>
        <PageForm onSubmit={(d) => submit("page", d)} />
      </section>

      <section className="mb-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <h2 className="mb-2 text-lg font-semibold">Catalog page setup</h2>
        <p className="mb-3 text-sm text-neutral-600">
          Create one All Products page and one page per visible collection, or remove all existing pages in one click.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded bg-neutral-900 px-3 py-2 text-sm text-white"
            type="button"
            onClick={setupCatalogPages}
          >
            Create all products + category pages
          </button>
          <button
            className="rounded bg-red-600 px-3 py-2 text-sm text-white"
            type="button"
            onClick={removeAllPages}
          >
            Remove all current pages
          </button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Orders</h2>
        <p className="mb-3 text-sm text-neutral-600">Orders are created at checkout. Use these buttons after verifying UPI payment manually.</p>
        {orders.length === 0 ? (
          <p className="text-sm text-neutral-500">No orders loaded</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{order.id}</p>
                    <p className="text-sm text-neutral-600">
                      {order.currency_code} {order.total_amount} | status: {order.status} | payment: {order.payment_status}
                    </p>
                    <p className="text-xs text-neutral-500">{order.created_at}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded bg-emerald-600 px-3 py-1 text-sm text-white"
                      onClick={() =>
                        updateOrder(order.id, {
                          status: 'paid',
                          payment_status: 'paid',
                        })
                      }
                    >
                      Mark paid
                    </button>
                    <button
                      type="button"
                      className="rounded bg-amber-500 px-3 py-1 text-sm text-white"
                      onClick={() =>
                        updateOrder(order.id, {
                          status: 'pending',
                          payment_status: 'pending',
                        })
                      }
                    >
                      Mark pending
                    </button>
                    <button
                      type="button"
                      className="rounded bg-red-600 px-3 py-1 text-sm text-white"
                      onClick={() =>
                        updateOrder(order.id, {
                          status: 'cancelled',
                          payment_status: 'failed',
                        })
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6">Status: {status}</div>

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">Products</h2>
        <div className="mb-4">
          {products.length === 0 ? <p className="text-sm text-neutral-500">No products loaded</p> : (
            <ul className="space-y-3">
              {products.map((p) => (
                <li key={p.id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-sm text-neutral-500">{p.handle}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded border border-neutral-300 px-3 py-1" onClick={() => setEditingProductId(editingProductId === p.id ? null : p.id)} type="button">{editingProductId === p.id ? "Close" : "Edit"}</button>
                      <button className="rounded bg-red-500 px-3 py-1 text-white" onClick={async () => {
                        if (!confirm('Delete product?')) return;
                        const res = await fetch('/api/admin/product', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }, body: JSON.stringify({ id: p.id }) });
                        if (res.ok) { setStatus('deleted'); loadAll(); } else { setStatus('delete failed'); }
                      }} type="button">Delete</button>
                    </div>
                  </div>
                  {editingProductId === p.id ? (
                    <div className="mt-4 border-t border-neutral-200 pt-4">
                      <ProductEditor
                        adminPassword={adminPassword}
                        item={p}
                        onCancel={() => setEditingProductId(null)}
                        onSave={async (payload) => {
                          const res = await fetch('/api/admin/product', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
                            body: JSON.stringify({ id: p.id, ...payload }),
                          });
                          if (res.ok) {
                            setStatus('updated');
                            setEditingProductId(null);
                            await loadAll();
                          } else {
                            setStatus('update failed');
                          }
                        }}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <h2 className="mb-2 text-lg font-semibold">Categories</h2>
        <div className="mb-4">
          {collections.length === 0 ? <p className="text-sm text-neutral-500">No collections loaded</p> : (
            <ul className="space-y-3">
              {collections.map((c) => (
                <li key={c.handle} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{c.title}</div>
                      <div className="text-sm text-neutral-500">{c.handle}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded border border-neutral-300 px-3 py-1" onClick={() => setEditingCollectionHandle(editingCollectionHandle === c.handle ? null : c.handle)} type="button">{editingCollectionHandle === c.handle ? "Close" : "Edit"}</button>
                      <button className="rounded bg-red-500 px-3 py-1 text-white" onClick={async () => {
                        if (!confirm('Delete collection?')) return;
                        const res = await fetch('/api/admin/collection', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }, body: JSON.stringify({ handle: c.handle }) });
                        if (res.ok) { setStatus('deleted'); loadAll(); } else { setStatus('delete failed'); }
                      }} type="button">Delete</button>
                    </div>
                  </div>
                  {editingCollectionHandle === c.handle ? (
                    <div className="mt-4 border-t border-neutral-200 pt-4">
                      <CollectionEditor
                        item={c}
                        onCancel={() => setEditingCollectionHandle(null)}
                        onSave={async (payload) => {
                          const res = await fetch('/api/admin/collection', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
                            body: JSON.stringify({ handle: c.handle, ...payload }),
                          });
                          if (res.ok) {
                            setStatus('updated');
                            setEditingCollectionHandle(null);
                            await loadAll();
                          } else {
                            setStatus('update failed');
                          }
                        }}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <h2 className="mb-2 text-lg font-semibold">Pages</h2>
        <div className="mb-4">
          {pages.length === 0 ? <p className="text-sm text-neutral-500">No pages loaded</p> : (
            <ul className="space-y-3">
              {pages.map((pg) => (
                <li key={pg.id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{pg.title}</div>
                      <div className="text-sm text-neutral-500">{pg.handle}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded border border-neutral-300 px-3 py-1" onClick={() => setEditingPageId(editingPageId === pg.id ? null : pg.id)} type="button">{editingPageId === pg.id ? "Close" : "Edit"}</button>
                      <button className="rounded bg-red-500 px-3 py-1 text-white" onClick={async () => {
                        if (!confirm('Delete page?')) return;
                        const res = await fetch('/api/admin/page', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }, body: JSON.stringify({ id: pg.id }) });
                        if (res.ok) { setStatus('deleted'); loadAll(); } else { setStatus('delete failed'); }
                      }} type="button">Delete</button>
                    </div>
                  </div>
                  {editingPageId === pg.id ? (
                    <div className="mt-4 border-t border-neutral-200 pt-4">
                      <PageEditor
                        item={pg}
                        onCancel={() => setEditingPageId(null)}
                        onSave={async (payload) => {
                          const res = await fetch('/api/admin/page', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
                            body: JSON.stringify({ id: pg.id, ...payload }),
                          });
                          if (res.ok) {
                            setStatus('updated');
                            setEditingPageId(null);
                            await loadAll();
                          } else {
                            setStatus('update failed');
                          }
                        }}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function ProductForm({
  adminPassword,
  collections,
  onSubmit,
}: {
  adminPassword: string;
  collections: any[];
  onSubmit: (d: any) => void;
}) {
  const [handle, setHandle] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryHandle, setCategoryHandle] = useState("");
  const [collectionHandles, setCollectionHandles] = useState("");
  const [images, setImages] = useState("[]");
  const [featuredImage, setFeaturedImage] = useState("null");
  const [productJson, setProductJson] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const visibleCollections = collections.filter(
    (collection) => collection?.handle && !collection?.hidden,
  );

  const currentImages = (() => {
    try {
      return parseImageArray(images);
    } catch {
      return [];
    }
  })();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const categoryList = Array.from(
          new Set([categoryHandle, ...csvToList(collectionHandles)].filter(Boolean)),
        );

        onSubmit({
          handle,
          title,
          description: description || null,
          collection_handles: categoryList,
          featured_image: parseJsonOr(featuredImage, null, "featured image"),
          images: parseJsonOr(images, [], "images"),
        });
      }}
    >
      <div className="mb-2">
        <label className="block mb-1">Handle</label>
        <input className="w-full rounded border px-3 py-2" value={handle} onChange={(e) => setHandle(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Title</label>
        <input className="w-full rounded border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Description</label>
        <textarea className="w-full rounded border px-3 py-2" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Primary category</label>
        <select
          className="w-full rounded border px-3 py-2"
          value={categoryHandle}
          onChange={(e) => setCategoryHandle(e.target.value)}
        >
          <option value="">Select category</option>
          {visibleCollections.map((collection) => (
            <option key={collection.handle} value={collection.handle}>
              {collection.title} ({collection.handle})
            </option>
          ))}
        </select>
      </div>
      <div className="mb-2">
        <label className="block mb-1">Category handles (comma separated)</label>
        <input
          className="w-full rounded border px-3 py-2"
          value={collectionHandles}
          onChange={(e) => setCollectionHandles(e.target.value)}
          placeholder="sarees, summer-drop"
        />
      </div>
      <div className="mb-2">
        <PhotoDropzone
          label="Drag product photos here"
          helper="Files will upload to Supabase Storage bucket yarnPhotos and be added to the product images list."
          disabled={uploading}
          onFiles={async (files) => {
            setUploading(true);
            setUploadError(null);
            try {
              const uploaded = await Promise.all(
                Array.from(files).map(async (file) => {
                  const result = await uploadAdminImage(file, adminPassword);
                  return imageObjectFromUrl(result.url, file.name);
                }),
              );
              setImages((current) => appendImages(current, uploaded));
              setFeaturedImage((current) => {
                try {
                  const parsed = current.trim() && current.trim() !== "null" ? JSON.parse(current) : null;
                  if (parsed) return current;
                } catch {
                  // ignore and fall through to first uploaded image
                }
                return JSON.stringify(uploaded[0] ?? null, null, 2);
              });
            } catch (error) {
              setUploadError(error instanceof Error ? error.message : "Upload failed");
            } finally {
              setUploading(false);
            }
          }}
        />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Featured image (JSON)</label>
        <textarea className="w-full rounded border px-3 py-2 font-mono text-sm" rows={4} value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Images (JSON)</label>
        <textarea className="w-full rounded border px-3 py-2 font-mono text-sm" rows={6} value={images} onChange={(e) => setImages(e.target.value)} />
      </div>
      {currentImages.length > 0 ? (
        <div className="mb-3">
          <p className="mb-2 text-sm font-medium text-neutral-700">Image preview</p>
          {imagePreviewList(currentImages)}
        </div>
      ) : null}
      <div className="mb-2">
        <label className="block mb-1">Product JSON import</label>
        <textarea className="w-full rounded border px-3 py-2 font-mono text-sm" rows={8} value={productJson} onChange={(e) => setProductJson(e.target.value)} placeholder='{"title":"...","handle":"...","images":[...]}' />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="rounded border border-neutral-300 px-3 py-1"
            onClick={() => {
              setUploadError(null);
              try {
                applyProductDraft(productJson, (draft) => {
                  if (typeof draft.title === "string") setTitle(draft.title);
                  if (typeof draft.handle === "string") setHandle(draft.handle);
                  if (typeof draft.description === "string" || draft.description === null) setDescription(draft.description ?? "");
                  if (Array.isArray(draft.collection_handles)) {
                    setCategoryHandle(draft.collection_handles[0] ?? "");
                    setCollectionHandles(draft.collection_handles.join(", "));
                  }
                  if (typeof draft.featured_image !== "undefined") setFeaturedImage(JSON.stringify(draft.featured_image ?? null, null, 2));
                  if (typeof draft.images !== "undefined") setImages(JSON.stringify(draft.images ?? [], null, 2));
                });
              } catch (error) {
                setUploadError(error instanceof Error ? error.message : "Invalid product JSON");
              }
            }}
          >
            Load JSON
          </button>
          <button
            type="button"
            className="rounded border border-neutral-300 px-3 py-1"
            onClick={() => {
              setProductJson(
                serializeProductDraft({
                  title,
                  handle,
                  description,
                  collection_handles: Array.from(
                    new Set([categoryHandle, ...csvToList(collectionHandles)].filter(Boolean)),
                  ),
                  featured_image: parseJsonOr(featuredImage, null, "featured image"),
                  images: parseJsonOr(images, [], "images"),
                }),
              );
            }}
          >
            Export JSON
          </button>
        </div>
      </div>
      {uploadError ? <p className="mb-2 text-sm text-red-600">{uploadError}</p> : null}
      {uploading ? <p className="mb-2 text-sm text-neutral-500">Uploading...</p> : null}
      <button className="rounded bg-rose-500 px-4 py-2 text-white">Create product</button>
    </form>
  );
}

function ProductEditor({ adminPassword, item, onSave, onCancel }: { adminPassword: string; item: any; onSave: (d: any) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(item.title ?? "");
  const [handle, setHandle] = useState(item.handle ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [availableForSale, setAvailableForSale] = useState(Boolean(item.available_for_sale ?? true));
  const [options, setOptions] = useState(JSON.stringify(item.options ?? [], null, 2));
  const [priceRange, setPriceRange] = useState(JSON.stringify(item.price_range ?? null, null, 2));
  const [variants, setVariants] = useState(JSON.stringify(item.variants ?? [], null, 2));
  const [featuredImage, setFeaturedImage] = useState(JSON.stringify(item.featured_image ?? null, null, 2));
  const [images, setImages] = useState(JSON.stringify(item.images ?? [], null, 2));
  const [seo, setSeo] = useState(JSON.stringify(item.seo ?? null, null, 2));
  const [tags, setTags] = useState(Array.isArray(item.tags) ? item.tags.join(", ") : "");
  const [collectionHandles, setCollectionHandles] = useState(Array.isArray(item.collection_handles) ? item.collection_handles.join(", ") : "");
  const [recommendationIds, setRecommendationIds] = useState(Array.isArray(item.recommendation_ids) ? item.recommendation_ids.join(", ") : "");
  const [salesRank, setSalesRank] = useState(item.sales_rank ?? "");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [productJson, setProductJson] = useState("");

  const currentImages = (() => {
    try {
      return parseImageArray(images);
    } catch {
      return [];
    }
  })();

  const currentFeaturedImage = (() => {
    try {
      return featuredImage.trim() && featuredImage.trim() !== "null" ? JSON.parse(featuredImage) : null;
    } catch {
      return null;
    }
  })();

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          await onSave({
            title,
            handle,
            description: description || null,
            available_for_sale: availableForSale,
            options: parseJsonOr(options, [], "options"),
            price_range: parseJsonOr(priceRange, null, "price range"),
            variants: parseJsonOr(variants, [], "variants"),
            featured_image: parseJsonOr(featuredImage, null, "featured image"),
            images: parseJsonOr(images, [], "images"),
            seo: parseJsonOr(seo, null, "seo"),
            tags: csvToList(tags),
            collection_handles: csvToList(collectionHandles),
            recommendation_ids: csvToList(recommendationIds),
            sales_rank: salesRank === "" ? null : Number(salesRank),
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save product");
        }
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <TextField label="Title" value={title} onChange={setTitle} />
        <TextField label="Handle" value={handle} onChange={setHandle} />
      </div>
      <TextAreaField label="Description" value={description} onChange={setDescription} rows={4} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={availableForSale} onChange={(e) => setAvailableForSale(e.target.checked)} />
        Available for sale
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <TextAreaField label="Options (JSON)" value={options} onChange={setOptions} rows={4} />
        <TextAreaField label="Price range (JSON)" value={priceRange} onChange={setPriceRange} rows={4} />
        <TextAreaField label="Variants (JSON)" value={variants} onChange={setVariants} rows={6} />
        <TextAreaField label="Featured image (JSON)" value={featuredImage} onChange={setFeaturedImage} rows={4} />
        <TextAreaField label="Images (JSON)" value={images} onChange={setImages} rows={6} />
        <TextAreaField label="SEO (JSON)" value={seo} onChange={setSeo} rows={4} />
      </div>
      {currentFeaturedImage?.url ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="aspect-square bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentFeaturedImage.url} alt={currentFeaturedImage.altText || title} className="h-full w-full object-cover" />
            </div>
            <div className="p-2 text-xs text-neutral-500">Featured image preview</div>
          </div>
          {currentImages.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-neutral-700">Image previews</p>
              {imagePreviewList(currentImages)}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <label className="mb-1 block text-sm font-medium text-neutral-700">Product JSON import/export</label>
        <textarea className="w-full rounded border px-3 py-2 font-mono text-sm" rows={8} value={productJson} onChange={(e) => setProductJson(e.target.value)} placeholder='{"title":"...","handle":"...","images":[...]}' />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="rounded border border-neutral-300 px-3 py-1"
            onClick={() => {
              setUploadError(null);
              try {
                applyProductDraft(productJson, (draft) => {
                  if (typeof draft.title === "string") setTitle(draft.title);
                  if (typeof draft.handle === "string") setHandle(draft.handle);
                  if (typeof draft.description === "string" || draft.description === null) setDescription(draft.description ?? "");
                  if (typeof draft.available_for_sale === "boolean") setAvailableForSale(draft.available_for_sale);
                  if (typeof draft.options !== "undefined") setOptions(JSON.stringify(draft.options ?? [], null, 2));
                  if (typeof draft.price_range !== "undefined") setPriceRange(JSON.stringify(draft.price_range ?? null, null, 2));
                  if (typeof draft.variants !== "undefined") setVariants(JSON.stringify(draft.variants ?? [], null, 2));
                  if (typeof draft.featured_image !== "undefined") setFeaturedImage(JSON.stringify(draft.featured_image ?? null, null, 2));
                  if (typeof draft.images !== "undefined") setImages(JSON.stringify(draft.images ?? [], null, 2));
                  if (typeof draft.seo !== "undefined") setSeo(JSON.stringify(draft.seo ?? null, null, 2));
                  if (Array.isArray(draft.tags)) setTags(draft.tags.join(", "));
                  if (Array.isArray(draft.collection_handles)) setCollectionHandles(draft.collection_handles.join(", "));
                  if (Array.isArray(draft.recommendation_ids)) setRecommendationIds(draft.recommendation_ids.join(", "));
                  if (typeof draft.sales_rank !== "undefined" && draft.sales_rank !== null) setSalesRank(String(draft.sales_rank));
                });
              } catch (error) {
                setUploadError(error instanceof Error ? error.message : "Invalid product JSON");
              }
            }}
          >
            Load JSON
          </button>
          <button
            type="button"
            className="rounded border border-neutral-300 px-3 py-1"
            onClick={() => {
              setProductJson(
                serializeProductDraft({
                  title,
                  handle,
                  description: description || null,
                  available_for_sale: availableForSale,
                  options: parseJsonOr(options, [], "options"),
                  price_range: parseJsonOr(priceRange, null, "price range"),
                  variants: parseJsonOr(variants, [], "variants"),
                  featured_image: parseJsonOr(featuredImage, null, "featured image"),
                  images: parseJsonOr(images, [], "images"),
                  seo: parseJsonOr(seo, null, "seo"),
                  tags: csvToList(tags),
                  collection_handles: csvToList(collectionHandles),
                  recommendation_ids: csvToList(recommendationIds),
                  sales_rank: salesRank === "" ? null : Number(salesRank),
                }),
              );
            }}
          >
            Export JSON
          </button>
        </div>
      </div>
      <PhotoDropzone
        label="Drag more product photos here"
        helper="Uploaded files go to yarnPhotos and are appended to the product images list."
        disabled={uploading}
        onFiles={async (files) => {
          setUploading(true);
          setUploadError(null);
          try {
            const uploaded = await Promise.all(
              Array.from(files).map(async (file) => {
                const result = await uploadAdminImage(file, adminPassword);
                return imageObjectFromUrl(result.url, file.name);
              }),
            );
            setImages((current) => appendImages(current, uploaded));
            setFeaturedImage((current) => {
              try {
                const currentValue = current.trim() && current.trim() !== "null" ? JSON.parse(current) : null;
                if (currentValue) return current;
                return JSON.stringify(uploaded[0], null, 2);
              } catch {
                return JSON.stringify(uploaded[0], null, 2);
              }
            });
          } catch (error) {
            setUploadError(error instanceof Error ? error.message : "Upload failed");
          } finally {
            setUploading(false);
          }
        }}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <TextField label="Tags (comma separated)" value={tags} onChange={setTags} />
        <TextField label="Collection handles (comma separated)" value={collectionHandles} onChange={setCollectionHandles} />
        <TextField label="Recommendation IDs (comma separated)" value={recommendationIds} onChange={setRecommendationIds} />
        <TextField label="Sales rank" value={String(salesRank)} onChange={setSalesRank} type="number" />
      </div>
      {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
      {uploading ? <p className="text-sm text-neutral-500">Uploading...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button className="rounded bg-rose-500 px-4 py-2 text-white" type="submit">Save product</button>
        <button className="rounded border border-neutral-300 px-4 py-2" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function CollectionEditor({ item, onSave, onCancel }: { item: any; onSave: (d: any) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(item.title ?? "");
  const [handle, setHandle] = useState(item.handle ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [seo, setSeo] = useState(JSON.stringify(item.seo ?? null, null, 2));
  const [hidden, setHidden] = useState(Boolean(item.hidden ?? false));
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          await onSave({
            title,
            handle,
            description: description || null,
            seo: parseJsonOr(seo, null, "seo"),
            hidden,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save collection");
        }
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <TextField label="Title" value={title} onChange={setTitle} />
        <TextField label="Handle" value={handle} onChange={setHandle} />
      </div>
      <TextAreaField label="Description" value={description} onChange={setDescription} rows={4} />
      <TextAreaField label="SEO (JSON)" value={seo} onChange={setSeo} rows={4} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
        Hidden
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button className="rounded bg-rose-500 px-4 py-2 text-white" type="submit">Save collection</button>
        <button className="rounded border border-neutral-300 px-4 py-2" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function PageEditor({ item, onSave, onCancel }: { item: any; onSave: (d: any) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(item.title ?? "");
  const [handle, setHandle] = useState(item.handle ?? "");
  const [body, setBody] = useState(item.body ?? "");
  const [bodySummary, setBodySummary] = useState(item.body_summary ?? item.bodySummary ?? "");
  const [seo, setSeo] = useState(JSON.stringify(item.seo ?? null, null, 2));
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          await onSave({
            title,
            handle,
            body,
            body_summary: bodySummary || null,
            seo: parseJsonOr(seo, null, "seo"),
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save page");
        }
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <TextField label="Title" value={title} onChange={setTitle} />
        <TextField label="Handle" value={handle} onChange={setHandle} />
      </div>
      <TextAreaField label="Body (HTML)" value={body} onChange={setBody} rows={6} />
      <TextAreaField label="Body summary" value={bodySummary} onChange={setBodySummary} rows={3} />
      <TextAreaField label="SEO (JSON)" value={seo} onChange={setSeo} rows={4} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button className="rounded bg-rose-500 px-4 py-2 text-white" type="submit">Save page</button>
        <button className="rounded border border-neutral-300 px-4 py-2" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-neutral-700">{label}</span>
      <input className="w-full rounded border border-neutral-300 px-3 py-2" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function TextAreaField({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-neutral-700">{label}</span>
      <textarea className="w-full rounded border border-neutral-300 px-3 py-2 font-mono text-sm" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function parseJsonOr(value: string, fallback: any, label: string) {
  if (!value.trim()) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid JSON for ${label}`);
  }
}

function csvToList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function CollectionForm({ onSubmit }: { onSubmit: (d: any) => void }) {
  const [handle, setHandle] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ handle, title, description: description || null });
      }}
    >
      <div className="mb-2">
        <label className="block mb-1">Handle</label>
        <input className="w-full rounded border px-3 py-2" value={handle} onChange={(e) => setHandle(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Title</label>
        <input className="w-full rounded border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Description</label>
        <textarea className="w-full rounded border px-3 py-2" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <button className="rounded bg-rose-500 px-4 py-2 text-white">Create collection</button>
    </form>
  );
}

function PageForm({ onSubmit }: { onSubmit: (d: any) => void }) {
  const [handle, setHandle] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ handle, title, body, bodySummary: body.slice(0, 160) });
      }}
    >
      <div className="mb-2">
        <label className="block mb-1">Handle</label>
        <input className="w-full rounded border px-3 py-2" value={handle} onChange={(e) => setHandle(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Title</label>
        <input className="w-full rounded border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Body (HTML)</label>
        <textarea className="w-full rounded border px-3 py-2" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <button className="rounded bg-rose-500 px-4 py-2 text-white">Create page</button>
    </form>
  );
}
