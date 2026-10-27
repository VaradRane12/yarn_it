import PageHeader from "components/page-header";
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
      timeZone: "Asia/Kolkata",
      timeZoneName: "short",
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

  const phone =
    typeof searchParams?.phone === "string" ? searchParams.phone.trim() : "";

  let orders: Awaited<ReturnType<typeof getOrdersFromSupabase>> = [];
  let error: string | null = null;

  if (orderId || email || phone) {
    try {
      orders = await getOrdersFromSupabase({
        orderId: orderId || undefined,
        email: email || undefined,
        phone: phone || undefined,
      });
    } catch (fetchError) {
      error =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load orders.";
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-4 pb-20">
      <PageHeader
        eyebrow="Track it"
        title={
          <>
            Your <span className="text-outline">orders</span>
          </>
        }
      >
        Look up an order with its order ID, your email, your phone number, or any mix.
      </PageHeader>

      <div className="card">
        <form method="get" className="grid gap-4 sm:grid-cols-3">
          <label className="block sm:col-span-1">
            <span className="field-label">Order ID</span>
            <input
              name="orderId"
              defaultValue={orderId}
              className="field"
              placeholder="YI-ABC123"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="field-label">Email</span>
            <input
              name="email"
              defaultValue={email}
              className="field"
              placeholder="you@example.com"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="field-label">Phone</span>
            <input
              name="phone"
              defaultValue={phone}
              className="field"
              placeholder="As entered at checkout"
            />
          </label>
          <div className="flex items-end sm:col-span-1">
            <button type="submit" className="btn w-full">
              Find my order
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs font-medium text-ink/60">
          Your order ID is in your confirmation, e.g. YI-ABC123
        </p>
      </div>

      {error ? (
        <p className="mt-6 rounded-2xl border-2 border-ink bg-coral/30 p-4 text-sm font-medium">
          {error}
        </p>
      ) : null}

      {orderId || email || phone ? (
        orders.length ? (
          <div className="mt-8 space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl uppercase">
                      {order.id}
                    </h2>
                    <p className="text-sm font-medium text-ink/60">
                      {formatOrderDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="rounded-full bg-ink px-3 py-1 text-sm font-bold text-cream">
                      {formatOrderTotal(
                        order.totalAmount.amount,
                        order.currencyCode,
                      )}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wide">
                      {order.status} · {order.paymentStatus}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="field-label">Customer</p>
                    <p className="mt-1 text-sm font-medium">
                      {order.customerEmail ||
                        order.guestEmail ||
                        "Guest checkout"}
                    </p>
                  </div>
                  {order.shipping ? (
                    <div>
                      <p className="field-label">Shipping</p>
                      <p className="mt-1 text-sm font-medium">
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
                    <p className="field-label">Items</p>
                    <p className="mt-1 text-sm font-medium">
                      {order.cartSnapshot.totalQuantity} items
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {order.cartSnapshot.lines.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border-2 border-ink bg-cream p-3"
                    >
                      <div>
                        <p className="font-bold">
                          {line.merchandise.product.title}
                        </p>
                        <p className="text-sm font-medium text-ink/60">
                          {line.merchandise.title} · Qty {line.quantity}
                        </p>
                      </div>
                      <p className="rounded-full bg-ink px-3 py-1 text-sm font-bold text-cream">
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
          <p className="mt-8 rounded-2xl border-2 border-ink bg-butter p-4 text-sm font-medium">
            No matching order yet. Double-check the order ID or email.
          </p>
        )
      ) : null}
    </section>
  );
}
