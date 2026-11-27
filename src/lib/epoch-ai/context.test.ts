import { beforeEach, describe, expect, it, vi } from "vitest";

const { quote } = vi.hoisted(() => ({ quote: { findUnique: vi.fn(), findMany: vi.fn() } }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { quote } }));

import { findEpochAiRecords } from "./context";

const draft = {
  id: "quote-1", title: null, quoteReference: null, quoteNumber: 7,
  status: "DRAFT", destination: "Sarajevo", tour: { title: "Balkans Pilgrimage" },
};

describe("Epoch AI quotation lookup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    quote.findMany.mockResolvedValue([draft]);
  });

  it("shows recent saved quotes when the search is blank", async () => {
    expect(await findEpochAiRecords("quote", " ")).toEqual([
      { id: "quote-1", label: "#7 · Balkans Pilgrimage", detail: "Sarajevo · DRAFT" },
    ]);
    expect(quote.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: undefined,
      orderBy: [{ updatedAt: "desc" }, { quoteNumber: "desc" }],
      take: 10,
    }));
  });

  it.each(["7", "#7", "Quote #7"])("finds the displayed quotation number %s", async (query) => {
    quote.findUnique.mockResolvedValue(draft);
    expect(await findEpochAiRecords("quote", query)).toHaveLength(1);
    expect(quote.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { quoteNumber: 7 } }));
    expect(quote.findMany).not.toHaveBeenCalled();
  });

  it("searches the linked tour title even when the quote uses a different title", async () => {
    await findEpochAiRecords("quote", "  Balkans  ");
    expect(quote.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: expect.arrayContaining([
        { tour: { is: { title: { contains: "Balkans", mode: "insensitive" } } } },
        { destination: { contains: "Balkans", mode: "insensitive" } },
      ]) },
    }));
    expect(quote.findUnique).not.toHaveBeenCalled();
  });
});
