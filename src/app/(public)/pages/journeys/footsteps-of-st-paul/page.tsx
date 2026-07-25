import { footstepsOfStPaul } from "@/data/journey";

import {
  JourneyHero,
  OpeningReflection,
  JourneyAtGlance,
  DestinationCards,
  DesignedFor,
  EpochDifference,
  JourneyInspirations,
  PilgrimReflection,
  JourneyCTA,
} from "@/components/journey";

export default function FootstepsOfStPaulPage() {
  const journey = footstepsOfStPaul;

  return (
    <main className="bg-white">
      <JourneyHero journey={journey} />
      <OpeningReflection journey={journey} />
      <JourneyAtGlance journey={journey} />
      <DestinationCards journey={journey} />
      <DesignedFor journey={journey} />
      <EpochDifference />
      <JourneyInspirations journey={journey} />
      <PilgrimReflection journey={journey} />
      <JourneyCTA journey={journey} />
    </main>
  );
}