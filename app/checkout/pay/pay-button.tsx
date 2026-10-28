"use client";

import { useState } from "react";

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open(): void };
  }
}

function loadScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PayButton({ rzpOrderId, keyId }: { rzpOrderId: string; keyId: string }) {
  const [msg, setMsg] = useState("");

  async function pay() {
    setMsg("");
    if (!rzpOrderId || !(await loadScript())) return setMsg("Could not load payment. Try again.");
    new window.Razorpay({
      key: keyId,
      order_id: rzpOrderId,
      name: "Yarn it",
      handler: async (r: Record<string, string>) => {
        setMsg("Confirming payment…");
        const res = await fetch("/api/checkout/razorpay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(r),
        });
        // Webhook is the backstop, so a failed verify still means the order is safe.
        if (res.ok) window.location.href = "/orders";
        else setMsg("Payment received, confirmation is delayed. Check your orders shortly.");
      },
    }).open();
  }

  return (
    <>
      <button type="button" onClick={pay} className="btn w-full">
        Pay now
      </button>
      {msg ? <p className="text-sm font-bold">{msg}</p> : null}
    </>
  );
}
