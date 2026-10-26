import { CartProvider } from "components/cart/cart-context";
import { Navbar } from "components/layout/navbar";
import SmoothScroll from "components/motion/smooth-scroll";
import { GeistSans } from "geist/font/sans";
import { getCart } from "lib/store";
import { baseUrl } from "lib/utils";
import { Anton } from "next/font/google";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";

const { SITE_NAME } = process.env;

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: SITE_NAME!,
    template: `%s | ${SITE_NAME}`,
  },
  robots: {
    follow: true,
    index: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Don't await the fetch, pass the Promise to the context provider
  const cart = getCart();

  return (
    <html lang="en" className={`${GeistSans.variable} ${anton.variable}`}>
      <body className="bg-cream font-sans text-ink selection:bg-butter selection:text-ink">
        <SmoothScroll>
          <CartProvider cartPromise={cart}>
            <Navbar />
            <main>
              {children}
              <Toaster closeButton />
            </main>
          </CartProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
