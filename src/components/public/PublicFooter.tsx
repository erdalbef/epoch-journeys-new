import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function PublicFooter() {
  return (
    <footer className="mt-24 bg-[#0B1F3A] text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              Epoch Journeys
            </h3>

            <p className="mt-4 text-sm font-medium text-[#C9A24D]">
              Thoughtfully Planned. Faithfully Delivered.
            </p>

            <p className="mt-5 max-w-sm text-[15px] leading-7 text-white/75">
              European Specialists in Catholic Pilgrimages and Christian
              Heritage Journeys across Europe and the Holy Land.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A24D]">
              Navigation
            </h3>

            <ul className="mt-5 space-y-3 text-[15px] text-white/70">
              <li><Link href="/" className="transition hover:text-white">Home</Link></li>
              <li><Link href="/pages/about" className="transition hover:text-white">About</Link></li>
              <li><Link href="/pages/journey-collections" className="transition hover:text-white">Journey Collections</Link></li>
              <li><Link href="/pages/services" className="transition hover:text-white">Services</Link></li>
              <li><Link href="/pages/why-epoch" className="transition hover:text-white">Why Epoch</Link></li>
              <li><Link href="/pages/contact" className="transition hover:text-white">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A24D]">
              Partner Access
            </h3>

            <ul className="mt-5 space-y-3 text-[15px] text-white/70">
              <li><Link href="/request-partnership" className="transition hover:text-white">Become a Partner</Link></li>
              <li><Link href="/agent-login" className="transition hover:text-white">Agent Login</Link></li>
              <li><Link href="/legal/privacy" className="transition hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/legal/terms" className="transition hover:text-white">Terms & Conditions</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A24D]">
              Head Office
            </h3>

            <div className="mt-5 space-y-2 text-[15px] leading-7 text-white/70">
              <p>Epoch Journeys OOD</p>
              <p>107 Tsar Boris III Blvd, Floor 7</p>
              <p>Sofia 1612, Bulgaria</p>

              <div className="space-y-1 pt-3">
                <p>
                  <a href="mailto:info@epochjourneys.com" className="transition hover:text-white">
                    info@epochjourneys.com
                  </a>
                </p>

                <p>
                  <a
                    href="https://www.epochjourneys.com"
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:text-white"
                  >
                    www.epochjourneys.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <Separator className="bg-white/15" />
        </div>

        <div className="mt-6 flex flex-col gap-3 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Epoch Journeys OOD. All rights reserved.</p>
          <p className="tracking-wide text-[#C9A24D]">European Pilgrimage DMC</p>
        </div>
      </div>
    </footer>
  );
}