"use client";

import { useState } from "react";

type Season = "LOW" | "SHOULDER" | "HIGH" | "PEAK";

type Props = {
  departureId: string;
  initialSeason: Season;
  initialPrice: number;
  seasonalPrices: Record<Season, number | null>;
  priceLocked?: boolean;
};

export function EditDepartureFields({
  departureId,
  initialSeason,
  initialPrice,
  seasonalPrices,
  priceLocked = false,
}: Props) {
  const [season, setSeason] = useState<Season>(initialSeason);
  const [price, setPrice] = useState(String(initialPrice));
  const [isManualPrice, setIsManualPrice] = useState(false);

  function handleSeasonChange(nextSeason: Season) {
    setSeason(nextSeason);

    if (!isManualPrice && !priceLocked) {
      const seasonalPrice = seasonalPrices[nextSeason];
      if (seasonalPrice !== null) {
        setPrice(String(seasonalPrice));
      }
    }
  }

  return (
    <>
      <div>
        <label
          htmlFor={`season-${departureId}`}
          className="text-sm font-medium"
        >
          Season
        </label>
        <select
          id={`season-${departureId}`}
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
        <label
          htmlFor={`price-${departureId}`}
          className="text-sm font-medium"
        >
          Price
        </label>
        <input
          id={`price-${departureId}`}
          name="price"
          type="number"
          min="0"
          step="0.01"
          required
          value={price}
          disabled={priceLocked}
          onChange={(e) => {
            setPrice(e.target.value);
            setIsManualPrice(true);
          }}
          className={`mt-1 w-full rounded border p-2 ${
            priceLocked ? "cursor-not-allowed bg-gray-100 text-gray-500" : ""
          }`}
        />
        <p className="mt-1 text-xs text-gray-500">
          {priceLocked
            ? "Price is locked because this departure already has bookings."
            : seasonalPrices[season] !== null
              ? isManualPrice
                ? "Manual price override"
                : "Auto-filled from seasonal pricing"
              : "No seasonal price set"}
        </p>
      </div>
    </>
  );
}