import Link from "next/link";
import {
  ArrowRight,
  Church,
  Cross,
  Heart,
  Landmark,
  Map,
  Sparkles,
} from "lucide-react";

const journeys = [
  {
    title: "Marian Journeys",
    description:
      "Encounter the world's most beloved Marian shrines through journeys of prayer, hope, and spiritual renewal.",
    highlights: [
      "Lourdes",
      "Fátima",
      "Medjugorje",
      "Guadalupe (Coming Soon)",
    ],
    icon: Heart,
    href: "/pages/journeys/marian-journeys",
  },
  {
    title: "Footsteps of St. Paul",
    description:
      "Follow the missionary journeys that shaped early Christianity and carried the Gospel across the Mediterranean.",
    highlights: ["Türkiye", "Greece", "Malta", "Rome"],
    icon: Map,
    href: "/pages/journeys/footsteps-of-st-paul",
  },
  {
    title: "Sacred Italy",
    description:
      "Experience the heart of Catholic tradition through Rome, Assisi, the saints, and Italy's treasured shrines.",
    highlights: ["Rome", "Assisi", "Padua", "Loreto"],
    icon: Church,
    href: "/pages/journeys/sacred-italy",
  },
  {
    title: "The Holy Land",
    description:
      "Walk through the places where Scripture comes alive and the story of salvation unfolded.",
    highlights: ["Jerusalem", "Galilee", "Bethlehem", "Jordan"],
    icon: Cross,
    href: "/pages/journeys/holy-land",
  },
  {
    title: "Christian Heritage & Sacred Europe",
    description:
      "Discover the lands where Christian history, sacred tradition, and European heritage have shaped the Church for nearly two thousand years.",
    highlights: ["Armenia", "Georgia", "Egypt", "Sacred Europe"],
    icon: Landmark,
    href: "/pages/journeys/christian-heritage",
  },
  {
    title: "Custom Signature Journeys",
    description:
      "Every pilgrimage is thoughtfully designed around your group's faith, interests, expectations, and spiritual goals.",
    highlights: [
      "Custom Routes",
      "Multi-Country Programs",
      "Special Interest Groups",
    ],
    icon: Sparkles,
    href: "/pages/journeys/custom-signature-journeys",
  },
];

export default function JourneysPage() {
  return (
    <main className="bg-white">

      {/* Hero */}

      <section className="bg-[#F7F3EA] px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl text-center">

          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#C9A24D]">
            Signature Journeys
          </p>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[#0B1F3A] sm:text-5xl lg:text-6xl">
            Discover Our Signature Journeys
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-gray-600">
            Every Epoch Journey is thoughtfully designed around a particular
            spiritual theme, Christian tradition, or historical heritage.
            Rather than offering fixed tour packages, we create meaningful
            pilgrimages carefully adapted to each group&apos;s purpose,
            expectations, and spiritual goals.
          </p>

        </div>
      </section>

      {/* Introduction */}

      <section className="px-6 pt-24 sm:px-10 lg:px-16">

        <div className="mx-auto max-w-4xl text-center">

          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
            Explore Our Signature Journeys
          </p>

          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-[#0B1F3A]">
            Journeys Inspired by Faith, History & Purpose
          </h2>

          <p className="mt-8 text-lg leading-8 text-gray-600">
            Each journey reflects a different expression of Christian faith and
            heritage. From Marian shrines and the missionary travels of
            St. Paul to the Holy Land and sacred sites across Europe,
            every pilgrimage is thoughtfully planned to inspire faith,
            deepen understanding, and create lasting memories.
          </p>

        </div>

        {/* Journey Cards */}

        <div className="mx-auto mt-16 grid max-w-7xl gap-8 md:grid-cols-2 xl:grid-cols-3">

          {journeys.map((journey) => {

            const Icon = journey.icon;

            return (

              <Link
                key={journey.title}
                href={journey.href}
                className="group rounded-3xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#C9A24D]/40 hover:shadow-xl"
              >

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0B1F3A] text-[#C9A24D]">
                  <Icon size={24} />
                </div>

                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
                  Signature Journey
                </p>

                <h3 className="mt-3 text-2xl font-semibold text-[#0B1F3A]">
                  {journey.title}
                </h3>

                <p className="mt-5 leading-8 text-gray-600">
                  {journey.description}
                </p>

                <div className="mt-7">

                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A24D]">
                    Highlights
                  </p>

                  <ul className="space-y-3">

                    {journey.highlights.map((highlight) => (

                      <li
                        key={highlight}
                        className="flex items-center gap-3 text-sm text-gray-700"
                      >

                        <span className="h-1.5 w-1.5 rounded-full bg-[#C9A24D]" />

                        {highlight}

                      </li>

                    ))}

                  </ul>

                </div>

                <div className="mt-8 inline-flex items-center gap-2 font-semibold text-[#0B1F3A]">

                  Discover Journey

                  <ArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />

                </div>

              </Link>

            );

          })}

        </div>

      </section>

      {/* Closing CTA */}

      <section className="mt-24 bg-[#0B1F3A] px-6 py-24 text-white sm:px-10 lg:px-16">

        <div className="mx-auto max-w-4xl text-center">

          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
            Begin Your Journey
          </p>

          <h2 className="mt-6 text-4xl font-semibold">
            Every Pilgrimage Begins with a Conversation
          </h2>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-white/80">
            Every group is unique. Whether you&apos;re planning a parish
            pilgrimage, a diocesan journey, or a custom program for
            your clients, we&apos;ll work with you to create an itinerary
            that reflects your goals, budget, and spiritual vision.
          </p>

          <div className="mt-10">

            <Link
              href="/pages/request-partnership"
              className="inline-flex items-center rounded-full bg-[#C9A24D] px-8 py-4 font-semibold text-[#0B1F3A] transition hover:bg-white"
            >
              Become a Partner
            </Link>

          </div>

        </div>

      </section>

    </main>
  );
}