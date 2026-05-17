import Link from "next/link";

type Props = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
};

export default function ActionButton({
  label,
  href,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
}: Props) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-semibold transition";

  const variants = {
    primary: "bg-[#8B0000] text-white hover:bg-red-900",
    secondary: "bg-[#001F3F] text-white hover:bg-[#003366]",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const className = `${base} ${variants[variant]} ${sizes[size]} ${
    disabled ? "opacity-50 cursor-not-allowed" : ""
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={className}>
      {label}
    </button>
  );
}