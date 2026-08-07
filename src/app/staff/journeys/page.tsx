"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Church,
  Compass,
  Cross,
  Filter,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Library,
  Map,
  MapPin,
  Search,
  Ship,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";

type JourneyStatus = "available" | "coming-soon";

type Journey = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  region: string;
  duration: string;
  difficulty: "Easy" | "Moderate" | "Active";
  countries: string[];
  destinations: string[];
  themes: string[];
  href?: string;
  status: JourneyStatus;
  featured?: boolean;
  verified?: boolean;
  image: string;
  icon: typeof Compass;
};

const journeys: Journey[] = [
  {
    id: "footsteps-of-st-paul",
    title: "Footsteps of St. Paul",
    subtitle:
      "Follow the Apostle who carried the Gospel across the ancient world.",
    description:
      "Explore the missionary journeys of St. Paul through Türkiye, Greece, Cyprus, Malta, and Rome while connecting Scripture with the places where the early Church grew.",
    category: "Apostolic Journeys",
    region: "Mediterranean",
    duration: "10–16 Days",
    difficulty: "Moderate",
    countries: ["Türkiye", "Greece", "Cyprus", "Malta", "Italy"],
    destinations: [
      "Antioch",
      "Tarsus",
      "Ephesus",
      "Philippi",
      "Thessaloniki",
      "Athens",
      "Corinth",
      "Rome",
    ],
    themes: ["Biblical", "Apostolic", "Early Christianity"],
    href: "/staff/journeys/footsteps-of-st-paul",
    status: "available",
    featured: true,
    verified: true,
    image: "/images/journeys/footsteps-of-st-paul.jpg",
    icon: BookOpen,
  },
  {
    id: "holy-land",
    title: "The Holy Land",
    subtitle: "Walk where the Gospel began.",
    description:
      "Journey through Jerusalem, Bethlehem, Nazareth, Galilee, Jericho, and the sacred landscapes connected with the life, ministry, Passion, death, and Resurrection of Jesus Christ.",
    category: "Biblical Journeys",
    region: "Middle East",
    duration: "8–12 Days",
    difficulty: "Moderate",
    countries: ["Israel", "Palestinian Territories"],
    destinations: [
      "Jerusalem",
      "Bethlehem",
      "Nazareth",
      "Sea of Galilee",
      "Jericho",
    ],
    themes: ["Biblical", "Christ", "Gospel"],
    status: "coming-soon",
    verified: false,
    image: "/images/journeys/holy-land.jpg",
    icon: Cross,
  },
  {
    id: "marian-pilgrimages",
    title: "Marian Pilgrimages",
    subtitle: "Where Heaven has spoken to the human heart.",
    description:
      "Discover the great Marian shrines and places of devotion associated with the Blessed Virgin Mary across Europe and the wider Christian world.",
    category: "Marian Journeys",
    region: "International",
    duration: "7–15 Days",
    difficulty: "Easy",
    countries: [
      "France",
      "Portugal",
      "Spain",
      "Poland",
      "Ireland",
      "Bosnia and Herzegovina",
      "Mexico",
    ],
    destinations: [
      "Lourdes",
      "Fátima",
      "Montserrat",
      "Częstochowa",
      "Knock",
      "Medjugorje",
      "Guadalupe",
    ],
    themes: ["Marian", "Shrines", "Devotion"],
    status: "coming-soon",
    verified: false,
    image: "/images/journeys/marian-pilgrimages.jpg",
    icon: Church,
  },
  {
    id: "sacred-italy",
    title: "Sacred Italy",
    subtitle: "The spiritual heart of Western Christianity.",
    description:
      "Explore Rome, Assisi, Loreto, Padua, Cascia, San Giovanni Rotondo, and the sacred places connected with the Apostles, saints, relics, and Catholic tradition.",
    category: "Catholic Heritage",
    region: "Southern Europe",
    duration: "8–14 Days",
    difficulty: "Moderate",
    countries: ["Italy", "Vatican City"],
    destinations: [
      "Rome",
      "Assisi",
      "Loreto",
      "Padua",
      "Cascia",
      "San Giovanni Rotondo",
    ],
    themes: ["Catholic", "Saints", "Relics", "Papal"],
    status: "coming-soon",
    verified: true,
    image: "/images/journeys/sacred-italy.jpg",
    icon: Landmark,
  },
  {
    id: "biblical-turkiye",
    title: "Biblical Türkiye",
    subtitle: "Where Christianity grew.",
    description:
      "Rediscover Asia Minor through Antioch, Ephesus, the Seven Churches of Revelation, Nicaea, Cappadocia, and the great centers of early Christian life.",
    category: "Biblical Journeys",
    region: "Mediterranean",
    duration: "9–14 Days",
    difficulty: "Moderate",
    countries: ["Türkiye"],
    destinations: [
      "Istanbul",
      "Nicaea",
      "Ephesus",
      "Smyrna",
      "Pergamum",
      "Cappadocia",
      "Antioch",
    ],
    themes: [
      "Biblical",
      "Seven Churches",
      "Councils",
      "Early Christianity",
    ],
    status: "coming-soon",
    verified: true,
    image: "/images/journeys/biblical-turkiye.jpg",
    icon: Map,
  },
  {
    id: "christian-heritage-europe",
    title: "Christian Heritage Europe",
    subtitle: "Discover the roots of Christian civilization.",
    description:
      "Follow the history of Christianity through cathedrals, monasteries, saints, shrines, relics, reformers, and sacred landscapes across Europe.",
    category: "Christian Heritage",
    region: "Europe",
    duration: "10–16 Days",
    difficulty: "Moderate",
    countries: [
      "France",
      "Germany",
      "Belgium",
      "Netherlands",
      "Switzerland",
      "Austria",
      "Poland",
      "Czech Republic",
    ],
    destinations: [
      "Paris",
      "Cologne",
      "Trier",
      "Banneux",
      "Lucerne",
      "Kraków",
      "Prague",
    ],
    themes: ["Christian Heritage", "Saints", "Cathedrals"],
    status: "coming-soon",
    verified: false,
    image: "/images/journeys/christian-heritage-europe.jpg",
    icon: Globe2,
  },
  {
    id: "river-pilgrimages",
    title: "River Pilgrimages",
    subtitle: "Faith along Europe’s historic waterways.",
    description:
      "Combine the rhythm of river cruising with Christian heritage, daily worship opportunities, sacred cities, and carefully designed land programmes.",
    category: "River Journeys",
    region: "Europe",
    duration: "8–12 Days",
    difficulty: "Easy",
    countries: [
      "Netherlands",
      "Germany",
      "France",
      "Switzerland",
      "Austria",
      "Hungary",
    ],
    destinations: [
      "Amsterdam",
      "Cologne",
      "Koblenz",
      "Strasbourg",
      "Basel",
      "Vienna",
      "Budapest",
    ],
    themes: ["River Cruise", "Christian Heritage", "Cultural"],
    status: "coming-soon",
    verified: false,
    image: "/images/journeys/river-pilgrimages.jpg",
    icon: Ship,
  },
  {
    id: "protestant-heritage",
    title: "Protestant Heritage",
    subtitle: "Follow the people and places that shaped the Reformation.",
    description:
      "Explore the biblical, theological, cultural, and historical heritage of the Reformation across Germany, Switzerland, France, Scotland, England, and beyond.",
    category: "Protestant Heritage",
    region: "Europe",
    duration: "8–14 Days",
    difficulty: "Moderate",
    countries: [
      "Germany",
      "Switzerland",
      "France",
      "Scotland",
      "England",
      "Czech Republic",
    ],
    destinations: [
      "Wittenberg",
      "Geneva",
      "Zurich",
      "Edinburgh",
      "Oxford",
      "Prague",
    ],
    themes: ["Protestant", "Reformation", "Christian Heritage"],
    status: "coming-soon",
    verified: false,
    image: "/images/journeys/protestant-heritage.jpg",
    icon: BookOpen,
  },
  {
    id: "celtic-saints",
    title: "Celtic Saints",
    subtitle: "Faith, mission, and monastic heritage across the Celtic lands.",
    description:
      "Discover the sacred landscapes, ancient monasteries, saints, missionaries, and Christian heritage of Ireland, Scotland, Wales, and northern England.",
    category: "Christian Heritage",
    region: "Northern Europe",
    duration: "8–13 Days",
    difficulty: "Moderate",
    countries: ["Ireland", "Scotland", "Wales", "England"],
    destinations: [
      "Dublin",
      "Knock",
      "Glendalough",
      "Iona",
      "St Andrews",
      "Lindisfarne",
    ],
    themes: ["Celtic Christianity", "Saints", "Monastic"],
    status: "coming-soon",
    verified: false,
    image: "/images/journeys/celtic-saints.jpg",
    icon: Compass,
  },
  {
    id: "orthodox-heritage",
    title: "Orthodox Heritage",
    subtitle: "Icons, monasteries, saints, and the living Eastern Church.",
    description:
      "Explore the spiritual and cultural heritage of Eastern Christianity through Constantinople, Meteora, Mount Athos, Romania, Serbia, Bulgaria, Georgia, and Armenia.",
    category: "Orthodox Heritage",
    region: "Eastern Europe",
    duration: "9–16 Days",
    difficulty: "Moderate",
    countries: [
      "Türkiye",
      "Greece",
      "Bulgaria",
      "Romania",
      "Serbia",
      "Georgia",
      "Armenia",
    ],
    destinations: [
      "Istanbul",
      "Meteora",
      "Thessaloniki",
      "Sofia",
      "Bucharest",
      "Tbilisi",
      "Yerevan",
    ],
    themes: ["Orthodox", "Monasteries", "Icons", "Saints"],
    status: "coming-soon",
    verified: false,
    image: "/images/journeys/orthodox-heritage.jpg",
    icon: Church,
  },
  {
    id: "custom-signature-journeys",
    title: "Custom Signature Journeys",
    subtitle: "Designed around the spiritual purpose of each parish.",
    description:
      "Build a pilgrimage around the priest, parish, pilgrims, faith tradition, destination interests, physical needs, and desired spiritual experience.",
    category: "Custom Journeys",
    region: "Worldwide",
    duration: "Flexible",
    difficulty: "Easy",
    countries: ["Worldwide"],
    destinations: ["Custom"],
    themes: ["Custom", "Parish", "Signature"],
    status: "coming-soon",
    verified: true,
    image: "/images/journeys/custom-signature-journeys.jpg",
    icon: HeartHandshake,
  },
];

