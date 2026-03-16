import { prisma } from "@/lib/prisma";

function normalize(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

export async function generateTourCode(title: string): Promise<string> {
  const words = title.split(" ").filter(Boolean);

  let base = "TR";

  if (words.length >= 2) {
    base =
      normalize(words[0].slice(0, 2)) +
      normalize(words[1].slice(0, 2));
  } else if (words.length === 1) {
    base = normalize(words[0].slice(0, 4));
  }

  if (!base) base = "TR";

  let counter = 1;

  while (true) {
    const candidate = `${base}${counter}`;

    const exists = await prisma.tour.findFirst({
      where: { tourCode: candidate },
      select: { id: true }
    });

    if (!exists) {
      return candidate;
    }

    counter++;
  }
}