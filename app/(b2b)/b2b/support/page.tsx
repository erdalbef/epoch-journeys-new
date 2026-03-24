import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export default async function B2BSupportPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-[#001F3F]">Support</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Contact our team for booking help, operational questions, and urgent requests.
        </p>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Quick Support
        </h2>

        <form className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Subject
            </label>
            <input
              type="text"
              placeholder="Enter subject"
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Message
            </label>
            <textarea
              rows={6}
              placeholder="Write your message"
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#6f0000]"
          >
            Send Support Request
          </button>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Need immediate assistance?
        </h2>

        <p className="text-sm text-muted-foreground">
          For urgent operational support, please contact the operations team directly.
        </p>

        <div className="mt-4">
          <Link
            href="/b2b/bookings"
            className="text-sm font-medium text-[#8B0000] hover:underline"
          >
            View My Bookings
          </Link>
        </div>
      </section>
    </div>
  );
}