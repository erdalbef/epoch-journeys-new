import Link from "next/link";

const standards = [
  {
    title: "Thoughtfully Planned",
    text: "Every pilgrimage begins with careful planning, spiritual understanding, and attention to detail. We design journeys that reflect the goals, traditions, and expectations of each group.",
  },
  {
    title: "Faithfully Delivered",
    text: "From hotel reservations and transportation to Mass coordination and local logistics, every element is managed with professionalism, care, and reliability.",
  },
  {
    title: "Trusted Partnerships",
    text: "Successful pilgrimages are built on trust. We cultivate long-term relationships through transparency, responsiveness, and consistent service.",
  },
  {
    title: "Destination Expertise",
    text: "Our trusted network of destination specialists provides authentic local knowledge and dependable operational support across meaningful Catholic pilgrimage destinations.",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-white text-black">
      <section className="bg-[#F7F3EA] px-6 py-24 text-center sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
            About Epoch Journeys
          </p>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#0B1F3A] sm:text-5xl">
            Building Meaningful Catholic Pilgrimages
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            Specialists in Catholic pilgrimages and Christian heritage journeys,
            partnering with agencies, dioceses, parishes, religious
            organizations, and pilgrimage leaders to create meaningful journeys
            of faith.
          </p>
        </div>
      </section>

      <section className="px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Our Story
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
            A New Chapter Begins
          </h2>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            An epoch marks the beginning of a new chapter. At Epoch Journeys, we
            believe every pilgrimage marks the beginning of something
            meaningful—for pilgrims, for communities, and for the partnerships
            that make these journeys possible.
          </p>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            We create opportunities for faith to be experienced, Christian
            history to be understood, and communities to grow stronger through
            thoughtfully planned pilgrimages delivered with professionalism and
            care.
          </p>
        </div>
      </section>

      <section className="bg-[#0B1F3A] px-6 py-24 text-white sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Who We Are
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            A Destination Management Company for Catholic Pilgrimages
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/75">
            Epoch Journeys specializes in Catholic pilgrimages and Christian
            heritage journeys. We work with agencies, tour operators, dioceses,
            parishes, religious organizations, and pilgrimage leaders.
          </p>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/75">
            Our role is simple: to transform a pilgrimage vision into a
            professionally managed and spiritually meaningful journey.
          </p>
        </div>
      </section>

      <section className="px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
              The Epoch Standard
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
              Thoughtfully Planned. Faithfully Delivered.
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {standards.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-gray-200 bg-white p-8 shadow-[0_12px_34px_rgba(0,0,0,0.05)]"
              >
                <h3 className="text-xl font-semibold text-[#0B1F3A]">
                  {item.title}
                </h3>
                <p className="mt-4 text-base leading-8 text-gray-600">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F7F3EA] px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
              Our Mission
            </p>

            <h2 className="mt-5 text-3xl font-semibold text-[#0B1F3A]">
              Creating Meaningful Journeys of Faith
            </h2>

            <p className="mt-6 text-lg leading-8 text-gray-600">
              To help agencies, dioceses, parishes, religious organizations, and
              pilgrimage leaders create meaningful Catholic pilgrimages and
              Christian heritage journeys through thoughtful planning, trusted
              destination expertise, and professional destination management.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
              Our Vision
            </p>

            <h2 className="mt-5 text-3xl font-semibold text-[#0B1F3A]">
              Becoming a Trusted Pilgrimage DMC
            </h2>

            <p className="mt-6 text-lg leading-8 text-gray-600">
              To become one of the most trusted Destination Management Companies
              for Catholic pilgrimages and Christian heritage journeys,
              recognized for excellence, integrity, and enduring partnerships.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-gray-200 bg-white p-8 text-center shadow-[0_12px_34px_rgba(0,0,0,0.05)] sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Our Team
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
            The People Behind Every Journey
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            Behind every successful pilgrimage is a dedicated team committed to
            thoughtful planning, professional execution, and exceptional partner
            support.
          </p>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-gray-600">
            Our international team is connected across different destinations
            and united by one commitment: delivering exceptional Catholic
            pilgrimages and Christian heritage journeys with professionalism and
            care.
          </p>

          <div className="mt-9">
            <Link
              href="/pages/team"
              className="inline-flex items-center justify-center rounded-full border border-[#0B1F3A] px-8 py-3.5 text-sm font-semibold text-[#0B1F3A] transition hover:bg-[#0B1F3A] hover:text-white"
            >
              Meet Our Team
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#0B1F3A] px-6 py-24 text-center text-white sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Begin Your Partnership
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Let’s Create Your Next Pilgrimage Together
          </h2>

          <p className="mt-6 text-lg leading-8 text-white/75">
            Whether you are organizing your first pilgrimage or your fiftieth,
            our team is ready to help you create a journey tailored to your
            group’s faith, expectations, and pilgrimage goals.
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