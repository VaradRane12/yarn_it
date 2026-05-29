import { readFile } from "fs/promises";
import { ImageResponse } from "next/og";
import { join } from "path";

export type Props = {
  title?: string;
};

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
    join(
      process.cwd(),
      "components",
      "icons",
      "Blue Yellow Cute Crochet Knitting Handmade Business Logo.svg",
    ),
    "utf8",
  );
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`;


  return new ImageResponse(
    (
      <div tw="flex h-full w-full flex-col items-center justify-center bg-black">
        <div tw="flex flex-none items-center justify-center border border-neutral-700 h-[160px] w-[160px] rounded-3xl">
          <img src={logoSrc} width="64" height="58" />
        </div>
        <p tw="mt-12 text-6xl font-bold text-white">{title}</p>
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
