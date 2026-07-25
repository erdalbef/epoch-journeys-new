interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  centered = true,
}: SectionHeadingProps) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-700">
          {eyebrow}
        </p>
      )}

      <h2 className="mt-5 font-serif text-4xl leading-tight text-stone-900 md:text-5xl">
        {title}
      </h2>

      {description && (
        <p className="mt-6 text-lg leading-8 text-stone-700">
          {description}
        </p>
      )}
    </div>
  );
}