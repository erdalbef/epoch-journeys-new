// app/admin-login/page.tsx
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">Admin Login</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in with your admin email and password.
      </p>

      <AdminLoginForm />
    </main>
  );
}
