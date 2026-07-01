import { LucideIcon } from "lucide-react";

interface InfoCardProps {
  icon: LucideIcon;
  title: string;
  text: string;
}

export default function InfoCard({ icon: Icon, title, text }: InfoCardProps) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
      <div className="flex justify-center">
        <div className="rounded-full bg-blue-50 p-4 transition-colors duration-300">
          <Icon className="h-8 w-8 text-blue-700" />
        </div>
      </div>

      <h3 className="mt-8 font-serif text-2xl text-stone-900">{title}</h3>

      <p className="mt-5 leading-7 text-stone-600">{text}</p>
    </div>
  );
}