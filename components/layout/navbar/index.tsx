import CartModal from "components/cart/modal";
import LogoSquare from "components/logo-square";
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

  const menu = [{ title: "All Products", path: "/products" }, ...categoryMenu];

  return (
    <nav className="relative flex items-center justify-between p-4 lg:px-6">
      <div className="block flex-none md:hidden">
        <Suspense fallback={null}>
          <MobileMenu menu={menu} />
        </Suspense>
      </div>
      <div className="flex w-full items-center">
        <div className="flex w-full md:w-1/3">
          <Link
            href="/"
            prefetch={true}
            className="mr-2 flex w-full items-center justify-center md:w-auto lg:mr-6"
          >
            <LogoSquare />
            <div className="ml-2 flex-none text-sm font-medium uppercase md:hidden lg:block">
              {SITE_NAME}
            </div>
          </Link>
          {menu.length ? (
            <ul className="hidden gap-6 text-sm md:flex md:items-center">
              <li>
                <Link
                  href="/products"
                  prefetch={true}
                  className="text-neutral-500 underline-offset-4 hover:text-black hover:underline dark:text-neutral-400 dark:hover:text-neutral-300"
                >
                  All Products
                </Link>
              </li>
              {categoryMenu.length ? (
                <li className="group relative py-1">
                  <span className="cursor-default text-neutral-500 underline-offset-4 group-hover:text-black dark:text-neutral-400 dark:group-hover:text-neutral-300">
                    Categories
                  </span>
                  <ul className="invisible absolute left-0 top-full z-30 min-w-48 rounded-md border border-neutral-200 bg-white p-2 opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-neutral-800 dark:bg-black">
                    {categoryMenu.map((item) => (
                      <li key={item.title}>
                        <Link
                          href={item.path}
                          prefetch={true}
                          className="block rounded px-3 py-2 text-neutral-600 hover:bg-neutral-100 hover:text-black dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <div className="hidden justify-center md:flex md:w-1/3">
          <Suspense fallback={<SearchSkeleton />}>
            <Search />
          </Suspense>
        </div>
        <div className="flex justify-end md:w-1/3">
          <CartModal />
        </div>
      </div>
    </nav>
  );
}
