import { Suspense } from "react";
import AdminLoginClient from "./AdminLoginClient";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8f8f8] px-6 py-16">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-md">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-[#001F3F]">
                Admin Access
              </h1>
              <p className="mt-2 text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        </main>
      }
    >
      <AdminLoginClient />
    </Suspense>
  );
}