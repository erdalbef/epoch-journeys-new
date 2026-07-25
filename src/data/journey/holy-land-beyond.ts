import { JourneyCollection } from "@/types/journey";
import {
  BookOpen,
  Church,
  Compass,
  Heart,
  Users,
} from "lucide-react";

export const holyLandBeyond: JourneyCollection = {
  slug: "holy-land-beyond",

  eyebrow: "Signature Journey",

  title: "Holy Land & Beyond",

  subtitle: "Walk Where Salvation History Unfolded",

  description:
    "Follow in the footsteps of Jesus Christ through the places where the Gospel came to life. From Bethlehem and Nazareth to Jerusalem and the Sea of Galilee, continue the story into Jordan, Egypt, Cyprus, Turkey, and the wider Biblical world.",

  heroImage:
    "/images/journey-collections/holy-land-beyond/hero.jpg",

  accentColor: "gold",

  buttonText: "Begin Your Pilgrimage",

  buttonHref: "/pages/contact",

    reflection: {
    label: "Opening Reflection",

    title: "The Fifth Gospel",

    paragraphs: [
      "Many pilgrims describe the Holy Land as the 'Fifth Gospel.' Walking where Jesus walked transforms familiar Scripture into living experience, allowing every page of the Gospel to be seen with new eyes.",

      "Praying in Bethlehem, sailing on the Sea of Galilee, standing on the Mount of Beatitudes, and following the Via Dolorosa create moments that remain with pilgrims for a lifetime.",

      "Epoch's Holy Land & Beyond journeys invite pilgrims not only to visit the places of Christ's earthly ministry but also to continue the biblical story through Jordan, Egypt, Cyprus, Turkey, and the lands of the early Church.",
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
      text: "Parishes, Biblical Study Groups, Christian Schools and Travel Partners",
      icon: Users,
    },
    {
      title: "Spiritual Focus",
      text: "Life of Christ, Scripture and the Biblical World",
      icon: Heart,
    },
  ],

    destinations: {
    label: "Sacred Destinations",

    title: "Walk Through the Gospel",

    description:
      "Our Holy Land & Beyond journeys explore the places where salvation history unfolded, allowing pilgrims to encounter Scripture where it happened.",

    items: [
        {
name: "Jerusalem",
country: "Holy Land",
image: "/images/journey-collections/holy-land-beyond/jerusalem.jpg",
description:
"Walk the Via Dolorosa, pray at the Church of the Holy Sepulchre, visit Mount Zion, the Mount of Olives and the Garden of Gethsemane.",
},

{
name:"Bethlehem",
country:"Holy Land",
image:"/images/journey-collections/holy-land-beyond/bethlehem.jpg",
description:
"Celebrate Mass at the Church of the Nativity and visit Shepherds' Field where the angels announced Christ's birth.",
},

{
name:"Nazareth",
country:"Holy Land",
image:"/images/journey-collections/holy-land-beyond/nazareth.jpg",
description:
"Visit the Basilica of the Annunciation and St. Joseph's Workshop in the town where Jesus spent His childhood.",
},

{
name:"Sea of Galilee",
country:"Holy Land",
image:"/images/journey-collections/holy-land-beyond/galilee.jpg",
description:
"Sail across the Sea of Galilee and visit Capernaum, Tabgha and the Mount of Beatitudes.",
},

{
name:"Jordan",
country:"Jordan",
image:"/images/journey-collections/holy-land-beyond/jordan.jpg",
description:
"Discover Bethany Beyond the Jordan, Mount Nebo and Madaba while following the story of Moses, Joshua and John the Baptist.",
},

{
name:"Egypt",
country:"Egypt",
image:"/images/journey-collections/holy-land-beyond/egypt.jpg",
description:
"Follow the Holy Family Route, visit St. Catherine's Monastery and stand on Mount Sinai where Moses received the Ten Commandments.",
},

{
name:"Cyprus",
country:"Cyprus",
image:"/images/journey-collections/holy-land-beyond/cyprus.jpg",
description:
"Continue the story of the Apostles in Salamis, Paphos and the places associated with St. Barnabas and St. Paul.",
},

{
name:"Biblical Turkey",
country:"Türkiye",
image:"/images/journey-collections/holy-land-beyond/turkey.jpg",
description:
"Extend the pilgrimage to Antioch, Tarsus, Ephesus and the Seven Churches of Revelation.",
},

],
},

designedFor: {
label:"Designed For",

title:"Journeys Created Around Your Faith Community",

description:
"Every Holy Land & Beyond journey is carefully designed around the spiritual priorities and interests of each group.",

groups:[
{
title:"Parishes & Dioceses",
description:"Prayerful pilgrimages with daily Mass and biblical reflection.",
icon:Church,
},
{
title:"Biblical Study Groups",
description:"Discover Scripture where it happened and deepen biblical understanding.",
icon:BookOpen,
},
{
title:"Christian Schools & Universities",
description:"Educational journeys connecting faith, history and Scripture.",
icon:Users,
},
{
title:"Travel Partners",
description:"Professionally coordinated land arrangements throughout the Biblical world.",
icon:Compass,
},
],
},

journeyInspirations:[
{
title:"Holy Land Essentials",
days:"8–10 Days",
countries:"Holy Land",
theme:"Life of Christ",
description:
"Visit the principal places of Christ's ministry from Galilee to Jerusalem.",
href:"/pages/contact",
},
{
title:"Holy Land & Jordan",
days:"10–12 Days",
countries:"Holy Land • Jordan",
theme:"Old & New Testament",
description:
"Combine the Holy Land with Mount Nebo, Madaba and Bethany Beyond the Jordan.",
href:"/pages/contact",
},
{
title:"Holy Land & Egypt",
days:"12–14 Days",
countries:"Holy Land • Egypt",
theme:"The Exodus & the Holy Family",
description:
"Follow Scripture from Mount Sinai to the Holy Family's journey through Egypt.",
href:"/pages/contact",
},
{
title:"Holy Land & Turkey",
days:"14–16 Days",
countries:"Holy Land • Türkiye",
theme:"From Christ to the Early Church",
description:
"Continue the story through Antioch, Tarsus, Ephesus and the Seven Churches.",
href:"/pages/contact",
},
],

quote:{
label:"Pilgrim Reflection",

text:
"The Holy Land is not simply a destination—it is where God's plan of salvation entered human history. Every step becomes an invitation to encounter Christ more deeply.",

author:"The Epoch Standard",
},

cta:{
title:"Let Us Design Your Holy Land Journey",

description:
"Whether your community dreams of walking through the Gospel or extending the journey into Jordan, Egypt, Cyprus or Turkey, we will thoughtfully design a pilgrimage shaped around your spiritual goals.",

buttonText:"Plan Your Pilgrimage",

buttonHref:"/pages/contact",
},
};
