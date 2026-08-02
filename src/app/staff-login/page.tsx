import { Suspense } from "react";
import { StaffLoginForm } from "./StaffLoginForm";

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#07172D] px-6 py-16">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
                Epoch Journeys
              </p>

              <h1 className="mt-4 font-serif text-3xl text-[#0B1F3A]">
                Epoch Workspace
              </h1>

              <p className="mt-3 text-sm text-slate-600">Loading...</p>
            </div>
          </div>
        </main>
      }
    >
      <StaffLoginForm />
    </Suspense>
  );
}