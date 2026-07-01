import {
  JourneyHero,
  OpeningReflection,
  JourneyAtGlance,
  DestinationCards
} from "@/components/journey";
  
import { marianPilgrimages } from "@/data/journey";

export default function MarianPilgrimagesPage() {
  const journey = marianPilgrimages;

return (
  <main className="bg-stone-50 text-stone-900">
    <JourneyHero journey={journey} />
    <OpeningReflection journey={journey} />
    <JourneyAtGlance journey={journey} />
    <DestinationCards journey={journey} />
  </main>
);
}