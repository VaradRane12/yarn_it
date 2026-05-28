import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    "components",
    "icons",
    "Blue Yellow Cute Crochet Knitting Handmade Business Logo.svg",
  );

  try {
    const body = await fs.promises.readFile(filePath, "utf8");
    return new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "image/svg+xml" },
    });
  } catch (err) {
    return NextResponse.json({ error: "Logo not found" }, { status: 404 });
  }
}
