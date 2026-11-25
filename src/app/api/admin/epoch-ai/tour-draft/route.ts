import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/authOptions";
import { generateTourCode } from "@/lib/codes/generateTourCode";
import { db } from "@/lib/db";
import { isTrustedEpochAiOrigin } from "@/lib/security/epochAiTrustedOrigin";
import { isRequestWithinLimit } from "@/lib/security/requestBodyLimit";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";

const draftSchema = z.object({
  confirmation: z.literal("SAVE_TOUR_DRAFT"),
  title: z.string().trim().min(3).max(180),
  duration: z.number().int().min(1).max(40),
  destinations: z.string().trim().min(2).max(2000),
  arrivalCity: z.string().trim().max(120),
  departureCity: z.string().trim().max(120),
  itinerary: z.string().trim().min(40).max(24000),
  overview: z.string().trim().max(5000),
}).strict();

const reply = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;

  if (!isTrustedEpochAiOrigin(
    request.headers.get("origin"),
    process.env.NODE_ENV ?? "development",
    process.env.EPOCH_ALLOWED_ORIGINS ?? "",
  )) return reply({ error: "Invalid request origin." }, 403);

  if (!(await isRequestWithinLimit(request, 192 * 1024))) {
    return reply({ error: "The tour draft is too large." }, 413);
  }

  const session = await getServerSession(authOptions);
  const actorId = session?.user?.id;
  if (!actorId) return reply({ error: "Authentication required." }, 401);

  const parsed = draftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return reply({ error: "Confirm the save and review the title, duration, destinations and itinerary in the working draft." }, 400);
  }

  const { title, duration, arrivalCity, departureCity, itinerary, overview } = parsed.data;
  const destinations = parsed.data.destinations.split(",").map(item => item.trim()).filter(Boolean);
  if (!destinations.length) return reply({ error: "Enter at least one destination." }, 400);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const tourCode = await generateTourCode(title);
      const result = await db.$transaction(async (tx) => {
        const existing = await tx.tour.findFirst({
          where: { title: { equals: title, mode: "insensitive" } },
          select: { id: true, isPublished: true },
          orderBy: { createdAt: "asc" },
        });
        if (existing) return { existing, created: null };

        const snapshot = {
          title, duration, destinations, tourCode, itinerary,
          arrivalCity: arrivalCity || null,
          departureCity: departureCity || null,
          overviewItinerary: overview || null,
          category: "Pilgrimage",
          isPublished: false,
        };
        const created = await tx.tour.create({
          data: {
            ...snapshot,
            subcategories: [], tags: [], highlights: [], inclusions: [],
            exclusions: [], accommodations: [], agentSellingPoints: [], idealFor: [],
          },
          select: { id: true },
        });
        await tx.epochTourDraftSave.create({
          data: { tourId: created.id, actorId, snapshot },
        });
        return { existing: null, created };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      if (result.existing) {
        return reply({
          error: "A tour with this title already exists. Open it to review the existing record.",
          tourId: result.existing.id,
        }, 409);
      }

      return reply({ tourId: result.created.id }, 201);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2034" || error.code === "P2002") && attempt < 2) continue;
      console.error("EPOCH_TOUR_DRAFT_SAVE_FAILED", error instanceof Error ? error.name : "Unknown");
      return reply({ error: "The tour draft could not be saved. Your working draft is still available." }, 503);
    }
  }

  return reply({ error: "The tour draft could not be saved. Try again." }, 503);
}
