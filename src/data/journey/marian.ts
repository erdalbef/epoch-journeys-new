import { Church, Heart, Users } from "lucide-react";
import { JourneyCollection } from "@/types/journey";

export const marianPilgrimages: JourneyCollection = {
  slug: "marian-pilgrimages",
  eyebrow: "Journey Collection",
  title: "Marian Pilgrimages",
  subtitle: "Where Heaven Has Spoken to the Human Heart",
  description:
    "Journey to the world’s most beloved Marian shrines, where centuries of prayer, hope, and devotion continue to inspire pilgrims from every nation.",
  heroImage: "/images/journey-collections/marian/hero.jpg",
  accentColor: "blue",
  buttonText: "Begin Your Pilgrimage",
  buttonHref: "/contact",

  reflection: {
    label: "Opening Reflection",
    title: "Mary Always Leads Us to Her Son",
    paragraphs: [
      "Across continents and generations, Marian shrines have become places of extraordinary devotion. Whether visiting the peaceful valley of Lourdes, the sunlit sanctuary of Fatima, or the quiet beauty of Knock, pilgrims discover far more than remarkable destinations — they experience moments of grace, community, and spiritual reflection.",
      "At Epoch Journeys, we thoughtfully design Marian pilgrimages that balance prayer, history, culture, and comfort. Each journey is crafted to allow pilgrims the time and space to participate in the spiritual life of each shrine while enjoying seamless travel and carefully planned logistics.",
    ],
  },

  glance: [
    {
      title: "Journey Type",
      text: "Marian Pilgrimages",
      icon: Church,
    },
    {
      title: "Ideal For",
      text: "Parishes, dioceses, Catholic groups, and travel partners",
      icon: Users,
    },
    {
      title: "Spiritual Focus",
      text: "Prayer, healing, gratitude, and Marian devotion",
      icon: Heart,
    },
  ],

  destinations: {
  label: "Sacred Destinations",
  title: "Beloved Marian Shrines",
  description:
    "Our Marian Collection may include many of the world’s most cherished shrines, carefully arranged around the needs, rhythm, and spiritual goals of each group.",
  items: [
    {
      name: "Lourdes",
      country: "France",
      image: "/images/journey-collections/marian/lourdes.jpg",
      description:
        "A place of prayer, healing, and hope, Lourdes continues to welcome pilgrims seeking peace and renewal at the Grotto of Massabielle.",
    },
    {
      name: "Fatima",
      country: "Portugal",
      image: "/images/journey-collections/marian/fatima.jpg",
      description:
        "Known for its message of prayer and conversion, Fatima invites pilgrims into a profound atmosphere of devotion and reflection.",
    },
    {
      name: "Knock",
      country: "Ireland",
      image: "/images/journey-collections/marian/knock.jpg",
      description:
        "A peaceful Marian shrine where pilgrims encounter silence, simplicity, and spiritual consolation in the heart of Ireland.",
    },
    {
      name: "Loreto",
      country: "Italy",
      image: "/images/journey-collections/marian/loreto.jpg",
      description:
        "One of Christianity’s oldest Marian pilgrimage destinations, Loreto is closely associated with the Holy House of Nazareth.",
    },
    {
      name: "Czestochowa",
      country: "Poland",
      image: "/images/journey-collections/marian/czestochowa.jpg",
      description:
        "Home to the revered Black Madonna, Jasna Góra remains a powerful symbol of faith, endurance, and Marian devotion.",
    },
    {
      name: "Montserrat",
      country: "Spain",
      image: "/images/journey-collections/marian/montserrat.jpg",
      description:
        "Set high among dramatic mountains, Montserrat offers pilgrims beauty, prayer, and Benedictine spiritual tradition.",
    },
  ],
}, 

  designedFor: {

    label: "Designed For",
    title: "Pilgrimages Shaped Around Your Group",
    description:
      "Every Marian pilgrimage is planned with care, flexibility, and respect for the spiritual purpose of the journey.",
    features: [
      "Private group pilgrimages",
      "Parish and diocesan programs",
      "Daily Mass opportunities",
      "Spiritual leadership support",
      "Carefully paced itineraries",
      "Trusted local coordination",
    ],
  },

  promise: {
    title: "The Epoch Promise",
    description:
      "Every journey entrusted to us is planned with the same care and attention we would give our own pilgrimage. We work closely with clergy, group leaders, and travel partners to create journeys that reflect the spiritual goals, pace, and interests of each group.",
    tagline: "Thoughtfully Planned. Faithfully Delivered.",
  },

  quote: {
    text: "Never be afraid of loving the Blessed Virgin too much. You can never love her more than Jesus did.",
    author: "St. Maximilian Kolbe",
  },

  cta: {
    title: "Every Pilgrimage Begins with a Conversation.",
    description:
      "Whether you are planning a parish pilgrimage, organizing a diocesan journey, or seeking a custom Marian itinerary for your travel clients, our specialists are ready to help shape a journey that reflects your vision.",
    buttonText: "Begin the Conversation",
    buttonHref: "/contact",
  },
};