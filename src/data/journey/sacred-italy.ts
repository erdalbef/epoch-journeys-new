import { JourneyCollection } from "@/types/journey";
import {
  BookOpen,
  Church,
  Compass,
  Heart,
  Users,
} from "lucide-react";

export const sacredItaly: JourneyCollection = {
  slug: "sacred-italy",

  eyebrow: "Signature Journey",

  title: "Sacred Italy",

  subtitle:
    "Walking in the Footsteps of Saints, Apostles & Catholic Tradition",

  description:
    "Experience the spiritual heart of Catholicism through Rome, Assisi, Padua, Loreto, San Giovanni Rotondo, and many of Italy's most treasured pilgrimage destinations.",

  heroImage: "/images/journey-collections/sacred-italy/hero.jpg",

  accentColor: "gold",

  buttonText: "Begin Your Pilgrimage",

  buttonHref: "/pages/contact",

  reflection: {
    label: "Opening Reflection",

    title: "Where Faith Has Been Lived for Two Thousand Years",

    paragraphs: [
      "Italy has welcomed pilgrims for centuries. From the tombs of the Apostles to the lives of beloved saints, every city tells a story of faith, sacrifice, and hope.",

      "Walking through Rome, praying beside the tomb of St. Peter, visiting Assisi, the home of St. Francis, or celebrating Mass at the shrine of Padre Pio offers far more than sightseeing—it becomes an encounter with the living history of the Church.",

      "Every Sacred Italy Journey is thoughtfully designed to combine prayer, daily Mass, Christian history, beautiful landscapes, and authentic Italian hospitality into an unforgettable pilgrimage experience.",
    ],
  },

  glance: [
    {
      title: "Journey Type",
      text: "Catholic Pilgrimage",
      icon: Church,
    },
    {
      title: "Ideal For",
      text: "Parishes, dioceses, pilgrimage groups and travel partners",
      icon: Users,
    },
    {
      title: "Spiritual Focus",
      text: "Saints, Catholic tradition, pilgrimage and renewal",
      icon: Heart,
    },
  ],

  destinations: {
    label: "Sacred Destinations",

    title: "Italy's Most Inspiring Pilgrimage Sites",

    description:
      "Our Sacred Italy journeys may include the country's most important shrines, basilicas, monasteries, and places associated with saints whose witness continues to inspire Christians around the world.",

    items: [
      {
        name: "Rome & Vatican City",
        country: "Italy",
        image: "/images/journey-collections/sacred-italy/rome.jpg",
        description:
          "The spiritual center of the Catholic Church, home to St. Peter's Basilica, the Major Basilicas, the Vatican Museums, and the tombs of the Apostles.",
      },
      {
        name: "Assisi",
        country: "Italy",
        image: "/images/journey-collections/sacred-italy/assisi.jpg",
        description:
          "The birthplace of St. Francis and St. Clare, where simplicity, peace, and joyful faith continue to inspire pilgrims.",
      },
      {
        name: "Padua",
        country: "Italy",
        image: "/images/journey-collections/sacred-italy/padua.jpg",
        description:
          "Visit the Basilica of St. Anthony, one of Christianity's most beloved saints and one of the world's most visited pilgrimage shrines.",
      },
      {
        name: "Loreto",
        country: "Italy",
        image: "/images/journey-collections/sacred-italy/loreto.jpg",
        description:
          "Pray at the Holy House of Nazareth, one of the most revered Marian shrines in the Christian world.",
      },
      {
        name: "San Giovanni Rotondo",
        country: "Italy",
        image: "/images/journey-collections/sacred-italy/padre-pio.jpg",
        description:
          "Follow the life and ministry of St. Padre Pio at the monastery, churches, and sacred places where he served for decades.",
      },
      {
        name: "Lanciano",
        country: "Italy",
        image: "/images/journey-collections/sacred-italy/lanciano.jpg",
        description:
          "Visit the site associated with the ancient Eucharistic Miracle of Lanciano and reflect upon Christ's Real Presence in the Eucharist.",
      },
      {
        name: "Montecassino",
        country: "Italy",
        image: "/images/journey-collections/sacred-italy/montecassino.jpg",
        description:
          "Discover the abbey founded by St. Benedict, the cradle of Western monasticism and a symbol of faith, perseverance, and renewal.",
      },
      {
        name: "Siena",
        country: "Italy",
        image: "/images/journey-collections/sacred-italy/siena.jpg",
        description:
          "Walk in the footsteps of St. Catherine of Siena, Doctor of the Church, whose courage and spirituality continue to inspire the faithful.",
      },
    ],
  },

  designedFor: {
  label: "Designed For",

  title: "Pilgrimages Created Around Your Community",

  description:
    "Sacred Italy journeys can be thoughtfully adapted to the spiritual priorities, interests, preferred pace, and pastoral needs of each pilgrimage group.",

  groups: [
    {
      title: "Parishes & Dioceses",
      description:
        "Faith-centered journeys with daily Mass, prayer, spiritual reflection, and meaningful encounters with Italy's Catholic heritage.",
      icon: Church,
    },
    {
      title: "Biblical Study Groups",
      description:
        "Journeys connecting Scripture with the lives of the Apostles, the early Church, the Roman world, and the places where Christian tradition took root.",
      icon: BookOpen,
    },
    {
      title: "Pilgrimage Groups",
      description:
        "Carefully balanced programs combining sacred places, saints, Christian history, beautiful landscapes, and authentic Italian culture.",
      icon: Users,
    },
    {
      title: "Travel Partners",
      description:
        "Professionally coordinated land arrangements delivered with dependable local knowledge, attentive support, and operational care.",
      icon: Compass,
    },
  ],
},

  journeyInspirations: [
    {
      title: "Rome, Assisi & the Saints of Italy",
      days: "9–11 Days",
      countries: "Italy",
      theme: "Saints, Apostles & Catholic Heritage",
      description:
        "A classic pilgrimage connecting the heart of the Catholic Church with the lives and witness of Italy's most beloved saints.",
      href: "/pages/contact",
    },
    {
      title: "Padre Pio & Eucharistic Miracles",
      days: "8–10 Days",
      countries: "Italy",
      theme: "Eucharistic Faith & Spiritual Renewal",
      description:
        "A spiritually focused journey through San Giovanni Rotondo, Lanciano, Loreto, and other places of devotion, prayer, and renewal.",
      href: "/pages/contact",
    },
    {
      title: "Catholic Heritage of Northern Italy",
      days: "8–10 Days",
      countries: "Italy",
      theme: "Saints, Basilicas & Christian Art",
      description:
        "Discover Padua, Venice, Milan, and sacred places connected with saints, basilicas, Christian art, and Church history.",
      href: "/pages/contact",
    },
  ],

  quote: {
    label: "Pilgrim Reflection",
    text:
      "Italy invites pilgrims not only to discover the history of the Church, but to encounter the faith that continues to live within it.",
    author: "The Epoch Standard",
  },

  cta: {
    title: "Let Us Design Your Sacred Italy Journey",
    description:
      "Every pilgrimage is different. We will work with you to create a thoughtfully planned journey shaped around your group's faith, priorities, and preferred pace.",
    buttonText: "Plan Your Pilgrimage",
    buttonHref: "/pages/contact",
  },
};