import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function PublicFooter() {
  return (
    <footer className="mt-20 bg-[#001F3F] text-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <h3 className="text-lg font-semibold">Epoch Journeys</h3>
            <p className="mt-4 text-sm leading-7 text-white/75">
              Cultural, historical, and pilgrimage travel programs across
              Europe, designed exclusively for travel professionals.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Navigation</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/pages/about">About</Link></li>
              <li><Link href="/pages/themes">Themes</Link></li>
              <li><Link href="/pages/destinations">Destinations</Link></li>
              <li><Link href="/pages/why-partner">Why Partner</Link></li>
              <li><Link href="/pages/contact">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Business</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              <li><Link href="/request-partnership">Request Partnership</Link></li>
              <li><Link href="/agent-login">Agent Login</Link></li>
              <li><Link href="/legal/privacy">Privacy Policy</Link></li>
              <li><Link href="/legal/terms">Terms & Conditions</Link></li>  
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Head Office</h3>
            <div className="mt-4 space-y-2 text-sm text-white/75">
              <p>Epoch Journeys OOD</p>
              <p>107 Tsar Boris III Blvd, Floor 7</p>
              <p>Sofia 1612, Bulgaria</p>

              <p className="pt-2">
                <a href="mailto:info@epochjourneys.com">
                  info@epochjourneys.com
                </a>
              </p>

              <p>
                <a
                  href="https://www.epochjourneys.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  www.epochjourneys.com
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <Separator className="bg-white/20" />
        </div>

        <div className="mt-6 flex flex-col gap-3 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Epoch Journeys OOD. All rights reserved.</p>
          <p>B2B Travel Platform</p>
        </div>
      </div>
    </footer>
  );
}