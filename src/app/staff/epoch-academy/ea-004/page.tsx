"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Hotel,
  Lightbulb,
  ListChecks,
  MessageCircleQuestion,
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
    id: "sales-with-integrity",
    number: 1,
    title: "Sales with Integrity",
    shortTitle: "Sales with Integrity",
    description:
      "Understand the Epoch approach to ethical sales, trust, value, and long-term relationships.",
    estimatedMinutes: 22,
    icon: BriefcaseBusiness,
    objectives: [
      "Explain how Epoch approaches sales differently from ordinary travel selling.",
      "Understand why trust is more important than pressure.",
      "Present value honestly without making unsupported promises.",
    ],
    sections: [
      {
        title: "Sales Begins with Understanding",
        paragraphs: [
          "At Epoch, sales does not begin with a brochure, price, or destination.",
          "It begins with listening carefully to the priest, parish, group organizer, or partner.",
          "The specialist must understand the spiritual purpose, group profile, expectations, budget, preferred destinations, and practical limitations before presenting a recommendation.",
        ],
      },
      {
        title: "Selling a Pilgrimage",
        paragraphs: [
          "A pilgrimage should never be sold only through hotel categories, sightseeing lists, or price comparisons.",
          "The specialist should explain how the journey serves the parish, supports the spiritual leader, and creates opportunities for prayer, learning, fellowship, and reflection.",
        ],
      },
      {
        title: "The Epoch Sales Standard",
        bullets: [
          "Listen before proposing.",
          "Understand before quoting.",
          "Explain value clearly.",
          "Never hide important limitations.",
          "Never create false urgency.",
          "Never promise unconfirmed services.",
          "Recommend only what can be delivered responsibly.",
          "Build relationships for the long term.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "We do not persuade people to buy a pilgrimage they do not need. We help them design the pilgrimage they truly need.",
      },
      {
        title: "Common Sales Failure",
        type: "scenario",
        paragraphs: [
          "A specialist immediately sends a standard itinerary because the client mentioned Italy.",
          "No questions are asked about the priest, parish, spiritual theme, age profile, Mass expectations, previous travel experience, or budget.",
          "The proposal may look professional, but it is not truly designed for the group.",
        ],
      },
      {
        title: "Think About It",
        type: "reflection",
        paragraphs: [
          "What creates greater trust: answering immediately or researching carefully before answering?",
          "How can you explain value without criticizing another company?",
        ],
      },
    ],
    keyTakeaways: [
      "Ethical sales begins with discovery.",
      "The specialist sells meaning, suitability, and trust—not only services.",
      "Long-term relationships are more valuable than pressured decisions.",
      "Integrity protects both the client and Epoch.",
    ],
    reviewQuestions: [
      {
        question: "What is the first stage of the Epoch sales process?",
        answer:
          "Understanding the client through careful discovery before presenting an itinerary, destination, or quotation.",
      },
      {
        question: "Why should a specialist avoid unsupported promises?",
        answer:
          "Because unconfirmed promises create false expectations, operational risk, financial loss, and damage to trust.",
      },
    ],
  },
  {
    id: "presenting-value",
    number: 2,
    title: "Presenting Value and Building Trust",
    shortTitle: "Presenting Value",
    description:
      "Learn how to explain the value of an Epoch pilgrimage clearly, respectfully, and confidently.",
    estimatedMinutes: 22,
    icon: Handshake,
    objectives: [
      "Explain the difference between price and value.",
      "Present Epoch’s strengths without attacking competitors.",
      "Respond professionally to price concerns.",
    ],
    sections: [
      {
        title: "Price and Value Are Not the Same",
        paragraphs: [
          "Price is the amount paid.",
          "Value is the quality, suitability, reliability, knowledge, care, and experience received in return.",
          "A lower-priced journey may become expensive if it includes poor hotels, unsuitable pacing, missed services, weak guides, or inadequate support.",
        ],
      },
      {
        title: "What Creates Epoch Value?",
        bullets: [
          "Pilgrimage specialization.",
          "Christian destination knowledge.",
          "Thoughtful itinerary design.",
          "Respect for priests and spiritual leadership.",
          "Reliable operational planning.",
          "Careful supplier selection.",
          "Clear communication.",
          "Honest recommendations.",
          "Support before, during, and after the journey.",
        ],
      },
      {
        title: "How to Discuss Price",
        paragraphs: [
          "When a client says another quotation is lower, do not become defensive.",
          "Ask whether the services are directly comparable.",
          "Review hotel locations, meal arrangements, porterage, entrances, guides, tips, church arrangements, transportation standards, cancellation terms, and operational support.",
        ],
      },
      {
        title: "Responsible Comparison",
        type: "epoch",
        quote:
          "Do not compare Epoch only to another company. Compare each proposal to the experience you want your pilgrims to have.",
      },
      {
        title: "Real-Life Scenario",
        type: "scenario",
        paragraphs: [
          "A competing quotation is lower, but it uses hotels outside the city, includes fewer meals, excludes several entrances, and offers limited support.",
          "The Epoch specialist should explain the differences calmly and allow the client to make an informed decision.",
        ],
      },
    ],
    keyTakeaways: [
      "Value includes quality, suitability, reliability, and care.",
      "Price concerns should be answered with facts, not emotion.",
      "Competitors should be treated professionally.",
      "Clear comparison helps clients make informed decisions.",
    ],
    reviewQuestions: [
      {
        question: "What is the difference between price and value?",
        answer:
          "Price is the amount paid, while value includes the quality, suitability, reliability, service, knowledge, and overall experience received.",
      },
      {
        question:
          "How should a specialist respond when another quotation is cheaper?",
        answer:
          "Review whether the quotations include the same services, standards, locations, conditions, and support, then explain the differences objectively.",
      },
    ],
  },
  {
    id: "proposal-and-confirmation",
    number: 3,
    title: "Proposals, Quotations, and Confirmations",
    shortTitle: "Proposals",
    description:
      "Prepare clear, accurate, realistic, and professionally controlled proposals.",
    estimatedMinutes: 26,
    icon: FileCheck2,
    objectives: [
      "Understand the difference between proposed, requested, and confirmed services.",
      "Prepare quotations that clearly define inclusions and exclusions.",
      "Prevent misunderstandings through careful documentation.",
    ],
    sections: [
      {
        title: "The Purpose of a Proposal",
        paragraphs: [
          "A proposal should help the client understand the journey, its spiritual purpose, included services, pace, quality level, price, conditions, and next steps.",
          "It should be inspiring, but it must also be accurate and operationally realistic.",
        ],
      },
      {
        title: "Three Different Statuses",
        bullets: [
          "Proposed: recommended but not yet requested or confirmed.",
          "Requested: sent to a supplier or church and awaiting response.",
          "Confirmed: accepted in writing and recorded operationally.",
        ],
      },
      {
        title: "Every Proposal Should Clarify",
        bullets: [
          "Dates and duration.",
          "Destinations and routing.",
          "Hotel category and meal basis.",
          "Transportation.",
          "Guides and tour management.",
          "Entrances and activities.",
          "Mass or church arrangements.",
          "Included and excluded services.",
          "Minimum group size.",
          "Payment schedule.",
          "Cancellation conditions.",
          "Validity period.",
          "Services subject to confirmation.",
        ],
      },
      {
        title: "The Epoch Control",
        type: "epoch",
        quote:
          "A service is not confirmed because someone expects it. It is confirmed only when written confirmation exists.",
      },
      {
        title: "Common Failure",
        type: "scenario",
        paragraphs: [
          "A church request has been submitted, but the itinerary states that Mass is confirmed.",
          "The parish distributes the programme, and later the church declines the request.",
          "The mistake was not the church’s decision. The mistake was presenting a request as a confirmation.",
        ],
      },
    ],
    keyTakeaways: [
      "Proposals must inspire without creating false certainty.",
      "Requested and confirmed services are not the same.",
      "Inclusions, exclusions, and conditions must be clear.",
      "Written documentation protects every party.",
    ],
    reviewQuestions: [
      {
        question:
          "What is the difference between a requested and confirmed service?",
        answer:
          "A requested service is awaiting supplier approval. A confirmed service has been accepted in writing and recorded.",
      },
      {
        question: "Why should exclusions be clearly stated?",
        answer:
          "Because unclear exclusions create incorrect expectations, disputes, financial risk, and operational confusion.",
      },
    ],
  },
  {
    id: "operational-foundations",
    number: 4,
    title: "Operational Foundations",
    shortTitle: "Operations",
    description:
      "Understand the controls that turn a good proposal into a successfully delivered pilgrimage.",
    estimatedMinutes: 30,
    icon: ClipboardCheck,
    objectives: [
      "Identify the main stages of pilgrimage operations.",
      "Understand why details must be controlled systematically.",
      "Recognize the difference between planning and verification.",
    ],
    sections: [
      {
        title: "From Promise to Delivery",
        paragraphs: [
          "Operations is the process of converting every confirmed promise into a delivered service.",
          "A beautiful itinerary has no value if hotels, coaches, guides, meals, entrances, churches, documents, and timings are not controlled carefully.",
        ],
      },
      {
        title: "The Main Operational Stages",
        bullets: [
          "Review the signed agreement and client commitments.",
          "Confirm suppliers and services.",
          "Record payment deadlines and cancellation conditions.",
          "Prepare the operational itinerary.",
          "Collect rooming, passport, dietary, and mobility information.",
          "Confirm flights and transfer details.",
          "Arrange Masses and church visits.",
          "Prepare vouchers, lists, and tour-manager documents.",
          "Reconfirm before arrival.",
          "Support the group during operation.",
          "Review performance after completion.",
        ],
      },
      {
        title: "Planning Is Not Verification",
        paragraphs: [
          "A service may appear in the itinerary but still require confirmation.",
          "A supplier may have confirmed months earlier but still require reconfirmation before arrival.",
          "Professional operations therefore includes both planning and repeated verification.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "Never assume that yesterday’s confirmation will solve tomorrow’s operation without review.",
      },
      {
        title: "Operational Scenario",
        type: "scenario",
        paragraphs: [
          "A hotel was confirmed six months earlier. The operations team does not reconfirm room types, meal times, porterage, coach access, or the group’s arrival time.",
          "The booking exists, but the arrival experience is poor because important details were never verified.",
        ],
      },
    ],
    keyTakeaways: [
      "Operations converts commitments into delivered services.",
      "Every important service must be documented and controlled.",
      "Reconfirmation is essential.",
      "Small details strongly influence the group experience.",
    ],
    reviewQuestions: [
      {
        question: "What is the main purpose of operations?",
        answer:
          "To ensure that every confirmed commitment is prepared, verified, communicated, and delivered accurately.",
      },
      {
        question: "Why is reconfirmation necessary?",
        answer:
          "Because timings, rooming, access, menus, contacts, policies, and other details may change or remain incomplete after the original booking.",
      },
    ],
  },
  {
    id: "supplier-management",
    number: 5,
    title: "Supplier and Partner Management",
    shortTitle: "Suppliers",
    description:
      "Build reliable professional relationships with hotels, DMCs, coaches, guides, churches, and other partners.",
    estimatedMinutes: 25,
    icon: Hotel,
    objectives: [
      "Evaluate suppliers beyond price.",
      "Communicate requirements clearly.",
      "Protect long-term partnerships while maintaining standards.",
    ],
    sections: [
      {
        title: "Suppliers Help Deliver the Epoch Promise",
        paragraphs: [
          "Pilgrims may never know the name of the local DMC, coach company, hotel sales manager, guide, or restaurant coordinator.",
          "However, those partners directly influence the experience and reputation of Epoch.",
        ],
      },
      {
        title: "Supplier Evaluation",
        bullets: [
          "Reliability.",
          "Pilgrimage-group experience.",
          "Communication quality.",
          "Financial transparency.",
          "Safety and legal compliance.",
          "Hotel location and suitability.",
          "Coach quality and luggage capacity.",
          "Guide knowledge and attitude.",
          "Problem-solving ability.",
          "Consistency over time.",
        ],
      },
      {
        title: "Clear Supplier Briefing",
        bullets: [
          "Exact dates and service times.",
          "Group size and rooming requirements.",
          "Meal basis and dietary needs.",
          "Luggage expectations.",
          "Mobility concerns.",
          "Priest and worship requirements.",
          "Porterage.",
          "Coach access.",
          "Guide language.",
          "Emergency contacts.",
          "Billing and payment terms.",
        ],
      },
      {
        title: "Partnership and Accountability",
        paragraphs: [
          "A strong partnership does not mean accepting poor performance.",
          "Epoch should communicate respectfully, document problems, seek solutions, and review whether the supplier remains suitable.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "Treat suppliers as partners, but never allow familiarity to replace quality control.",
      },
    ],
    keyTakeaways: [
      "Supplier performance becomes part of the Epoch experience.",
      "Price alone is not a sufficient selection criterion.",
      "Clear briefing prevents avoidable failure.",
      "Professional relationships require both respect and accountability.",
    ],
    reviewQuestions: [
      {
        question: "Why should suppliers be evaluated beyond price?",
        answer:
          "Because reliability, safety, suitability, communication, quality, and problem-solving directly affect the pilgrimage and Epoch’s reputation.",
      },
      {
        question: "What is the purpose of a supplier briefing?",
        answer:
          "To ensure the supplier understands exactly what has been promised, required, timed, and expected.",
      },
    ],
  },
  {
    id: "quality-control",
    number: 6,
    title: "Quality Control and Documentation",
    shortTitle: "Quality Control",
    description:
      "Use checklists, documents, and review systems to prevent errors and preserve consistency.",
    estimatedMinutes: 28,
    icon: ListChecks,
    objectives: [
      "Understand why checklists protect quality.",
      "Identify the main operational documents.",
      "Recognize the importance of version control.",
    ],
    sections: [
      {
        title: "Quality Must Be Designed",
        paragraphs: [
          "Quality does not appear automatically because the team is experienced or well intentioned.",
          "It must be supported by systems, checklists, approvals, templates, and review points.",
        ],
      },
      {
        title: "Important Operational Documents",
        bullets: [
          "Signed agreement.",
          "Final itinerary.",
          "Supplier confirmations.",
          "Rooming list.",
          "Passport list.",
          "Flight list.",
          "Dietary and mobility list.",
          "Hotel and transport vouchers.",
          "Mass confirmations.",
          "Tour-manager instructions.",
          "Emergency contact sheet.",
          "Payment records.",
          "Final operational checklist.",
        ],
      },
      {
        title: "Version Control",
        paragraphs: [
          "A journey may have many itinerary versions.",
          "The final approved version must be clearly identified and shared with everyone who depends on it.",
          "Old versions should not remain in active use.",
        ],
      },
      {
        title: "The Four-Eyes Principle",
        type: "epoch",
        quote:
          "Important documents should be reviewed by another qualified person before release.",
        paragraphs: [
          "A second review can identify incorrect dates, names, flight times, hotel nights, room totals, missing services, and inconsistent wording.",
        ],
      },
      {
        title: "Common Failure",
        type: "scenario",
        paragraphs: [
          "The tour manager receives one itinerary, the guide receives another, and the client has a third version.",
          "Even if each version differs only slightly, confusion becomes inevitable.",
        ],
      },
    ],
    keyTakeaways: [
      "Quality depends on systems, not memory alone.",
      "Operational documents must be complete and consistent.",
      "Version control prevents confusion.",
      "A second review protects against avoidable mistakes.",
    ],
    reviewQuestions: [
      {
        question: "What is the purpose of version control?",
        answer:
          "To ensure every stakeholder works from the same current and approved information.",
      },
      {
        question: "What is the four-eyes principle?",
        answer:
          "It means an important document is reviewed by a second qualified person before being issued or used.",
      },
    ],
  },
  {
    id: "service-excellence",
    number: 7,
    title: "Service Excellence and Pilgrim Care",
    shortTitle: "Service Excellence",
    description:
      "Create consistent, thoughtful, and compassionate service before, during, and after the pilgrimage.",
    estimatedMinutes: 26,
    icon: HeartHandshake,
    objectives: [
      "Understand service excellence from the pilgrim’s perspective.",
      "Recognize the importance of anticipation and preparation.",
      "Respond respectfully to individual needs.",
    ],
    sections: [
      {
        title: "What Is Service Excellence?",
        paragraphs: [
          "Service excellence is not luxury alone.",
          "It is the consistent experience of being respected, prepared, informed, supported, and cared for.",
          "A modest hotel with excellent organization may serve a group better than a luxurious hotel with poor access, weak meals, or unsuitable location.",
        ],
      },
      {
        title: "Service Before Departure",
        bullets: [
          "Clear preparation information.",
          "Accurate itinerary.",
          "Packing and dress guidance.",
          "Mobility and walking expectations.",
          "Documentation reminders.",
          "Emergency contact details.",
          "Realistic information about weather and schedule.",
        ],
      },
      {
        title: "Service During the Journey",
        bullets: [
          "Punctuality.",
          "Clear daily briefings.",
          "Respectful assistance.",
          "Clean and suitable transportation.",
          "Appropriate rest stops.",
          "Reasonable meal timing.",
          "Attention to elderly or vulnerable pilgrims.",
          "Coordination with the priest and tour manager.",
        ],
      },
      {
        title: "Service After the Journey",
        bullets: [
          "Thank the group and partners.",
          "Request feedback.",
          "Review incidents and lessons learned.",
          "Resolve outstanding issues.",
          "Preserve important information for future journeys.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "Service excellence means noticing what pilgrims may need before they are forced to ask.",
      },
      {
        title: "Think About It",
        type: "reflection",
        paragraphs: [
          "Which small service detail creates the greatest feeling of care?",
          "How can the team anticipate the needs of senior pilgrims?",
        ],
      },
    ],
    keyTakeaways: [
      "Service excellence is built through consistency and care.",
      "Preparation is part of service.",
      "Pilgrim dignity should guide decisions.",
      "The journey should be reviewed after completion.",
    ],
    reviewQuestions: [
      {
        question: "Is service excellence the same as luxury?",
        answer:
          "No. Service excellence means suitability, reliability, preparation, respectful care, and consistent delivery.",
      },
      {
        question: "Why is anticipation important?",
        answer:
          "Because identifying likely needs in advance prevents discomfort, confusion, delays, and avoidable requests.",
      },
    ],
  },
  {
    id: "problem-solving",
    number: 8,
    title: "Problem Solving and Service Recovery",
    shortTitle: "Problem Solving",
    description:
      "Respond calmly, honestly, and responsibly when services fail or unexpected problems arise.",
    estimatedMinutes: 30,
    icon: AlertTriangle,
    objectives: [
      "Apply a structured response to operational problems.",
      "Communicate incidents responsibly.",
      "Understand the purpose of service recovery.",
    ],
    sections: [
      {
        title: "Problems Will Occur",
        paragraphs: [
          "Weather changes, traffic, illness, flight disruption, supplier failure, church cancellations, rooming errors, lost luggage, and unexpected closures may affect a pilgrimage.",
          "Professional excellence is demonstrated not only by preventing problems but also by responding well when they occur.",
        ],
      },
      {
        title: "The Response Sequence",
        bullets: [
          "Protect safety first.",
          "Understand the facts.",
          "Inform the responsible people.",
          "Identify realistic alternatives.",
          "Communicate clearly with the priest or group leader.",
          "Take action.",
          "Document the incident.",
          "Review the root cause after the journey.",
        ],
      },
      {
        title: "How to Communicate a Problem",
        paragraphs: [
          "Do not hide the problem.",
          "Do not blame others in front of the client.",
          "Do not make promises before confirming the solution.",
          "Explain what happened, what is being done, and when the next update will be provided.",
        ],
      },
      {
        title: "Service Recovery",
        paragraphs: [
          "Service recovery means restoring trust after a failure.",
          "It may require an apology, correction, alternative service, reimbursement, follow-up, or another appropriate action depending on the situation.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "A problem handled honestly and professionally can strengthen trust. A problem hidden or ignored will damage it.",
      },
      {
        title: "Scenario",
        type: "scenario",
        paragraphs: [
          "The hotel has prepared fewer twin rooms than confirmed, and several pilgrims are waiting in the lobby.",
          "The team should remain calm, protect the pilgrims from unnecessary discussion, verify the rooming list, work directly with hotel management, keep the priest informed, and document the final solution.",
        ],
      },
    ],
    keyTakeaways: [
      "Safety comes first.",
      "Facts should be established before blame is assigned.",
      "Clear updates reduce anxiety.",
      "Every incident should produce a lesson.",
    ],
    reviewQuestions: [
      {
        question: "What is the first priority during an operational problem?",
        answer:
          "The safety and immediate welfare of the pilgrims.",
      },
      {
        question: "What is service recovery?",
        answer:
          "The process of correcting a failure and rebuilding trust through communication, action, apology, compensation, or another suitable response.",
      },
    ],
  },
  {
    id: "review-assessment",
    number: 9,
    title: "Knowledge Review and Final Assessment",
    shortTitle: "Assessment",
    description:
      "Review the sales, operations, quality, and service principles introduced throughout EA-004.",
    estimatedMinutes: 35,
    icon: GraduationCap,
    objectives: [
      "Review the essential controls of sales and operations.",
      "Apply the Epoch Standard to practical situations.",
      "Demonstrate readiness to continue to advanced Academy courses.",
    ],
    sections: [
      {
        title: "Knowledge Review",
        type: "review",
        bullets: [
          "How does Epoch approach sales differently from ordinary selling?",
          "What is the difference between price and value?",
          "What is the difference between proposed, requested, and confirmed services?",
          "Why is reconfirmation necessary?",
          "How should suppliers be evaluated?",
          "What is version control?",
          "What is the four-eyes principle?",
          "What does service excellence mean?",
          "What is the correct response sequence during a problem?",
          "How does service recovery protect trust?",
        ],
      },
      {
        title: "Case Study One",
        type: "scenario",
        paragraphs: [
          "A priest asks for a lower price. The only available reduction requires moving the group to hotels outside the city and removing several included meals.",
          "Explain how you would present the options honestly and protect the pilgrimage experience.",
        ],
      },
      {
        title: "Case Study Two",
        type: "scenario",
        paragraphs: [
          "A church service is still pending, but the client wants the final itinerary immediately.",
          "Explain how the service should be presented and what alternative planning should be completed.",
        ],
      },
      {
        title: "Case Study Three",
        type: "scenario",
        paragraphs: [
          "The coach is delayed, lunch is approaching, and the afternoon church visit has a fixed reservation time.",
          "Explain how you would evaluate the priorities, communicate, and adjust the programme.",
        ],
      },
      {
        title: "Practical Assignment",
        type: "review",
        bullets: [
          "Prepare a short pilgrimage proposal.",
          "Identify confirmed, requested, and proposed services.",
          "List the main operational risks.",
          "Prepare a supplier confirmation checklist.",
          "Create a pre-departure quality-control checklist.",
          "Explain how the Epoch Promise is protected throughout the process.",
        ],
      },
      {
        title: "Completion Standard",
        type: "epoch",
        quote:
          "EA-004 is complete when the learner can sell honestly, document clearly, operate systematically, solve problems responsibly, and serve pilgrims with genuine care.",
      },
      {
        title: "Personal Reflection",
        type: "reflection",
        paragraphs: [
          "Which operational control prevents the greatest risk in your role?",
          "Which part of service recovery do you find most difficult?",
          "What will you do differently after completing this course?",
        ],
      },
    ],
    keyTakeaways: [
      "Integrity connects sales, operations, and service.",
      "Every promise must be documented and delivered.",
      "Quality depends on systems, review, and accountability.",
      "Problems should be handled honestly and calmly.",
      "Service excellence protects the Epoch reputation.",
    ],
  },
];

const STORAGE_KEY = "epoch-academy-ea004-completed-lessons";
const ACTIVE_LESSON_KEY = "epoch-academy-ea004-active-lesson";

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
          <AlertTriangle className="text-[#0B1F3A]" size={21} />

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

export default function SalesOperationsServiceCoursePage() {
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
      console.error("Unable to load EA-004 progress:", error);
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
                EA-004
              </p>

              <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
                Sales, Operations & Service Excellence
              </h1>

              <p className="mt-5 text-xl text-[#E8D8AE]">
                Turning the Epoch Promise into professional delivery.
              </p>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/70">
                Learn how to sell with integrity, prepare accurate proposals,
                control operations, manage suppliers, protect quality, care for
                pilgrims, and respond responsibly when challenges arise.
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
                EA-004 Lessons
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
            <ShieldCheck
              className="mx-auto text-[#C9A24D]"
              size={26}
            />

            <blockquote className="mx-auto mt-5 max-w-3xl font-serif text-2xl italic leading-10 text-white/90">
              “Every promise creates an operational responsibility. Every
              responsibility must be fulfilled with integrity.”
            </blockquote>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#C9A24D]">
              The Epoch Standard
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}