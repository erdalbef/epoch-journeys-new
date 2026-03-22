import { db} from "@/lib/db";

function normalize(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

export async function generateTourCode(title: string): Promise<string> {
  const words = title.split(" ").filter(Boolean);

  let base = "TOUR";

  if (words.length >= 2) {
    base =
      normalize(words[0].slice(0, 2)) +
      normalize(words[1].slice(0, 2));
  } else if (words.length === 1) {
    base = normalize(words[0].slice(0, 4));
  }

  base = base || "TOUR";

  let counter = 1;

  while (true) {
    const candidate = `${base}${counter}`;

    const existing = await db.tour.findFirst({
      where: { tourCode: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    counter++;
  }
}