import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => {
  type RecordData = {
    count: number;
    expiresAt: Date;
  };

  const records = new Map<string, RecordData>();

  return {
    records,
    failUpdate: { value: false },
    failCreate: { value: false },
  };
});

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    passwordResetThrottle: {
      updateMany: async (args: {
        where: {
          key: string;
          expiresAt: { gt?: Date; lte?: Date };
          count?: { lt: number };
        };
        data: {
          count: number | { increment: number };
          expiresAt?: Date;
        };
      }) => {
        if (mock.failUpdate.value) {
          throw new Error("Simulated database failure");
        }

        const record = mock.records.get(args.where.key);
        if (!record) return { count: 0 };

        const now = args.where.expiresAt.gt ??
          args.where.expiresAt.lte!;

        if (args.where.expiresAt.gt &&
            record.expiresAt <= now) {
          return { count: 0 };
        }

        if (args.where.expiresAt.lte &&
            record.expiresAt > now) {
          return { count: 0 };
        }

        if (args.where.count?.lt !== undefined &&
            record.count >= args.where.count.lt) {
          return { count: 0 };
        }

        const nextCount =
          typeof args.data.count === "number"
            ? args.data.count
            : record.count + args.data.count.increment;

        mock.records.set(args.where.key, {
          count: nextCount,
          expiresAt: args.data.expiresAt ?? record.expiresAt,
        });

        return { count: 1 };
      },

      findUnique: async (args: {
        where: { key: string };
      }) => mock.records.get(args.where.key) ?? null,

      create: async (args: {
        data: {
          key: string;
          count: number;
          expiresAt: Date;
        };
      }) => {
        if (mock.failCreate.value) {
          throw new Error("Simulated database failure");
        }

        if (mock.records.has(args.data.key)) {
          throw new Error("Duplicate key");
        }

        mock.records.set(args.data.key, {
          count: args.data.count,
          expiresAt: args.data.expiresAt,
        });

        return args.data;
      },
    },
  },
}));

import { checkEpochAiRateLimit } from "./aiRateLimit";

describe("Epoch AI shared rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-23T12:00:00Z"));
    mock.records.clear();
    mock.failUpdate.value = false;
    mock.failCreate.value = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows eight requests and rejects the ninth", async () => {
    for (let i = 0; i < 8; i++) {
      expect(
        (await checkEpochAiRateLimit("admin-1")).allowed
      ).toBe(true);
    }

    const ninth = await checkEpochAiRateLimit("admin-1");

    expect(ninth.allowed).toBe(false);
    expect(ninth.retryAfter).toBeGreaterThan(0);
  });

  it("allows no more than eight concurrent requests", async () => {
    const results = await Promise.all(
      Array.from({ length: 25 }, () =>
        checkEpochAiRateLimit("admin-2")
      )
    );

    expect(
      results.filter((result) => result.allowed)
    ).toHaveLength(8);
  });

  it("resets after the ten-minute window", async () => {
    for (let i = 0; i < 8; i++) {
      await checkEpochAiRateLimit("admin-3");
    }

    expect(
      (await checkEpochAiRateLimit("admin-3")).allowed
    ).toBe(false);

    vi.advanceTimersByTime(10 * 60 * 1000 + 1000);

    expect(
      (await checkEpochAiRateLimit("admin-3")).allowed
    ).toBe(true);
  });

  it("rejects when creating a database record fails", async () => {
    mock.failCreate.value = true;

    expect(
      (await checkEpochAiRateLimit("admin-4")).allowed
    ).toBe(false);
  });

  it("propagates database update errors rather than allowing a request", async () => {
    mock.failUpdate.value = true;

    await expect(
      checkEpochAiRateLimit("admin-5")
    ).rejects.toThrow("Simulated database failure");
  });

  it("uses namespaced keys separate from password-reset keys", async () => {
    await checkEpochAiRateLimit("admin-6");

    const keys = [...mock.records.keys()];

    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^epoch-ai:[a-f0-9]{64}$/);
  });

  it("does not change an existing password-reset throttle", async () => {
    const originalExpiry = new Date("2026-11-23T12:15:00Z");

    mock.records.set("password-reset-test", {
      count: 4,
      expiresAt: originalExpiry,
    });

    await checkEpochAiRateLimit("admin-7");

    expect(mock.records.get("password-reset-test")).toEqual({
      count: 4,
      expiresAt: originalExpiry,
    });
  });
});