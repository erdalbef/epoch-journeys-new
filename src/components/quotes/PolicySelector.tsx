"use client";

type PolicyPreset = {
  id: string;
  label: string;
  payment: string;
  cancellation: string;
};

const POLICY_PRESETS: PolicyPreset[] = [
  {
    id: "flexible",
    label: "Flexible Policy",
    payment: `A deposit of 20% is required to confirm the booking.

A second payment of 30% is due 60 days prior to departure.

The remaining balance is due 30 days prior to departure.

Bookings made within 30 days require full payment at confirmation.

Bank transfer fees are the responsibility of the sender.`,
    cancellation: `All cancellations must be submitted in writing.

• More than 60 days: Full refund minus administrative fees  
• 59–30 days: 30% of total cost  
• 29–15 days: 50% of total cost  
• 14 days or less: 100% of total cost  

Unused services are non-refundable.`,
  },
  {
    id: "standard",
    label: "Standard Policy",
    payment: `A non-refundable deposit of 30% is required to confirm the booking.

A second payment of 40% is due 90 days prior to departure.

The remaining balance must be paid 60 days prior to departure.

Bookings within 60 days require full payment at confirmation.

All bank fees are the responsibility of the sender.`,
    cancellation: `All cancellations must be submitted in writing.

• More than 90 days: Deposit non-refundable  
• 89–60 days: 50% of total cost  
• 59–30 days: 75% of total cost  
• 29 days or less: 100% of total cost  

No refunds for unused services or no-shows.`,
  },
  {
    id: "strict",
    label: "Strict Policy",
    payment: `A non-refundable deposit of 40% is required to confirm the booking.

An additional 40% is due 120 days prior to departure.

The remaining balance must be paid 90 days prior to departure.

Bookings within 90 days require full payment at confirmation.

All payments are non-refundable once made.`,
    cancellation: `All cancellations must be submitted in writing.

• More than 120 days: Deposit non-refundable  
• 119–90 days: 75% of total cost  
• 89 days or less: 100% of total cost  

No refunds for cancellations, no-shows, or unused services.`,
  },
];

export default function PolicySelector({
  onSelect,
}: {
  onSelect: (payment: string, cancellation: string) => void;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="font-semibold text-sm">Policy Presets</h3>

      <div className="flex flex-wrap gap-2">
        {POLICY_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.payment, p.cancellation)}
            className="border px-3 py-2 text-sm rounded-md hover:bg-gray-100"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}