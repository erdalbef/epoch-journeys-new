import { AgentLoginForm } from "./AgentLoginForm";

export default function AgentLoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agent Login</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to access the B2B portal.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <AgentLoginForm />
      </div>
    </div>
  );
}