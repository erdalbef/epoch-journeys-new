import Image from "next/image";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function PublicFooter() {
  return (
    <footer className="mt-24 bg-[#0B1F3A] text-white">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-14 md:grid-cols-2 xl:grid-cols-4">
          {/* Company */}
          <div>
            <div className="flex items-center gap-4">
              <Image
                src="/epoch-compass-logo.png"
                alt="Epoch Journeys"
                width={60}
                height={60}
                className="h-14 w-14 object-contain"
              />

              <div>
                <h3 className="text-2xl font-semibold tracking-tight">
                  Epoch Journeys
                </h3>

                <p className="mt-1 text-sm font-medium text-[#C9A24D]">
                  Thoughtfully Planned. Faithfully Delivered.
                </p>
              </div>
            </div>

            <p className="mt-6 max-w-sm text-[15px] leading-7 text-white/75">
              A Destination Management Company specializing in Catholic
              pilgrimages and Christian heritage journeys across Europe,
              the Holy Land, Turkey, Greece, and the world&apos;s most meaningful
              faith destinations.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A24D]">
              Navigation
            </h3>

            <ul className="mt-6 space-y-3 text-[15px] text-white/70">
              <li>
                <Link href="/" className="transition hover:text-white">
                  Home
                </Link>
              </li>

              <li>
                <Link href="/pages/about" className="transition hover:text-white">
                  About
                </Link>
              </li>

              <li>
                <Link
                  href="/pages/journey-collections"
                  className="transition hover:text-white"
                >
                  Journey Collections
                </Link>
              </li>

              <li>
                <Link href="/pages/services" className="transition hover:text-white">
                  Services
                </Link>
              </li>

              <li>
                <Link href="/pages/why-epoch" className="transition hover:text-white">
                  Why Epoch
                </Link>
              </li>

              <li>
                <Link href="/pages/contact" className="transition hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Partner */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A24D]">
              Partner Access
            </h3>

            <ul className="mt-6 space-y-3 text-[15px] text-white/70">
              <li>
                <Link
                  href="/request-partnership"
                  className="transition hover:text-white"
                >
                  Become a Partner
                </Link>
              </li>

              <li>
                <Link
                  href="/agent-login"
                  className="transition hover:text-white"
                >
                  Agent Login
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
                <Link
                  href="/legal/terms"
                  className="transition hover:text-white"
                >
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A24D]">
              Head Office
            </h3>

            <div className="mt-6 space-y-2 text-[15px] leading-7 text-white/70">
              <p>Epoch Journeys OOD</p>

              <p>107 Tsar Boris III Blvd, Floor 7</p>

              <p>Sofia 1612, Bulgaria</p>

              <div className="pt-4">
                <p>
                  <a
                    href="mailto:info@epochjourneys.com"
                    className="transition hover:text-white"
                  >
                    info@epochjourneys.com
                  </a>
                </p>

                <p className="mt-1">
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

        <div className="mt-14">
          <Separator className="bg-white/15" />
        </div>

        <div className="mt-8 flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/60">
            © {new Date().getFullYear()} Epoch Journeys OOD. All rights reserved.
          </p>

          <p className="text-center font-medium tracking-wide text-[#C9A24D]">
            Catholic Pilgrimages • Christian Heritage • Trusted Local Expertise
          </p>
        </div>
      </div>
    </footer>
  );
}