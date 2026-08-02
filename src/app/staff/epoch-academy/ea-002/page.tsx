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
  Compass,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Lightbulb,
  ListChecks,
  MessageCircleQuestion,
  MessagesSquare,
  Route,
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
    id: "pilgrimage-specialist",
    number: 1,
    title: "The Epoch Pilgrimage Specialist",
    shortTitle: "The Specialist",
    description:
      "Understand the role, responsibility, knowledge, and professional character of an Epoch Pilgrimage Specialist.",
    estimatedMinutes: 18,
    icon: GraduationCap,
    objectives: [
      "Explain the difference between a travel consultant and a Pilgrimage Specialist.",
      "Understand the responsibilities carried by an Epoch specialist.",
      "Recognize the knowledge, judgement, and attitude required in the role.",
    ],
    sections: [
      {
        title: "More Than a Travel Consultant",
        paragraphs: [
          "A travel consultant can arrange transportation, hotels, meals, guides, and activities.",
          "An Epoch Pilgrimage Specialist must do all of those things while also understanding the spiritual purpose of the journey, the expectations of priests and pilgrims, and the Christian significance of the destinations being presented.",
          "This requires professional travel knowledge, Christian understanding, emotional intelligence, cultural respect, and careful operational judgement.",
        ],
      },
      {
        title: "The Specialist’s Responsibility",
        paragraphs: [
          "A priest may depend on the specialist to translate a spiritual vision into a workable journey.",
          "Pilgrims may depend on the specialist to provide accurate information, thoughtful pacing, suitable accommodation, and opportunities for prayer and worship.",
          "Operations teams depend on the specialist to provide complete, accurate, and realistic information.",
          "The specialist therefore becomes a bridge between spiritual purpose and professional delivery.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "An Epoch Pilgrimage Specialist understands both the journey of faith and the responsibility of professional travel.",
        paragraphs: [
          "Knowledge creates confidence, but humility protects credibility.",
          "A true specialist never pretends to know something they do not know. They research, verify, ask, and continue learning.",
        ],
      },
      {
        title: "What Failure Looks Like",
        type: "scenario",
        paragraphs: [
          "A salesperson recommends an attractive itinerary without asking about the group’s spiritual priorities, mobility, age profile, preferred Mass schedule, or previous pilgrimage experience.",
          "The itinerary may look impressive, but it may not serve the group. The failure began before the quotation was prepared: the specialist did not listen.",
        ],
      },
      {
        title: "Think About It",
        type: "reflection",
        paragraphs: [
          "Which areas of pilgrimage knowledge do you currently understand well?",
          "Which areas require further study before you can advise a priest confidently?",
          "How will you respond when someone asks a question you cannot answer?",
        ],
      },
    ],
    keyTakeaways: [
      "A Pilgrimage Specialist connects spiritual purpose with professional planning.",
      "The role requires knowledge, judgement, humility, and continuous learning.",
      "Listening is the first professional skill.",
      "Credibility is strengthened by honest uncertainty, not by guessing.",
    ],
    reviewQuestions: [
      {
        question:
          "What is the main difference between a travel consultant and a Pilgrimage Specialist?",
        answer:
          "A Pilgrimage Specialist combines travel expertise with an understanding of spiritual purpose, Christian heritage, clergy relationships, pilgrim needs, and the responsibilities of designing a journey of faith.",
      },
      {
        question: "Why is humility essential to the specialist’s role?",
        answer:
          "Because pilgrimage includes religious, historical, and operational subjects that require accuracy. A specialist must be willing to verify information rather than guess or present uncertain claims as fact.",
      },
    ],
  },
  {
    id: "understanding-pilgrimage",
    number: 2,
    title: "Understanding Pilgrimage",
    shortTitle: "Pilgrimage",
    description:
      "Learn why pilgrimage is different from ordinary tourism and how spiritual purpose should guide every journey.",
    estimatedMinutes: 20,
    icon: Church,
    objectives: [
      "Define Christian pilgrimage clearly.",
      "Explain how pilgrimage differs from tourism.",
      "Identify the spiritual, pastoral, educational, and communal purposes of pilgrimage.",
    ],
    sections: [
      {
        title: "What Is a Pilgrimage?",
        paragraphs: [
          "A Christian pilgrimage is a journey undertaken with spiritual purpose.",
          "Pilgrims may travel to pray, give thanks, seek renewal, study Scripture, honor a saint, visit a shrine, walk in the footsteps of the Apostles, or deepen their relationship with God.",
          "A pilgrimage may include history, culture, food, architecture, and fellowship, but these elements support the spiritual journey rather than replace it.",
        ],
      },
      {
        title: "Pilgrimage and Tourism",
        paragraphs: [
          "Tourism generally begins with the destination: Where would you like to go?",
          "Pilgrimage should begin with purpose: What do you hope your pilgrims will experience?",
          "The same city can be experienced differently by a tourist and a pilgrim. A tourist may admire a church as an architectural monument. A pilgrim may enter it as a place of prayer, memory, worship, and encounter.",
        ],
      },
      {
        title: "Common Pilgrimage Purposes",
        bullets: [
          "Prayer and spiritual renewal.",
          "Following the life of Jesus Christ.",
          "Walking in the footsteps of the Apostles.",
          "Marian devotion.",
          "Honoring saints and martyrs.",
          "Studying Scripture in its geographical context.",
          "Parish fellowship and community formation.",
          "Thanksgiving, healing, remembrance, or discernment.",
          "Christian heritage and education.",
        ],
      },
      {
        title: "The Epoch Principle",
        type: "epoch",
        quote:
          "The destination serves the pilgrimage. The pilgrimage does not serve the destination.",
        paragraphs: [
          "A famous site should never be included merely because it is famous.",
          "Every visit should support the purpose, rhythm, and profile of the group.",
        ],
      },
      {
        title: "Real-Life Scenario",
        type: "scenario",
        paragraphs: [
          "A group requests several additional attractions because they are nearby.",
          "Adding them would reduce prayer time, delay hotel arrival, and create an exhausting day.",
          "The specialist should explain the consequences and recommend a balanced programme rather than automatically adding every request.",
        ],
      },
    ],
    keyTakeaways: [
      "Pilgrimage is travel with spiritual purpose.",
      "Cultural and educational experiences should support the pilgrimage.",
      "More sites do not always create a better journey.",
      "Purpose, pacing, prayer, and people must remain connected.",
    ],
    reviewQuestions: [
      {
        question: "What makes a journey a pilgrimage?",
        answer:
          "Its spiritual purpose. Pilgrims travel not only to see places but to pray, reflect, worship, learn, remember, and grow in faith.",
      },
      {
        question:
          "Why should the spiritual purpose be identified before designing the itinerary?",
        answer:
          "Because the purpose determines which sites, activities, schedule, pace, worship opportunities, and pastoral elements are most suitable for the group.",
      },
    ],
  },
  {
    id: "understanding-pilgrims",
    number: 3,
    title: "Understanding Pilgrims",
    shortTitle: "Pilgrims",
    description:
      "Learn how to understand, prepare, and serve pilgrims with dignity, patience, compassion, and genuine care.",
    estimatedMinutes: 22,
    icon: Users,
    objectives: [
      "Recognize the diversity within a pilgrimage group.",
      "Understand the emotional and physical needs pilgrims may carry.",
      "Prepare journeys that respect age, mobility, expectations, and spiritual intention.",
    ],
    sections: [
      {
        title: "Every Pilgrim Carries a Story",
        paragraphs: [
          "Pilgrims do not arrive as identical passengers.",
          "One may be travelling in thanksgiving. Another may be grieving. Someone may be seeking healing, reconciliation, direction, or peace.",
          "Some pilgrims may have waited many years for the journey. Others may feel uncertain, anxious, or physically vulnerable.",
          "A specialist does not need to know every private intention, but must remember that the journey may carry deep personal meaning.",
        ],
      },
      {
        title: "Understanding the Group Profile",
        bullets: [
          "Age range.",
          "Mobility and accessibility needs.",
          "Medical or dietary requirements.",
          "Previous international travel experience.",
          "Previous pilgrimage experience.",
          "Language needs.",
          "Denominational background.",
          "Preferred level of religious content.",
          "Expected pace and daily schedule.",
          "Budget expectations.",
        ],
      },
      {
        title: "Pilgrim Dignity",
        paragraphs: [
          "Dignity is protected through thoughtful planning.",
          "Reasonable hotel arrival times, clear information, suitable rest stops, appropriate meals, accessible routes, patient communication, and realistic walking expectations are not minor details.",
          "They are expressions of care.",
        ],
      },
      {
        title: "Common Mistake",
        type: "scenario",
        paragraphs: [
          "A programme is designed around what a physically active tour manager can accomplish rather than what the average pilgrim can comfortably manage.",
          "The result may be technically possible but pastorally and physically unsuitable.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "Pilgrims are never treated as numbers, rooming-list entries, or seats on a coach.",
        paragraphs: [
          "Every pilgrim deserves clear preparation, respectful communication, and compassionate service.",
        ],
      },
      {
        title: "Think About It",
        type: "reflection",
        paragraphs: [
          "What information about a group would change the pace of an itinerary?",
          "How might a pilgrimage feel different for a first-time international traveller?",
          "Which operational decisions communicate dignity most clearly?",
        ],
      },
    ],
    keyTakeaways: [
      "Every group contains different physical, emotional, and spiritual needs.",
      "The itinerary must reflect the real profile of the pilgrims.",
      "Dignity is protected through preparation and realistic planning.",
      "Compassion should influence operations, not remain only a personal attitude.",
    ],
    reviewQuestions: [
      {
        question:
          "Why is understanding the group profile essential before designing a journey?",
        answer:
          "Because age, mobility, experience, spiritual expectations, budget, and other needs directly influence pace, hotel choice, transport, site selection, meals, and daily rhythm.",
      },
      {
        question: "How does operational planning protect pilgrim dignity?",
        answer:
          "By reducing unnecessary fatigue, providing clear information, respecting accessibility and dietary needs, allowing rest, and creating a journey suited to the actual people travelling.",
      },
    ],
  },
  {
    id: "working-with-priests",
    number: 4,
    title: "Working with Priests and Spiritual Leaders",
    shortTitle: "Priests",
    description:
      "Build respectful, trusted, and lasting relationships with priests, pastors, and spiritual leaders.",
    estimatedMinutes: 25,
    icon: HeartHandshake,
    objectives: [
      "Understand the spiritual leader’s role in the pilgrimage.",
      "Communicate with clergy respectfully and professionally.",
      "Support pastoral objectives without replacing spiritual leadership.",
    ],
    sections: [
      {
        title: "The Priest Is More Than the Group Leader",
        paragraphs: [
          "A priest may be the spiritual leader, pastoral guide, decision-maker, group organizer, and trusted representative of the parish.",
          "He may carry responsibility for the spiritual welfare of the pilgrims while also facing questions about cost, participation, communication, and parish expectations.",
          "The Epoch specialist supports that responsibility through preparation, listening, clarity, and reliable service.",
        ],
      },
      {
        title: "What Priests Need from Epoch",
        bullets: [
          "Respect for their spiritual leadership.",
          "Clear and timely communication.",
          "Honest information about what is and is not possible.",
          "Support with Mass and church arrangements.",
          "An itinerary aligned with pastoral goals.",
          "Reliable operational planning.",
          "Sensitivity to parish concerns and group dynamics.",
          "Confidence that pilgrims will be cared for.",
        ],
      },
      {
        title: "Professional Boundaries",
        paragraphs: [
          "The specialist supports the spiritual programme but does not replace the priest.",
          "The priest determines pastoral priorities, liturgical preferences, prayer, and spiritual leadership.",
          "The specialist advises on feasibility, timing, destination knowledge, operations, and group experience.",
        ],
      },
      {
        title: "How to Communicate",
        bullets: [
          "Use respectful forms of address.",
          "Listen without interrupting.",
          "Summarize your understanding before proposing solutions.",
          "Document important decisions.",
          "Avoid theological arguments.",
          "Never pressure a priest into a decision.",
          "Respond honestly when further research is required.",
          "Follow up when promised.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "We do not approach priests as sales targets. We approach them as spiritual leaders and long-term partners.",
      },
      {
        title: "Real-Life Scenario",
        type: "scenario",
        paragraphs: [
          "A priest requests daily Mass in famous churches, but several locations do not permit private celebrations at the requested time.",
          "The specialist should not promise what has not been confirmed. Instead, explain the limitations, research alternatives, and protect the spiritual rhythm of the programme.",
        ],
      },
    ],
    keyTakeaways: [
      "The priest carries spiritual and pastoral responsibility.",
      "Epoch supports, but never replaces, spiritual leadership.",
      "Trust grows through respectful, clear, and reliable communication.",
      "Clergy relationships should be developed for the long term.",
    ],
    reviewQuestions: [
      {
        question:
          "What is the difference between the role of the priest and the role of the specialist?",
        answer:
          "The priest leads the spiritual and pastoral dimension. The specialist designs and delivers the professional travel framework that supports those spiritual objectives.",
      },
      {
        question:
          "What should the specialist do when a requested church arrangement is uncertain?",
        answer:
          "Explain that confirmation is required, research the request, identify alternatives, and avoid making promises until the arrangement is formally confirmed.",
      },
    ],
  },
  {
    id: "discovery-conversation",
    number: 5,
    title: "The Discovery Conversation",
    shortTitle: "Discovery",
    description:
      "Learn how to understand the parish, group, spiritual purpose, expectations, and practical requirements before proposing a journey.",
    estimatedMinutes: 25,
    icon: MessagesSquare,
    objectives: [
      "Conduct a structured discovery conversation.",
      "Ask questions that reveal spiritual and practical priorities.",
      "Summarize the client’s needs before preparing a proposal.",
    ],
    sections: [
      {
        title: "The First Question",
        type: "epoch",
        quote:
          "What do you want your pilgrims to experience?",
        paragraphs: [
          "This question moves the conversation away from a list of destinations and toward the purpose of the pilgrimage.",
          "It encourages the priest or organizer to describe the desired spiritual outcome.",
        ],
      },
      {
        title: "Essential Discovery Questions",
        bullets: [
          "What is the main spiritual purpose of the journey?",
          "Who will lead the group spiritually?",
          "Which Christian tradition or parish community is travelling?",
          "What destinations or saints are especially meaningful?",
          "Is daily Mass expected?",
          "What is the estimated group size?",
          "What is the expected age and mobility profile?",
          "What travel dates or season are preferred?",
          "What approximate budget should guide the design?",
          "What level of hotel comfort is expected?",
          "Has the group travelled together before?",
          "Are there previous programmes the group liked or disliked?",
          "What would make this pilgrimage successful in the priest’s eyes?",
        ],
      },
      {
        title: "Listen for Priorities",
        paragraphs: [
          "Not every request carries equal importance.",
          "A priest may mention several destinations, but the real priority may be Marian devotion, St. Paul, Scripture study, parish fellowship, or a particular saint.",
          "The specialist should identify what is essential, what is preferred, and what is optional.",
        ],
      },
      {
        title: "Confirm Your Understanding",
        paragraphs: [
          "At the end of the conversation, summarize what you have understood.",
          "This allows misunderstandings to be corrected before time is invested in the itinerary and quotation.",
        ],
      },
      {
        title: "Real-Life Scenario",
        type: "scenario",
        paragraphs: [
          "A priest asks for Italy, France, Spain, and Portugal in twelve days.",
          "Rather than immediately building an exhausting itinerary, the specialist asks which spiritual themes matter most and explains the consequences of excessive distance and frequent hotel changes.",
        ],
      },
      {
        title: "Think About It",
        type: "reflection",
        paragraphs: [
          "Which discovery question is most likely to reveal the true purpose of a journey?",
          "How can you explain that a requested programme is too ambitious without sounding negative?",
        ],
      },
    ],
    keyTakeaways: [
      "Discovery comes before design.",
      "The best proposals are built from understanding, not assumptions.",
      "Priorities should be separated into essential, preferred, and optional.",
      "Summarizing the conversation prevents avoidable mistakes.",
    ],
    reviewQuestions: [
      {
        question:
          "Why should the specialist ask what pilgrims should experience before asking where they want to go?",
        answer:
          "Because the desired experience and spiritual purpose should guide destination selection, pace, worship, content, and the entire design of the journey.",
      },
      {
        question:
          "What should happen before an itinerary or quotation is prepared?",
        answer:
          "The specialist should conduct discovery, identify priorities and constraints, confirm understanding, and gather the essential operational information.",
      },
    ],
  },
  {
    id: "journey-design",
    number: 6,
    title: "Designing a Meaningful Pilgrimage",
    shortTitle: "Journey Design",
    description:
      "Transform spiritual purpose and group needs into a balanced, meaningful, and operationally realistic journey.",
    estimatedMinutes: 30,
    icon: Route,
    objectives: [
      "Apply spiritual purpose to itinerary design.",
      "Balance worship, learning, travel, rest, and fellowship.",
      "Recognize the risks of overcrowded programmes.",
    ],
    sections: [
      {
        title: "Begin with the Journey’s Purpose",
        paragraphs: [
          "An itinerary should not begin as a collection of attractions.",
          "It should begin with the spiritual theme, the group profile, the available time, and the realistic rhythm of travel.",
        ],
      },
      {
        title: "The Five Elements of Balance",
        bullets: [
          "Spiritual life: Mass, prayer, Scripture, reflection, and devotion.",
          "Christian knowledge: history, saints, archaeology, art, and tradition.",
          "Human rhythm: meals, rest, fellowship, and personal time.",
          "Operations: transport, opening hours, reservations, hotels, and guides.",
          "Group profile: age, mobility, experience, and expectations.",
        ],
      },
      {
        title: "Daily Rhythm",
        paragraphs: [
          "A well-designed day has a clear purpose and a natural rhythm.",
          "It avoids unnecessary backtracking, excessive hotel changes, unrealistic walking, late arrivals, and too many unrelated visits.",
          "The programme should give pilgrims time to experience a place rather than only photograph it.",
        ],
      },
      {
        title: "What to Protect",
        bullets: [
          "Daily Mass when requested and reasonably possible.",
          "Time for prayer and quiet reflection.",
          "Reasonable departure and arrival times.",
          "Meal quality and timing.",
          "Restroom and comfort stops.",
          "Adequate visit duration.",
          "Accessibility and safety.",
          "Time for the priest to lead the group.",
        ],
      },
      {
        title: "Common Design Failure",
        type: "scenario",
        paragraphs: [
          "An itinerary contains famous sites every hour from early morning until evening.",
          "It appears valuable because it includes many visits, but pilgrims become tired, Mass feels rushed, meals are delayed, and the group remembers exhaustion more than spiritual meaning.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "A meaningful pilgrimage is not measured by how many places were visited, but by how deeply the pilgrims were able to experience them.",
      },
    ],
    keyTakeaways: [
      "Purpose must shape the itinerary.",
      "A good pilgrimage balances spiritual, educational, human, and operational needs.",
      "Pacing is part of service.",
      "Every inclusion creates a time and energy cost.",
    ],
    reviewQuestions: [
      {
        question:
          "What are the five elements that should be balanced in pilgrimage design?",
        answer:
          "Spiritual life, Christian knowledge, human rhythm, professional operations, and the profile of the group.",
      },
      {
        question: "Why can an itinerary with more sites be less valuable?",
        answer:
          "Because excessive visits may create fatigue, rushed worship, delayed meals, limited reflection, and shallow experiences.",
      },
    ],
  },
  {
    id: "communication-integrity",
    number: 7,
    title: "Communication with Integrity",
    shortTitle: "Communication",
    description:
      "Communicate clearly, respectfully, accurately, and honestly throughout the pilgrimage process.",
    estimatedMinutes: 22,
    icon: ShieldCheck,
    objectives: [
      "Understand why communication is an operational control.",
      "Avoid assumptions, vague promises, and undocumented commitments.",
      "Communicate challenges without damaging trust.",
    ],
    sections: [
      {
        title: "Communication Is Part of the Service",
        paragraphs: [
          "Good communication is not separate from operations. It is one of the most important operational controls.",
          "Many failures begin with incomplete information, assumptions, delayed responses, undocumented decisions, or unclear responsibility.",
        ],
      },
      {
        title: "The Epoch Communication Standard",
        bullets: [
          "Be clear.",
          "Be accurate.",
          "Be respectful.",
          "Be timely.",
          "Document important decisions.",
          "Confirm what has been agreed.",
          "Do not hide problems.",
          "Do not exaggerate certainty.",
          "Do not promise what has not been confirmed.",
        ],
      },
      {
        title: "Saying No Professionally",
        paragraphs: [
          "Professional service does not mean agreeing to every request.",
          "When something is unsafe, unrealistic, unavailable, or harmful to the journey, the specialist should explain why and offer a constructive alternative.",
        ],
      },
      {
        title: "Responsible Language",
        bullets: [
          "Say: “We are verifying availability.”",
          "Do not say: “It should be fine.”",
          "Say: “The traditional site is associated with this event.”",
          "Do not say: “This is definitely the exact place,” unless it is supported.",
          "Say: “We recommend this option because…”",
          "Do not pressure the client with unsupported claims.",
        ],
      },
      {
        title: "Real-Life Scenario",
        type: "scenario",
        paragraphs: [
          "A church has not confirmed the requested Mass, but the proposal deadline is approaching.",
          "The specialist should identify the Mass as pending, explain the confirmation process, and prepare an alternative rather than presenting it as guaranteed.",
        ],
      },
    ],
    keyTakeaways: [
      "Clear communication prevents operational failure.",
      "Important decisions should be documented.",
      "Honesty protects long-term trust.",
      "A professional alternative is better than an unrealistic promise.",
    ],
    reviewQuestions: [
      {
        question: "Why is communication considered an operational control?",
        answer:
          "Because accurate, timely, documented communication prevents misunderstandings, missed services, incorrect expectations, and unclear responsibility.",
      },
      {
        question:
          "How should an unconfirmed service be presented in a proposal?",
        answer:
          "It should be clearly identified as pending or subject to confirmation, with an alternative considered where appropriate.",
      },
    ],
  },
  {
    id: "professional-judgement",
    number: 8,
    title: "Professional Judgement and Handover",
    shortTitle: "Judgement",
    description:
      "Learn how to make responsible decisions and transfer complete information from sales and design into operations.",
    estimatedMinutes: 25,
    icon: Handshake,
    objectives: [
      "Apply professional judgement when priorities conflict.",
      "Understand the importance of a complete operational handover.",
      "Identify information that must never remain only in one person’s memory.",
    ],
    sections: [
      {
        title: "Professional Judgement",
        paragraphs: [
          "Pilgrimage work frequently involves competing priorities.",
          "A lower price may reduce quality. A special visit may create a long day. A requested hotel may be unsuitable for the coach. A church arrangement may conflict with travel timing.",
          "Professional judgement means evaluating consequences and recommending the option that best protects the pilgrimage.",
        ],
      },
      {
        title: "The Decision Test",
        type: "epoch",
        bullets: [
          "Does this serve the spiritual purpose?",
          "Is it operationally realistic?",
          "Is it suitable for the group?",
          "Has the information been verified?",
          "What risks does the decision create?",
          "Is there a better alternative?",
          "Can the decision be explained honestly?",
        ],
      },
      {
        title: "The Handover",
        paragraphs: [
          "A successful sale can still become an operational failure if information is not transferred completely.",
          "The operations team should not be expected to reconstruct promises from emails, memories, or incomplete notes.",
        ],
      },
      {
        title: "Essential Handover Information",
        bullets: [
          "Group identity and spiritual purpose.",
          "Priest and decision-maker details.",
          "Confirmed dates, flights, and group size.",
          "Agreed itinerary and inclusions.",
          "Mass and church arrangements.",
          "Hotel standards and special requirements.",
          "Mobility, dietary, medical, or accessibility needs.",
          "Commercial terms and client commitments.",
          "Pending confirmations and unresolved risks.",
          "Important communication history.",
        ],
      },
      {
        title: "Common Failure",
        type: "scenario",
        paragraphs: [
          "A specialist verbally promises an additional service but does not include it in the contract, costing, or operational handover.",
          "The group expects the service, operations has no record of it, and trust is damaged.",
        ],
      },
      {
        title: "Think About It",
        type: "reflection",
        paragraphs: [
          "Which information is most likely to be lost during handover?",
          "What system can ensure that important promises never remain only in a conversation?",
        ],
      },
    ],
    keyTakeaways: [
      "Professional judgement considers consequences, not only immediate requests.",
      "The handover is a formal operational control.",
      "Promises must be documented and costed.",
      "Information should belong to the organization, not remain in one person’s memory.",
    ],
    reviewQuestions: [
      {
        question: "What is professional judgement?",
        answer:
          "The ability to evaluate purpose, suitability, risk, feasibility, quality, cost, and consequences before making or recommending a decision.",
      },
      {
        question: "Why is the handover essential?",
        answer:
          "Because it transfers the client’s expectations, confirmed services, risks, requirements, and commitments into operations so the journey can be delivered accurately.",
      },
    ],
  },
  {
    id: "review-assessment",
    number: 9,
    title: "Knowledge Review and Final Assessment",
    shortTitle: "Assessment",
    description:
      "Review the principles of EA-002 and demonstrate readiness to serve as an Epoch Pilgrimage Specialist.",
    estimatedMinutes: 30,
    icon: ListChecks,
    objectives: [
      "Review the essential responsibilities of a Pilgrimage Specialist.",
      "Apply the course principles to practical situations.",
      "Identify areas requiring further development.",
    ],
    sections: [
      {
        title: "Knowledge Review",
        type: "review",
        bullets: [
          "What distinguishes a Pilgrimage Specialist from a travel consultant?",
          "Why should pilgrimage design begin with spiritual purpose?",
          "What group information must be gathered during discovery?",
          "How should an Epoch specialist support a priest?",
          "What makes an itinerary balanced?",
          "Why should unconfirmed services never be presented as guaranteed?",
          "What information must be included in the operational handover?",
          "How does humility protect professional credibility?",
        ],
      },
      {
        title: "Case Study One",
        type: "scenario",
        paragraphs: [
          "A parish wants a twelve-day journey including Portugal, Spain, France, Switzerland, and Italy. Most pilgrims are over sixty-five, and the priest wants daily Mass and time for reflection.",
          "Explain how you would guide the discovery conversation and redesign the request responsibly.",
        ],
      },
      {
        title: "Case Study Two",
        type: "scenario",
        paragraphs: [
          "A supplier offers a lower hotel rate, but the hotel is outside the city, has limited coach access, and would cause a late arrival after a long day.",
          "Explain which Epoch principles should guide the recommendation.",
        ],
      },
      {
        title: "Case Study Three",
        type: "scenario",
        paragraphs: [
          "A priest asks whether a traditional site is the exact location of a biblical event. Historical evidence is uncertain.",
          "Write a respectful and accurate response.",
        ],
      },
      {
        title: "Completion Standard",
        type: "epoch",
        quote:
          "EA-002 is complete when the learner can listen carefully, identify spiritual purpose, advise honestly, design responsibly, and transfer every commitment into operations.",
      },
      {
        title: "Personal Reflection",
        type: "reflection",
        paragraphs: [
          "Which responsibility of the Pilgrimage Specialist do you find most demanding?",
          "Which skill will you develop next?",
          "How will you earn the confidence of priests, pilgrims, colleagues, and partners?",
        ],
      },
    ],
    keyTakeaways: [
      "A Pilgrimage Specialist listens before proposing.",
      "Spiritual purpose and group profile guide the design.",
      "Integrity is more important than a quick sale.",
      "Professional responsibility continues from discovery through handover.",
      "Learning is a permanent part of the role.",
    ],
  },
];

const STORAGE_KEY = "epoch-academy-ea002-completed-lessons";
const ACTIVE_LESSON_KEY = "epoch-academy-ea002-active-lesson";

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
          <p
            key={paragraph}
            className="mt-5 leading-8 text-white/75"
          >
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
            <p
              key={paragraph}
              className="leading-8 text-slate-700"
            >
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
          <HeartHandshake className="text-[#0B1F3A]" size={21} />

          <h3 className="font-serif text-2xl text-[#0B1F3A]">
            {section.title}
          </h3>
        </div>

        <div className="mt-5 space-y-4">
          {section.paragraphs?.map((paragraph) => (
            <p
              key={paragraph}
              className="leading-8 text-slate-700"
            >
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
          <p
            key={paragraph}
            className="mt-5 leading-8 text-slate-700"
          >
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

export default function EpochPilgrimageSpecialistCoursePage() {
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
      console.error("Unable to load EA-002 progress:", error);
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
      Math.round(
        (completedCount / lessons.length) * 100
      ),
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
                EA-002
              </p>

              <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
                The Epoch Pilgrimage Specialist
              </h1>

              <p className="mt-5 text-xl text-[#E8D8AE]">
                Developing professionals who understand pilgrimage.
              </p>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/70">
                Learn how to understand pilgrimage, serve pilgrims,
                work with priests, conduct discovery conversations,
                design meaningful journeys, communicate with
                integrity, and transfer every commitment into
                professional operations.
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
                EA-002 Lessons
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
            <Compass
              className="mx-auto text-[#C9A24D]"
              size={26}
            />

            <blockquote className="mx-auto mt-5 max-w-3xl font-serif text-2xl italic leading-10 text-white/90">
              “A Pilgrimage Specialist does not simply know where
              pilgrims travel. A Pilgrimage Specialist understands why
              the journey matters.”
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