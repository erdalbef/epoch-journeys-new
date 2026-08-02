import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Church,
  Compass,
  GraduationCap,
  Library,
  LockKeyhole,
  Map,
  Sparkles,
} from "lucide-react";

type AcademyCourse = {
  code: string;
  title: string;
  description: string;
  category: string;
  href?: string;
  available: boolean;
  featured?: boolean;
  icon: typeof BookOpen;
};

const foundationCourses: AcademyCourse[] = [
  {
    code: "EA-001",
    title: "The Epoch Foundation",
    description:
      "The mission, philosophy, values, culture, promise, and guiding principles of Epoch Journeys.",
    category: "Foundation Programme",
    href: "/staff/epoch-academy/ea-001",
    available: true,
    featured: true,
    icon: Compass,
  },
  {
    code: "EA-002",
    title: "The Epoch Pilgrimage Specialist",
    description:
      "Understanding pilgrimage, pilgrims, priests, spiritual purpose, professional responsibility, and the Epoch Way.",
    category: "Foundation Programme",
    href: "/staff/epoch-academy/ea-002",
    available: true,
    icon: GraduationCap,
  },
  {
    code: "EA-003",
    title: "Christianity & Christian Heritage",
    description:
      "The essential Christian history, traditions, sacred places, saints, relics, art, and heritage every specialist should understand.",
    category: "Foundation Programme",
    href: "/staff/epoch-academy/ea-003",
    available: true,
    icon: Church,
  },
  {
    code: "EA-004",
    title: "Sales, Operations & Service Excellence",
    description:
      "Ethical sales, supplier coordination, documentation, operational controls, service recovery, and the Epoch Standard.",
    category: "Foundation Programme",
    href: "/staff/epoch-academy/ea-004",
    available: true,
    icon: CheckCircle2,
  },
  {
    code: "EA-005",
    title: "The Epoch Christian Encyclopedia",
    description:
      "Christian terms, symbols, traditions, sacred objects, liturgy, architecture, and terminology for pilgrimage specialists.",
    category: "Foundation Reference",
    href: "/staff/epoch-academy/ea-005",
    available: true,
    featured: true,
    icon: Library,
  },
];

const destinationCourses: AcademyCourse[] = [
  {
    code: "EA-101",
    title: "Greece Pilgrimage Specialist",
    description:
      "Christianity entering Europe through the journeys of St. Paul, the early Church, Byzantine heritage, monasteries, and sacred sites.",
    category: "Destination Masterclass",
    href: "/staff/epoch-academy/ea-101",
    available: true,
    icon: Map,
  },
  {
    code: "EA-102",
    title: "Türkiye Pilgrimage Specialist",
    description:
      "The heartland where Christianity grew: biblical Asia Minor, the Seven Churches, Apostles, Councils, Cappadocia, and early Christian communities.",
    category: "Destination Masterclass",
    href: "/staff/epoch-academy/ea-102",
    available: true,
    featured: true,
    icon: Map,
  },
  {
    code: "EA-103",
    title: "Italy Pilgrimage Specialist",
    description:
      "Rome, the Apostles, saints, papal basilicas, Marian devotion, relics, sacred art, and the development of Western Christianity.",
    category: "Destination Masterclass",
    href: "/staff/epoch-academy/ea-103",
    available: true,
    icon: Map,
  },
  {
    code: "EA-104",
    title: "Holy Land Pilgrimage Specialist",
    description:
      "The land where Christianity was born: the life of Christ, biblical geography, sacred places, pilgrimage traditions, and operations.",
    category: "Destination Masterclass",
    available: false,
    icon: Map,
  },
  {
    code: "EA-105",
    title: "Spain Pilgrimage Specialist",
    description:
      "Apostolic heritage, Marian shrines, saints, cathedrals, pilgrimage routes, and Christian history across Spain.",
    category: "Destination Masterclass",
    available: false,
    icon: Map,
  },
  {
    code: "EA-106",
    title: "Portugal Pilgrimage Specialist",
    description:
      "Fátima, Eucharistic heritage, saints, Marian devotion, sacred places, and pilgrimage design in Portugal.",
    category: "Destination Masterclass",
    available: false,
    icon: Map,
  },
];

const futureLibraries = [
  {
    title: "Journey-Type Masterclasses",
    description:
      "Marian Pilgrimages, Footsteps of St. Paul, Christian Heritage, Reformation Journeys, Biblical Journeys, and more.",
    icon: Compass,
  },
  {
    title: "Leadership Development",
    description:
      "Training for senior specialists, mentors, managers, and future leaders of Epoch Journeys.",
    icon: GraduationCap,
  },
  {
    title: "Specialist Reference Library",
    description:
      "Saints, relics, shrines, church terminology, maps, directories, feast days, and field references.",
    icon: Library,
  },
];

