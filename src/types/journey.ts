import { LucideIcon } from "lucide-react";

export type JourneyDestination = {
  name: string;
  country: string;
  description: string;
  image: string;
  href?: string;
};

export type JourneyGlanceItem = {
  title: string;
  text: string;
  icon: LucideIcon;
};

export type JourneyCollection = {
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  heroImage: string;
  accentColor: string;
  buttonText: string;
  buttonHref: string;

  reflection: {
    label: string;
    title: string;
    paragraphs: string[];
  };

  glance: JourneyGlanceItem[];

  destinations: {
    label: string;
    title: string;
    description: string;
    items: JourneyDestination[];
  };

  designedFor: {
    label: string;
    title: string;
    description: string;
    groups: {
      title: string;
      description: string;
      icon: LucideIcon;
    }[];
  };

  journeyInspirations: {
    title: string;
    days: string;
    countries: string;
    theme: string;
    description: string;
    href: string;
  }[];

  quote: {
    label: string;
    text: string;
    author: string;
  };

  cta: {
    title: string;
    description: string;
    buttonText: string;
    buttonHref: string;
  };
};