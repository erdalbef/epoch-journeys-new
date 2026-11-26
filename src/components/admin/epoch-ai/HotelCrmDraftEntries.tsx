import { hotelCrmEntryKey, hotelCrmFieldLabels, type HotelCrmEntry } from "@/lib/epoch-ai/hotelCrmProfile";

export default function HotelCrmDraftEntries({entries, excluded, onToggle}: {
  entries: HotelCrmEntry[];
  excluded: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <ul className="divide-y divide-slate-200 rounded-lg border bg-white px-3 text-sm">
      {entries.map(entry => {
        const key = hotelCrmEntryKey(entry);
        return <li key={key} className="space-y-1 py-2">
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={!excluded.includes(key)} onChange={() => onToggle(key)} />
            <span className="min-w-0 break-words">
              <strong>{hotelCrmFieldLabels[entry.kind]}</strong> · {entry.value}
            </span>
          </label>
          <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-5 text-xs text-blue-800 underline">
            Review source
          </a>
        </li>;
      })}
    </ul>
  );
}
