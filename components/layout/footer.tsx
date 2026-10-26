import Link from "next/link";

import FooterMenu from "components/layout/footer-menu";
import { getMenu } from "lib/store";
import { Suspense } from "react";

const { COMPANY_NAME, SITE_NAME } = process.env;

export default async function Footer() {
  const currentYear = new Date().getFullYear();
  const copyrightDate = 2023 + (currentYear > 2023 ? `-${currentYear}` : "");
  const skeleton = "w-full h-6 animate-pulse rounded-sm bg-cream/20";
  const menu = await getMenu("next-js-frontend-footer-menu");
  const copyrightName = COMPANY_NAME || SITE_NAME || "";

  return (
    <footer className="mt-10 overflow-hidden rounded-t-[2.5rem] bg-ink text-sm text-cream">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pt-16 md:flex-row md:gap-12">
        <div className="max-w-sm">
          <p className="font-display text-4xl uppercase leading-none">
            Made slow. <span className="text-butter">Loved long.</span>
          </p>
          <Link
            className="mt-6 inline-flex rounded-full border-[3px] border-cream bg-coral px-6 py-3 font-display text-lg uppercase text-ink transition-transform hover:-translate-y-1"
            href="/search"
          >
            Browse shop →
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="flex h-[188px] w-[200px] flex-col gap-2">
              <div className={skeleton} />
              <div className={skeleton} />
              <div className={skeleton} />
              <div className={skeleton} />
            </div>
          }
        >
          <FooterMenu menu={menu} />
        </Suspense>
        <ul className="flex flex-col gap-2 font-bold uppercase tracking-wider md:ml-auto">
          <li>
            <Link className="hover:text-butter" href="/estimate">
              Custom estimate
            </Link>
          </li>
          <li>
            <Link className="hover:text-butter" href="/orders">
              Your orders
            </Link>
          </li>
        </ul>
      </div>

      <p
        aria-hidden
        className="mt-12 select-none whitespace-nowrap text-center font-display text-[clamp(4rem,22vw,22rem)] uppercase leading-[0.8] text-lilac"
      >
        {SITE_NAME || "Yarn it"}
      </p>

      <div className="border-t-2 border-cream/20 py-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-1 px-6 text-cream/70 md:flex-row">
          <p>
            &copy; {copyrightDate} {copyrightName}
            {copyrightName.length && !copyrightName.endsWith(".")
              ? "."
              : ""}{" "}
            All rights reserved.
          </p>
          <p className="md:ml-auto">
            Crocheted by hand, one loop at a time. 🧶
          </p>
        </div>
      </div>
    </footer>
  );
}
