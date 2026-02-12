import { AgentLoginForm } from "@/components/auth/AgentLoginForm";

export default function AgentLoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">Agent Login</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to access the agent dashboard.
      </p>

      <AgentLoginForm />
    </main>
  );
}
