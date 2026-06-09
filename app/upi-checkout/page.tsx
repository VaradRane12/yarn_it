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
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900">UPI Checkout</h1>
      <p className="mt-2 text-neutral-600">
        Complete payment using any UPI app (GPay, PhonePe, Paytm, BHIM).
      </p>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-neutral-500">Amount to pay</p>
        <p className="mt-1 text-2xl font-bold text-neutral-900">
          {formatAmount(amount, currency)}
        </p>
        {orderId ? (
          <p className="mt-2 text-sm text-neutral-600">Order ID: {orderId}</p>
        ) : null}
      </div>

      {!payeeVpa ? (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Set UPI_VPA in your environment to enable UPI payments.
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">UPI ID</p>
            <p className="mt-1 font-medium text-neutral-900">{payeeVpa}</p>

            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={upiUri}
                className="rounded-full bg-rose-500 px-5 py-2 text-sm font-medium text-white"
              >
                Open UPI App
              </a>
              <a
                href={upiUri}
                className="rounded-full border border-neutral-300 px-5 py-2 text-sm"
              >
                Copy/share UPI link
              </a>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm text-neutral-500">
              Scan QR with your UPI app
            </p>
            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrSrc}
                alt="UPI payment QR code"
                className="h-64 w-64 rounded border border-neutral-200"
              />
            ) : null}
          </div>
        </>
      )}

      <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
        After payment, verify the transaction manually from your UPI app and
        your bank statement.
      </div>

      <div className="mt-6">
        <Link href="/search" className="text-sm font-medium text-rose-600">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
