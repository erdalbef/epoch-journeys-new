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
  Languages,
  Library,
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
    id: "using-the-encyclopedia",
    number: 1,
    title: "Using the Epoch Christian Encyclopedia",
    shortTitle: "How to Use It",
    description:
      "Understand how EA-005 supports every Foundation Programme and Destination Masterclass.",
    estimatedMinutes: 18,
    icon: Library,
    objectives: [
      "Understand the purpose of the Epoch Christian Encyclopedia.",
      "Use entries as both study material and professional reference.",
      "Recognize when additional research or clergy guidance is required.",
    ],
    sections: [
      {
        title: "The Common Language of the Academy",
        paragraphs: [
          "Every profession has its own vocabulary.",
          "Pilgrimage specialists work with terms connected with Scripture, saints, churches, liturgy, relics, sacred art, architecture, Christian traditions, and pilgrimage practice.",
          "EA-005 provides a common language for the entire Epoch Academy.",
        ],
      },
      {
        title: "A Reference, Not a Replacement",
        paragraphs: [
          "The Encyclopedia is designed for pilgrimage professionals.",
          "It does not replace the Bible, official Church teaching, theological education, clergy guidance, historical scholarship, or local expert advice.",
          "Its purpose is to help specialists communicate accurately, respectfully, and confidently.",
        ],
      },
      {
        title: "How to Use an Entry",
        bullets: [
          "Read the definition.",
          "Study the origin and pronunciation.",
          "Review the biblical or historical background.",
          "Understand why the term matters to pilgrimage.",
          "Compare Christian perspectives when relevant.",
          "Study common mistakes.",
          "Practice the one-minute pilgrim explanation.",
          "Follow related terms for deeper learning.",
        ],
      },
      {
        title: "The Epoch Principle",
        type: "epoch",
        quote:
          "Never use a religious term merely because it sounds impressive. Use it only when you understand what it means.",
      },
      {
        title: "When to Ask for Help",
        type: "scenario",
        paragraphs: [
          "A pilgrim asks a complex theological question about the Eucharist, papal authority, or the relationship between Catholic and Orthodox teaching.",
          "The specialist may provide a basic factual explanation, but should refer theological interpretation to the priest or appropriate clergy member.",
        ],
      },
    ],
    keyTakeaways: [
      "EA-005 supports every Academy course.",
      "The specialist must know the limits of their role.",
      "Clear terminology protects credibility.",
      "Related terms should be studied together.",
    ],
    reviewQuestions: [
      {
        question: "What is the main purpose of EA-005?",
        answer:
          "To provide pilgrimage specialists with a clear, respectful, and practical reference to Christian terms, symbols, traditions, sacred places, objects, worship, and heritage.",
      },
      {
        question:
          "When should a specialist refer a question to clergy?",
        answer:
          "When the question requires theological interpretation, pastoral judgement, sacramental guidance, or denominational teaching beyond the specialist’s professional role.",
      },
    ],
  },
  {
    id: "foundational-terms",
    number: 2,
    title: "Foundational Christian Terms",
    shortTitle: "Foundations",
    description:
      "Learn the basic words required to understand Christianity and Christian pilgrimage.",
    estimatedMinutes: 30,
    icon: Cross,
    objectives: [
      "Explain foundational Christian terms in clear language.",
      "Recognize the relationship between Christ, Gospel, Church, and discipleship.",
      "Avoid common misunderstandings.",
    ],
    sections: [
      {
        title: "Christianity",
        paragraphs: [
          "Christianity is the faith centered on the life, teachings, death, and resurrection of Jesus Christ.",
          "Christians believe Jesus is the Christ, the promised Messiah.",
        ],
      },
      {
        title: "Jesus Christ",
        paragraphs: [
          "Jesus is the personal name.",
          "Christ is a title from the Greek Christos, meaning the Anointed One.",
          "Christ is not a surname.",
        ],
      },
      {
        title: "Messiah",
        paragraphs: [
          "Messiah comes from a Hebrew word meaning Anointed One.",
          "The Greek equivalent is Christos.",
        ],
      },
      {
        title: "Gospel",
        paragraphs: [
          "Gospel means good news.",
          "It may refer to the Christian message about Jesus Christ or to one of the four New Testament Gospels.",
        ],
      },
      {
        title: "Disciple",
        paragraphs: [
          "A disciple is a learner or follower.",
          "The term applies broadly to those who follow Jesus Christ.",
        ],
      },
      {
        title: "Apostle",
        paragraphs: [
          "An apostle is one who is sent.",
          "The term is especially associated with Christ’s chosen witnesses and missionaries.",
        ],
      },
      {
        title: "Church",
        paragraphs: [
          "Church may refer to a building used for Christian worship.",
          "With a capital C, Church may also refer to the Christian community.",
        ],
      },
      {
        title: "Common Mistake",
        type: "scenario",
        paragraphs: [
          "A specialist explains that Christianity began when Jesus founded a building called the Church.",
          "This is misleading. The Church first refers to the community of believers; dedicated buildings developed later.",
        ],
      },
      {
        title: "How to Explain It",
        type: "epoch",
        quote:
          "Christianity is centered on Jesus Christ. The Gospel is the good news about Him. His disciples followed Him, and His Apostles were sent to carry that message to others.",
      },
    ],
    keyTakeaways: [
      "Christ means Messiah or Anointed One.",
      "Gospel means good news.",
      "A disciple follows; an Apostle is sent.",
      "Church may mean both community and building.",
    ],
    reviewQuestions: [
      {
        question: "What does the title Christ mean?",
        answer:
          "It means Anointed One and is the Greek equivalent of Messiah.",
      },
      {
        question:
          "What is the difference between a disciple and an Apostle?",
        answer:
          "A disciple is a follower or learner. An Apostle is one who is sent with a mission and is especially associated with Christ’s chosen witnesses.",
      },
    ],
  },
  {
    id: "church-buildings",
    number: 3,
    title: "Churches, Cathedrals, Basilicas, and Shrines",
    shortTitle: "Sacred Buildings",
    description:
      "Distinguish the principal types and titles of Christian sacred buildings.",
    estimatedMinutes: 32,
    icon: Church,
    objectives: [
      "Distinguish between church, cathedral, basilica, shrine, sanctuary, and chapel.",
      "Explain each term simply to pilgrims.",
      "Avoid describing every major church as a cathedral.",
    ],
    sections: [
      {
        title: "Church",
        paragraphs: [
          "A church is a building dedicated to Christian worship.",
          "The term may apply broadly to many different places of worship.",
        ],
      },
      {
        title: "Cathedral",
        paragraphs: [
          "A cathedral is the principal church of a bishop.",
          "Its name comes from cathedra, meaning the bishop’s official seat.",
          "A cathedral is not defined by size.",
        ],
      },
      {
        title: "Basilica",
        paragraphs: [
          "In the Catholic Church, a basilica is a church granted special status because of its historical, spiritual, architectural, or liturgical importance.",
          "A basilica may also be a cathedral, but the terms describe different things.",
        ],
      },
      {
        title: "Shrine",
        paragraphs: [
          "A shrine is a sacred place associated with a saint, relic, apparition, miracle, biblical event, or established devotion.",
          "Shrines attract pilgrims for prayer and spiritual purpose.",
        ],
      },
      {
        title: "Sanctuary",
        paragraphs: [
          "Sanctuary may refer to the sacred area around the altar.",
          "In some contexts, it may also refer to an entire holy place or pilgrimage center.",
        ],
      },
      {
        title: "Chapel",
        paragraphs: [
          "A chapel is a smaller place of Christian worship.",
          "It may be located inside a church, hospital, school, monastery, airport, cemetery, or private institution.",
        ],
      },
      {
        title: "Frequently Confused Terms",
        bullets: [
          "A cathedral is defined by the bishop’s seat.",
          "A basilica is defined by special status.",
          "A shrine is defined by devotion or pilgrimage significance.",
          "A chapel is usually smaller and may serve a particular community or purpose.",
          "One building may hold more than one title.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "Do not say a church is a cathedral because it is large or impressive. Explain the title accurately.",
      },
    ],
    keyTakeaways: [
      "Cathedral and basilica are not synonyms.",
      "A shrine is connected with devotion and pilgrimage.",
      "A chapel is generally a smaller worship space.",
      "One church can be both cathedral and basilica.",
    ],
    reviewQuestions: [
      {
        question: "What makes a church a cathedral?",
        answer:
          "It is the principal church of a bishop and contains the bishop’s official seat, the cathedra.",
      },
      {
        question:
          "Can a basilica also be a cathedral?",
        answer:
          "Yes. Basilica describes special status, while cathedral describes the bishop’s principal church.",
      },
    ],
  },
  {
    id: "church-leadership",
    number: 4,
    title: "Christian Leadership and Ministry",
    shortTitle: "Leadership",
    description:
      "Understand common terms for clergy, religious life, and Church leadership.",
    estimatedMinutes: 35,
    icon: Users,
    objectives: [
      "Distinguish common clergy and religious titles.",
      "Use respectful forms of address.",
      "Understand that titles differ among Christian traditions.",
    ],
    sections: [
      {
        title: "Pope",
        paragraphs: [
          "The Pope is the Bishop of Rome and the spiritual leader of the Catholic Church.",
          "Catholics regard him as the successor of St. Peter.",
        ],
      },
      {
        title: "Patriarch",
        paragraphs: [
          "A patriarch is a senior bishop leading an ancient or important ecclesiastical jurisdiction.",
          "The title is used in Eastern Orthodox, Oriental Orthodox, and Eastern Catholic traditions.",
        ],
      },
      {
        title: "Cardinal",
        paragraphs: [
          "A cardinal is a senior Catholic churchman appointed by the Pope.",
          "Cardinals advise the Pope and elect a new Pope when the See of Rome becomes vacant.",
        ],
      },
      {
        title: "Bishop and Archbishop",
        paragraphs: [
          "A bishop oversees a diocese.",
          "An archbishop usually leads an archdiocese or holds senior responsibility.",
        ],
      },
      {
        title: "Priest",
        paragraphs: [
          "A priest is ordained for sacramental, pastoral, liturgical, and teaching ministry.",
          "Terminology and responsibilities differ among Christian traditions.",
        ],
      },
      {
        title: "Deacon",
        paragraphs: [
          "A deacon is ordained for service, proclamation, charity, and liturgical ministry.",
          "The exact role differs among traditions.",
        ],
      },
      {
        title: "Monk and Nun",
        paragraphs: [
          "A monk is a man living a monastic religious life.",
          "A nun is a woman living a consecrated religious life, often within a cloistered or monastic community.",
        ],
      },
      {
        title: "Friar",
        paragraphs: [
          "A friar belongs to a mendicant religious order and often carries out active ministry among the public.",
          "Not every monk is a friar, and not every friar is a monk in the strict sense.",
        ],
      },
      {
        title: "Abbot and Abbess",
        paragraphs: [
          "An abbot leads an abbey or monastic community of men.",
          "An abbess leads an abbey or monastic community of women.",
        ],
      },
      {
        title: "Respectful Communication",
        type: "epoch",
        bullets: [
          "Use the title preferred by the person or institution.",
          "Confirm unfamiliar titles.",
          "Avoid assuming that every clergyman is a priest.",
          "Follow local customs.",
          "When uncertain, communicate respectfully and ask.",
        ],
      },
    ],
    keyTakeaways: [
      "Church leadership titles describe different responsibilities.",
      "Titles vary among traditions.",
      "Monk, friar, and priest are not interchangeable.",
      "Respectful forms of address should be confirmed.",
    ],
    reviewQuestions: [
      {
        question: "What is the role of a bishop?",
        answer:
          "A bishop provides spiritual, pastoral, sacramental, and administrative oversight of a diocese.",
      },
      {
        question:
          "What is the difference between a monk and a friar?",
        answer:
          "A monk is associated primarily with monastic community life, while a friar belongs to a mendicant order and often carries out active public ministry.",
      },
    ],
  },
  {
    id: "sacred-space-architecture",
    number: 5,
    title: "Sacred Space and Church Architecture",
    shortTitle: "Architecture",
    description:
      "Identify the principal parts of Christian churches and understand their function.",
    estimatedMinutes: 35,
    icon: Landmark,
    objectives: [
      "Identify major architectural terms.",
      "Explain how sacred space supports worship.",
      "Recognize important Eastern and Western church features.",
    ],
    sections: [
      {
        title: "Nave",
        paragraphs: [
          "The nave is the main area of the church where the congregation gathers.",
        ],
      },
      {
        title: "Narthex",
        paragraphs: [
          "The narthex is the entrance or vestibule area of a church.",
        ],
      },
      {
        title: "Sanctuary",
        paragraphs: [
          "The sanctuary is the sacred area surrounding the altar.",
        ],
      },
      {
        title: "Apse",
        paragraphs: [
          "The apse is the curved or polygonal end section of a church, often behind the altar.",
        ],
      },
      {
        title: "Transept",
        paragraphs: [
          "The transept crosses the main body of many churches, creating a cross-shaped plan.",
        ],
      },
      {
        title: "Sacristy",
        paragraphs: [
          "The sacristy is the room where clergy prepare and where vestments and sacred vessels are stored.",
        ],
      },
      {
        title: "Crypt",
        paragraphs: [
          "A crypt is a chamber beneath or near a church, often containing tombs, relics, chapels, or memorials.",
        ],
      },
      {
        title: "Cloister",
        paragraphs: [
          "A cloister is a covered walkway surrounding a courtyard, commonly found in monasteries and abbeys.",
        ],
      },
      {
        title: "Iconostasis",
        paragraphs: [
          "The iconostasis is a screen or wall of icons separating the sanctuary from the nave in many Eastern Christian churches.",
        ],
      },
      {
        title: "Cathedra",
        paragraphs: [
          "The cathedra is the official seat of the bishop and gives the cathedral its name.",
        ],
      },
      {
        title: "How to Explain Architecture",
        type: "epoch",
        quote:
          "Explain what the space is used for before explaining the architectural term.",
      },
      {
        title: "Operational Awareness",
        type: "scenario",
        paragraphs: [
          "A historic church includes steep crypt stairs, limited seating, uneven floors, and restricted coach access.",
          "The specialist should connect architectural knowledge with accessibility and timing.",
        ],
      },
    ],
    keyTakeaways: [
      "Church architecture supports worship and community.",
      "The nave is the main congregational space.",
      "The sanctuary surrounds the altar.",
      "The iconostasis is important in Eastern churches.",
      "Architecture affects accessibility and operations.",
    ],
    reviewQuestions: [
      {
        question: "What is the nave?",
        answer:
          "The principal area of the church where the congregation gathers.",
      },
      {
        question: "What is an iconostasis?",
        answer:
          "A screen or wall of icons separating the sanctuary from the nave in many Eastern churches.",
      },
    ],
  },
  {
    id: "sacred-objects",
    number: 6,
    title: "Sacred Objects and Liturgical Vessels",
    shortTitle: "Sacred Objects",
    description:
      "Recognize important sacred objects used in Christian worship.",
    estimatedMinutes: 35,
    icon: ScrollText,
    objectives: [
      "Identify common sacred objects.",
      "Explain their purpose accurately.",
      "Avoid confusing similar terms.",
    ],
    sections: [
      {
        title: "Altar",
        paragraphs: [
          "The altar is the sacred table used for the celebration of the Eucharist.",
        ],
      },
      {
        title: "Ambo and Lectern",
        paragraphs: [
          "An ambo is a designated place for proclaiming Scripture.",
          "A lectern is a reading stand and may have broader uses.",
        ],
      },
      {
        title: "Tabernacle",
        paragraphs: [
          "In Catholic churches, the tabernacle is the secure place where the consecrated Eucharist is reserved.",
        ],
      },
      {
        title: "Chalice",
        paragraphs: [
          "A chalice is the cup used for the wine during the Eucharistic celebration.",
        ],
      },
      {
        title: "Paten",
        paragraphs: [
          "A paten is the plate used to hold the Eucharistic bread or host.",
        ],
      },
      {
        title: "Ciborium",
        paragraphs: [
          "A ciborium is a covered vessel used to hold consecrated hosts.",
        ],
      },
      {
        title: "Monstrance",
        paragraphs: [
          "A monstrance is a vessel used in Catholic worship to display the consecrated host during Eucharistic Adoration or Benediction.",
        ],
      },
      {
        title: "Thurible",
        paragraphs: [
          "A thurible is the vessel in which incense is burned during worship.",
        ],
      },
      {
        title: "Baptismal Font",
        paragraphs: [
          "The baptismal font holds water used in the sacrament or rite of Baptism.",
        ],
      },
      {
        title: "Crucifix and Cross",
        paragraphs: [
          "A cross represents the instrument of Christ’s crucifixion.",
          "A crucifix includes an image of the body of Christ.",
        ],
      },
      {
        title: "Common Mistake",
        type: "scenario",
        paragraphs: [
          "A specialist calls every covered Eucharistic vessel a chalice.",
          "The correct term may be ciborium, depending on its purpose.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "Sacred objects should be explained by their purpose within worship, not merely by their appearance.",
      },
    ],
    keyTakeaways: [
      "Sacred vessels have distinct liturgical purposes.",
      "A cross and a crucifix are not identical.",
      "A tabernacle reserves the Eucharist in Catholic churches.",
      "A monstrance is used for Eucharistic display.",
    ],
    reviewQuestions: [
      {
        question: "What is a chalice?",
        answer:
          "The sacred cup used for wine during the Eucharistic celebration.",
      },
      {
        question:
          "What is the difference between a cross and a crucifix?",
        answer:
          "A cross shows the cross itself. A crucifix includes the figure of the crucified Christ.",
      },
    ],
  },
  {
    id: "relics-saints-devotion",
    number: 7,
    title: "Saints, Relics, and Devotion",
    shortTitle: "Saints & Relics",
    description:
      "Understand key terminology connected with saints, relics, canonization, and Christian devotion.",
    estimatedMinutes: 35,
    icon: ShieldCheck,
    objectives: [
      "Explain terms connected with saints and relics.",
      "Distinguish worship from veneration.",
      "Use responsible language about authenticity and tradition.",
    ],
    sections: [
      {
        title: "Saint",
        paragraphs: [
          "A saint is a holy person belonging to God.",
          "In Catholic and Orthodox usage, the title commonly refers to a Christian formally recognized for holiness, martyrdom, or faithful witness.",
        ],
      },
      {
        title: "Martyr",
        paragraphs: [
          "A martyr is a person who dies rather than deny the Christian faith.",
          "The word means witness.",
        ],
      },
      {
        title: "Canonization",
        paragraphs: [
          "Canonization is the formal recognition in the Catholic Church that a person is a saint.",
        ],
      },
      {
        title: "Beatification",
        paragraphs: [
          "Beatification is a formal Catholic recognition that permits limited public veneration of a person known as Blessed.",
        ],
      },
      {
        title: "Relic",
        paragraphs: [
          "A relic is a physical object connected with Christ, a saint, or a holy person.",
        ],
      },
      {
        title: "Reliquary",
        paragraphs: [
          "A reliquary is the container that preserves or displays a relic.",
        ],
      },
      {
        title: "Veneration",
        paragraphs: [
          "Veneration is honor shown to saints, sacred images, or relics.",
          "It is not the worship given to God.",
        ],
      },
      {
        title: "Intercession",
        paragraphs: [
          "Intercession is prayer offered on behalf of another person.",
          "Catholic and Orthodox Christians may ask saints to pray for them.",
        ],
      },
      {
        title: "Responsible Language",
        type: "epoch",
        quote:
          "Christians worship God. Saints are honored as faithful witnesses, and their prayers may be requested according to the tradition of the group.",
      },
      {
        title: "Authenticity",
        type: "scenario",
        paragraphs: [
          "Some relics have strong historical documentation. Others depend largely on ancient tradition.",
          "The specialist should not make stronger claims than the evidence supports.",
        ],
      },
    ],
    keyTakeaways: [
      "Relic and reliquary are different.",
      "Worship and veneration are different.",
      "Canonization and beatification are formal Catholic terms.",
      "Authenticity claims should be explained responsibly.",
    ],
    reviewQuestions: [
      {
        question: "What is a reliquary?",
        answer:
          "A container used to preserve or display a relic.",
      },
      {
        question:
          "What is the difference between worship and veneration?",
        answer:
          "Worship is directed to God. Veneration is honor shown to saints or sacred objects.",
      },
    ],
  },
  {
    id: "sacred-art-symbols",
    number: 8,
    title: "Icons, Sacred Art, and Christian Symbols",
    shortTitle: "Art & Symbols",
    description:
      "Recognize key forms of Christian art and commonly encountered symbols.",
    estimatedMinutes: 38,
    icon: Eye,
    objectives: [
      "Distinguish icons, frescoes, mosaics, and statues.",
      "Recognize common Christian symbols.",
      "Explain sacred art as Christian teaching and memory.",
    ],
    sections: [
      {
        title: "Icon",
        paragraphs: [
          "An icon is a sacred image, particularly important in Orthodox and Eastern Christian traditions.",
          "It is understood as more than decoration and is associated with worship, theology, and devotion.",
        ],
      },
      {
        title: "Fresco",
        paragraphs: [
          "A fresco is a painting made on fresh, wet plaster.",
        ],
      },
      {
        title: "Mosaic",
        paragraphs: [
          "A mosaic is created from small pieces of glass, stone, ceramic, or other material.",
        ],
      },
      {
        title: "Statue",
        paragraphs: [
          "A statue is a three-dimensional representation of Christ, the Virgin Mary, a saint, or another sacred subject.",
        ],
      },
      {
        title: "Common Christian Symbols",
        bullets: [
          "Cross: Christ’s crucifixion and victory.",
          "Chi-Rho: early monogram of Christ.",
          "Alpha and Omega: Christ as beginning and end.",
          "Ichthys or fish: early Christian symbol.",
          "Dove: Holy Spirit and peace.",
          "Lamb: Christ as the Lamb of God.",
          "Anchor: hope and steadfast faith.",
          "Keys: St. Peter.",
          "Sword: St. Paul.",
          "Shell: St. James and pilgrimage.",
          "Lily: purity and often the Virgin Mary or St. Joseph.",
          "Crown of thorns: the Passion of Christ.",
        ],
      },
      {
        title: "How to Read Sacred Art",
        bullets: [
          "Identify the central figure.",
          "Observe symbols and attributes.",
          "Notice gestures, colors, inscriptions, and surroundings.",
          "Connect the image with Scripture or a saint’s life.",
          "Explain the spiritual message.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "Do not only describe what pilgrims see. Explain what the artist wanted Christians to remember.",
      },
    ],
    keyTakeaways: [
      "Icons have a sacred theological role.",
      "Fresco and mosaic describe different techniques.",
      "Symbols help identify saints and doctrines.",
      "Sacred art communicates Christian memory and teaching.",
    ],
    reviewQuestions: [
      {
        question: "What is the difference between a fresco and a mosaic?",
        answer:
          "A fresco is painted on wet plaster, while a mosaic is assembled from small pieces of material.",
      },
      {
        question:
          "Which symbol is commonly associated with St. Peter?",
        answer:
          "Keys.",
      },
    ],
  },
  {
    id: "worship-liturgy-pilgrimage",
    number: 9,
    title: "Liturgy, Worship, and Pilgrimage Terms",
    shortTitle: "Worship Terms",
    description:
      "Understand common worship, devotion, and pilgrimage vocabulary.",
    estimatedMinutes: 40,
    icon: Languages,
    objectives: [
      "Explain common liturgical and devotional terms.",
      "Understand how terminology differs among traditions.",
      "Use correct language when arranging worship.",
    ],
    sections: [
      {
        title: "Liturgy",
        paragraphs: [
          "Liturgy is the structured public worship of the Church.",
        ],
      },
      {
        title: "Mass",
        paragraphs: [
          "Mass is the principal Eucharistic celebration of the Catholic Church and some Western Christian traditions.",
        ],
      },
      {
        title: "Divine Liturgy",
        paragraphs: [
          "Divine Liturgy is the principal Eucharistic worship of Orthodox and many Eastern Catholic Churches.",
        ],
      },
      {
        title: "Eucharist",
        paragraphs: [
          "The Eucharist is the Christian sacrament or sacred rite centered on bread and wine in remembrance of and participation in Christ.",
          "Theological understanding differs among traditions.",
        ],
      },
      {
        title: "Adoration",
        paragraphs: [
          "Adoration is worship directed to God.",
          "In Catholic usage, Eucharistic Adoration refers to prayer before the consecrated Eucharist.",
        ],
      },
      {
        title: "Benediction",
        paragraphs: [
          "Benediction is a Catholic devotion in which the congregation is blessed with the consecrated Eucharist.",
        ],
      },
      {
        title: "Rosary",
        paragraphs: [
          "The Rosary is a Catholic prayer devotion reflecting on events in the lives of Christ and the Virgin Mary.",
        ],
      },
      {
        title: "Novena",
        paragraphs: [
          "A novena is a period of prayer traditionally observed over nine days or occasions.",
        ],
      },
      {
        title: "Vespers and Compline",
        paragraphs: [
          "Vespers is evening prayer.",
          "Compline is prayer traditionally offered at the close of the day.",
        ],
      },
      {
        title: "Pilgrimage",
        paragraphs: [
          "A pilgrimage is a journey undertaken with spiritual purpose.",
        ],
      },
      {
        title: "Jubilee",
        paragraphs: [
          "A Jubilee is a special holy year or season of grace, prayer, pilgrimage, and renewal.",
        ],
      },
      {
        title: "Holy Door",
        paragraphs: [
          "A Holy Door is a specially designated church door opened during certain Jubilee observances in the Catholic Church.",
        ],
      },
      {
        title: "Apparition",
        paragraphs: [
          "An apparition is a reported supernatural appearance, often associated with Christ, the Virgin Mary, an angel, or a saint.",
          "Official recognition varies.",
        ],
      },
      {
        title: "Responsible Planning",
        type: "epoch",
        quote:
          "Use the terminology of the group’s own Christian tradition whenever possible.",
      },
      {
        title: "Common Mistake",
        type: "scenario",
        paragraphs: [
          "A specialist refers to an Orthodox Divine Liturgy as a Catholic Mass.",
          "Although both are Eucharistic worship, the correct terminology should be respected.",
        ],
      },
    ],
    keyTakeaways: [
      "Liturgy is public Christian worship.",
      "Mass and Divine Liturgy are not interchangeable terms.",
      "Devotions support prayer but are not identical to liturgy.",
      "Pilgrimage terminology should be used accurately.",
    ],
    reviewQuestions: [
      {
        question: "What is Vespers?",
        answer:
          "A traditional service of evening prayer.",
      },
      {
        question:
          "Why should Mass and Divine Liturgy not be treated as interchangeable terms?",
        answer:
          "Because they belong to distinct liturgical traditions and should be described using the terminology of the relevant Church.",
      },
    ],
  },
  {
    id: "review-assessment",
    number: 10,
    title: "Knowledge Review and Final Assessment",
    shortTitle: "Assessment",
    description:
      "Review the vocabulary and professional principles introduced throughout EA-005.",
    estimatedMinutes: 40,
    icon: GraduationCap,
    objectives: [
      "Review essential Christian terminology.",
      "Apply terms accurately in realistic pilgrimage situations.",
      "Demonstrate readiness for Destination Masterclasses.",
    ],
    sections: [
      {
        title: "Knowledge Review",
        type: "review",
        bullets: [
          "What is the difference between Christ and Messiah?",
          "What is the difference between a disciple and an Apostle?",
          "What makes a church a cathedral?",
          "What is the difference between a cathedral and a basilica?",
          "What is the difference between a shrine and a chapel?",
          "What is the role of a bishop?",
          "What is the difference between a monk and a friar?",
          "What are the nave, sanctuary, apse, and narthex?",
          "What is the difference between chalice, ciborium, and monstrance?",
          "What is the difference between a relic and a reliquary?",
          "What is the difference between worship and veneration?",
          "What is the difference between fresco and mosaic?",
          "What is an iconostasis?",
          "What is the difference between Mass and Divine Liturgy?",
          "What is a Jubilee?",
        ],
      },
      {
        title: "Case Study One",
        type: "scenario",
        paragraphs: [
          "A guide says that every large church is a cathedral and every important cathedral is a basilica.",
          "Correct the explanation using clear and respectful language.",
        ],
      },
      {
        title: "Case Study Two",
        type: "scenario",
        paragraphs: [
          "A pilgrim asks why Catholics worship saints and relics.",
          "Prepare a one-minute explanation using the terms worship, veneration, intercession, relic, and reliquary correctly.",
        ],
      },
      {
        title: "Case Study Three",
        type: "scenario",
        paragraphs: [
          "A mixed Christian group enters an Orthodox church with an iconostasis, frescoes, and relics.",
          "Prepare a respectful five-minute introduction suitable for Catholic, Orthodox, Protestant, and Anglican pilgrims.",
        ],
      },
      {
        title: "Practical Assignment",
        type: "review",
        bullets: [
          "Choose one major pilgrimage church.",
          "Identify its correct title or status.",
          "Identify its principal architectural features.",
          "List important sacred objects.",
          "Identify saints, relics, icons, frescoes, mosaics, or symbols.",
          "Prepare a glossary of fifteen terms connected with the site.",
          "Write a five-minute pilgrim explanation.",
        ],
      },
      {
        title: "Completion Standard",
        type: "epoch",
        quote:
          "EA-005 is complete when the learner can use Christian terminology accurately, explain it simply, and recognize when further expertise is required.",
      },
      {
        title: "Personal Reflection",
        type: "reflection",
        paragraphs: [
          "Which Christian terms did you misunderstand before this course?",
          "Which vocabulary is most important for your role?",
          "How will you continue expanding your knowledge?",
        ],
      },
    ],
    keyTakeaways: [
      "Accurate vocabulary protects trust.",
      "Terms should be explained in plain language.",
      "Christian traditions must be represented respectfully.",
      "The Encyclopedia should remain a lifelong reference.",
      "EA-005 prepares learners for advanced Destination Masterclasses.",
    ],
  },
];

const STORAGE_KEY = "epoch-academy-ea005-completed-lessons";
const ACTIVE_LESSON_KEY = "epoch-academy-ea005-active-lesson";

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

export default function ChristianEncyclopediaCoursePage() {
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
      console.error("Unable to load EA-005 progress:", error);
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
    () => Math.round((completedCount / lessons.length) * 100),
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
          Foundation Reference
        </span>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] bg-[#0B1F3A] px-8 py-11 text-white shadow-sm sm:px-12 sm:py-14">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#C9A24D]/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
                EA-005
              </p>

              <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
                The Epoch Christian Encyclopedia
              </h1>

              <p className="mt-5 text-xl text-[#E8D8AE]">
                The language of Christian pilgrimage.
              </p>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/70">
                Learn the Christian terms, symbols, sacred places,
                objects, traditions, architecture, worship, and
                pilgrimage vocabulary required to communicate with
                knowledge, accuracy, and respect.
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
                  <Library className="text-[#C9A24D]" size={19} />

                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/45">
                      Type
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      Reference
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
                EA-005 Lessons
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
            <Library className="mx-auto text-[#C9A24D]" size={26} />

            <blockquote className="mx-auto mt-5 max-w-3xl font-serif text-2xl italic leading-10 text-white/90">
              “To guide pilgrims confidently, first understand the
              language of Christianity.”
            </blockquote>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#C9A24D]">
              The Epoch Christian Encyclopedia
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}