"use client";

import { useState } from "react";

type Season = "LOW" | "SHOULDER" | "HIGH" | "PEAK";

type Props = {
  seasonalPrices: Record<Season, number | null>;
};

export function AddDepartureForm({ seasonalPrices }: Props) {
  const defaultSeason: Season = "SHOULDER";
  const defaultPrice = seasonalPrices[defaultSeason];

  const [season, setSeason] = useState<Season>(defaultSeason);
  const [price, setPrice] = useState(
    defaultPrice !== null ? String(defaultPrice) : ""
  );

  function handleSeasonChange(nextSeason: Season) {
    setSeason(nextSeason);

    const seasonalPrice = seasonalPrices[nextSeason];
    if (seasonalPrice !== null) {
      setPrice(String(seasonalPrice));
    } else {
      setPrice("");
    }
  }

  return (
    <>
      <div>
        <label htmlFor="date" className="text-sm font-medium">
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          className="mt-1 w-full rounded border p-2"
        />
      </div>

      <div>
        <label htmlFor="season" className="text-sm font-medium">
          Season
        </label>
        <select
          id="season"
          name="season"
          value={season}
          onChange={(e) => handleSeasonChange(e.target.value as Season)}
          className="mt-1 w-full rounded border p-2"
        >
          <option value="LOW">Low Season</option>
          <option value="SHOULDER">Shoulder Season</option>
          <option value="HIGH">High Season</option>
          <option value="PEAK">Peak Season</option>
        </select>
      </div>

      <div>
        <label htmlFor="price" className="text-sm font-medium">
          Price
        </label>
        <input
          id="price"
          name="price"
          type="number"
          min="0"
          step="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-1 w-full rounded border p-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          {seasonalPrices[season] !== null
            ? "Auto-filled from seasonal pricing"
            : "No seasonal price set for this season"}
        </p>
      </div>

      <div>
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue="AVAILABLE"
          className="mt-1 w-full rounded border p-2"
        >
          <option value="EARLY_BOOKING">Early Booking</option>
          <option value="AVAILABLE">Available</option>
          <option value="SOLD_OUT">Sold Out</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div>
        <label htmlFor="capacity" className="text-sm font-medium">
          Capacity
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min="0"
          required
          defaultValue="0"
          className="mt-1 w-full rounded border p-2"
        />
      </div>

      <div>
        <label htmlFor="earlyDiscountPercent" className="text-sm font-medium">
          Early Discount %
        </label>
        <input
          id="earlyDiscountPercent"
          name="earlyDiscountPercent"
          type="number"
          min="0"
          step="0.01"
          className="mt-1 w-full rounded border p-2"
        />
      </div>

      <div>
        <label htmlFor="earlyDiscountDeadline" className="text-sm font-medium">
          Discount Deadline
        </label>
        <input
          id="earlyDiscountDeadline"
          name="earlyDiscountDeadline"
          type="date"
          className="mt-1 w-full rounded border p-2"
        />
      </div>
    </>
  );
}