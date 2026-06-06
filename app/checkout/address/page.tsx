import { cookies } from "next/headers";

export const metadata = {
  title: "Shipping address",
  description: "Enter shipping address before completing checkout",
};

export default async function AddressPage() {
  const cookieStore = await cookies();
  const cartId = cookieStore.get("cartId")?.value ?? "";

  return (
    <section className="mx-auto max-w-xl py-10">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Shipping address</h1>
        <p className="mt-2 text-sm text-neutral-600">We need your shipping details before creating the order.</p>

        <form action="/api/checkout/address" method="post" className="mt-6 space-y-4">
          {/* Pass cartId so the API route can look up the cart directly */}
          <input type="hidden" name="cartId" value={cartId} />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Full name</span>
            <input name="name" className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-rose-500" placeholder="Full name" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Email (optional)</span>
            <input name="email" type="email" className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-rose-500" placeholder="you@example.com" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Address line 1</span>
            <input name="line1" required className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-rose-500" placeholder="House, street, area" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Address line 2</span>
            <input name="line2" className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-rose-500" placeholder="Apartment, suite, etc (optional)" />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">City</span>
              <input name="city" required className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-rose-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">State / Province</span>
              <input name="state" className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-rose-500" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">Postal code</span>
              <input name="postalCode" required className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-rose-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">Country</span>
              <input name="country" required defaultValue="India" className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-rose-500" />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Phone (optional)</span>
            <input name="phone" className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-rose-500" placeholder="Mobile number" />
          </label>

          <div className="flex items-center justify-end">
            <button type="submit" className="rounded-full bg-rose-500 px-5 py-3 text-sm font-medium text-white">Continue to payment</button>
          </div>
        </form>
      </div>
    </section>
  );
}
