import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  request: vi.fn()
}));

vi.mock("node:dns/promises", () => ({
  lookup: mocks.lookup
}));

vi.mock("node:https", () => ({
  request: mocks.request
}));

import { fetchHotelPublicPage } from "./hotelSecurePageFetch";

type ResponseSetup = {
  status: number;
  contentType?: string;
  contentLength?: string;
  bodyBytes?: number;
};

function simulateResponse(setup: ResponseSetup) {
  mocks.request.mockImplementation((...args: unknown[]) => {
    const callback = args[2] as (response: EventEmitter) => void;

    const req = new EventEmitter() as EventEmitter & {
      end: () => void;
      destroy: (error?: Error) => void;
    };

    req.destroy = (error?: Error) => {
      if (error) req.emit("error", error);
    };

    req.end = () => {
      queueMicrotask(() => {
        const response = Object.assign(new EventEmitter(), {
          statusCode: setup.status,
          headers: {
            "content-type": setup.contentType || "text/html",
            ...(setup.contentLength
              ? { "content-length": setup.contentLength }
              : {})
          },
          destroy: vi.fn()
        });

        callback(response);

        if (setup.status === 200 &&
            setup.contentType !== "application/pdf" &&
            !setup.contentLength) {
          response.emit(
            "data",
            setup.bodyBytes
              ? Buffer.alloc(setup.bodyBytes, 65)
              : Buffer.from("<html>Hotel</html>")
          );
          response.emit("end");
        }
      });
    };

    return req;
  });
}

describe("Secure hotel fetch network protections", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.lookup.mockResolvedValue([
      { address: "8.8.8.8", family: 4 }
    ]);
  });

  it("rejects private DNS addresses before connecting", async () => {
    mocks.lookup.mockResolvedValue([
      { address: "127.0.0.1", family: 4 }
    ]);

    await expect(
      fetchHotelPublicPage("https://hotel.example.com/contact")
    ).rejects.toThrow("acceptable public IPv4");

    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("rejects mixed public and private DNS results", async () => {
    mocks.lookup.mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
      { address: "192.168.1.1", family: 4 }
    ]);

    await expect(
      fetchHotelPublicPage("https://hotel.example.com/contact")
    ).rejects.toThrow("acceptable public IPv4");

    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("rejects redirects rather than following them", async () => {
    simulateResponse({ status: 302 });

    await expect(
      fetchHotelPublicPage("https://hotel.example.com/contact")
    ).rejects.toThrow("redirect requires separate review");

    expect(mocks.request).toHaveBeenCalledTimes(1);
  });

  it("rejects non-HTML website responses", async () => {
    simulateResponse({
      status: 200,
      contentType: "application/pdf"
    });

    await expect(
      fetchHotelPublicPage("https://hotel.example.com/contact")
    ).rejects.toThrow("not HTML");
  });

  it("rejects oversized declared responses", async () => {
    simulateResponse({
      status: 200,
      contentLength: "9999999"
    });

    await expect(
      fetchHotelPublicPage("https://hotel.example.com/contact")
    ).rejects.toThrow("maximum allowed size");
  });

  it("retrieves a small HTML response without verification", async () => {
    simulateResponse({ status: 200 });

    const result = await fetchHotelPublicPage(
      "https://hotel.example.com/contact"
    );

    expect(result.html).toContain("Hotel");
    expect(result.status).toBe("retrieved-unverified");
    expect(result.sourceUrl)
      .toBe("https://hotel.example.com/contact");
  });
  it("times out a stalled DNS lookup without connecting", async () => {
    vi.useFakeTimers();

    try {
      mocks.lookup.mockImplementation(
        () => new Promise(() => {})
      );

      const pending = fetchHotelPublicPage(
        "https://hotel.example.com/contact"
      );

      const assertion = expect(pending)
        .rejects.toThrow("Hotel DNS lookup timed out");

      await vi.advanceTimersByTimeAsync(6501);
      await assertion;

      expect(mocks.request).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("enforces a total deadline on a stalled connection", async () => {
    vi.useFakeTimers();

    try {
      mocks.request.mockImplementation(() => {
        const req = new EventEmitter() as EventEmitter & {
          end: () => void;
          destroy: (error?: Error) => void;
        };

        req.end = () => {};
        req.destroy = (error?: Error) => {
          if (error) req.emit("error", error);
        };

        return req;
      });

      const pending = fetchHotelPublicPage(
        "https://hotel.example.com/contact"
      );

      const assertion = expect(pending)
        .rejects.toThrow("Hotel website retrieval timed out");

      await vi.advanceTimersByTimeAsync(6501);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects an oversized streamed response", async () => {
    simulateResponse({
      status: 200,
      bodyBytes: 512 * 1024 + 1
    });

    await expect(
      fetchHotelPublicPage("https://hotel.example.com/contact")
    ).rejects.toThrow("maximum allowed size");
  });

});