export const MISSING_ORDERS_TABLE_MESSAGE =
  "Supabase schema is missing the 'orders' table. Run the SQL in supabase/init.sql (or apply your migrations) to create required tables, then retry.";

export const MISSING_ORDERS_TABLE_HINT =
  "Run the SQL in supabase/init.sql via the Supabase SQL editor or supabase CLI (supabase db reset/migrate).";

export function isMissingOrdersTableError(error: unknown) {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" && error
          ? JSON.stringify(error)
          : "";

  return (
    message.includes("Could not find the table 'public.orders'") ||
    message.includes("Could not find the table \"public.orders\"") ||
    message.includes("public.orders") && message.includes("PGRST205")
  );
}