const categories = [
  "All",
  "Apostolic Journeys",
  "Biblical Journeys",
  "Marian Journeys",
  "Catholic Heritage",
  "Christian Heritage",
  "Protestant Heritage",
  "Orthodox Heritage",
  "River Journeys",
  "Custom Journeys",
];

const updates = [
  {
    title: "Footsteps of St. Paul",
    description:
      "The first Journey Library master page is now in development.",
    type: "Journey Guide",
  },
  {
    title: "Biblical Türkiye",
    description:
      "Türkiye messaging aligned with the theme: Where Christianity grew.",
    type: "Content Update",
  },
  {
    title: "Sacred Italy",
    description:
      "Italy destination knowledge linked to the Academy masterclass.",
    type: "Academy Connection",
  },
  {
    title: "Epoch Knowledge Standard",
    description:
      "The principle Create Knowledge Once. Use It Everywhere. adopted.",
    type: "Knowledge Standard",
  },
];

const knowledgeConnections = [
  {
    title: "Destinations",
    description:
      "Countries, cities, sacred sites, churches, shrines, and practical destination knowledge.",
    icon: MapPin,
  },
  {
    title: "Academy",
    description:
      "Related Foundation courses and Destination Masterclasses.",
    icon: GraduationCap,
  },
  {
    title: "Sales Guidance",
    description:
      "Ideal groups, selling points, objections, questions, and presentation support.",
    icon: Users,
  },
  {
    title: "Operations",
    description:
      "Routing, timing, hotels, transportation, church planning, and operational risks.",
    icon: CheckCircle2,
  },
  {
    title: "Downloads",
    description:
      "Itineraries, presentations, brochures, maps, and approved materials.",
    icon: Library,
  },
  {
    title: "Founder’s Notes",
    description:
      "Experience, judgement, field observations, and lessons learned.",
    icon: Sparkles,
  },
];

