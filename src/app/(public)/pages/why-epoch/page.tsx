
 import Link from "next/link";
import {
  CheckCircle2,
  Handshake,
  Landmark,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const differenceItems = [
  {
    title: "Thoughtfully Planned",
    text: "Every pilgrimage begins with understanding your group’s vision, expectations, and pilgrimage goals.",
    icon: Sparkles,
  },
  {
    title: "Faithfully Delivered",
    text: "Professional execution from arrival until departure, with every detail managed with care.",
    icon: ShieldCheck,
  },
  {
    title: "European Expertise",
    text: "Trusted destination specialists across Europe and the Holy Land.",
    icon: Landmark,
  },
  {
    title: "Built for Partnerships",
    text: "Your reputation becomes our responsibility.",
    icon: Handshake,
  },
];

const promiseItems = [
  "We listen before we design.",
  "We customize every pilgrimage.",
  "We communicate clearly and promptly.",
  "We protect your reputation.",
  "We build long-term partnerships.",
];

const checklistItems = [
  "European specialists in Catholic pilgrimages",
  "Christian heritage expertise",
  "Tailor-made pilgrimage programs",
  "Multi-country planning",
  "Carefully selected hotels",
  "Licensed local guides",
  "Transportation coordination",
  "Assistance with Mass arrangements",
  "Customized proposals",
  "Responsive communication",
  "Transparent pricing",
  "Long-term partnerships",
];

const processItems = [
  {
    step: "01",
    title: "Share Your Vision",
    text: "Tell us about your group, destinations, travel dates, and pilgrimage goals.",
  },
  {
    step: "02",
    title: "We Design Your Pilgrimage",
    text: "Our specialists prepare a tailored proposal reflecting your objectives.",
  },
  {
    step: "03",
    title: "We Coordinate Every Detail",
    text: "Hotels, transportation, local guides, restaurants, operational support, and assistance with Mass arrangements.",
  },
  {
    step: "04",
    title: "Together We Deliver",
    text: "Your pilgrims return inspired. Your organization grows. Our partnership continues.",
  },
];

export default function WhyEpochPage() {
  return (
    <main className="bg-white text-black">
      <section className="bg-[#F7F3EA] px-6 py-24 text-center sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
            Why Epoch Journeys
          </p>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#0B1F3A] sm:text-5xl">
            Why Travel Professionals Choose Epoch
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            European specialists in Catholic pilgrimages, combining thoughtful
            planning, trusted partnerships, and professional destination
            management across Europe and the Holy Land.
          </p>

          <div className="mt-9">
            <Link
              href="/request-partnership"
              className="inline-flex items-center justify-center rounded-full bg-[#C9A24D] px-8 py-3.5 text-sm font-semibold text-[#0B1F3A] transition hover:bg-[#0B1F3A] hover:text-[#C9A24D]"
            >
              Become a Partner
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Our Approach
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
            We Become Part of Your Team
          </h2>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            A successful pilgrimage is about far more than reservations and
            logistics. It begins with understanding your vision, respecting the
            spiritual purpose of the journey, and carefully planning every
            detail so your pilgrims can focus on what matters most.
          </p>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            At Epoch Journeys, we become an extension of your team, providing
            the expertise, local knowledge, and operational support needed to
            deliver exceptional Catholic pilgrimages.
          </p>
        </div>
      </section>

      <section className="bg-[#F7F3EA] px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
              The Epoch Difference
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
              Built for Trust. Designed for Pilgrimages.
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {differenceItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-gray-200 bg-white p-7 shadow-[0_12px_34px_rgba(0,0,0,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1F3A] text-[#C9A24D]">
                    <Icon size={22} />
                  </div>

                  <h3 className="mt-6 text-xl font-semibold text-[#0B1F3A]">
                    {item.title}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-gray-600">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#0B1F3A] px-6 py-24 text-center text-white sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            The Epoch Standard
          </p>

          <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Thoughtfully Planned.
            <br />
            Faithfully Delivered.
          </h2>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-white/75">
            Every itinerary. Every hotel. Every local guide. Every partnership.
            Every pilgrimage. Guided by one commitment: The Epoch Standard.
          </p>
        </div>
      </section>

      <section className="px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
              Our Promise to Partners
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
              We Protect the Trust You Place in Us
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-5">
            {promiseItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-[0_10px_28px_rgba(0,0,0,0.04)]"
              >
                <MessageCircle
                  className="mx-auto text-[#C9A24D]"
                  size={24}
                />
                <p className="mt-4 text-sm font-semibold leading-6 text-[#0B1F3A]">
                  {item}
                </p>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-12 max-w-3xl text-center text-lg leading-8 text-gray-600">
            When your pilgrims travel with Epoch Journeys, they travel under
            your name. We never forget that responsibility.
          </p>
        </div>
      </section>

      <section className="bg-[#F7F3EA] px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
              Why Professionals Choose Epoch
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
              Everything Needed for a Thoughtfully Managed Pilgrimage
            </h2>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {checklistItems.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 text-[#C9A24D]" size={20} />
                <span className="text-base leading-7 text-gray-700">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
              How We Work
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
              From Vision to Pilgrimage
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-4">
            {processItems.map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-gray-200 bg-white p-7 shadow-[0_12px_34px_rgba(0,0,0,0.05)]"
              >
                <p className="text-sm font-semibold tracking-[0.18em] text-[#C9A24D]">
                  {item.step}
                </p>

                <h3 className="mt-4 text-lg font-semibold text-[#0B1F3A]">
                  {item.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-gray-600">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0B1F3A] px-6 py-24 text-center text-white sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Begin Your Partnership
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Let’s Begin Your Next Pilgrimage
          </h2>

          <p className="mt-6 text-lg leading-8 text-white/75">
            Whether you organize one pilgrimage each year or many throughout
            Europe, Epoch Journeys is ready to become your trusted destination
            management partner.
          </p>

          <div className="mt-9">
            <Link
              href="/request-partnership"
              className="inline-flex items-center justify-center rounded-full bg-[#C9A24D] px-8 py-3.5 text-sm font-semibold text-[#0B1F3A] transition hover:bg-white"
            >
              Become a Partner
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}