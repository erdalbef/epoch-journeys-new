"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Church,
  Circle,
  Clock3,
  Cross,
  Eye,
  GraduationCap,
  Landmark,
  Lightbulb,
  MessageCircleQuestion,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

type LessonSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  quote?: string;
  type?: "standard" | "epoch" | "reflection" | "scenario" | "review";
};

type ReviewQuestion = {
  question: string;
  answer: string;
};

type Lesson = {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  estimatedMinutes: number;
  icon: typeof BookOpen;
  objectives: string[];
  sections: LessonSection[];
  keyTakeaways: string[];
  reviewQuestions?: ReviewQuestion[];
};

const lessons: Lesson[] = [
  {
    id: "introduction-to-christianity",
    number: 1,
    title: "Introduction to Christianity",
    shortTitle: "Christianity",
    description:
      "Understand the central beliefs, origins, and shared foundations of Christianity.",
    estimatedMinutes: 20,
    icon: Cross,
    objectives: [
      "Explain the basic meaning of Christianity.",
      "Identify the central beliefs shared by most Christian traditions.",
      "Understand why Christian knowledge is essential for pilgrimage specialists.",
    ],
    sections: [
      {
        title: "What Is Christianity?",
        paragraphs: [
          "Christianity is a monotheistic faith centered on the life, teachings, death, and resurrection of Jesus Christ.",
          "The word Christ comes from the Greek Christos, meaning the Anointed One. It corresponds to the Hebrew title Messiah.",
          "Christians believe that Jesus Christ is the Son of God and that His life, death, and resurrection opened the way to salvation.",
        ],
      },
      {
        title: "The Shared Christian Foundation",
        bullets: [
          "Belief in one God.",
          "Belief in Jesus Christ.",
          "Belief in the death and resurrection of Christ.",
          "Respect for the Bible as sacred Scripture.",
          "Prayer and worship.",
          "The call to love God and neighbor.",
          "The importance of Christian community.",
          "Hope in eternal life.",
        ],
      },
      {
        title: "Why This Matters to a Pilgrimage Specialist",
        paragraphs: [
          "A pilgrimage specialist does not need to become a theologian.",
          "However, the specialist must understand the basic beliefs, practices, history, and vocabulary connected with the places being presented.",
          "Without this foundation, churches may be described only as buildings, saints only as historical figures, and pilgrimage only as religious tourism.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "Before explaining a sacred place, understand the faith that made the place sacred.",
      },
      {
        title: "Think About It",
        type: "reflection",
        paragraphs: [
          "How would you explain Christianity respectfully to someone with no religious background?",
          "Why should a pilgrimage specialist avoid theological arguments with pilgrims or clergy?",
        ],
      },
    ],
    keyTakeaways: [
      "Christianity is centered on Jesus Christ.",
      "Most Christian traditions share a common foundation despite differences.",
      "Christian knowledge helps specialists explain destinations with meaning and accuracy.",
      "The specialist informs and supports; the specialist does not replace clergy.",
    ],
    reviewQuestions: [
      {
        question: "What is Christianity centered upon?",
        answer:
          "Christianity is centered on the life, teachings, death, and resurrection of Jesus Christ.",
      },
      {
        question:
          "Why must a pilgrimage specialist understand basic Christianity?",
        answer:
          "Because the meaning of Christian destinations, saints, churches, relics, art, worship, and pilgrimage practices cannot be explained accurately without this foundation.",
      },
    ],
  },
  {
    id: "bible-and-christian-story",
    number: 2,
    title: "The Bible and the Christian Story",
    shortTitle: "The Bible",
    description:
      "Understand the structure of the Bible and how Scripture connects with pilgrimage destinations.",
    estimatedMinutes: 24,
    icon: BookOpen,
    objectives: [
      "Explain the difference between the Old and New Testaments.",
      "Identify the main sections of the New Testament.",
      "Connect biblical passages with pilgrimage destinations.",
    ],
    sections: [
      {
        title: "What Is the Bible?",
        paragraphs: [
          "The Bible is the collection of sacred writings received by Christians as Scripture.",
          "It is not one book written at one time. It is a library of books written across many centuries and containing history, law, poetry, prophecy, wisdom, letters, and accounts of the life of Jesus Christ.",
        ],
      },
      {
        title: "The Old Testament",
        paragraphs: [
          "The Old Testament contains the sacred history and writings of ancient Israel.",
          "It includes creation, the patriarchs, the Exodus, the covenant, the prophets, the kings, wisdom literature, and the expectation of the Messiah.",
        ],
      },
      {
        title: "The New Testament",
        bullets: [
          "The four Gospels: Matthew, Mark, Luke, and John.",
          "The Acts of the Apostles.",
          "The letters of St. Paul.",
          "The Catholic or General Epistles.",
          "The Book of Revelation.",
        ],
      },
      {
        title: "Scripture and Pilgrimage",
        paragraphs: [
          "Pilgrimage destinations help Christians understand Scripture geographically and historically.",
          "The Holy Land brings the Gospels to life. Türkiye reveals the world of Asia Minor, St. Paul, the Seven Churches, and the early councils. Greece brings Acts and the Pauline journeys into view. Italy connects pilgrims with the Apostles, martyrs, and the development of Western Christianity.",
        ],
      },
      {
        title: "Responsible Biblical Interpretation",
        type: "epoch",
        quote:
          "Distinguish clearly between what Scripture states, what history supports, and what tradition remembers.",
        paragraphs: [
          "A specialist should never present uncertain traditions as proven facts.",
          "Responsible language protects credibility and respects both faith and scholarship.",
        ],
      },
      {
        title: "Real-Life Scenario",
        type: "scenario",
        paragraphs: [
          "A pilgrim asks whether a traditional site is the exact location of a biblical event.",
          "The specialist should explain what Scripture says, what tradition associates with the place, and whether archaeological confirmation exists.",
        ],
      },
    ],
    keyTakeaways: [
      "The Bible is a collection of sacred writings.",
      "The New Testament is central to many pilgrimage destinations.",
      "Scripture gives spiritual meaning to geographical places.",
      "Tradition, Scripture, and archaeology should be explained honestly.",
    ],
    reviewQuestions: [
      {
        question: "What are the main sections of the New Testament?",
        answer:
          "The Gospels, Acts of the Apostles, Pauline Letters, General Epistles, and Revelation.",
      },
      {
        question:
          "How should a specialist speak about a traditional biblical site?",
        answer:
          "The specialist should distinguish between the biblical account, historical evidence, archaeological findings, and later Christian tradition.",
      },
    ],
  },
  {
    id: "major-christian-traditions",
    number: 3,
    title: "Major Christian Traditions",
    shortTitle: "Traditions",
    description:
      "Understand the major Christian traditions and how their pilgrimage priorities may differ.",
    estimatedMinutes: 30,
    icon: Users,
    objectives: [
      "Identify the major Christian traditions.",
      "Understand common pilgrimage interests across traditions.",
      "Communicate respectfully with Catholic, Orthodox, Protestant, Anglican, and Oriental Orthodox groups.",
    ],
    sections: [
      {
        title: "One Christian History, Different Traditions",
        paragraphs: [
          "Christianity developed through different historical, cultural, liturgical, and theological traditions.",
          "These traditions share important foundations while differing in governance, worship, spiritual practices, and some teachings.",
          "The specialist should understand practical differences without reducing a tradition to stereotypes.",
        ],
      },
      {
        title: "Catholic Pilgrims",
        bullets: [
          "Daily Mass.",
          "The Eucharist and Eucharistic Adoration.",
          "Marian shrines and apparitions.",
          "Saints and relics.",
          "Papal sites and basilicas.",
          "Rosary, Stations of the Cross, and devotions.",
          "Sacramental and parish identity.",
        ],
      },
      {
        title: "Eastern Orthodox Pilgrims",
        bullets: [
          "Divine Liturgy.",
          "Icons and iconostasis.",
          "Monasteries and monastic spirituality.",
          "Patriarchates and ancient churches.",
          "Saints, relics, and feast days.",
          "Byzantine history and sacred art.",
        ],
      },
      {
        title: "Oriental Orthodox Pilgrims",
        bullets: [
          "Ancient apostolic traditions.",
          "Armenian, Coptic, Syriac, Ethiopian, Eritrean, and Malankara heritage.",
          "Monasteries, martyrs, saints, and historic communities.",
          "Distinct liturgical and linguistic traditions.",
        ],
      },
      {
        title: "Protestant and Evangelical Pilgrims",
        bullets: [
          "Biblical geography.",
          "The life of Jesus Christ.",
          "The missionary journeys of St. Paul.",
          "Reformation heritage.",
          "Bible study and preaching.",
          "Early Christian history and archaeology.",
        ],
      },
      {
        title: "Anglican Pilgrims",
        bullets: [
          "Biblical and Christian heritage.",
          "Cathedrals and historic worship.",
          "Saints and pilgrimage traditions.",
          "Reformation and pre-Reformation heritage.",
          "Liturgy, music, and Christian culture.",
        ],
      },
      {
        title: "Respectful Communication",
        type: "epoch",
        quote:
          "Do not decide what a group values based only on its denomination. Ask, listen, and understand.",
      },
      {
        title: "Common Mistake",
        type: "scenario",
        paragraphs: [
          "A specialist assumes that every Protestant group rejects visits connected with saints, relics, or historic churches.",
          "In reality, the group may be deeply interested in biblical history, archaeology, the Reformation, early Christianity, and Christian heritage.",
        ],
      },
    ],
    keyTakeaways: [
      "Christian traditions share roots but have distinct practices and priorities.",
      "Group expectations should be discovered, not assumed.",
      "Respectful language builds trust.",
      "The itinerary emphasis may change even when the destinations remain similar.",
    ],
    reviewQuestions: [
      {
        question:
          "What are common pilgrimage priorities for Catholic groups?",
        answer:
          "Mass, the Eucharist, Marian shrines, saints, relics, papal sites, devotions, and parish spiritual formation.",
      },
      {
        question:
          "Why should the specialist avoid assumptions based on denomination?",
        answer:
          "Because individual parishes and groups may have different interests, levels of devotion, educational goals, and expectations.",
      },
    ],
  },
  {
    id: "saints-and-martyrs",
    number: 4,
    title: "Saints, Apostles, and Martyrs",
    shortTitle: "Saints",
    description:
      "Understand the role of saints, apostles, martyrs, feast days, and Christian memory.",
    estimatedMinutes: 26,
    icon: ShieldCheck,
    objectives: [
      "Explain the meaning of saint, apostle, and martyr.",
      "Understand why saints are important to many pilgrims.",
      "Present saints respectfully across different traditions.",
    ],
    sections: [
      {
        title: "What Is a Saint?",
        paragraphs: [
          "In the broad Christian meaning, a saint is a holy person belonging to God.",
          "In Catholic and Orthodox practice, the term is commonly used for Christians formally recognized for holiness, faithful witness, martyrdom, or exceptional service to the Church.",
        ],
      },
      {
        title: "The Apostles",
        paragraphs: [
          "The Apostles were chosen witnesses and messengers of Jesus Christ.",
          "Pilgrimage frequently follows the lives and missions of St. Peter, St. Paul, St. John, St. James, St. Andrew, St. Philip, and others.",
        ],
      },
      {
        title: "Martyrs",
        paragraphs: [
          "A martyr is a person who suffers death rather than deny the Christian faith.",
          "The word martyr comes from a Greek word meaning witness.",
          "Sites connected with martyrdom often become places of prayer, memory, courage, and Christian identity.",
        ],
      },
      {
        title: "Why Saints Matter",
        bullets: [
          "They provide examples of Christian faith and courage.",
          "They connect belief with real human lives.",
          "They shape local Christian identity.",
          "They are associated with churches, relics, shrines, and feast days.",
          "They help pilgrims understand different expressions of holiness.",
        ],
      },
      {
        title: "Veneration and Worship",
        type: "epoch",
        quote:
          "Christians worship God. Catholic and Orthodox Christians venerate saints as faithful witnesses and ask for their prayers.",
        paragraphs: [
          "The specialist should explain this distinction clearly and respectfully.",
          "Avoid language suggesting that saints are worshipped as gods.",
        ],
      },
      {
        title: "How to Present a Saint",
        bullets: [
          "Who was the person?",
          "When and where did the person live?",
          "What was their Christian witness?",
          "Which symbols are associated with them?",
          "Where are their principal pilgrimage sites?",
          "Are relics connected with them?",
          "What is their feast day?",
          "Why do pilgrims remember them today?",
        ],
      },
    ],
    keyTakeaways: [
      "Saints connect Christian teaching with human lives.",
      "Martyrs are remembered as witnesses to faith.",
      "Worship and veneration are not the same.",
      "Specialists should explain saints historically, spiritually, and respectfully.",
    ],
    reviewQuestions: [
      {
        question: "What does the word martyr mean?",
        answer:
          "It comes from the Greek word for witness and refers to someone who gives their life rather than deny the Christian faith.",
      },
      {
        question:
          "What is the difference between worship and veneration?",
        answer:
          "Worship is directed to God alone. Veneration is honor shown to saints as faithful Christian witnesses.",
      },
    ],
  },
  {
    id: "relics-shrines-pilgrimage",
    number: 5,
    title: "Relics, Shrines, and Sacred Places",
    shortTitle: "Relics & Shrines",
    description:
      "Understand relics, shrines, sanctuaries, pilgrimage churches, and responsible explanations of sacred tradition.",
    estimatedMinutes: 28,
    icon: Landmark,
    objectives: [
      "Explain what relics and reliquaries are.",
      "Distinguish between a shrine, sanctuary, church, basilica, and cathedral.",
      "Understand the place of sacred objects and sites in pilgrimage.",
    ],
    sections: [
      {
        title: "What Is a Relic?",
        paragraphs: [
          "A relic is a physical object connected with Jesus Christ, a saint, or a holy person.",
          "In Catholic tradition, relics are commonly described in classes according to their relationship with the saint.",
        ],
      },
      {
        title: "Classes of Relics",
        bullets: [
          "First-class relic: part of the body of a saint or an object directly associated with the life of Christ.",
          "Second-class relic: an object personally used or worn by a saint.",
          "Third-class relic: an object touched to a first- or second-class relic.",
        ],
      },
      {
        title: "Relic and Reliquary",
        paragraphs: [
          "The relic is the sacred object.",
          "The reliquary is the container in which the relic is preserved and displayed.",
        ],
      },
      {
        title: "What Is a Shrine?",
        paragraphs: [
          "A shrine is a church or sacred place associated with a saint, relic, apparition, miracle, biblical event, or longstanding devotion.",
          "Shrines may be local, diocesan, national, or international.",
        ],
      },
      {
        title: "Frequently Confused Terms",
        bullets: [
          "A cathedral is the principal church of a bishop.",
          "A basilica is a church granted a special status.",
          "A shrine is a place of particular devotion or pilgrimage.",
          "A sanctuary may mean a sacred place or the area around the altar, depending on context.",
          "A chapel is a smaller place of worship.",
          "A monastery is a religious community and its buildings.",
        ],
      },
      {
        title: "Responsible Language",
        type: "epoch",
        quote:
          "Present devotion with respect, tradition with accuracy, and uncertainty with honesty.",
        paragraphs: [
          "Authenticity claims concerning relics and ancient traditions may differ in certainty.",
          "The specialist should avoid declaring contested claims as proven facts.",
        ],
      },
      {
        title: "Pilgrim Etiquette",
        bullets: [
          "Maintain silence where requested.",
          "Follow photography restrictions.",
          "Respect queues and devotional practices.",
          "Dress appropriately.",
          "Do not touch reliquaries unless explicitly permitted.",
          "Allow pilgrims personal prayer time.",
        ],
      },
    ],
    keyTakeaways: [
      "Relics and reliquaries are different.",
      "Shrines are places of particular devotion and pilgrimage.",
      "Church titles describe different functions or statuses.",
      "Accuracy and sensitivity are essential when discussing sacred traditions.",
    ],
    reviewQuestions: [
      {
        question: "What is the difference between a relic and a reliquary?",
        answer:
          "A relic is the sacred object connected with Christ or a saint. A reliquary is the container that preserves or displays it.",
      },
      {
        question: "What makes a church a cathedral?",
        answer:
          "It is the principal church of a bishop and contains the bishop’s official seat, called the cathedra.",
      },
    ],
  },
  {
    id: "icons-frescoes-mosaics",
    number: 6,
    title: "Icons, Frescoes, Mosaics, and Sacred Art",
    shortTitle: "Sacred Art",
    description:
      "Learn how Christian art communicates theology, Scripture, memory, and devotion.",
    estimatedMinutes: 30,
    icon: Eye,
    objectives: [
      "Explain the differences between icons, frescoes, mosaics, and statues.",
      "Recognize common Christian symbols.",
      "Help pilgrims interpret sacred art respectfully.",
    ],
    sections: [
      {
        title: "Sacred Art as Christian Teaching",
        paragraphs: [
          "Christian art is not only decoration.",
          "For centuries, images helped Christians understand Scripture, saints, feast days, doctrine, and the story of salvation.",
          "Churches often function as visual books of Christian memory.",
        ],
      },
      {
        title: "Icons",
        paragraphs: [
          "An icon is a sacred image, especially important in Orthodox and Eastern Christian traditions.",
          "Icons are created according to inherited theological and artistic conventions.",
          "They are often described as windows toward heavenly reality.",
        ],
      },
      {
        title: "Frescoes",
        paragraphs: [
          "A fresco is painted onto fresh, wet plaster so that the pigment becomes part of the wall as the plaster dries.",
          "Frescoes are common in churches, chapels, monasteries, and historic Christian buildings.",
        ],
      },
      {
        title: "Mosaics",
        paragraphs: [
          "A mosaic is made from small pieces of colored glass, stone, ceramic, or other material.",
          "Byzantine churches frequently use gold-background mosaics to express light, glory, and heavenly reality.",
        ],
      },
      {
        title: "Statues and Sculpture",
        paragraphs: [
          "Statues are especially common in Western Christian traditions.",
          "They may represent Christ, the Virgin Mary, saints, biblical figures, or theological themes.",
        ],
      },
      {
        title: "Common Christian Symbols",
        bullets: [
          "Cross and crucifix.",
          "Chi-Rho.",
          "Alpha and Omega.",
          "Fish or Ichthys.",
          "Lamb.",
          "Dove.",
          "Anchor.",
          "Keys of St. Peter.",
          "Sword of St. Paul.",
          "Shell of St. James.",
          "Lily.",
          "Crown of thorns.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "Do not only tell pilgrims what they are looking at. Help them understand what the image is trying to teach.",
      },
      {
        title: "Common Mistake",
        type: "scenario",
        paragraphs: [
          "A specialist describes an Orthodox icon as merely an old painting.",
          "This ignores its theological, liturgical, and devotional significance and may appear disrespectful.",
        ],
      },
    ],
    keyTakeaways: [
      "Sacred art communicates Christian belief and memory.",
      "Icons, frescoes, mosaics, and statues use different techniques and traditions.",
      "Symbols help identify saints and theological themes.",
      "Art should be interpreted, not merely admired.",
    ],
    reviewQuestions: [
      {
        question: "What is the basic difference between a fresco and a mosaic?",
        answer:
          "A fresco is painted into wet plaster, while a mosaic is assembled from small pieces of glass, stone, ceramic, or similar materials.",
      },
      {
        question: "Why is an icon more than an ordinary painting?",
        answer:
          "Because it has a sacred and theological role within Eastern Christian worship, devotion, and teaching.",
      },
    ],
  },
  {
    id: "church-architecture",
    number: 7,
    title: "Church Architecture and Sacred Space",
    shortTitle: "Architecture",
    description:
      "Understand the principal parts, styles, and purposes of Christian churches.",
    estimatedMinutes: 30,
    icon: Church,
    objectives: [
      "Identify the principal parts of a church.",
      "Recognize major architectural traditions.",
      "Explain how sacred space supports Christian worship.",
    ],
    sections: [
      {
        title: "Why Church Architecture Matters",
        paragraphs: [
          "Church architecture is shaped by worship, theology, culture, climate, technology, and historical period.",
          "A church is not designed only to be beautiful. Its spaces support prayer, proclamation, sacrament, procession, music, community, and sacred memory.",
        ],
      },
      {
        title: "Principal Parts of a Church",
        bullets: [
          "Nave: the main area for the congregation.",
          "Sanctuary: the sacred area around the altar.",
          "Apse: the curved or polygonal end of a church.",
          "Narthex: the entrance or vestibule.",
          "Transept: the section crossing the nave.",
          "Choir: the area used by clergy or singers.",
          "Crypt: a chamber beneath or near the church.",
          "Sacristy: the room where vestments and sacred objects are prepared.",
          "Cathedra: the bishop’s official seat.",
          "Iconostasis: the icon screen in many Eastern churches.",
        ],
      },
      {
        title: "Major Architectural Styles",
        bullets: [
          "Early Christian basilica.",
          "Byzantine.",
          "Romanesque.",
          "Gothic.",
          "Renaissance.",
          "Baroque.",
          "Neoclassical.",
          "Modern and contemporary.",
        ],
      },
      {
        title: "How to Recognize Byzantine Architecture",
        bullets: [
          "Centralized plan.",
          "Large dome.",
          "Mosaics or frescoes.",
          "Iconostasis.",
          "Symbolic use of light.",
          "Strong emphasis on sacred interior space.",
        ],
      },
      {
        title: "How to Recognize Gothic Architecture",
        bullets: [
          "Pointed arches.",
          "Ribbed vaults.",
          "Flying buttresses.",
          "Tall vertical proportions.",
          "Large stained-glass windows.",
          "Rose windows.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "Begin by explaining why the church exists before describing how it was built.",
      },
      {
        title: "Tour Manager Awareness",
        type: "scenario",
        paragraphs: [
          "Historic churches may include steps, narrow entrances, uneven floors, limited seating, restricted coach access, dress codes, and services in progress.",
          "Architectural knowledge should therefore be connected with operational preparation.",
        ],
      },
    ],
    keyTakeaways: [
      "Church architecture supports worship and theology.",
      "Different architectural styles reflect different historical periods.",
      "Specialists should recognize principal church areas.",
      "Architecture should be connected with spiritual meaning and practical operations.",
    ],
    reviewQuestions: [
      {
        question: "What is the nave?",
        answer:
          "The nave is the main central area of the church where the congregation usually gathers.",
      },
      {
        question: "What is an iconostasis?",
        answer:
          "It is a screen or wall of icons separating the sanctuary from the nave in many Eastern Christian churches.",
      },
    ],
  },
  {
    id: "worship-liturgy-devotion",
    number: 8,
    title: "Worship, Liturgy, and Devotion",
    shortTitle: "Worship",
    description:
      "Understand common Christian worship practices and how they affect pilgrimage planning.",
    estimatedMinutes: 30,
    icon: ScrollText,
    objectives: [
      "Explain the difference between Mass and Divine Liturgy.",
      "Recognize common Christian devotions and services.",
      "Plan pilgrimage programmes that respect worship and denominational practice.",
    ],
    sections: [
      {
        title: "Liturgy",
        paragraphs: [
          "Liturgy is the public worship of the Church.",
          "It includes structured prayers, Scripture readings, hymns, sacraments, rituals, and the observance of the Christian calendar.",
        ],
      },
      {
        title: "Holy Mass",
        paragraphs: [
          "Mass is the principal Eucharistic celebration of the Catholic Church and some Western Christian traditions.",
          "Catholic pilgrimages often request daily Mass, requiring careful coordination with churches, priests, transportation, and the itinerary.",
        ],
      },
      {
        title: "Divine Liturgy",
        paragraphs: [
          "Divine Liturgy is the principal Eucharistic worship of the Orthodox and many Eastern Catholic Churches.",
          "Its structure, music, language, duration, and customs may differ from Western forms of worship.",
        ],
      },
      {
        title: "Common Devotions",
        bullets: [
          "Rosary.",
          "Stations of the Cross.",
          "Eucharistic Adoration.",
          "Benediction.",
          "Novena.",
          "Vespers.",
          "Matins.",
          "Compline.",
          "Processions.",
          "Pilgrimage blessings.",
          "Veneration of icons or relics.",
        ],
      },
      {
        title: "Pilgrimage Planning",
        bullets: [
          "Confirm whether worship is private or public.",
          "Confirm language requirements.",
          "Clarify vestments and liturgical needs.",
          "Respect church schedules and local clergy.",
          "Allow preparation time.",
          "Ensure transport timing is realistic.",
          "Identify alternatives if the preferred church is unavailable.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "Worship is not another attraction in the itinerary. It is often the spiritual center of the day.",
      },
      {
        title: "Real-Life Scenario",
        type: "scenario",
        paragraphs: [
          "A famous church offers a public Mass at a suitable time, but a private Mass request cannot be accepted.",
          "The specialist should discuss whether participation in the public Mass serves the group’s needs or whether another church should be arranged.",
        ],
      },
    ],
    keyTakeaways: [
      "Liturgy is public Christian worship.",
      "Mass and Divine Liturgy reflect different Christian traditions.",
      "Devotional practices vary by group.",
      "Worship planning requires spiritual sensitivity and operational accuracy.",
    ],
    reviewQuestions: [
      {
        question: "What is liturgy?",
        answer:
          "Liturgy is the structured public worship of the Church, including prayer, Scripture, hymns, sacraments, and ritual.",
      },
      {
        question:
          "Why should worship arrangements be planned early?",
        answer:
          "Because church availability, clergy, language, transportation, opening hours, group size, liturgical requirements, and daily timing must all be coordinated.",
      },
    ],
  },
  {
    id: "review-assessment",
    number: 9,
    title: "Knowledge Review and Final Assessment",
    shortTitle: "Assessment",
    description:
      "Review the essential Christian heritage knowledge introduced in EA-003.",
    estimatedMinutes: 35,
    icon: GraduationCap,
    objectives: [
      "Review the principal concepts of Christian heritage.",
      "Apply respectful and accurate terminology.",
      "Demonstrate readiness for destination masterclasses.",
    ],
    sections: [
      {
        title: "Knowledge Review",
        type: "review",
        bullets: [
          "What are the central shared foundations of Christianity?",
          "What are the main sections of the New Testament?",
          "How may Catholic and Protestant pilgrimage priorities differ?",
          "What is the difference between worship and veneration?",
          "What is the difference between a relic and a reliquary?",
          "What makes a church a cathedral?",
          "How does an icon differ from an ordinary painting?",
          "What is the difference between a fresco and a mosaic?",
          "What are the principal parts of a church?",
          "Why must worship arrangements be integrated into operations?",
        ],
      },
      {
        title: "Case Study One",
        type: "scenario",
        paragraphs: [
          "A mixed Christian group will visit Ephesus, Patmos, Athens, and Rome.",
          "Explain how you would identify the interests of Catholic, Orthodox, and Protestant participants without creating division.",
        ],
      },
      {
        title: "Case Study Two",
        type: "scenario",
        paragraphs: [
          "A pilgrim asks whether Catholics worship relics and saints.",
          "Prepare a respectful one-minute explanation.",
        ],
      },
      {
        title: "Case Study Three",
        type: "scenario",
        paragraphs: [
          "A guide describes an Orthodox icon as an old religious painting and moves on.",
          "Explain why the description is insufficient and how an Epoch specialist should improve it.",
        ],
      },
      {
        title: "Practical Assignment",
        type: "review",
        bullets: [
          "Select one important church.",
          "Identify its status: church, cathedral, basilica, shrine, or monastery church.",
          "Describe its architecture.",
          "Identify important saints, relics, icons, frescoes, or mosaics.",
          "Explain its importance for Catholic, Orthodox, Protestant, or mixed groups.",
          "Prepare a five-minute pilgrim explanation.",
        ],
      },
      {
        title: "Completion Standard",
        type: "epoch",
        quote:
          "EA-003 is complete when the learner can explain Christian heritage accurately, respectfully, and practically without pretending to be a theologian.",
      },
      {
        title: "Personal Reflection",
        type: "reflection",
        paragraphs: [
          "Which Christian tradition do you understand least?",
          "Which terms or practices require further study?",
          "How will you ensure that your explanations remain respectful and accurate?",
        ],
      },
    ],
    keyTakeaways: [
      "Christian knowledge gives spiritual meaning to destination knowledge.",
      "Different Christian traditions should be presented respectfully.",
      "Accuracy protects trust.",
      "The specialist should know when to explain and when to refer a theological question to clergy.",
      "EA-003 prepares the learner for destination masterclasses.",
    ],
  },
];

const STORAGE_KEY = "epoch-academy-ea003-completed-lessons";
const ACTIVE_LESSON_KEY = "epoch-academy-ea003-active-lesson";

function SectionBlock({ section }: { section: LessonSection }) {
  if (section.type === "epoch") {
    return (
      <section className="rounded-[1.75rem] bg-[#0B1F3A] p-7 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <Sparkles className="text-[#C9A24D]" size={20} />

          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#C9A24D]">
            {section.title}
          </p>
        </div>

        {section.quote ? (
          <blockquote className="mt-5 font-serif text-2xl italic leading-10 text-white/95">
            “{section.quote}”
          </blockquote>
        ) : null}

        {section.paragraphs?.map((paragraph) => (
          <p key={paragraph} className="mt-5 leading-8 text-white/75">
            {paragraph}
          </p>
        ))}

        {section.bullets ? (
          <ul className="mt-6 space-y-3">
            {section.bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-3 text-white/80"
              >
                <Check
                  className="mt-1 shrink-0 text-[#C9A24D]"
                  size={17}
                />

                <span className="leading-7">{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  }

  if (section.type === "reflection") {
    return (
      <section className="rounded-[1.75rem] border border-[#C9A24D]/30 bg-[#F7F3EA] p-7 sm:p-8">
        <div className="flex items-center gap-3">
          <Lightbulb className="text-[#C9A24D]" size={21} />

          <h3 className="font-serif text-2xl text-[#0B1F3A]">
            {section.title}
          </h3>
        </div>

        {section.quote ? (
          <blockquote className="mt-5 font-serif text-xl italic leading-9 text-[#0B1F3A]">
            “{section.quote}”
          </blockquote>
        ) : null}

        <div className="mt-5 space-y-4">
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="leading-8 text-slate-700">
              {paragraph}
            </p>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "scenario") {
    return (
      <section className="rounded-[1.75rem] border border-blue-100 bg-blue-50/70 p-7 sm:p-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-[#0B1F3A]" size={21} />

          <h3 className="font-serif text-2xl text-[#0B1F3A]">
            {section.title}
          </h3>
        </div>

        <div className="mt-5 space-y-4">
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="leading-8 text-slate-700">
              {paragraph}
            </p>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "review") {
    return (
      <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-7 sm:p-8">
        <div className="flex items-center gap-3">
          <MessageCircleQuestion
            className="text-[#C9A24D]"
            size={21}
          />

          <h3 className="font-serif text-2xl text-[#0B1F3A]">
            {section.title}
          </h3>
        </div>

        {section.paragraphs?.map((paragraph) => (
          <p key={paragraph} className="mt-5 leading-8 text-slate-700">
            {paragraph}
          </p>
        ))}

        {section.bullets ? (
          <ol className="mt-6 space-y-4">
            {section.bullets.map((bullet, index) => (
              <li
                key={bullet}
                className="flex items-start gap-4 text-slate-700"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0B1F3A] text-xs font-semibold text-[#C9A24D]">
                  {index + 1}
                </span>

                <span className="pt-0.5 leading-7">{bullet}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    );
  }

  return (
    <section>
      <h3 className="font-serif text-2xl text-[#0B1F3A]">
        {section.title}
      </h3>

      {section.quote ? (
        <blockquote className="mt-5 border-l-4 border-[#C9A24D] pl-6 font-serif text-xl italic leading-9 text-[#0B1F3A]">
          “{section.quote}”
        </blockquote>
      ) : null}

      <div className="mt-5 space-y-5">
        {section.paragraphs?.map((paragraph) => (
          <p
            key={paragraph}
            className="text-lg leading-8 text-slate-700"
          >
            {paragraph}
          </p>
        ))}
      </div>

      {section.bullets ? (
        <ul className="mt-6 space-y-3">
          {section.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-3 text-slate-700"
            >
              <CheckCircle2
                className="mt-1 shrink-0 text-[#C9A24D]"
                size={18}
              />

              <span className="leading-7">{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default function ChristianityHeritageCoursePage() {
  const [activeLessonId, setActiveLessonId] = useState(
    lessons[0].id
  );

  const [completedLessonIds, setCompletedLessonIds] = useState<
    string[]
  >([]);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedCompleted = window.localStorage.getItem(STORAGE_KEY);
      const storedActive = window.localStorage.getItem(
        ACTIVE_LESSON_KEY
      );

      if (storedCompleted) {
        const parsed: unknown = JSON.parse(storedCompleted);

        if (Array.isArray(parsed)) {
          setCompletedLessonIds(
            parsed.filter(
              (item): item is string => typeof item === "string"
            )
          );
        }
      }

      if (
        storedActive &&
        lessons.some((lesson) => lesson.id === storedActive)
      ) {
        setActiveLessonId(storedActive);
      }
    } catch (error) {
      console.error("Unable to load EA-003 progress:", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(completedLessonIds)
    );
  }, [completedLessonIds, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    window.localStorage.setItem(
      ACTIVE_LESSON_KEY,
      activeLessonId
    );
  }, [activeLessonId, hydrated]);

  const activeLessonIndex = lessons.findIndex(
    (lesson) => lesson.id === activeLessonId
  );

  const activeLesson =
    lessons[activeLessonIndex] ?? lessons[0];

  const previousLesson =
    activeLessonIndex > 0
      ? lessons[activeLessonIndex - 1]
      : null;

  const nextLesson =
    activeLessonIndex < lessons.length - 1
      ? lessons[activeLessonIndex + 1]
      : null;

  const completedCount = completedLessonIds.length;

  const progressPercentage = useMemo(
    () =>
      Math.round((completedCount / lessons.length) * 100),
    [completedCount]
  );

  const totalStudyMinutes = useMemo(
    () =>
      lessons.reduce(
        (total, lesson) => total + lesson.estimatedMinutes,
        0
      ),
    []
  );

  const isActiveLessonCompleted =
    completedLessonIds.includes(activeLesson.id);

  function selectLesson(lessonId: string) {
    setActiveLessonId(lessonId);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function toggleActiveLessonComplete() {
    setCompletedLessonIds((current) => {
      if (current.includes(activeLesson.id)) {
        return current.filter(
          (lessonId) => lessonId !== activeLesson.id
        );
      }

      return [...current, activeLesson.id];
    });
  }

  function completeAndContinue() {
    setCompletedLessonIds((current) => {
      if (current.includes(activeLesson.id)) {
        return current;
      }

      return [...current, activeLesson.id];
    });

    if (nextLesson) {
      selectLesson(nextLesson.id);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/staff/epoch-academy"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#0B1F3A]"
        >
          <ArrowLeft size={17} />
          Back to Academy Library
        </Link>

        <span className="rounded-full bg-[#F7F3EA] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6B23]">
          Foundation Programme
        </span>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] bg-[#0B1F3A] px-8 py-11 text-white shadow-sm sm:px-12 sm:py-14">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#C9A24D]/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
                EA-003
              </p>

              <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
                Christianity & Christian Heritage
              </h1>

              <p className="mt-5 text-xl text-[#E8D8AE]">
                The knowledge behind every Christian pilgrimage.
              </p>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/70">
                Understand Christianity, Scripture, Christian traditions,
                saints, relics, shrines, sacred art, architecture,
                worship, and the language required to explain Christian
                heritage accurately and respectfully.
              </p>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[390px] lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4">
                <div className="flex items-center gap-3">
                  <Clock3 className="text-[#C9A24D]" size={19} />

                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/45">
                      Study Time
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      {Math.ceil(totalStudyMinutes / 60)} Hours
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-[#C9A24D]" size={19} />

                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/45">
                      Lessons
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      {lessons.length} Lessons
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4">
                <div className="flex items-center gap-3">
                  <GraduationCap
                    className="text-[#C9A24D]"
                    size={19}
                  />

                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/45">
                      Level
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      Foundation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  Course Progress
                </p>

                <p className="mt-1 text-sm text-white/55">
                  {completedCount} of {lessons.length} lessons completed
                </p>
              </div>

              <p className="font-serif text-3xl text-[#C9A24D]">
                {progressPercentage}%
              </p>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#C9A24D] transition-all duration-500"
                style={{
                  width: `${progressPercentage}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="self-start xl:sticky xl:top-24">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-[#F7F3EA] px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9A24D]">
                Course Contents
              </p>

              <h2 className="mt-2 font-serif text-2xl text-[#0B1F3A]">
                EA-003 Lessons
              </h2>
            </div>

            <nav className="p-3">
              {lessons.map((lesson) => {
                const Icon = lesson.icon;
                const isActive = lesson.id === activeLesson.id;
                const isCompleted =
                  completedLessonIds.includes(lesson.id);

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => selectLesson(lesson.id)}
                    className={`flex w-full items-start gap-3 rounded-2xl px-4 py-4 text-left transition ${
                      isActive
                        ? "bg-[#0B1F3A] text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isActive
                          ? "bg-[#C9A24D] text-[#0B1F3A]"
                          : isCompleted
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isCompleted ? (
                        <Check size={16} />
                      ) : (
                        <Icon size={15} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                          isActive
                            ? "text-[#C9A24D]"
                            : "text-slate-400"
                        }`}
                      >
                        Lesson {lesson.number}
                      </p>

                      <p className="mt-1 text-sm font-semibold leading-5">
                        {lesson.shortTitle}
                      </p>

                      <p
                        className={`mt-1 text-xs ${
                          isActive
                            ? "text-white/50"
                            : "text-slate-400"
                        }`}
                      >
                        {lesson.estimatedMinutes} minutes
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0">
          <article className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-7 py-8 sm:px-10 sm:py-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A24D]">
                  Lesson {activeLesson.number} of {lessons.length}
                </p>

                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock3 size={16} />
                  {activeLesson.estimatedMinutes} minutes
                </div>
              </div>

              <h2 className="mt-5 font-serif text-3xl leading-tight text-[#0B1F3A] sm:text-4xl">
                {activeLesson.title}
              </h2>

              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                {activeLesson.description}
              </p>
            </header>

            <div className="space-y-10 px-7 py-8 sm:px-10 sm:py-10">
              <section className="rounded-[1.75rem] border border-[#C9A24D]/25 bg-[#FCFBF8] p-7">
                <div className="flex items-center gap-3">
                  <Target className="text-[#C9A24D]" size={21} />

                  <h3 className="font-serif text-2xl text-[#0B1F3A]">
                    Learning Objectives
                  </h3>
                </div>

                <p className="mt-4 text-sm text-slate-500">
                  After completing this lesson, you should be able to:
                </p>

                <ul className="mt-5 space-y-3">
                  {activeLesson.objectives.map((objective) => (
                    <li
                      key={objective}
                      className="flex items-start gap-3 text-slate-700"
                    >
                      <CheckCircle2
                        className="mt-1 shrink-0 text-[#C9A24D]"
                        size={18}
                      />

                      <span className="leading-7">{objective}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {activeLesson.sections.map((section) => (
                <SectionBlock
                  key={`${activeLesson.id}-${section.title}`}
                  section={section}
                />
              ))}

              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-[#C9A24D]" size={21} />

                  <h3 className="font-serif text-2xl text-[#0B1F3A]">
                    Key Takeaways
                  </h3>
                </div>

                <ul className="mt-6 space-y-4">
                  {activeLesson.keyTakeaways.map((takeaway) => (
                    <li
                      key={takeaway}
                      className="flex items-start gap-4"
                    >
                      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0B1F3A] text-[#C9A24D]">
                        <Check size={14} />
                      </div>

                      <span className="leading-7 text-slate-700">
                        {takeaway}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {activeLesson.reviewQuestions?.length ? (
                <section className="rounded-[1.75rem] bg-[#F7F3EA] p-7 sm:p-8">
                  <div className="flex items-center gap-3">
                    <MessageCircleQuestion
                      className="text-[#C9A24D]"
                      size={21}
                    />

                    <h3 className="font-serif text-2xl text-[#0B1F3A]">
                      Knowledge Review
                    </h3>
                  </div>

                  <p className="mt-4 leading-7 text-slate-600">
                    Review each question before opening the suggested answer.
                  </p>

                  <div className="mt-6 space-y-4">
                    {activeLesson.reviewQuestions.map(
                      (review, index) => (
                        <details
                          key={review.question}
                          className="group rounded-2xl border border-[#C9A24D]/20 bg-white p-5"
                        >
                          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold text-[#0B1F3A]">
                            <span>
                              {index + 1}. {review.question}
                            </span>

                            <span className="text-[#C9A24D] transition group-open:rotate-45">
                              +
                            </span>
                          </summary>

                          <div className="mt-4 border-t border-slate-100 pt-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A24D]">
                              Suggested Answer
                            </p>

                            <p className="mt-3 leading-7 text-slate-600">
                              {review.answer}
                            </p>
                          </div>
                        </details>
                      )
                    )}
                  </div>
                </section>
              ) : null}

              <section
                className={`rounded-[1.75rem] border p-7 sm:p-8 ${
                  isActiveLessonCompleted
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                        isActiveLessonCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-white text-slate-400"
                      }`}
                    >
                      {isActiveLessonCompleted ? (
                        <Check size={20} />
                      ) : (
                        <Circle size={20} />
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-[#0B1F3A]">
                        {isActiveLessonCompleted
                          ? "Lesson Completed"
                          : "Complete This Lesson"}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {isActiveLessonCompleted
                          ? "Your progress has been saved in this browser."
                          : "Mark the lesson complete when you understand its main principles."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleActiveLessonComplete}
                    className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
                      isActiveLessonCompleted
                        ? "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100"
                        : "bg-[#0B1F3A] text-white hover:bg-[#15345F]"
                    }`}
                  >
                    {isActiveLessonCompleted ? (
                      <>
                        <Check size={17} />
                        Completed
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={17} />
                        Mark Complete
                      </>
                    )}
                  </button>
                </div>
              </section>
            </div>

            <footer className="border-t border-slate-100 px-7 py-6 sm:px-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {previousLesson ? (
                  <button
                    type="button"
                    onClick={() => selectLesson(previousLesson.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#C9A24D]/50 hover:text-[#0B1F3A]"
                  >
                    <ChevronLeft size={17} />
                    Previous Lesson
                  </button>
                ) : (
                  <div />
                )}

                {nextLesson ? (
                  <button
                    type="button"
                    onClick={completeAndContinue}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C9A24D] px-6 py-3 text-sm font-semibold text-[#0B1F3A] transition hover:bg-[#B8903E]"
                  >
                    Complete & Continue
                    <ChevronRight size={17} />
                  </button>
                ) : (
                  <Link
                    href="/staff/epoch-academy"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C9A24D] px-6 py-3 text-sm font-semibold text-[#0B1F3A] transition hover:bg-[#B8903E]"
                  >
                    Finish Course
                    <ArrowRight size={17} />
                  </Link>
                )}
              </div>
            </footer>
          </article>

          <section className="mt-8 rounded-[2rem] bg-[#07172D] p-8 text-center text-white sm:p-10">
            <Church className="mx-auto text-[#C9A24D]" size={26} />

            <blockquote className="mx-auto mt-5 max-w-3xl font-serif text-2xl italic leading-10 text-white/90">
              “Knowledge enables us to answer questions. Faith enables us
              to understand why the questions matter.”
            </blockquote>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#C9A24D]">
              The Epoch Way
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}