import CartModal from "components/cart/modal";
import LogoIcon from "components/icons/logo";
import { getCollections } from "lib/store";
import Link from "next/link";
import { Suspense } from "react";
import MobileMenu from "./mobile-menu";
import Search, { SearchSkeleton } from "./search";

const { SITE_NAME } = process.env;

export async function Navbar() {
  const collections = await getCollections();

  const categoryMenu = collections
    .filter((c) => c.handle && !c.handle.startsWith("hidden"))
    .sort((a, b) => {
      const aTime = Number(new Date(a.updatedAt));
      const bTime = Number(new Date(b.updatedAt));
      return bTime - aTime;
    })
    .map((c) => ({ title: c.title, path: c.path }));

  const utilityMenu = [
    { title: "Orders", path: "/orders" },
    { title: "Estimator", path: "/estimate" },
  ];

  const menu = [
    { title: "Products", path: "/search" },
    ...categoryMenu,
    ...utilityMenu,
  ];

  return (
    <nav className="sticky top-3 z-40 mx-3 mt-3 flex items-center justify-between rounded-full border-[3px] border-ink bg-cream/85 px-4 py-2 shadow-chunky-sm backdrop-blur-md lg:mx-6 lg:px-6">
      <div className="block flex-none md:hidden">
        <Suspense fallback={null}>
          <MobileMenu menu={menu} />
        </Suspense>
      </div>
      <div className="flex w-full items-center gap-4 lg:gap-8">
        <Link
          href="/"
          prefetch={true}
          className="flex flex-1 items-center justify-center gap-2 md:flex-none"
        >
          <LogoIcon className="-my-2 h-14 w-14 flex-none md:-my-3 md:h-16 md:w-16" />
          <span className="whitespace-nowrap font-display text-2xl uppercase tracking-wide">
            {SITE_NAME}
          </span>
        </Link>
        {menu.length ? (
          <ul className="hidden flex-none gap-1 whitespace-nowrap text-sm font-bold uppercase tracking-wider md:flex md:items-center lg:gap-3">
            <li>
              <Link
                href="/search"
                prefetch={true}
                className="rounded-full px-2 py-1 transition-colors hover:bg-butter"
              >
                Products
              </Link>
            </li>
            {categoryMenu.length ? (
              <li className="group relative py-1">
                <span className="cursor-default rounded-full px-2 py-1 transition-colors group-hover:bg-butter">
                  Categories
                </span>
                <ul className="invisible absolute left-0 top-full z-30 min-w-48 rounded-2xl border-[3px] border-ink bg-cream p-2 opacity-0 shadow-chunky-sm transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-neutral-800 dark:bg-black">
                  {categoryMenu.map((item) => (
                    <li key={item.title}>
                      <Link
                        href={item.path}
                        prefetch={true}
                        className="block rounded-xl px-3 py-2 hover:bg-lilac"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ) : null}
            {utilityMenu.map((item) => (
              <li key={item.title}>
                <Link
                  href={item.path}
                  prefetch={true}
                  className="rounded-full px-2 py-1 transition-colors hover:bg-butter"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="ml-auto hidden w-full max-w-xs xl:block">
          <Suspense fallback={<SearchSkeleton />}>
            <Search />
          </Suspense>
        </div>
        <div className="flex flex-none justify-end md:ml-auto xl:ml-0">
          <CartModal />
        </div>
      </div>
    </nav>
  );
}
