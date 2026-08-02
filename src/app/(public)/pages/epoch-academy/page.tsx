import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Church,
  Compass,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  LockKeyhole,
  Map,
  MessageCircleQuestion,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

const academyPurposes = [
  {
    title: "Preserve Our Philosophy",
    description:
      "Ensure every Epoch Team Member understands the purpose, values, and principles upon which Epoch Journeys was founded.",
    icon: Compass,
  },
  {
    title: "Develop Pilgrimage Specialists",
    description:
      "Build knowledgeable, confident, and trusted professionals who understand both pilgrimage and travel operations.",
    icon: GraduationCap,
  },
  {
    title: "Strengthen Destination Knowledge",
    description:
      "Teach the spiritual, historical, cultural, and practical importance of the destinations included in Epoch Journeys.",
    icon: Map,
  },
  {
    title: "Maintain the Epoch Standard",
    description:
      "Create consistency in how we communicate, design Journeys, serve pilgrims, and protect the Epoch reputation.",
    icon: ShieldCheck,
  },
  {
    title: "Prepare Future Leaders",
    description:
      "Develop people who can guide teams, mentor others, and carry the Epoch Philosophy into the future.",
    icon: Users,
  },
  {
    title: "Support Lifelong Learning",
    description:
      "Encourage every Pilgrimage Specialist to continue learning, reflecting, and improving throughout their career.",
    icon: BookOpen,
  },
];

const learningMethod = [
  {
    title: "Learn",
    description: "Understand the principle and why it matters.",
    icon: BookOpen,
  },
  {
    title: "Summary",
    description: "Review the central message of the lesson.",
    icon: Target,
  },
  {
    title: "Key Takeaways",
    description: "Remember the ideas that matter most.",
    icon: Sparkles,
  },
  {
    title: "Knowledge Review",
    description:
      "Reinforce learning through carefully prepared questions and answers.",
    icon: MessageCircleQuestion,
  },
  {
    title: "Think About It",
    description: "Reflect on the meaning of the lesson.",
    icon: Lightbulb,
  },
  {
    title: "Real-Life Scenario",
    description: "Apply the Epoch Philosophy to a practical situation.",
    icon: HeartHandshake,
  },
];

const academyLibrary = [
  {
    title: "Welcome to Epoch",
    description:
      "The mission, philosophy, culture, values, and principles that define Epoch Journeys.",
    icon: Compass,
  },
  {
    title: "Understanding Pilgrimage",
    description:
      "Why pilgrimage is different from ordinary travel and why spiritual purpose must guide every Journey.",
    icon: Church,
  },
  {
    title: "Understanding Pilgrims",
    description:
      "How to serve pilgrims with patience, dignity, compassion, and genuine care.",
    icon: Users,
  },
  {
    title: "Working with Priests",
    description:
      "How to listen, communicate respectfully, support spiritual leadership, and build lasting relationships.",
    icon: HeartHandshake,
  },
  {
    title: "Journey Design",
    description:
      "How to transform a spiritual purpose into a balanced, meaningful, and thoughtfully planned pilgrimage.",
    icon: Map,
  },
  {
    title: "Destination Knowledge",
    description:
      "Sacred places, saints, Scripture, Christian history, churches, shrines, and practical destination knowledge.",
    icon: BookOpen,
  },
  {
    title: "Sales with Integrity",
    description:
      "How to understand needs, communicate value, build trust, and never promise what cannot be delivered.",
    icon: ShieldCheck,
  },
  {
    title: "Operational Excellence",
    description:
      "Hotels, transportation, churches, documents, suppliers, timing, quality control, and problem solving.",
    icon: Target,
  },
  {
    title: "Leadership & Growth",
    description:
      "Teamwork, mentorship, decision-making, continuous improvement, and protecting the Epoch culture.",
    icon: GraduationCap,
  },
];

const trustPrinciples = [
  "Trust",
  "Encouragement",
  "Mentorship",
  "Shared purpose",
  "Continuous learning",
];

