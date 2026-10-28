import { NextResponse } from "next/server";

const ESTIMATOR_URL =
  process.env.ESTIMATOR_API_URL ||
  `http://localhost:${process.env.ESTIMATOR_API_PORT || "8001"}`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Missing job_id" },
        { status: 400 },
      );
    }

    const resp = await fetch(
      `${ESTIMATOR_URL}/estimate/${encodeURIComponent(jobId)}`,
    );

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Estimator status error ${resp.status}: ${err}`);
    }

    const data = await resp.json();

    if (data.status === "completed") {
      return NextResponse.json({
        success: true,
        status: "completed",
        ...data.result,
      });
    } else if (data.status === "failed") {
      return NextResponse.json({
        success: false,
        status: "failed",
        error: data.error,
      });
    } else {
      // still pending
      return NextResponse.json({ success: true, status: "pending" });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Status check failed",
      },
      { status: 500 },
    );
  }
}
