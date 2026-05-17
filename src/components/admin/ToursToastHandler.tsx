"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type Props = {
  success?: string;
  error?: string;
};

function decodeValue(value?: string) {
  if (!value) return "";
  return decodeURIComponent(value).trim();
}

export default function ToursToastHandler({ success, error }: Props) {
  useEffect(() => {
    const successValue = decodeValue(success);
    const errorValue = decodeValue(error);

    if (successValue) {
      toast.success(successValue);
    }

    if (errorValue) {
      toast.error(errorValue);
    }
  }, [success, error]);

  return null;
}