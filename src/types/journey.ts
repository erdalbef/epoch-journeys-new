import { LucideIcon } from "lucide-react";

export type JourneyDestination = {
  name: string;
  country: string;
  description: string;
  image: string;
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
    features: string[];
  };

  promise: {
    title: string;
    description: string;
    tagline: string;
  };

  quote: {
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