import Container from "./Container";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export default function Section({
  children,
  className = "",
  containerClassName = "",
}: SectionProps) {
  return (
    <section className={`py-24 ${className}`}>
      <Container className={containerClassName}>
        {children}
      </Container>
    </section>
  );
}