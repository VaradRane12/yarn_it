import PageHeader from "components/page-header";
import PayButton from "./pay-button";

export const metadata = { title: "Payment" };

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ rzp?: string; amount?: string }>;
}) {
  const { rzp = "", amount = "0" } = await searchParams;
  return (
    <section className="mx-auto max-w-xl px-4 pb-20">
      <PageHeader
        eyebrow="Checkout · step 2 of 2"
        title={
          <>
            Pay <span className="text-outline">securely</span>
          </>
        }
      >
        UPI, cards and netbanking via Razorpay.
      </PageHeader>
      <div className="card space-y-4">
        <p className="font-display text-5xl">₹{Number(amount).toFixed(2)}</p>
        <PayButton rzpOrderId={rzp} keyId={process.env.RAZORPAY_KEY_ID || ""} />
      </div>
    </section>
  );
}
