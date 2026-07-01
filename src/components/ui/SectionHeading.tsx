import SectionDivider from "./SectionDivider";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  centered?: boolean;
}

export default function SectionHeading({
  eyebrow,
  title,
  centered = true,
}: SectionHeadingProps) {
  return (
    <div className={centered ? "text-center" : ""}>
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-700">
        {eyebrow}
      </p>

      <h2 className="mt-5 font-serif text-4xl text-stone-900 md:text-5xl">
        {title}
      </h2>

      <div className="mt-8 flex justify-center">
        <SectionDivider />
      </div>
    </div>
  );
}