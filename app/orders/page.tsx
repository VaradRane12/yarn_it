import { getOrdersFromSupabase } from "lib/store/supabase";

function formatOrderTotal(amount: string, currencyCode: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode || "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount || "0"));
  } catch {
    return `${currencyCode || "INR"} ${Number(amount || "0").toFixed(2)}`;
  }
}

function formatOrderDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export const metadata = {
  title: "My Orders",
  description: "Look up a guest order by order ID and email.",
};

export default async function OrdersPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const orderId =
    typeof searchParams?.orderId === "string"
      ? searchParams.orderId.trim()
      : "";
  const email =
    typeof searchParams?.email === "string" ? searchParams.email.trim() : "";

  let orders: Awaited<ReturnType<typeof getOrdersFromSupabase>> = [];
  let error: string | null = null;

  if (orderId || email) {
    try {
      orders = await getOrdersFromSupabase({
        orderId: orderId || undefined,
        email: email || undefined,
      });
    } catch (fetchError) {
      error =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load orders.";
    }
  }

  return (
    <section className="mx-auto max-w-4xl py-10">
      <div className="mb-8 space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900">
          My Orders
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-neutral-600">
          Guest orders can be looked up with an order ID and email.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form method="get" className="grid gap-4 sm:grid-cols-3">
          <label className="block sm:col-span-1">
            <span className="mb-1 block text-sm font-medium text-neutral-700">
              Order ID
            </span>
            <input
              name="orderId"
              defaultValue={orderId}
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-rose-500"
              placeholder="ord_..."
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="mb-1 block text-sm font-medium text-neutral-700">
              Email
            </span>
            <input
              name="email"
              defaultValue={email}
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-rose-500"
              placeholder="you@example.com"
            />
          </label>
          <div className="flex items-end sm:col-span-1">
            <button
              type="submit"
              className="w-full rounded-full bg-rose-500 px-5 py-3 text-sm font-medium text-white"
            >
              Find guest order
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs text-neutral-500">
          Guest orders can be searched by order ID, email, or both.
        </p>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {orderId || email ? (
        orders.length ? (
          <div className="mt-8 space-y-4">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">
                      {order.id}
                    </h2>
                    <p className="text-sm text-neutral-500">
                      {formatOrderDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-900">
                      {formatOrderTotal(
                        order.totalAmount.amount,
                        order.currencyCode,
                      )}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      {order.status} · {order.paymentStatus}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Customer
                    </p>
                    <p className="mt-1 text-sm text-neutral-700">
                      {order.customerEmail ||
                        order.guestEmail ||
                        "Guest checkout"}
                    </p>
                  </div>
                  {order.shipping ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Shipping
                      </p>
                      <p className="mt-1 text-sm text-neutral-700">
                        {order.shipping.name || ""}
                        <br />
                        {order.shipping.line1}
                        {order.shipping.line2 ? (
                          <>
                            <br />
                            {order.shipping.line2}
                          </>
                        ) : null}
                        <br />
                        {order.shipping.city}
                        {order.shipping.state
                          ? `, ${order.shipping.state}`
                          : ""}
                        <br />
                        {order.shipping.postalCode} · {order.shipping.country}
                        {order.shipping.phone ? (
                          <>
                            <br />
                            {order.shipping.phone}
                          </>
                        ) : null}
                      </p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Items
                    </p>
                    <p className="mt-1 text-sm text-neutral-700">
                      {order.cartSnapshot.totalQuantity} items
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {order.cartSnapshot.lines.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center justify-between gap-4 rounded-lg bg-neutral-50 p-3"
                    >
                      <div>
                        <p className="font-medium text-neutral-900">
                          {line.merchandise.product.title}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {line.merchandise.title} · Qty {line.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-neutral-900">
                        {formatOrderTotal(
                          line.cost.totalAmount.amount,
                          line.cost.totalAmount.currencyCode,
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            No matching guest order yet. Try the correct order ID or email.
          </p>
        )
      ) : null}
    </section>
  );
}