export default function EpochAcademyPage() {
  return (
    <main className="bg-white text-[#0B1F3A]">
      {/* Hero */}
      <section className="relative flex min-h-[88vh] items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/images/epoch-academy/academy-hero.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#07172D]/95 via-[#0B1F3A]/85 to-[#0B1F3A]/55" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-16">
          <div className="max-w-4xl text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#C9A24D]">
              Continue Your Journey
            </p>

            <h1 className="mt-6 font-serif text-5xl leading-tight sm:text-6xl lg:text-7xl">
              Epoch Academy
            </h1>

            <p className="mt-5 text-2xl font-light text-blue-50 sm:text-3xl">
              Developing Pilgrimage Specialists
            </p>

            <div className="mt-8 h-px w-32 bg-[#C9A24D]" />

            <p className="mt-8 text-xl italic text-[#E8D8AE]">
              Per Fidem, Per Excellentiam
            </p>

            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
              Through Faith, Through Excellence
            </p>

            <p className="mt-8 max-w-3xl text-lg leading-8 text-white/85">
              Developing knowledgeable, confident, and trusted Pilgrimage
              Specialists through faith, professional education, destination
              knowledge, and operational excellence.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#discover-academy"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C9A24D] px-8 py-4 text-sm font-semibold uppercase tracking-wide text-[#0B1F3A] transition duration-300 hover:-translate-y-0.5 hover:bg-white"
              >
                Discover the Academy
                <ArrowRight size={17} />
              </a>

            </div>            
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section
        id="discover-academy"
        className="scroll-mt-24 bg-[#F7F3EA] px-6 py-24 sm:px-10 lg:px-16"
      >
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
              More Than Training
            </p>

            <h2 className="mt-5 font-serif text-4xl leading-tight text-[#0B1F3A] sm:text-5xl">
              The Heart of the Epoch Culture
            </h2>
          </div>

          <div className="space-y-6 text-lg leading-8 text-gray-700">
            <p>
              Epoch Academy is the professional learning and development center
              of Epoch Journeys.
            </p>

            <p>
              It exists to preserve the Epoch Philosophy, develop Pilgrimage
              Specialists, and ensure that every member of the Epoch Team serves
              with knowledge, integrity, compassion, and excellence.
            </p>

            <p>
              We believe extraordinary pilgrimages are created not only through
              careful planning, but through extraordinary people united by a
              shared philosophy.
            </p>

            <p className="font-semibold text-[#0B1F3A]">
              At Epoch, learning is not an event. It is a lifelong Journey.
            </p>
          </div>
        </div>
      </section>

      {/* Why Academy Exists */}
      <section className="px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
              Why the Academy Exists
            </p>

            <h2 className="mt-5 font-serif text-4xl text-[#0B1F3A] sm:text-5xl">
              We Invest in People
            </h2>

            <p className="mt-6 text-lg leading-8 text-gray-600">
              Our greatest strength is not the places we visit. It is the people
              who bring those places to life.
            </p>
          </div>

          <div className="mt-14 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {academyPurposes.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-3xl border border-gray-200 bg-white p-8 shadow-[0_12px_34px_rgba(0,0,0,0.05)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1F3A] text-[#C9A24D]">
                    <Icon size={22} />
                  </div>

                  <h3 className="mt-6 text-xl font-semibold text-[#0B1F3A]">
                    {item.title}
                  </h3>

                  <p className="mt-4 leading-7 text-gray-600">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Epoch Learning Method */}
      <section className="bg-[#0B1F3A] px-6 py-24 text-white sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
              The Epoch Learning Method
            </p>

            <h2 className="mt-5 font-serif text-4xl sm:text-5xl">
              Learning Through Understanding
            </h2>

            <p className="mt-6 text-lg leading-8 text-white/70">
              We do not learn to pass a test. We learn to serve pilgrims with
              greater knowledge, confidence, wisdom, and excellence.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {learningMethod.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-3xl border border-white/15 bg-white/[0.06] p-7 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C9A24D] text-[#0B1F3A]">
                      <Icon size={20} />
                    </div>

                    <span className="text-sm font-semibold text-white/35">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="mt-6 text-xl font-semibold">{item.title}</h3>

                  <p className="mt-3 leading-7 text-white/65">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Academy Library */}
      <section className="bg-white px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
              Academy Library
            </p>

            <h2 className="mt-5 font-serif text-4xl text-[#0B1F3A] sm:text-5xl">
              Knowledge for Every Pilgrimage Specialist
            </h2>

            <p className="mt-6 text-lg leading-8 text-gray-600">
              Academy modules combine Epoch philosophy, pilgrimage knowledge,
              destination expertise, professional skills, and leadership
              development.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {academyLibrary.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="group rounded-3xl border border-gray-200 bg-[#FCFBF8] p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#C9A24D]/35 bg-white text-[#C9A24D]">
                    <Icon size={20} />
                  </div>

                  <h3 className="mt-6 text-xl font-semibold text-[#0B1F3A]">
                    {item.title}
                  </h3>

                  <p className="mt-3 leading-7 text-gray-600">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Epoch Difference */}
      <section className="bg-[#F7F3EA] px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
            The Epoch Difference
          </p>

          <h2 className="mt-5 font-serif text-4xl text-[#0B1F3A] sm:text-5xl">
            We Begin with Purpose
          </h2>

          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-gray-700">
            We do not begin with a destination. We begin by understanding the
            priest, the parish, the pilgrims, and the spiritual purpose of the
            Journey.
          </p>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 text-left md:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 bg-white p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                The First Question Is Not
              </p>

              <p className="mt-5 font-serif text-2xl leading-9 text-gray-500">
                “Where would you like to go?”
              </p>
            </div>

            <div className="rounded-3xl bg-[#0B1F3A] p-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9A24D]">
                Epoch Begins By Asking
              </p>

              <p className="mt-5 font-serif text-2xl leading-9">
                “What do you want your pilgrims to experience?”
              </p>
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-xl font-semibold leading-9 text-[#0B1F3A]">
            The destination serves the pilgrimage. The pilgrimage does not serve
            the destination.
          </p>
        </div>
      </section>

      {/* Trust */}
      <section className="px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
              Our Commitment
            </p>

            <h2 className="mt-5 font-serif text-4xl leading-tight text-[#0B1F3A] sm:text-5xl">
              We Develop People Through Trust
            </h2>

            <p className="mt-7 text-lg leading-8 text-gray-600">
              The Academy is designed to guide, encourage, and strengthen the
              Epoch Team. It is a professional library for learning and growth,
              not a system of unnecessary monitoring.
            </p>

            <p className="mt-5 text-lg leading-8 text-gray-600">
              We believe professionals who are inspired by a shared purpose will
              strive for excellence because they understand why their work
              matters.
            </p>
          </div>

          <div className="rounded-[2rem] bg-[#0B1F3A] p-8 text-white sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C9A24D]">
              Great Professionals Grow Through
            </p>

            <div className="mt-8 space-y-4">
              {trustPrinciples.map((principle) => (
                <div
                  key={principle}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4"
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-[#C9A24D]" />

                  <span className="text-lg">{principle}</span>
                </div>
              ))}
            </div>

            <p className="mt-8 border-t border-white/15 pt-7 text-lg leading-8 text-white/75">
              We develop people through trust, encouragement, and shared
              purpose—not through unnecessary monitoring.
            </p>
          </div>
        </div>
      </section>

      {/* Staff Access */}
      <section className="relative overflow-hidden bg-[#07172D] px-6 py-24 text-white sm:px-10 lg:px-16">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#C9A24D]/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
            Continue Your Journey
          </p>

          <h2 className="mt-5 font-serif text-4xl sm:text-5xl">
            Enter Epoch Academy
          </h2>

          <p className="mt-5 text-xl italic text-[#E8D8AE]">
            Per Fidem, Per Excellentiam
          </p>

          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.22em] text-white/55">
            Through Faith, Through Excellence
          </p>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-white/75">
            Continue developing your knowledge, strengthen your professional
            skills, and remain faithful to the Epoch Philosophy.
          </p>

          <div className="mx-auto mt-9 inline-flex items-center gap-3 rounded-full border border-[#C9A24D]/40 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-[#E8D8AE]">
            <LockKeyhole size={17} />
            Access Reserved for Authorized Epoch Team Members
          </div>

          <div className="mt-9">
            <Link
              href="/staff-login"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C9A24D] px-9 py-4 text-sm font-semibold uppercase tracking-wide text-[#0B1F3A] transition duration-300 hover:-translate-y-0.5 hover:bg-white"
            >
              <LockKeyhole size={17} />
              Enter Epoch Academy
            </Link>
          </div>

          <blockquote className="mx-auto mt-14 max-w-3xl border-t border-white/15 pt-10 font-serif text-2xl italic leading-10 text-white/85">
            “Extraordinary pilgrimages are created by extraordinary people
            united by a shared philosophy.”
          </blockquote>

          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A24D]">
            The Epoch Standard
          </p>
        </div>
      </section>
    </main>
  );
}