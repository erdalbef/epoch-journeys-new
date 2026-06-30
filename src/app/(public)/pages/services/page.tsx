import Link from "next/link";
import {
  Church,
  ClipboardList,
  Hotel,
  Map,
  Plane,
  Bus,
  Users,
  Utensils,
  Headphones,
  ShieldCheck,
  MessageCircle,
  Handshake,
  Globe2,
  CheckCircle2,
} from "lucide-react";

const beforeServices = [
  {
    title: "Pilgrimage Planning",
    text: "Tailor-made concepts designed around your group’s vision.",
    icon: Church,
  },
  {
    title: "Itinerary Design",
    text: "Routes that balance faith, heritage, pace, and logistics.",
    icon: Map,
  },
  {
    title: "Hotel Selection",
    text: "Carefully selected hotels balancing comfort, location, and group requirements.",
    icon: Hotel,
  },
  {
    title: "Program Budgeting",
    text: "Clear proposals shaped around your objectives and expectations.",
    icon: ClipboardList,
  },
];

const duringServices = [
  {
    title: "Airport Meet & Assist",
    text: "Professional arrival and departure coordination.",
    icon: Plane,
  },
  {
    title: "Transportation",
    text: "Reliable coaches and transfers throughout the pilgrimage.",
    icon: Bus,
  },
  {
    title: "Licensed Local Guides",
    text: "Guides who understand history, faith, and sacred places.",
    icon: Users,
  },
  {
    title: "Mass Arrangements",
    text: "Assistance coordinating Masses with local churches when possible.",
    icon: Church,
  },
  {
    title: "Restaurant Reservations",
    text: "Restaurants selected for quality, timing, and group needs.",
    icon: Utensils,
  },
  {
    title: "Whisper Systems",
    text: "Audio guide systems for clear communication during visits.",
    icon: Headphones,
  },
  {
    title: "Operational Support",
    text: "Responsive support while your pilgrims are with us.",
    icon: ShieldCheck,
  },
];

const afterServices = [
  {
    title: "Follow-Up",
    text: "We welcome feedback and use it to improve future pilgrimages.",
    icon: MessageCircle,
  },
  {
    title: "Future Planning",
    text: "We help you develop your next pilgrimage with confidence.",
    icon: ClipboardList,
  },
  {
    title: "Long-Term Partnership",
    text: "Our goal is years of successful pilgrimages together.",
    icon: Handshake,
  },
];

const destinations = [
  "Italy",
  "France",
  "Spain & Portugal",
  "Greece",
  "Türkiye",
  "Holy Land",
  "Medjugorje & the Balkans",
  "Central & Eastern Europe",
  "British Isles",
  "Northern Europe",
  "Mexico (Coming Soon)",
  "Japan & South Korea (Coming Soon)",
];

const managedItems = [
  "Hotels",
  "Transportation",
  "Local Guides",
  "Mass Arrangements",
  "Restaurants",
  "Entrance Reservations",
  "Audio Guide Systems",
  "Airport Transfers",
  "Group Coordination",
  "Pilgrimage Logistics",
  "On-site Operational Support",
  "Future Planning",
];

export default function ServicesPage() {
  return (
    <main className="bg-white text-black">
      <section className="bg-[#F7F3EA] px-6 py-24 text-center sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
            Our Services
          </p>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#0B1F3A] sm:text-5xl">
            Supporting Your Pilgrimage Every Step of the Way
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            We provide comprehensive destination management services for Catholic
            pilgrimages and Christian heritage journeys, helping our partners
            create meaningful experiences through trusted local expertise,
            thoughtful planning, and reliable operations.
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

      <ServiceSection
        label="Before the Pilgrimage"
        title="Thoughtful Planning from the First Conversation"
        items={beforeServices}
      />

      <ServiceSection
        label="While Your Pilgrims Are With Us"
        title="Professional Support Throughout the Journey"
        items={duringServices}
        muted
      />

      <ServiceSection
        label="After the Pilgrimage"
        title="Partnership Beyond the Final Farewell"
        items={afterServices}
      />

      <section className="bg-[#F7F3EA] px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Our Network
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
            Our Pilgrimage Destinations
          </h2>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_10px_28px_rgba(0,0,0,0.04)]"
              >
                <Globe2 className="mx-auto text-[#C9A24D]" size={26} />
                <h3 className="mt-4 text-lg font-semibold text-[#0B1F3A]">
                  {item}
                </h3>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-base leading-8 text-gray-600">
            Epoch Journeys continues to expand its network of Catholic
            pilgrimage and Christian heritage destinations through trusted local
            partnerships, carefully curated journey collections, and a commitment
            to meaningful pilgrimage experiences.
          </p>
        </div>
      </section>

      <section className="px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
              What We Manage
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
              Every Detail Matters
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {managedItems.map((item) => (
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

      <section className="bg-[#0B1F3A] px-6 py-24 text-center text-white sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Begin Your Partnership
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Let’s Plan Your Next Pilgrimage
          </h2>

          <p className="mt-6 text-lg leading-8 text-white/75">
            Whether you already have a pilgrimage in mind or are beginning with
            an idea, our team is ready to help you create a thoughtfully planned
            pilgrimage that reflects your group’s faith, expectations, and
            purpose.
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

function ServiceSection({
  label,
  title,
  items,
  muted = false,
}: {
  label: string;
  title: string;
  items: {
    title: string;
    text: string;
    icon: React.ElementType;
  }[];
  muted?: boolean;
}) {
  return (
    <section
      className={`px-6 py-24 sm:px-10 lg:px-16 ${
        muted ? "bg-[#F7F3EA]" : "bg-white"
      }`}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            {label}
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
            {title}
          </h2>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
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
  );
}