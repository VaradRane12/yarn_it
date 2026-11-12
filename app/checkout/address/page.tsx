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
            <span className="field-label">Email</span>
            <input
              name="email"
              type="email"
              required
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
            <span className="field-label">Mobile number</span>
            <input name="phone" type="tel" required className="field" placeholder="Mobile number" />
          </label>

          <fieldset className="space-y-2">
            <legend className="field-label">Payment</legend>
            <label className="flex items-start gap-2 text-sm font-medium">
              <input type="radio" name="pay" value="half" defaultChecked className="mt-1" />
              <span>
                Pay 50% now
                <span className="block font-normal text-ink/60">
                  Every piece is made to order. The other half is due once it is
                  ready, before we ship. We will send you a payment link then.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm font-medium">
              <input type="radio" name="pay" value="full" className="mt-1" />
              <span>Pay in full now</span>
            </label>
          </fieldset>

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
