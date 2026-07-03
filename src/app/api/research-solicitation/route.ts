import { NextResponse } from "next/server";
import { z } from "zod";
import { researchSolicitation } from "@/lib/researchSolicitation";
import { PublicDataError } from "@/lib/types";

export const runtime = "nodejs";

const requestSchema = z.object({
  samUrl: z.string().trim().min(1, "SAM.gov URL is required."),
  fallbackIdentifier: z.string().trim().max(100).optional(),
  accessCode: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: parsed.error.issues[0]?.message ?? "Invalid request.",
        },
      },
      { status: 400 },
    );
  }

  const requiredAccessCode = process.env.APP_ACCESS_CODE?.trim();
  if (
    requiredAccessCode &&
    parsed.data.accessCode?.trim() !== requiredAccessCode
  ) {
    return NextResponse.json(
      {
        error: {
          code: "ACCESS_DENIED",
          message: "Enter the dashboard access code and try again.",
        },
      },
      { status: 401 },
    );
  }

  try {
    return NextResponse.json(
      await researchSolicitation(parsed.data.samUrl, {
        fallbackIdentifier: parsed.data.fallbackIdentifier,
      }),
    );
  } catch (error) {
    if (error instanceof PublicDataError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status: error.status },
      );
    }
    console.error("Unhandled solicitation research error", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "The research request failed unexpectedly.",
        },
      },
      { status: 500 },
    );
  }
}
