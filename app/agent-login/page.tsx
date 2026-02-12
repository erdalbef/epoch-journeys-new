import { AgentLoginForm } from "./AgentLoginForm";

type PageProps = {
  searchParams?: {
    callbackUrl?: string;
  };
};

export default function AgentLoginPage({ searchParams }: PageProps) {
  const callbackUrl =
    typeof searchParams?.callbackUrl === "string" && searchParams.callbackUrl.trim()
      ? searchParams.callbackUrl
      : "/b2b/dashboard";

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">Agent Login</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in with your agent email and password.
      </p>

      <AgentLoginForm callbackUrl={callbackUrl} />
    </main>
  );
}
