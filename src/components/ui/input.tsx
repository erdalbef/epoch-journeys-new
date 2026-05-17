// src/components/ui/input.tsx

"use client";

import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({
  className = "",
  type = "text",
  ...props
}: InputProps) {
  return (
    <input
      type={type}
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm 
      placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F] 
      disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}