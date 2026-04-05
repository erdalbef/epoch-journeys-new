"use client";

export function AddDepartureForm() {
  return (
    <>
      <div>
        <label htmlFor="date" className="text-sm font-medium">
          Departure Date
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
          defaultValue="SHOULDER"
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
          Price per Person in Double Room
        </label>
        <input
          id="price"
          name="price"
          type="number"
          min="0"
          step="0.01"
          required
          className="mt-1 w-full rounded border p-2"
          placeholder="e.g. 1490"
        />
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
          defaultValue={0}
          className="mt-1 w-full rounded border p-2"
        />
      </div>

      <div>
        <label
          htmlFor="earlyDiscountPercent"
          className="text-sm font-medium"
        >
          Early Discount %
        </label>
        <input
          id="earlyDiscountPercent"
          name="earlyDiscountPercent"
          type="number"
          min="0"
          step="0.01"
          className="mt-1 w-full rounded border p-2"
          placeholder="Optional"
        />
      </div>

      <div>
        <label
          htmlFor="earlyDiscountDeadline"
          className="text-sm font-medium"
        >
          Early Discount Deadline
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