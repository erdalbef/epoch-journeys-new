import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="p-10">Loading...</main>}><ResetPasswordForm /></Suspense>;
}
