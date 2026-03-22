import RequestPartnershipForm from "@/components/shared/form/RequestPartnershipForm";

export default function RequestPartnershipPage() {
  return (
    <main className="bg-[#f8f9fb] text-black">
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center sm:px-10 lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8B0000]">
          Partnership
        </p>

        <h1 className="mt-4 text-4xl font-semibold text-[#001F3F] sm:text-5xl">
          Request partnership access
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
          Join our network of travel professionals and work with a partner
          focused on quality, structure, and reliable delivery.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-10 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-[#001F3F]">
                Why work with us
              </h2>

              <ul className="mt-6 space-y-4 text-gray-600">
                <li>• Structured cultural and pilgrimage programs</li>
                <li>• Clear B2B collaboration model</li>
                <li>• Flexible custom travel solutions</li>
                <li>• Reliable operational support</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
              <h3 className="text-lg font-semibold text-[#001F3F]">
                What happens next
              </h3>

              <p className="mt-3 text-sm leading-7 text-gray-600">
                Once your request is reviewed, our team will contact you with
                the next steps and partnership details.
              </p>
            </div>
          </div>

          <RequestPartnershipForm />
        </div>
      </section>
    </main>
  );
}