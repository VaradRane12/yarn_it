import { ReadonlyURLSearchParams } from "next/navigation";

export const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.SITE_URL
    ? process.env.SITE_URL
  : "http://localhost:3000";

export const createUrl = (
  pathname: string,
  params: URLSearchParams | ReadonlyURLSearchParams,
) => {
  const paramsString = params.toString();
  const queryString = `${paramsString.length ? "?" : ""}${paramsString}`;

  return `${pathname}${queryString}`;
};

export const ensureStartsWith = (stringToCheck: string, startsWith: string) =>
  stringToCheck.startsWith(startsWith)
    ? stringToCheck
    : `${startsWith}${stringToCheck}`;

export const validateEnvironmentVariables = () => {
  const provider = (process.env.COMMERCE_PROVIDER || "local").toLowerCase();

  if (provider !== "supabase") {
    return;
  }

  const requiredForSupabase = ["NEXT_PUBLIC_SUPABASE_URL"];
  const missingEnvironmentVariables: string[] = [];

  requiredForSupabase.forEach((envVar) => {
    if (!process.env[envVar]) {
      missingEnvironmentVariables.push(envVar);
    }
  });

  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    missingEnvironmentVariables.push(
      "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  if (missingEnvironmentVariables.length) {
    throw new Error(
      `Supabase provider is enabled but some environment variables are missing:\n\n${missingEnvironmentVariables.join(
        "\n",
      )}\n`,
    );
  }
};