function JourneyCard({ journey }: { journey: Journey }) {
  const Icon = journey.icon;
  const isAvailable = journey.status === "available";

  const content = (
    <>
      <div className="relative h-56 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
          style={{
            backgroundImage: `url('${journey.image}')`,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#07172D] via-[#07172D]/35 to-transparent" />

        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          {journey.featured ? (
            <span className="rounded-full bg-[#C9A24D] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0B1F3A]">
              Featured
            </span>
          ) : null}

          {journey.verified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-700 backdrop-blur">
              <CheckCircle2 size={13} />
              Epoch Verified
            </span>
          ) : null}
        </div>

        <div className="absolute bottom-5 left-5 right-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E8D8AE]">
            {journey.category}
          </p>

          <h3 className="mt-2 font-serif text-3xl leading-tight text-white">
            {journey.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-7">
        <p className="font-serif text-lg italic leading-7 text-[#8B6B23]">
          {journey.subtitle}
        </p>

        <p className="mt-4 leading-7 text-slate-600">
          {journey.description}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Duration
            </p>

            <p className="mt-1 font-semibold text-[#0B1F3A]">
              {journey.duration}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Difficulty
            </p>

            <p className="mt-1 font-semibold text-[#0B1F3A]">
              {journey.difficulty}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {journey.themes.slice(0, 3).map((theme) => (
            <span
              key={theme}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500"
            >
              {theme}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-7">
          {isAvailable ? (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B0000]">
              Open Journey
              <ArrowRight size={16} />
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400">
              In Development
            </span>
          )}
        </div>
      </div>
    </>
  );

  if (isAvailable && journey.href) {
    return (
      <Link
        href={journey.href}
        className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-[#C9A24D]/50 hover:shadow-[0_20px_50px_rgba(11,31,58,0.12)]"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
      {content}
    </article>
  );
}

export default function JourneyLibraryPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const filteredJourneys = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return journeys.filter((journey) => {
      const matchesCategory =
        activeCategory === "All" ||
        journey.category === activeCategory;

      if (!matchesCategory) return false;

      if (!normalizedQuery) return true;

      const searchableText = [
        journey.title,
        journey.subtitle,
        journey.description,
        journey.category,
        journey.region,
        journey.duration,
        journey.difficulty,
        ...journey.countries,
        ...journey.destinations,
        ...journey.themes,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [activeCategory, query]);

  const featuredJourney =
    journeys.find((journey) => journey.featured) ?? journeys[0];

  const availableCount = journeys.filter(
    (journey) => journey.status === "available"
  ).length;

  function clearFilters() {
    setQuery("");
    setActiveCategory("All");
  }

  const hasActiveFilters =
    query.trim().length > 0 || activeCategory !== "All";

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#07172D] px-8 py-14 text-white shadow-sm sm:px-12 sm:py-16">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#C9A24D]/10 blur-3xl" />
        <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative z-10 max-w-5xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A24D] text-[#0B1F3A]">
            <Compass size={26} />
          </div>

          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.32em] text-[#C9A24D]">
            Epoch Journey Library
          </p>

          <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Knowledge Behind Every Pilgrimage
          </h1>

          <p className="mt-6 max-w-4xl text-xl leading-9 text-white/75">
            Every Epoch Journey is more than an itinerary. Explore the
            spiritual purpose, Christian history, destinations, selling
            guidance, operational knowledge, Academy connections, and
            experience that bring each journey to life.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white/75">
              {journeys.length} Journey Collections
            </span>

            <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white/75">
              {availableCount} Journey Available
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-[#C9A24D]/30 bg-[#C9A24D]/10 px-4 py-2 text-sm text-[#E8D8AE]">
              <CheckCircle2 size={15} />
              Single Source of Truth
            </span>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search journeys, countries, destinations, saints, or themes..."
              className="h-14 w-full rounded-full border border-slate-200 bg-slate-50 pl-14 pr-12 text-sm text-[#0B1F3A] outline-none transition placeholder:text-slate-400 focus:border-[#C9A24D] focus:bg-white focus:ring-4 focus:ring-[#C9A24D]/10"
            />

            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#0B1F3A]"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            className={`inline-flex h-14 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold transition ${
              showFilters || activeCategory !== "All"
                ? "border-[#C9A24D] bg-[#F7F3EA] text-[#0B1F3A]"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#C9A24D]/50"
            }`}
          >
            <Filter size={17} />
            Journey Categories
          </button>
        </div>

        {showFilters ? (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Filter by Collection
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeCategory === category
                      ? "bg-[#0B1F3A] text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-[#C9A24D]/50"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Featured Journey */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
              Featured Journey
            </p>

            <h2 className="mt-4 font-serif text-3xl text-[#0B1F3A] sm:text-4xl">
              Begin with the Story of St. Paul
            </h2>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full bg-[#F7F3EA] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6B23]">
            <Star size={14} />
            Master Journey Template
          </span>
        </div>

        <div className="mt-8 overflow-hidden rounded-[2rem] bg-[#0B1F3A] text-white shadow-sm">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[360px]">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url('${featuredJourney.image}')`,
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#07172D]/25 to-[#07172D]/70 lg:bg-gradient-to-r lg:from-transparent lg:to-[#07172D]" />
            </div>

            <div className="flex flex-col justify-center p-8 sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
                {featuredJourney.category}
              </p>

              <h3 className="mt-5 font-serif text-4xl leading-tight">
                {featuredJourney.title}
              </h3>

              <p className="mt-4 font-serif text-xl italic leading-8 text-[#E8D8AE]">
                {featuredJourney.subtitle}
              </p>

              <p className="mt-6 leading-8 text-white/70">
                {featuredJourney.description}
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {featuredJourney.themes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs text-white/65"
                  >
                    {theme}
                  </span>
                ))}
              </div>

              {featuredJourney.href ? (
                <Link
                  href={featuredJourney.href}
                  className="mt-9 inline-flex w-fit items-center gap-2 rounded-full bg-[#C9A24D] px-7 py-3.5 text-sm font-semibold text-[#0B1F3A] transition hover:bg-white"
                >
                  Open Journey
                  <ArrowRight size={17} />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Journey Collections */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
              Journey Collections
            </p>

            <h2 className="mt-4 font-serif text-3xl text-[#0B1F3A] sm:text-4xl">
              Explore Epoch Signature Journeys
            </h2>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Search by theme, destination, region, country, or pilgrimage
              tradition. Each journey will gradually connect with Academy,
              sales, operations, destinations, downloads, and Founder’s Notes.
            </p>
          </div>

          <p className="text-sm font-semibold text-slate-500">
            {filteredJourneys.length}{" "}
            {filteredJourneys.length === 1 ? "Journey" : "Journeys"}
          </p>
        </div>

        {filteredJourneys.length > 0 ? (
          <div className="mt-9 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {filteredJourneys.map((journey) => (
              <JourneyCard key={journey.id} journey={journey} />
            ))}
          </div>
        ) : (
          <div className="mt-9 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-8 py-16 text-center">
            <Search className="mx-auto text-slate-300" size={34} />

            <h3 className="mt-5 font-serif text-2xl text-[#0B1F3A]">
              No Journeys Found
            </h3>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
              Try another destination, theme, country, or journey
              collection.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-full bg-[#0B1F3A] px-6 py-3 text-sm font-semibold text-white"
            >
              Clear Search and Filters
            </button>
          </div>
        )}
      </section>

      {/* Knowledge Connections */}
      <section className="rounded-[2rem] bg-[#F7F3EA] p-8 sm:p-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Connected Knowledge
          </p>

          <h2 className="mt-4 font-serif text-3xl text-[#0B1F3A]">
            Every Journey Connects to the Epoch Ecosystem
          </h2>

          <p className="mt-4 leading-8 text-slate-600">
            Journey knowledge should never exist in isolation. Each
            Signature Journey connects to the destinations, Academy
            lessons, sales guidance, operational resources, downloads,
            and experience required to understand and deliver it.
          </p>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {knowledgeConnections.map((connection) => {
            const Icon = connection.icon;

            return (
              <article
                key={connection.title}
                className="rounded-[1.5rem] border border-[#C9A24D]/20 bg-white p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B1F3A] text-[#C9A24D]">
                  <Icon size={20} />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-[#0B1F3A]">
                  {connection.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {connection.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Recently Updated */}
      <section>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Recently Updated
          </p>

          <h2 className="mt-4 font-serif text-3xl text-[#0B1F3A]">
            The Library Continues to Grow
          </h2>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {updates.map((update) => (
            <article
              key={update.title}
              className="flex items-start gap-5 rounded-[1.5rem] border border-slate-200 bg-white p-6"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={19} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A24D]">
                  {update.type}
                </p>

                <h3 className="mt-2 font-semibold text-[#0B1F3A]">
                  {update.title}
                </h3>

                <p className="mt-2 leading-7 text-slate-600">
                  {update.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Founder Note */}
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[2rem] bg-[#0B1F3A] p-8 text-white sm:p-10">
          <Sparkles className="text-[#C9A24D]" size={25} />

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.26em] text-[#C9A24D]">
            Founder’s Thought
          </p>

          <blockquote className="mt-5 font-serif text-2xl italic leading-10 text-white/90">
            “The itinerary tells pilgrims where they will go. Knowledge
            explains why the journey matters.”
          </blockquote>

          <p className="mt-7 text-sm font-semibold text-white">
            Erdal Vardarli
          </p>

          <p className="mt-1 text-sm text-white/45">
            Founder, Epoch Journeys
          </p>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#C9A24D]">
            Epoch Knowledge Principle
          </p>

          <h2 className="mt-5 font-serif text-3xl leading-tight text-[#0B1F3A]">
            Create Knowledge Once. Use It Everywhere.
          </h2>

          <p className="mt-5 leading-8 text-slate-600">
            Each journey should have one authoritative source of truth.
            The public website, Agent Dashboard, Staff Workspace,
            Academy, sales materials, operations, and future systems
            should reuse the same approved knowledge at the appropriate
            access level.
          </p>

          <div className="mt-7 flex items-center gap-3 text-sm font-semibold text-[#8B0000]">
            Epoch Knowledge Standard
            <ChevronRight size={16} />
          </div>
        </article>
      </section>

      {/* Document Control */}
      <section className="border-t border-slate-200 py-8">
        <div className="flex flex-col gap-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-[#0B1F3A]">
              Epoch Journey Library
            </p>

            <p className="mt-1">
              Knowledge behind every pilgrimage.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-7 gap-y-2">
            <span>
              <strong className="text-slate-700">ID:</strong> EJL-001
            </span>

            <span>
              <strong className="text-slate-700">Version:</strong> 1.0
            </span>

            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Epoch Verified
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}