"use client";

import { COUNTRY_PHONE_CODES } from "./countryCodes";

type PhoneInputProps = {
  label: string;
  codeValue: string;
  numberValue: string;
  onCodeChange: (value: string) => void;
  onNumberChange: (value: string) => void;
  required?: boolean;
  codeName?: string;
  numberName?: string;
  placeholder?: string;
};

export function PhoneInput({
  label,
  codeValue,
  numberValue,
  onCodeChange,
  onNumberChange,
  required = false,
  codeName,
  numberName,
  placeholder = "555 123 4567",
}: PhoneInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label} {required ? <span className="text-red-700">*</span> : null}
      </label>

      <div className="grid grid-cols-[160px_1fr] gap-3">
        <select
          name={codeName}
          value={codeValue}
          onChange={(e) => onCodeChange(e.target.value)}
          className="h-10 rounded-md border bg-white px-3 text-sm"
        >
          {COUNTRY_PHONE_CODES.map((item) => (
            <option key={`${item.label}-${item.code}`} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>

        <input
          name={numberName}
          type="text"
          value={numberValue}
          onChange={(e) => onNumberChange(e.target.value)}
          className="h-10 rounded-md border px-3 text-sm"
          placeholder={placeholder}
          required={required}
        />
      </div>
    </div>
  );
}