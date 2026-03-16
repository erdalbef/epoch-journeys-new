import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function PublicFooter() {
  return (
    <footer className="mt-20 bg-[#001F3F] text-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">

          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold">Epoch Journeys</h3>
            <p className="mt-4 text-sm leading-7 text-white/75">
              Curated cultural, historical, and pilgrimage travel experiences
              across Europe for travel advisors, tour operators, and group
              leaders.
            </p>
          </div>

          {/* Presence */}
          <div>
            <h3 className="text-lg font-semibold">Our Presence</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              <li>Spain Office</li>
              <li>Greece Office</li>
              <li>Turkey Office</li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              <li>
                <Link href="/pages/about" className="transition hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/request-partnership"
                  className="transition hover:text-white"
                >
                  Request Partnership
                </Link>
              </li>
              <li>
                <Link
                  href="/pages/contact"
                  className="transition hover:text-white"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="transition hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="transition hover:text-white">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Head Office */}
          <div>
            <h3 className="text-lg font-semibold">Head Office</h3>

            <div className="mt-4 space-y-2 text-sm text-white/75">
              <p>Epoch Journeys OOD</p>

              <p>107 Tsar Boris III Blvd, Floor 7</p>
              <p>Sofia 1612, Bulgaria</p>

              <p className="pt-2">
                <a
                  href="mailto:info@epochjourneys.com"
                  className="transition hover:text-white"
                >
                  info@epochjourneys.com
                </a>
              </p>

              <p>
                <a
                  href="https://www.epochjourneys.com"
                  target="_blank"
                  className="transition hover:text-white"
                >
                  www.epochjourneys.com
                </a>
              </p>
            </div>
          </div>

        </div>

        <div className="mt-10">
          <Separator className="bg-white/15" />
        </div>

        <div className="mt-6 flex flex-col gap-3 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Epoch Journeys OOD. All rights reserved.</p>
          <p>B2B Travel Platform</p>
        </div>
      </div>
    </footer>
  );
}