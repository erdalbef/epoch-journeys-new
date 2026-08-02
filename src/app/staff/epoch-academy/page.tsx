import { BookOpen } from "lucide-react";

const modules = [
  {
    title: "Module 1 - Welcome to Epoch",
    description:
      "The mission, philosophy, culture, values, and principles that define Epoch Journeys.",
  },
  {
    title: "Module 2 - What Is a Pilgrimage?",
    description:
      "Understanding the spiritual purpose of pilgrimage and how it differs from ordinary travel.",
  },
  {
    title: "Module 3 - Understanding Pilgrims",
    description:
      "Serving pilgrims with dignity, patience, compassion, and care.",
  },
  {
    title: "Module 4 - Understanding Priests",
    description:
      "Building respectful, trusted, and long-term relationships with spiritual leaders.",
  },
];

export default function StaffEpochAcademyPage() {
  return (
    <div className="space-y-10">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
          Epoch Academy
        </p>

        <h2 className="mt-4 font-serif text-4xl text-[#0B1F3A]">
          Academy Library
        </h2>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          Return whenever you wish to deepen your knowledge, strengthen your
          professional skills, or revisit the Epoch Philosophy.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {modules.map((module) => (
          <article
            key={module.title}
            className="rounded-3xl border border-slate-200 bg-white p-7"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1F3A] text-[#C9A24D]">
              <BookOpen size={22} />
            </div>

            <h3 className="mt-6 text-xl font-semibold text-[#0B1F3A]">
              {module.title}
            </h3>

            <p className="mt-3 leading-7 text-slate-600">
              {module.description}
            </p>

            <button
              type="button"
              className="mt-6 rounded-full bg-[#C9A24D] px-5 py-3 text-sm font-semibold text-[#0B1F3A]"
            >
              Open Module
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}