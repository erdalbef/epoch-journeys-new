import { RequestPartnershipForm } from "./RequestPartnershipForm";

export default function RequestPartnershipPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Request Partnership</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Travel advisors and group leaders may request access. Your account will be
        reviewed before approval.
      </p>

      <RequestPartnershipForm />
    </main>
  );
}
