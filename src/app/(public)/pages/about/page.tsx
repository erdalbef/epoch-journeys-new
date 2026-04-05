import Link from "next/link";
import Image from "next/image";

const principles = [
  {
    title: "Travel with Meaning",
    text: "We design journeys that connect travelers with the deeper cultural and historical context of each destination.",
  },
  {
    title: "Designed with Purpose",
    text: "Our itineraries are structured around clear themes and real audience needs, not generic touring.",
  },
  {
    title: "Built for Professionals",
    text: "We work exclusively with travel professionals, focusing on clarity, reliability, and long-term collaboration.",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-[#f8f9fb] text-black">
      
      {/* HERO */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8B0000]">
          About
        </p>

        <h1 className="mt-4 text-4xl font-semibold text-[#001F3F] sm:text-5xl">
          Travel designed with context, purpose, and professional care
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
          Epoch Journeys is a B2B travel company focused on cultural,
          historical, and pilgrimage programs across Europe and the
          Mediterranean, developed exclusively for travel professionals.
        </p>
      </section>

      {/* PRINCIPLES */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-8 md:grid-cols-3">
          {principles.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-200/70 bg-white p-7 shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
            >
              <h2 className="text-xl font-semibold text-[#001F3F]">
                {item.title}
              </h2>

              <p className="mt-4 text-sm leading-7 text-gray-600">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SHORT PERSPECTIVE (SIMPLIFIED) */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-semibold text-[#001F3F]">
            Our Perspective
          </h2>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            We believe that travel should offer more than movement between
            destinations. It should create understanding, connection, and
            meaning. This is especially important in cultural and pilgrimage
            travel, where the quality of a journey depends on how well it is
            designed, structured, and delivered.
          </p>
        </div>
      </section>

      {/* TEAM / LEADERSHIP */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8B0000]">
            Leadership
          </p>

          <h2 className="mt-4 text-3xl font-semibold text-[#001F3F]">
            The people behind Epoch Journeys
          </h2>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          
          {/* ERDAL */}
          <div className="text-center">
            <Image
              src="/team/erdal.jpg"
              alt="Erdal Vardarli"
              width={160}
              height={160}
              className="mx-auto h-32 w-32 rounded-full object-cover"
            />

            <h3 className="mt-4 text-lg font-semibold text-[#001F3F]">
              Erdal Vardarli
            </h3>

            <p className="text-sm text-[#8B0000]">Managing Director</p>

            <p className="mt-3 text-sm leading-7 text-gray-600">
              Background in pilgrimage and cultural travel, specializing in
              program design, operations, and international B2B partnerships.
            </p>
          </div>

          {/* OKAN */}
          <div className="text-center">
            <Image
              src="/team/okan.jpg"
              alt="Okan Cuhan"
              width={160}
              height={160}
              className="mx-auto h-32 w-32 rounded-full object-cover"
            />

            <h3 className="mt-4 text-lg font-semibold text-[#001F3F]">
              Okan Cuhan
            </h3>

            <p className="text-sm text-[#8B0000]">Operations & Guiding</p>

            <p className="mt-3 text-sm leading-7 text-gray-600">
              Active professional tour guide with strong expertise in cultural
              and historical programs across Turkey and surrounding regions.
            </p>
          </div>

          {/* MERT */}
          <div className="text-center">
            <Image
              src="/team/mert.jpg"
              alt="Mert"
              width={160}
              height={160}
              className="mx-auto h-32 w-32 rounded-full object-cover"
            />

            <h3 className="mt-4 text-lg font-semibold text-[#001F3F]">
              Mert
            </h3>

            <p className="text-sm text-[#8B0000]">European Operations</p>

            <p className="mt-3 text-sm leading-7 text-gray-600">
              Responsible for coordination and supplier management across Europe,
              supporting cost control and operational planning.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24 text-center">
        <h2 className="text-3xl font-semibold text-[#001F3F]">
          Let’s build meaningful travel programs together
        </h2>

        <p className="mt-6 text-lg text-gray-600">
          We work with travel professionals to deliver structured, reliable,
          and thoughtfully designed travel experiences.
        </p>

        <div className="mt-8">
          <Link
            href="/request-partnership"
            className="rounded-full bg-[#8B0000] px-8 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[#6f0000]"
          >
            Request Partnership
          </Link>
        </div>
      </section>
    </main>
  );
}