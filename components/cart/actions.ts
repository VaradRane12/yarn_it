"use server";

import { TAGS } from "lib/constants";
import {
    addToCart,
    createCart,
    getCart,
    removeFromCart,
    updateCart,
} from "lib/store";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function createPendingOrder(cart: NonNullable<Awaited<ReturnType<typeof getCart>>>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return undefined;
  }

  const orderId = `ord_${crypto.randomUUID().replace(/-/g, "")}`;
  const payload = {
    id: orderId,
    status: "pending",
    payment_method: "upi",
    payment_status: "pending",
    currency_code: cart.cost.totalAmount.currencyCode,
    total_amount: Number(cart.cost.totalAmount.amount),
    cart_snapshot: {
      totalQuantity: cart.totalQuantity,
      lines: cart.lines,
      totals: cart.cost,
    },
  };

  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/orders`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return undefined;
    }

    return orderId;
  } catch {
    return undefined;
  }
}

export async function addItem(
  prevState: any,
  selectedVariantId: string | undefined
) {
  if (!selectedVariantId) {
    return "Error adding item to cart";
  }

  try {
    await addToCart([{ merchandiseId: selectedVariantId, quantity: 1 }]);
    updateTag(TAGS.cart);
  } catch (e) {
    return "Error adding item to cart";
  }
}

export async function removeItem(prevState: any, merchandiseId: string) {
  try {
    const cart = await getCart();

    if (!cart) {
      return "Error fetching cart";
    }

    const lineItem = cart.lines.find(
      (line) => line.merchandise.id === merchandiseId
    );

    if (lineItem && lineItem.id) {
      await removeFromCart([lineItem.id]);
      updateTag(TAGS.cart);
    } else {
      return "Item not found in cart";
    }
  } catch (e) {
    return "Error removing item from cart";
  }
}

export async function updateItemQuantity(
  prevState: any,
  payload: {
    merchandiseId: string;
    quantity: number;
  }
) {
  const { merchandiseId, quantity } = payload;

  try {
    const cart = await getCart();

    if (!cart) {
      return "Error fetching cart";
    }

    const lineItem = cart.lines.find(
      (line) => line.merchandise.id === merchandiseId
    );

    if (lineItem && lineItem.id) {
      if (quantity === 0) {
        await removeFromCart([lineItem.id]);
      } else {
        await updateCart([
          {
            id: lineItem.id,
            merchandiseId,
            quantity,
          },
        ]);
      }
    } else if (quantity > 0) {
      // If the item doesn't exist in the cart and quantity > 0, add it
      await addToCart([{ merchandiseId, quantity }]);
    }

    updateTag(TAGS.cart);
  } catch (e) {
    console.error(e);
    return "Error updating item quantity";
  }
}

export async function redirectToCheckout() {
  const cart = await getCart();
  if (!cart || cart.totalQuantity === 0) {
    redirect("/search");
  }

  const orderId = await createPendingOrder(cart);

  const params = new URLSearchParams({
    amount: cart.cost.totalAmount.amount,
    currency: cart.cost.totalAmount.currencyCode,
  });

  if (orderId) {
    params.set("orderId", orderId);
  }

  redirect(`/upi-checkout?${params.toString()}`);
}

export async function createCartAndSetCookie() {
  let cart = await createCart();
  (await cookies()).set("cartId", cart.id!);
}
