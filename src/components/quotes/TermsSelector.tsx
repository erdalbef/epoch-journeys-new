"use client";

type TermsPreset = {
  id: string;
  label: string;
  terms: string;
};

const TERMS_PRESETS: TermsPreset[] = [
  {
    id: "standard",
    label: "Standard Terms",
    terms: `This quotation is confidential and intended solely for the recipient.

All services are subject to availability at the time of booking and are not reserved until confirmed in writing.

Hotels listed are indicative and may be replaced with similar properties of equal category if necessary.

Room categories are based on standard rooms unless otherwise specified.

The quotation includes only the services explicitly mentioned in the "Included Services" section.

The company reserves the right to adjust the itinerary due to operational requirements, weather conditions, or unforeseen circumstances, while maintaining the overall quality of the program.

Prices are based on current rates and are subject to change prior to confirmation due to currency fluctuations, fuel surcharges, or supplier changes.

The client is responsible for ensuring that all travel documents, including passports and visas, are valid and in compliance with destination requirements.

Travel insurance is strongly recommended and should be arranged independently.

The company shall not be held responsible for delays, cancellations, or changes caused by circumstances beyond its control, including but not limited to natural events, strikes, or governmental actions.

This quotation and its pricing structure are strictly confidential and must not be disclosed, reproduced, or distributed to third parties without prior written consent.`,
  },
  {
    id: "short",
    label: "Short Terms",
    terms: `All services are subject to availability and confirmation.

Hotels listed are indicative and may be replaced with similar properties.

Prices are subject to change prior to confirmation.

Travel documents and insurance are the responsibility of the client.

This quotation is confidential and intended only for the recipient.`,
  },
  {
    id: "strict",
    label: "Strict Terms",
    terms: `This quotation is confidential and intended solely for the recipient.

All services are subject to availability and are not reserved until confirmed in writing and required payments are received.

Hotels listed are indicative and may be replaced with similar properties of equal category if necessary.

The quotation includes only the services expressly stated in the "Included Services" section.

Rates are based on the specified number of participants. Any change in group size may result in a price adjustment.

Prices are subject to change prior to confirmation due to supplier revisions, currency fluctuations, fuel surcharges, tax changes, or transport adjustments.

The company reserves the right to amend itinerary sequencing, transportation arrangements, or hotel selections where operationally required, while maintaining the overall standard of services.

The client is fully responsible for passports, visas, health requirements, and all travel documentation.

Travel insurance is strongly recommended and should be arranged independently.

The company shall not be liable for delays, cancellations, losses, or modifications caused by force majeure or circumstances beyond its control.

This quotation and its pricing structure are proprietary and must not be shared, reproduced, or distributed without prior written consent.`,
  },
];

export default function TermsSelector({
  onSelect,
}: {
  onSelect: (terms: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Terms Presets</h3>

      <div className="flex flex-wrap gap-2">
        {TERMS_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.terms)}
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}