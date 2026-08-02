import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  BookOpen,
  BriefcaseBusiness,
  Church,
  Compass,
  FileText,
  Map,
  Megaphone,
  Settings,
} from "lucide-react";

import { authOptions } from "@/lib/authOptions";

const workspaceSections = [
  {
    title: "Epoch Academy",
    description:
      "Access Academy modules, Knowledge Reviews, Founder Messages, and professional learning resources.",
    href: "/staff/epoch-academy",
    icon: BookOpen,
    available: true,
  },
  {
    title: "Journey Library",
    description:
      "Explore Epoch Journeys, pilgrimage themes, internal itineraries, and presentation guidance.",
    href: "/staff/journeys",
    icon: Compass,
    available: false,
  },
  {
    title: "Destination Library",
    description:
      "Study sacred destinations, churches, shrines, saints, Christian history, and practical notes.",
    href: "/staff/destinations",
    icon: Church,
    available: false,
  },
  {
    title: "Sales Resources",
    description:
      "Access selling principles, priest meeting guidance, presentations, and approved marketing materials.",
    href: "/staff/sales-resources",
    icon: BriefcaseBusiness,
    available: false,
  },
  {
    title: "Operations Center",
    description:
      "Find operational standards, procedures, checklists, supplier guidance, and tour-management resources.",
    href: "/staff/operations",
    icon: Settings,
    available: false,
  },
  {
    title: "Document Center",
    description:
      "Open approved manuals, templates, forms, policies, and official Epoch documents.",
    href: "/staff/documents",
    icon: FileText,
    available: false,
  },
  {
    title: "Epoch News",
    description:
      "Read Founder Messages, company announcements, Academy updates, and important notices.",
    href: "/staff/news",
    icon: Megaphone,
    available: false,
  },
  {
    title: "Knowledge Center",
    description:
      "Review useful articles, frequently asked questions, lessons learned, and best practices.",
    href: "/staff/knowledge",
    icon: Map,
    available: false,
  },
];

export default async function StaffHomePage() {
  const session = await getServerSession(authOptions);

  const staffName =
    session?.user?.fullName ||
    session?.user?.name ||
    session?.user?.email?.split("@")[0] ||
    "Epoch Team Member";

  return (
    <div className="space-y-12">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0B1F3A] px-8 py-12 text-white shadow-sm sm:px-12 sm:py-16">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#C9A24D]/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative z-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
            Welcome to the Epoch Workspace
          </p>

          <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
            Welcome, {staffName}.
          </h1>

          <p className="mt-5 text-xl text-white/85">
            Continue your journey.
          </p>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
            This is the digital home of the Epoch Team—a place to learn,
            prepare, collaborate, and access the knowledge and resources that
            support every Epoch Journey.
          </p>

          <div className="mt-8 h-px w-28 bg-[#C9A24D]" />

          <p className="mt-7 font-serif text-xl italic text-[#E8D8AE]">
            Per Fidem, Per Excellentiam
          </p>

          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
            Through Faith, Through Excellence
          </p>
        </div>
      </section>

      {/* Founder Message */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="flex items-center gap-3">
          <Megaphone className="text-[#C9A24D]" size={22} />

          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A24D]">
            Message from the Founder
          </p>
        </div>

        <blockquote className="mt-7 max-w-4xl font-serif text-2xl leading-10 text-[#0B1F3A]">
          “You have joined more than a travel company. You have joined a team
          committed to creating meaningful journeys of faith and serving every
          pilgrim with knowledge, integrity, compassion, and excellence.”
        </blockquote>

        <p className="mt-6 text-sm font-semibold text-slate-700">
          Erdal Vardarli
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Founder, Epoch Journeys
        </p>
      </section>

      {/* Workspace Sections */}
      <section>
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Your Workspace
          </p>

          <h2 className="mt-4 font-serif text-3xl text-[#0B1F3A] sm:text-4xl">
            Knowledge, Resources and Support
          </h2>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            Everything an Epoch Team Member needs to learn, know, and use will
            gradually become available within the Epoch Workspace.
          </p>
        </div>

        <div className="mt-9 grid gap-6 md:grid-cols-2">
          {workspaceSections.map((section) => {
            const Icon = section.icon;

            const content = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1F3A] text-[#C9A24D]">
                    <Icon size={22} />
                  </div>

                  {!section.available && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Coming Soon
                    </span>
                  )}
                </div>

                <h3 className="mt-6 text-xl font-semibold text-[#0B1F3A]">
                  {section.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {section.description}
                </p>

                {section.available && (
                  <p className="mt-6 text-sm font-semibold text-[#8B0000]">
                    Open Section →
                  </p>
                )}
              </>
            );

            if (section.available) {
              return (
                <Link
                  key={section.title}
                  href={section.href}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-[#C9A24D]/40 hover:shadow-lg"
                >
                  {content}
                </Link>
              );
            }

            return (
              <article
                key={section.title}
                className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-7"
              >
                {content}
              </article>
            );
          })}
        </div>
      </section>

      {/* Latest Update and Reflection */}
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[2rem] bg-[#F7F3EA] p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A24D]">
            Latest Update
          </p>

          <h2 className="mt-4 font-serif text-2xl text-[#0B1F3A]">
            Epoch Academy Is Now Open
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            The first Academy resources are being prepared for the Epoch Team.
            Module 1 introduces the philosophy, values, culture, and principles
            upon which Epoch Journeys was founded.
          </p>

          <Link
            href="/staff/epoch-academy"
            className="mt-6 inline-flex text-sm font-semibold text-[#8B0000]"
          >
            Visit Epoch Academy →
          </Link>
        </article>

        <article className="rounded-[2rem] bg-[#0B1F3A] p-8 text-white sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A24D]">
            Reflection
          </p>

          <blockquote className="mt-5 font-serif text-2xl italic leading-10 text-white/90">
            “Extraordinary pilgrimages are created by extraordinary people
            united by a shared philosophy.”
          </blockquote>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A24D]">
            The Epoch Standard
          </p>
        </article>
      </section>

      {/* Footer Principle */}
      <section className="border-t border-slate-200 py-8 text-center">
        <p className="mx-auto max-w-3xl text-sm leading-7 text-slate-500">
          The Epoch Workspace exists to help every team member learn,
          collaborate, and serve pilgrims according to the Epoch Philosophy and
          the Epoch Standard.
        </p>
      </section>
    </div>
  );
}