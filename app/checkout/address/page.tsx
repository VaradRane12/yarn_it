import PageHeader from "components/page-header";

export const metadata = {
  title: "Shipping address",
  description: "Enter shipping address before completing checkout",
};

export default function AddressPage() {
  return (
    <section className="mx-auto max-w-xl px-4 pb-20">
      <PageHeader
        eyebrow="Checkout · step 1 of 2"
        title={
          <>
            Where to <span className="text-outline">ship?</span>
          </>
        }
      >
        Tell us where your new yarn friend should go.
      </PageHeader>
      <div className="card">
        <form
          action="/api/checkout/address"
          method="post"
          className="space-y-4"
        >
          <label className="block">
            <span className="field-label">Full name</span>
            <input name="name" className="field" placeholder="Full name" />
          </label>

          <label className="block">
            <span className="field-label">Email (optional)</span>
            <input
              name="email"
              type="email"
              className="field"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="field-label">Address line 1</span>
            <input
              name="line1"
              required
              className="field"
              placeholder="House, street, area"
            />
          </label>

          <label className="block">
            <span className="field-label">Address line 2</span>
            <input
              name="line2"
              className="field"
              placeholder="Apartment, suite, etc (optional)"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="field-label">City</span>
              <input name="city" required className="field" />
            </label>
            <label className="block">
              <span className="field-label">State / Province</span>
              <input name="state" className="field" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="field-label">Postal code</span>
              <input name="postalCode" required className="field" />
            </label>
            <label className="block">
              <span className="field-label">Country</span>
              <input
                name="country"
                required
                defaultValue="India"
                className="field"
              />
            </label>
          </div>

          <label className="block">
            <span className="field-label">Phone (optional)</span>
            <input name="phone" className="field" placeholder="Mobile number" />
          </label>

          <div className="flex items-center justify-end">
            <button type="submit" className="btn w-full sm:w-auto">
              Continue to payment
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
