import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function PublicFooter() {
  return (
    <footer className="mt-24 bg-[#001F3F] text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-4">
          
          {/* BRAND */}
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              Epoch Journeys
            </h3>

            <p className="mt-5 max-w-sm text-[15px] leading-7 text-white/75">
              Cultural, historical, and pilgrimage travel programs across
              Europe and the Mediterranean, designed exclusively for travel
              professionals.
            </p>
          </div>

          {/* NAVIGATION */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/90">
              Navigation
            </h3>

            <ul className="mt-5 space-y-3 text-[15px] text-white/70">
              <li>
                <Link href="/" className="hover:text-white transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/pages/about" className="hover:text-white transition">
                  About
                </Link>
              </li>
              <li>
                <Link href="/pages/themes" className="hover:text-white transition">
                  Themes
                </Link>
              </li>
              <li>
                <Link href="/pages/destinations" className="hover:text-white transition">
                  Destinations
                </Link>
              </li>
              <li>
                <Link href="/pages/why-partner" className="hover:text-white transition">
                  Why Partner
                </Link>
              </li>
              <li>
                <Link href="/pages/contact" className="hover:text-white transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* BUSINESS */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/90">
              Business
            </h3>

            <ul className="mt-5 space-y-3 text-[15px] text-white/70">
              <li>
                <Link href="/request-partnership" className="hover:text-white transition">
                  Request Partnership
                </Link>
              </li>
              <li>
                <Link href="/agent-login" className="hover:text-white transition">
                  Agent Login
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-white transition">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/90">
              Head Office
            </h3>

            <div className="mt-5 space-y-2 text-[15px] text-white/70 leading-7">
              <p>Epoch Journeys OOD</p>
              <p>107 Tsar Boris III Blvd, Floor 7</p>
              <p>Sofia 1612, Bulgaria</p>

              <div className="pt-3 space-y-1">
                <p>
                  <a
                    href="mailto:info@epochjourneys.com"
                    className="hover:text-white transition"
                  >
                    info@epochjourneys.com
                  </a>
                </p>

                <p>
                  <a
                    href="https://www.epochjourneys.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition"
                  >
                    www.epochjourneys.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="mt-12">
          <Separator className="bg-white/15" />
        </div>

        {/* BOTTOM BAR */}
        <div className="mt-6 flex flex-col gap-3 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Epoch Journeys OOD. All rights reserved.
          </p>

          <p className="tracking-wide">
            B2B Travel Platform
          </p>
        </div>
      </div>
    </footer>
  );
}