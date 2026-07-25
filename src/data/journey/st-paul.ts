import { JourneyCollection } from "@/types/journey";
import {
  BookOpen,
  Church,
  Compass,
  Globe,
  GraduationCap,
  Heart,
  Landmark,
  Users,
} from "lucide-react";

export const footstepsOfStPaul: JourneyCollection = {
  slug: "footsteps-of-st-paul",

  eyebrow: "Signature Journey",

  title: "Footsteps of St. Paul",

  subtitle:
    "Following the Apostle Through the Lands of the Early Church",

  description:
    "Walk through the cities, ports, and sacred landscapes where St. Paul preached the Gospel, strengthened the first Christian communities, and helped shape the foundations of the early Church.",

  heroImage: "/images/journey-collections/st-paul/hero.jpg",

  accentColor: "blue",

  buttonText: "Begin Your Pilgrimage",
  buttonHref: "/pages/contact",

  reflection: {
    label: "Opening Reflection",

    title: "A Journey of Faith, Courage, and Mission",

    paragraphs: [
      "The journeys of St. Paul carried the message of Christ across cultures, cities, and continents. From his conversion and early ministry to his missionary travels through Asia Minor, Greece, Cyprus, Malta, and Rome, his life reveals extraordinary courage, perseverance, and trust in God.",

      "Following in the footsteps of St. Paul allows pilgrims to encounter the world of the Acts of the Apostles and the communities addressed in his letters. Ancient ruins, sacred churches, bustling ports, and quiet landscapes bring Scripture into clearer focus and invite pilgrims to reflect upon their own calling to faith and mission.",

      "At Epoch Journeys, we carefully shape Pauline pilgrimages around Scripture, prayer, Christian history, and thoughtful travel. Each journey is designed to connect biblical places with the spiritual meaning of St. Paul’s message while allowing time for daily Mass, reflection, fellowship, and discovery.",
    ],
  },

  glance: [
    {
      title: "Journey Type",
      text: "Biblical and Early Christian Pilgrimage",
      icon: BookOpen,
    },
    {
      title: "Ideal For",
      text: "Parishes, dioceses, Christian groups, schools, and travel partners",
      icon: Users,
    },
    {
      title: "Spiritual Focus",
      text: "Scripture, discipleship, mission, perseverance, and the early Church",
      icon: Heart,
    },
  ],

  destinations: {
    label: "Biblical Destinations",

    title: "Across the World of St. Paul",

    description:
      "Our Footsteps of St. Paul Journeys may include the principal cities, ports, and sacred landscapes connected with the Apostle’s life, missionary travels, letters, and witness.",

    items: [
      {
        name: "Tarsus",
        country: "Türkiye",
        image:
          "/images/journey-collections/st-paul/tarsus.jpg",
        description:
          "The birthplace of St. Paul, Tarsus introduces pilgrims to the cultural and historical world that shaped the young Saul before his conversion and missionary calling.",
      },
      {
        name: "Antioch",
        country: "Türkiye",
        image:
          "/images/journey-collections/st-paul/antioch.jpg",
        description:
          "One of the most important centers of early Christianity, Antioch became the missionary base from which Paul and Barnabas were sent to proclaim the Gospel.",
      },
      {
        name: "Ephesus",
        country: "Türkiye",
        image:
          "/images/journey-collections/st-paul/ephesus.jpg",
        description:
          "Among the best-preserved cities of the ancient world, Ephesus recalls Paul’s extended ministry and the growth of a vibrant Christian community.",
      },
      {
        name: "Philippi",
        country: "Greece",
        image:
          "/images/journey-collections/st-paul/philippi.jpg",
        description:
          "In Philippi, St. Paul established one of Europe’s earliest Christian communities and baptized Lydia, remembered as the first recorded Christian convert in Europe.",
      },
      {
        name: "Thessaloniki",
        country: "Greece",
        image:
          "/images/journey-collections/st-paul/thessaloniki.jpg",
        description:
          "A major city of the ancient world, Thessaloniki received Paul’s preaching and later inspired two of his New Testament letters.",
      },
      {
        name: "Corinth",
        country: "Greece",
        image:
          "/images/journey-collections/st-paul/corinth.jpg",
        description:
          "Ancient Corinth offers a powerful setting for understanding Paul’s ministry, his work with the local Christian community, and the message of his letters to the Corinthians.",
      },
    ],
  },

  designedFor: {
    label: "Designed For",

    title: "Journeys That Bring Scripture to Life",

    description:
      "Every Pauline pilgrimage is shaped around the spiritual, educational, pastoral, and practical needs of the people traveling together.",

    groups: [
      {
        title: "Parish Communities",
        icon: Church,
        description:
          "Faith-filled journeys that connect Scripture, prayer, daily Mass, and fellowship with the lands of the early Church.",
      },
      {
        title: "Biblical Study Groups",
        icon: BookOpen,
        description:
          "Thoughtfully planned pilgrimages for communities seeking a deeper understanding of the Acts of the Apostles and the letters of St. Paul.",
      },
      {
        title: "Schools & Universities",
        icon: GraduationCap,
        description:
          "Educational journeys combining biblical studies, archaeology, ancient history, Christian heritage, and cultural discovery.",
      },
      {
        title: "Travel Partners",
        icon: Globe,
        description:
          "Custom pilgrimage design, reliable local operations, church coordination, and destination expertise for agencies and group organizers.",
      },
    ],
  },

  journeyInspirations: [
    {
      title: "St. Paul in Greece",
      days: "9 Days",
      countries: "Greece",
      theme: "Scripture • Mission • Early Church",
      description:
        "Follow the ministry of St. Paul through Philippi, Thessaloniki, Berea, Athens, and Corinth while exploring the biblical foundations of Christianity in Greece.",
      href: "/pages/contact",
    },
    {
      title: "St. Paul in Türkiye & Greece",
      days: "13 Days",
      countries: "Türkiye • Greece",
      theme: "Biblical Heritage • Discipleship • Faith",
      description:
        "A comprehensive Pauline journey connecting the ancient Christian communities of Asia Minor with the places where Paul preached throughout Macedonia and Greece.",
      href: "/pages/contact",
    },
    {
      title: "The Great Pauline Journey",
      days: "16 Days",
      countries: "Türkiye • Greece • Italy",
      theme: "Mission • Witness • Christian Heritage",
      description:
        "An extensive journey following the world of St. Paul from the cities of Asia Minor and Greece to Rome, where his mission and witness reached their final chapter.",
      href: "/pages/contact",
    },
  ],

  quote: {
    label: "A Pauline Reflection",

    text:
      "I have fought the good fight, I have finished the race, I have kept the faith.",

    author: "2 Timothy 4:7",
  },

  cta: {
    title: "Bring the World of St. Paul to Life.",

    description:
      "Whether you are planning a parish pilgrimage, a biblical study journey, an educational program, or a custom itinerary for your travel clients, our specialists are ready to help create a meaningful journey through the lands of the early Church.",

    buttonText: "Begin the Conversation",
    buttonHref: "/pages/contact",
  },
};