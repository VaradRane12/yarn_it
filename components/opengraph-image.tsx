import { readFile } from "fs/promises";
import { ImageResponse } from "next/og";
import { join } from "path";

export type Props = {
  title?: string;
};

// Link-preview card (WhatsApp, iMessage, socials). Colors mirror the theme tokens in globals.css.
const INK = "#1d1028";
const CREAM = "#fff4e4";
const DOTS = ["#b9a2ff", "#ffd94f", "#74e4b5", "#ff6f4f", "#72c6ff", "#ff92c8"];

export default async function OpengraphImage(
  props?: Props,
): Promise<ImageResponse> {
  const { title } = {
    ...{
      title: process.env.SITE_NAME,
    },
    ...props,
  };

  const file = await readFile(join(process.cwd(), "./fonts/Inter-Bold.ttf"));
  const font = Uint8Array.from(file).buffer;
  const logo = await readFile(
    join(process.cwd(), "components", "icons", "og-logo.png"),
  );
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        tw="flex h-full w-full items-center px-20"
        style={{ backgroundColor: CREAM, color: INK }}
      >
        <div
          tw="flex flex-none items-center justify-center overflow-hidden bg-white"
          style={{
            width: 420,
            height: 420,
            borderRadius: 64,
            border: `8px solid ${INK}`,
            boxShadow: `14px 14px 0 0 ${INK}`,
          }}
        >
          <img src={logoSrc} width={380} height={380} />
        </div>
        <div tw="ml-20 flex flex-col">
          <p
            tw="m-0 uppercase"
            style={{ fontSize: 130, letterSpacing: -4, lineHeight: 1 }}
          >
            {title}
          </p>
          <p tw="m-0 mt-6 text-4xl" style={{ lineHeight: 1.3 }}>
            Handmade crochet,
          </p>
          <p tw="m-0 text-4xl" style={{ lineHeight: 1.3 }}>
            one loop at a time.
          </p>
          <div tw="mt-10 flex">
            {DOTS.map((c) => (
              <div
                key={c}
                tw="mr-4 rounded-full"
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: c,
                  border: `4px solid ${INK}`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter",
          data: font,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