function CourseCard({ course }: { course: AcademyCourse }) {
  const Icon = course.icon;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1F3A] text-[#C9A24D]">
          <Icon size={22} />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {course.featured ? (
            <span className="rounded-full bg-[#F7F3EA] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#8B6B23]">
              Featured
            </span>
          ) : null}

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              course.available
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {course.available ? "Available" : "Coming Soon"}
          </span>
        </div>
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#C9A24D]">
        {course.code}
      </p>

      <h3 className="mt-3 font-serif text-2xl leading-8 text-[#0B1F3A]">
        {course.title}
      </h3>

      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {course.category}
      </p>

      <p className="mt-5 leading-7 text-slate-600">
        {course.description}
      </p>

      <div className="mt-7 border-t border-slate-100 pt-5">
        {course.available ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B0000]">
            Open Course
            <ArrowRight size={16} />
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400">
            <LockKeyhole size={15} />
            In Development
          </span>
        )}
      </div>
    </>
  );

  if (course.available && course.href) {
    return (
      <Link
        href={course.href}
        className="group rounded-[1.75rem] border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-[#C9A24D]/50 hover:shadow-[0_18px_45px_rgba(11,31,58,0.10)]"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-7">
      {content}
    </article>
  );
}

export default function StaffEpochAcademyPage() {
  const availableCourses = [
    ...foundationCourses,
    ...destinationCourses,
  ].filter((course) => course.available).length;

  const totalCourses =
    foundationCourses.length + destinationCourses.length;

  return (
    <div className="space-y-14">
      {/* Academy Introduction */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0B1F3A] px-8 py-12 text-white shadow-sm sm:px-12 sm:py-16">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#C9A24D]/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative z-10 max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
            Epoch Academy
          </p>

          <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
            Academy Library
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/75">
            Develop the knowledge, judgement, confidence, and professional
            skills required to serve pilgrims, priests, partners, and
            colleagues according to the Epoch Philosophy and the Epoch
            Standard.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white/75">
              {availableCourses} Courses Available
            </span>

            <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white/75">
              {totalCourses} Courses Listed
            </span>

            <span className="rounded-full border border-[#C9A24D]/30 bg-[#C9A24D]/10 px-4 py-2 text-sm text-[#E8D8AE]">
              Lifelong Learning
            </span>
          </div>
        </div>
      </section>

      {/* Learning Principle */}
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A24D]">
            The Learning Journey
          </p>

          <h2 className="mt-4 font-serif text-3xl text-[#0B1F3A]">
            Begin with the Foundation
          </h2>

          <p className="mt-5 max-w-3xl leading-8 text-slate-600">
            New Epoch Team Members should complete the Foundation Programme
            before beginning the Destination Masterclasses. The Foundation
            courses introduce the philosophy, Christian knowledge,
            professional standards, and terminology used throughout the
            Academy.
          </p>
        </article>

        <article className="rounded-[2rem] bg-[#F7F3EA] p-8 sm:p-10">
          <Sparkles className="text-[#C9A24D]" size={24} />

          <p className="mt-5 font-serif text-2xl leading-9 text-[#0B1F3A]">
            Knowledge builds confidence. Faith gives purpose. Service creates
            meaningful pilgrimages.
          </p>

          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-[#8B6B23]">
            The Epoch Way
          </p>
        </article>
      </section>

      {/* Foundation Programme */}
      <section>
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Foundation Programme
          </p>

          <h2 className="mt-4 font-serif text-3xl text-[#0B1F3A] sm:text-4xl">
            The Knowledge Every Specialist Needs
          </h2>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            These courses establish the common philosophy, language, knowledge,
            and professional standards of Epoch Journeys.
          </p>
        </div>

        <div className="mt-9 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {foundationCourses.map((course) => (
            <CourseCard key={course.code} course={course} />
          ))}
        </div>
      </section>

      {/* Destination Masterclasses */}
      <section>
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Destination Masterclasses
          </p>

          <h2 className="mt-4 font-serif text-3xl text-[#0B1F3A] sm:text-4xl">
            Become a Destination Specialist
          </h2>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            Study the biblical, spiritual, historical, cultural, and
            operational importance of each destination and learn how to serve
            different Christian groups with confidence and respect.
          </p>
        </div>

        <div className="mt-9 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {destinationCourses.map((course) => (
            <CourseCard key={course.code} course={course} />
          ))}
        </div>
      </section>

      {/* Future Academy Areas */}
      <section className="rounded-[2rem] bg-[#F7F3EA] p-8 sm:p-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Growing with Epoch
          </p>

          <h2 className="mt-4 font-serif text-3xl text-[#0B1F3A]">
            Future Academy Libraries
          </h2>

          <p className="mt-4 leading-8 text-slate-600">
            The Epoch Academy will continue to expand as new journeys,
            destinations, professional standards, and leadership programmes
            are developed.
          </p>
        </div>

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          {futureLibraries.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-[1.5rem] border border-[#C9A24D]/20 bg-white p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B1F3A] text-[#C9A24D]">
                    <Icon size={20} />
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Coming Soon
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-semibold text-[#0B1F3A]">
                  {item.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Academy Commitment */}
      <section className="rounded-[2rem] bg-[#07172D] p-8 text-center text-white sm:p-12">
        <BookOpen
          className="mx-auto text-[#C9A24D]"
          size={28}
        />

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
          The Epoch Academy Commitment
        </p>

        <blockquote className="mx-auto mt-6 max-w-4xl font-serif text-2xl italic leading-10 text-white/90 sm:text-3xl sm:leading-[1.55]">
          “Before you learn how we work, understand why we exist. Before you
          represent Epoch, prepare yourself to serve with knowledge,
          integrity, humility, and excellence.”
        </blockquote>

        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-[#E8D8AE]">
          Per Fidem, Per Excellentiam
        </p>
      </section>
    </div>
  );
}