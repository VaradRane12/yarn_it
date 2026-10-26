import PageHeader from "components/page-header";
import Link from "next/link";

type Props = {
  searchParams?: Promise<{
    amount?: string;
    currency?: string;
    orderId?: string;
  }>;
};

function formatAmount(amount: string, currency: string) {
  const value = Number(amount || "0");
  if (!Number.isFinite(value)) return amount;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency || "INR"} ${value.toFixed(2)}`;
  }
}

export default async function UpiCheckoutPage({ searchParams }: Props) {
  const params = (await searchParams) || {};
  const amount = params.amount || "0";
  const currency = (params.currency || "INR").toUpperCase();
  const orderId = params.orderId || "";

  const payeeVpa = process.env.UPI_VPA || "";
  const payeeName = process.env.UPI_PAYEE_NAME || "Crochet Shop";
  const baseTransactionNote =
    process.env.UPI_TRANSACTION_NOTE || "Order payment";
  const transactionNote = orderId
    ? `${baseTransactionNote} ${orderId}`
    : baseTransactionNote;

  const upiUri = payeeVpa
    ? `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(payeeName)}&am=${encodeURIComponent(amount)}&cu=${encodeURIComponent(currency)}&tn=${encodeURIComponent(transactionNote)}`
    : "";

  const qrSrc = upiUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`
    : "";

  return (
    <div className="mx-auto max-w-xl px-4 pb-20">
      <PageHeader
        eyebrow="Checkout · step 2 of 2"
        title={
          <>
            Pay with <span className="text-outline">UPI</span>
          </>
        }
      >
        Use any UPI app: GPay, PhonePe, Paytm or BHIM.
      </PageHeader>

      <div className="rounded-[2rem] border-[3px] border-ink bg-butter p-6 shadow-chunky md:p-8">
        <p className="field-label">Amount to pay</p>
        <p className="font-display text-6xl leading-none">
          {formatAmount(amount, currency)}
        </p>
        {orderId ? (
          <p className="mt-3 text-sm font-bold">Order ID: {orderId}</p>
        ) : null}
      </div>

      {!payeeVpa ? (
        <div className="mt-6 rounded-2xl border-2 border-ink bg-coral/30 p-4 text-sm font-medium">
          Set UPI_VPA in your environment to enable UPI payments.
        </div>
      ) : (
        <>
          <div className="card mt-6">
            <p className="field-label">UPI ID</p>
            <p className="font-bold">{payeeVpa}</p>

            <div className="mt-4 flex flex-wrap gap-3">
              <a href={upiUri} className="btn">
                Open UPI App
              </a>
              <a href={upiUri} className="btn-ghost">
                Copy/share UPI link
              </a>
            </div>
          </div>

          <div className="card mt-6">
            <p className="field-label mb-3">Scan QR with your UPI app</p>
            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrSrc}
                alt="UPI payment QR code"
                className="h-64 w-64 rounded-2xl border-[3px] border-ink"
              />
            ) : null}
          </div>
        </>
      )}

      <div className="mt-6 rounded-2xl border-2 border-ink bg-mint p-4 text-sm font-medium">
        After payment, verify the transaction manually from your UPI app and
        your bank statement.
      </div>

      <div className="mt-6">
        <Link href="/search" className="btn-ghost">
          ← Keep shopping
        </Link>
      </div>
    </div>
  );
}
