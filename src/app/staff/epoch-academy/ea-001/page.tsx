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
  Circle,
  Clock3,
  Compass,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  ListChecks,
  MessageCircleQuestion,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

type LessonSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  quote?: string;
  type?: "standard" | "epoch" | "reflection" | "scenario" | "review";
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
  reviewQuestions?: {
    question: string;
    answer: string;
  }[];
};

const lessons: Lesson[] = [
  {
    id: "welcome-to-epoch",
    number: 1,
    title: "Welcome to Epoch",
    shortTitle: "Welcome to Epoch",
    description:
      "Discover why Epoch Journeys exists and what it means to become part of the Epoch Team.",
    estimatedMinutes: 15,
    icon: Compass,
    objectives: [
      "Understand why Epoch Journeys was founded.",
      "Recognize the difference between an ordinary travel company and a pilgrimage specialist.",
      "Understand the responsibility carried by every Epoch Team Member.",
    ],
    sections: [
      {
        title: "More Than a Travel Company",
        paragraphs: [
          "Epoch Journeys was not established simply to arrange hotels, transportation, guides, and entrance tickets.",
          "It was created to serve people during some of the most meaningful journeys of their lives.",
          "A pilgrimage may represent years of prayer, preparation, saving, and anticipation. Every pilgrim travels with a personal story, a spiritual intention, and an expectation that their journey will be treated with dignity and care.",
          "For this reason, every decision made by an Epoch Team Member matters.",
        ],
      },
      {
        title: "Our Responsibility",
        paragraphs: [
          "Selecting a hotel is not simply choosing accommodation. It is choosing where pilgrims will rest after demanding days of prayer, reflection, and discovery.",
          "Designing an itinerary is not simply arranging places on a map. It is creating a rhythm that allows pilgrims to worship, learn, reflect, and grow together.",
          "Communicating with a priest is not simply handling a client request. It is supporting the spiritual leader who has accepted responsibility for guiding his community.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "We are not in the travel business alone. We are in the business of serving pilgrims.",
        paragraphs: [
          "Professional operations are essential, but they are only the foundation.",
          "The deeper purpose of our work is to help create pilgrimages marked by faith, trust, understanding, and genuine human care.",
        ],
      },
      {
        title: "Think About It",
        type: "reflection",
        paragraphs: [
          "If every Epoch Team Member worked exactly as you do today, what kind of company would Epoch become?",
          "What can you do in your role to make every pilgrim feel respected, prepared, and cared for?",
        ],
      },
    ],
    keyTakeaways: [
      "Epoch exists to serve pilgrims, priests, parishes, and partners with integrity.",
      "Every operational detail influences the spiritual experience of the journey.",
      "Every Epoch Team Member is responsible for protecting the company’s reputation.",
      "Our work is not only a profession. It is a responsibility and a vocation of service.",
    ],
    reviewQuestions: [
      {
        question: "Why was Epoch Journeys established?",
        answer:
          "Epoch Journeys was established to create meaningful pilgrimages through professional planning, Christian understanding, integrity, and genuine care—not merely to arrange travel services.",
      },
      {
        question: "Why does every operational decision matter?",
        answer:
          "Every decision affects the pilgrim’s comfort, trust, understanding, and spiritual experience. Small operational details can strengthen or weaken the entire journey.",
      },
      {
        question: "What is the responsibility of every Epoch Team Member?",
        answer:
          "To serve with integrity, continue learning, protect the Epoch reputation, and ensure that every decision supports the purpose of the pilgrimage.",
      },
    ],
  },
  {
    id: "our-mission",
    number: 2,
    title: "Our Mission",
    shortTitle: "Our Mission",
    description:
      "Understand the purpose that guides every decision, relationship, and pilgrimage.",
    estimatedMinutes: 12,
    icon: Target,
    objectives: [
      "Understand the official mission of Epoch Journeys.",
      "Apply the mission to everyday professional decisions.",
      "Recognize the relationship between spiritual purpose and operational excellence.",
    ],
    sections: [
      {
        title: "The Mission of Epoch Journeys",
        type: "epoch",
        quote:
          "To create meaningful Christian pilgrimages through thoughtful planning, faithful service, destination expertise, and genuine care for every pilgrim.",
      },
      {
        title: "What the Mission Means",
        paragraphs: [
          "A mission is not a sentence that appears only on a website or in a company document.",
          "It is a practical standard for making decisions.",
          "When considering a hotel, itinerary, guide, supplier, or communication, an Epoch specialist should ask whether the decision supports a meaningful, respectful, and professionally delivered pilgrimage.",
        ],
      },
      {
        title: "Mission in Daily Work",
        bullets: [
          "Listen carefully before recommending a destination.",
          "Never promise a service that has not been confirmed.",
          "Protect opportunities for prayer, Mass, reflection, and fellowship.",
          "Communicate honestly when a request is not possible.",
          "Select suppliers who understand and respect pilgrimage groups.",
          "Review every journey from the perspective of the pilgrim.",
        ],
      },
      {
        title: "Real-Life Scenario",
        type: "scenario",
        paragraphs: [
          "A lower-priced hotel is available, but it requires a long transfer after an already demanding day.",
          "The Epoch mission requires us to consider more than price. We must consider rest, dignity, timing, group profile, and the effect on the following day’s pilgrimage experience.",
        ],
      },
      {
        title: "Think About It",
        type: "reflection",
        paragraphs: [
          "Which part of the Epoch mission has the greatest influence on your current role?",
          "How can the mission help you make a difficult decision when cost and quality conflict?",
        ],
      },
    ],
    keyTakeaways: [
      "The Epoch mission guides practical decisions.",
      "Thoughtful planning requires understanding the spiritual and human purpose of the journey.",
      "Price is important, but it must never be considered without quality, suitability, and pilgrim welfare.",
      "Faithful service includes honesty, preparation, and accountability.",
    ],
    reviewQuestions: [
      {
        question: "What is the mission of Epoch Journeys?",
        answer:
          "To create meaningful Christian pilgrimages through thoughtful planning, faithful service, destination expertise, and genuine care for every pilgrim.",
      },
      {
        question: "How should the mission influence supplier selection?",
        answer:
          "Suppliers should be evaluated not only by price but also by reliability, suitability, respect for pilgrimage groups, service quality, and their contribution to the overall journey.",
      },
    ],
  },
  {
    id: "our-vision",
    number: 3,
    title: "Our Vision",
    shortTitle: "Our Vision",
    description:
      "Explore the future Epoch Journeys is working to build.",
    estimatedMinutes: 10,
    icon: Sparkles,
    objectives: [
      "Understand the long-term vision of Epoch Journeys.",
      "Recognize how individual work contributes to institutional growth.",
      "Understand why knowledge preservation is essential.",
    ],
    sections: [
      {
        title: "The Vision",
        type: "epoch",
        quote:
          "To become one of the world’s most trusted and respected Christian pilgrimage specialists.",
      },
      {
        title: "Trust Before Size",
        paragraphs: [
          "Epoch does not measure success only by the number of groups operated, offices opened, or destinations offered.",
          "Growth is valuable only when the company continues to protect its philosophy, standards, relationships, and reputation.",
          "We seek to become trusted before becoming large.",
        ],
      },
      {
        title: "A Company That Can Continue",
        paragraphs: [
          "The Epoch Library, Academy, Standard, and Workspace exist to preserve knowledge and culture.",
          "The goal is to build a company that can continue delivering the same quality and values even when it can no longer depend entirely on the Founder.",
        ],
      },
      {
        title: "The Golden Question",
        type: "reflection",
        quote:
          "If Epoch could no longer rely on the Founder tomorrow, would our systems enable the team to continue delivering the same quality and the same values?",
      },
    ],
    keyTakeaways: [
      "Epoch seeks trust and respect before size.",
      "Growth must never weaken the company’s values.",
      "Knowledge must be documented, taught, and shared.",
      "Every team member helps build the future institution.",
    ],
    reviewQuestions: [
      {
        question: "What is the long-term vision of Epoch Journeys?",
        answer:
          "To become one of the world’s most trusted and respected Christian pilgrimage specialists.",
      },
      {
        question: "Why are the Epoch Academy and Workspace important?",
        answer:
          "They preserve institutional knowledge, standards, philosophy, and professional practices so the organization can continue consistently as it grows.",
      },
    ],
  },
  {
    id: "core-values",
    number: 4,
    title: "Our Core Values",
    shortTitle: "Core Values",
    description:
      "Learn the values that guide how Epoch thinks, decides, communicates, and serves.",
    estimatedMinutes: 18,
    icon: ShieldCheck,
    objectives: [
      "Identify the core values of Epoch Journeys.",
      "Understand how values guide professional conduct.",
      "Apply the values to real-life decisions.",
    ],
    sections: [
      {
        title: "Faith",
        paragraphs: [
          "Faith gives purpose to our work and reminds us that pilgrimage is more than travel.",
          "We serve people who may be seeking renewal, healing, thanksgiving, understanding, or a deeper relationship with God.",
        ],
      },
      {
        title: "Integrity",
        paragraphs: [
          "We tell the truth, communicate clearly, and never promise what cannot be delivered.",
          "Integrity requires honesty even when honesty is inconvenient.",
        ],
      },
      {
        title: "Excellence",
        paragraphs: [
          "Excellence is not perfection. It is the disciplined pursuit of better service, better preparation, and better decisions.",
          "It is achieved through thousands of thoughtful details.",
        ],
      },
      {
        title: "Respect",
        paragraphs: [
          "We respect pilgrims, priests, colleagues, suppliers, destinations, cultures, and Christian traditions.",
          "Respect is expressed through language, punctuality, preparation, patience, and professional conduct.",
        ],
      },
      {
        title: "Service",
        paragraphs: [
          "We do not ask only what is easiest for us. We ask what best serves the pilgrimage.",
          "Service requires humility, responsibility, and genuine care.",
        ],
      },
      {
        title: "Continuous Improvement",
        paragraphs: [
          "We learn from every pilgrimage, every challenge, every mistake, and every success.",
          "No team member should ever believe that learning is complete.",
        ],
      },
      {
        title: "The Epoch Decision Test",
        type: "epoch",
        bullets: [
          "Is it honest?",
          "Does it serve the pilgrim?",
          "Does it protect trust?",
          "Does it reflect the Epoch Standard?",
          "Would we be comfortable explaining the decision openly?",
        ],
      },
    ],
    keyTakeaways: [
      "Values become meaningful only when applied.",
      "Integrity must never be sacrificed for convenience or profit.",
      "Excellence is built through preparation and attention to detail.",
      "Respect must guide interactions with every Christian tradition.",
      "Continuous learning is a professional responsibility.",
    ],
    reviewQuestions: [
      {
        question: "What are the core values of Epoch Journeys?",
        answer:
          "Faith, integrity, excellence, respect, service, and continuous improvement.",
      },
      {
        question: "What does integrity require?",
        answer:
          "Truthful communication, reliable commitments, transparency, accountability, and refusing to promise what cannot be delivered.",
      },
      {
        question: "How is excellence achieved?",
        answer:
          "Through preparation, disciplined follow-through, attention to detail, learning, and continuous improvement.",
      },
    ],
  },
  {
    id: "epoch-promise",
    number: 5,
    title: "The Epoch Promise",
    shortTitle: "The Epoch Promise",
    description:
      "Understand the commitment Epoch makes to pilgrims, priests, partners, and colleagues.",
    estimatedMinutes: 12,
    icon: HeartHandshake,
    objectives: [
      "Understand the Epoch Promise.",
      "Recognize how trust is created and protected.",
      "Apply the promise to communication and service.",
    ],
    sections: [
      {
        title: "Our Promise",
        type: "epoch",
        quote:
          "Every pilgrim will be treated with honesty, dignity, respect, professionalism, and genuine care.",
      },
      {
        title: "Trust Is Our Most Valuable Asset",
        paragraphs: [
          "A priest may entrust Epoch with his parish community. Pilgrims may entrust us with a journey they have anticipated for years.",
          "Suppliers trust that we will communicate clearly and honor our agreements. Colleagues trust one another to complete their responsibilities.",
          "Trust is built slowly and can be damaged quickly.",
        ],
      },
      {
        title: "How We Keep the Promise",
        bullets: [
          "We listen before proposing.",
          "We confirm before promising.",
          "We explain limitations honestly.",
          "We prepare carefully.",
          "We respond respectfully.",
          "We take responsibility when something goes wrong.",
          "We learn and improve after every journey.",
        ],
      },
      {
        title: "Think About It",
        type: "reflection",
        paragraphs: [
          "What actions build trust most strongly in your role?",
          "Which small mistake could damage trust if repeated?",
        ],
      },
    ],
    keyTakeaways: [
      "The Epoch Promise applies to every interaction.",
      "Trust must be earned through consistent action.",
      "Clear communication is a form of service.",
      "Responsibility continues after a mistake occurs.",
    ],
    reviewQuestions: [
      {
        question: "What is the Epoch Promise?",
        answer:
          "That every pilgrim will be treated with honesty, dignity, respect, professionalism, and genuine care.",
      },
      {
        question: "How is trust protected?",
        answer:
          "Through preparation, honest communication, confirmed commitments, accountability, respectful service, and continuous improvement.",
      },
    ],
  },
  {
    id: "epoch-standard",
    number: 6,
    title: "The Epoch Standard",
    shortTitle: "The Epoch Standard",
    description:
      "Learn how the Epoch philosophy becomes a consistent professional standard.",
    estimatedMinutes: 15,
    icon: ListChecks,
    objectives: [
      "Understand the purpose of the Epoch Standard.",
      "Recognize the relationship between philosophy and procedure.",
      "Apply consistent standards across different destinations.",
    ],
    sections: [
      {
        title: "What Is the Epoch Standard?",
        paragraphs: [
          "The Epoch Standard is the practical expression of the Epoch philosophy.",
          "It defines how we design journeys, select suppliers, communicate, prepare documents, support priests, care for pilgrims, manage challenges, and review performance.",
        ],
      },
      {
        title: "Consistency Without Rigidity",
        paragraphs: [
          "Every destination is different, and every group has unique needs.",
          "The Epoch Standard does not require every journey to look identical. It requires every journey to be planned and delivered according to consistent principles.",
        ],
      },
      {
        title: "Examples of the Standard",
        bullets: [
          "Spiritual purpose is identified before the itinerary is designed.",
          "Daily Mass is planned whenever appropriate and possible.",
          "Hotels are selected for suitability, not only price.",
          "Long days and early departures are minimized where possible.",
          "Information is verified before being communicated.",
          "Operational documents are accurate and complete.",
          "Problems are reported promptly and handled responsibly.",
        ],
      },
      {
        title: "The Epoch Way",
        type: "epoch",
        quote:
          "Do not compare Epoch only with other pilgrimage companies. Compare every decision with the experience you want your pilgrims to have.",
      },
    ],
    keyTakeaways: [
      "The Epoch Standard turns values into consistent action.",
      "Consistency does not mean every journey must be identical.",
      "Standards protect quality, trust, and reputation.",
      "Every team member shares responsibility for the Standard.",
    ],
    reviewQuestions: [
      {
        question: "What is the Epoch Standard?",
        answer:
          "It is the practical expression of the Epoch philosophy, defining how journeys are designed, communicated, operated, reviewed, and improved.",
      },
      {
        question: "Does consistency require identical itineraries?",
        answer:
          "No. It requires consistent principles and quality while allowing each itinerary to respond to its destination, group, and spiritual purpose.",
      },
    ],
  },
  {
    id: "reflection",
    number: 7,
    title: "Personal Reflection",
    shortTitle: "Reflection",
    description:
      "Reflect on your responsibility as a member of the Epoch Team.",
    estimatedMinutes: 10,
    icon: Lightbulb,
    objectives: [
      "Connect the course principles with your own role.",
      "Identify areas for personal development.",
      "Express your commitment to the Epoch philosophy.",
    ],
    sections: [
      {
        title: "Reflect Before You Continue",
        type: "reflection",
        paragraphs: [
          "Why do you want to be part of Epoch Journeys?",
          "Which Epoch value is most important to you personally, and why?",
          "What does serving pilgrims with genuine care look like in your role?",
          "How will you respond when honesty is more difficult than convenience?",
          "What knowledge or skill do you most need to develop?",
          "What kind of reputation do you want to help build for Epoch Journeys?",
        ],
      },
      {
        title: "Personal Commitment",
        type: "epoch",
        quote:
          "I understand that every decision I make influences the trust placed in Epoch Journeys. I commit myself to learning continuously, communicating honestly, serving respectfully, and protecting the values and reputation of Epoch.",
      },
    ],
    keyTakeaways: [
      "Professional growth begins with honest reflection.",
      "Every role contributes to the pilgrim experience.",
      "The Epoch philosophy must become personal before it becomes operational.",
    ],
  },
  {
    id: "knowledge-review",
    number: 8,
    title: "Knowledge Review",
    shortTitle: "Knowledge Review",
    description:
      "Review the essential principles introduced throughout EA-001.",
    estimatedMinutes: 15,
    icon: MessageCircleQuestion,
    objectives: [
      "Review the central principles of EA-001.",
      "Identify areas requiring further study.",
      "Prepare for the final course assessment.",
    ],
    sections: [
      {
        title: "Review Questions",
        type: "review",
        bullets: [
          "Why does Epoch describe its work as more than travel?",
          "What is the mission of Epoch Journeys?",
          "What is the long-term vision of the company?",
          "Name and explain the six core values.",
          "What is the Epoch Promise?",
          "How does the Epoch Standard protect the company?",
          "Why is continuous learning essential?",
          "What is the Golden Question?",
        ],
      },
      {
        title: "Review Guidance",
        paragraphs: [
          "Return to any lesson you cannot explain confidently in your own words.",
          "Course completion should represent understanding, not simply reaching the final page.",
        ],
      },
    ],
    keyTakeaways: [
      "Understanding is demonstrated by explanation and application.",
      "Review is an essential part of professional learning.",
      "The Academy exists to build judgement, not only memory.",
    ],
  },
  {
    id: "final-assessment",
    number: 9,
    title: "Final Assessment",
    shortTitle: "Final Assessment",
    description:
      "Complete the final self-assessment for EA-001.",
    estimatedMinutes: 20,
    icon: GraduationCap,
    objectives: [
      "Demonstrate understanding of the Epoch Foundation.",
      "Apply the philosophy to realistic professional situations.",
      "Confirm readiness to continue to EA-002.",
    ],
    sections: [
      {
        title: "Assessment Instructions",
        paragraphs: [
          "Answer each question without copying directly from the lesson.",
          "Use your own words and explain how the principle applies in practice.",
          "A manager or Academy instructor may review your answers during formal staff training.",
        ],
      },
      {
        title: "Written Assessment",
        type: "review",
        bullets: [
          "Explain why pilgrimage requires a different approach from ordinary tourism.",
          "Describe the Epoch mission and give one practical example of how it influences a decision.",
          "Explain the relationship between trust and integrity.",
          "Describe a situation in which the cheapest option may not be the best Epoch option.",
          "Explain the purpose of the Epoch Standard.",
          "Describe how you will contribute to the future of Epoch Journeys.",
        ],
      },
      {
        title: "Practical Scenario",
        type: "scenario",
        paragraphs: [
          "A supplier offers a lower price but has not confirmed several important services in writing. The client is waiting for the final proposal.",
          "Explain how an Epoch specialist should respond. Identify the values and standards that guide the decision.",
        ],
      },
      {
        title: "Completion Standard",
        type: "epoch",
        quote:
          "EA-001 is complete when the learner can explain not only what Epoch does, but why Epoch exists and how its philosophy should influence daily work.",
      },
    ],
    keyTakeaways: [
      "Completion requires understanding and application.",
      "EA-001 establishes the foundation for every later Academy course.",
      "The learner should now be ready to continue to EA-002.",
    ],
  },
];

const STORAGE_KEY = "epoch-academy-ea001-completed-lessons";
const ACTIVE_LESSON_KEY = "epoch-academy-ea001-active-lesson";

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
          <ul className="mt-5 space-y-3">
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
          <HeartHandshake className="text-[#0B1F3A]" size={21} />
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

export default function EpochFoundationCoursePage() {
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
        const parsed = JSON.parse(storedCompleted);

        if (Array.isArray(parsed)) {
          setCompletedLessonIds(
            parsed.filter((id): id is string => typeof id === "string")
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
      console.error("Unable to load EA-001 progress:", error);
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
      {/* Back Navigation */}
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

      {/* Course Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0B1F3A] px-8 py-11 text-white shadow-sm sm:px-12 sm:py-14">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#C9A24D]/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
                EA-001
              </p>

              <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
                The Epoch Foundation
              </h1>

              <p className="mt-5 text-xl text-[#E8D8AE]">
                The philosophy behind every Epoch Journey.
              </p>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/70">
                Before you learn how Epoch works, understand why Epoch
                exists. This course introduces the mission, vision,
                values, promise, culture, and standards that guide every
                member of the Epoch Team.
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
                      {Math.round(totalStudyMinutes / 60)} Hours
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

          {/* Progress */}
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

      {/* Course Layout */}
      <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Lesson Navigation */}
        <aside className="self-start xl:sticky xl:top-24">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-[#F7F3EA] px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9A24D]">
                Course Contents
              </p>

              <h2 className="mt-2 font-serif text-2xl text-[#0B1F3A]">
                EA-001 Lessons
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

        {/* Active Lesson */}
        <main className="min-w-0">
          <article className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            {/* Lesson Header */}
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
              {/* Learning Objectives */}
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

              {/* Lesson Sections */}
              {activeLesson.sections.map((section) => (
                <SectionBlock
                  key={`${activeLesson.id}-${section.title}`}
                  section={section}
                />
              ))}

              {/* Key Takeaways */}
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

              {/* Knowledge Review */}
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
                    Review each question before opening the answer.
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

              {/* Completion */}
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

            {/* Lesson Navigation */}
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

          {/* Course Principle */}
          <section className="mt-8 rounded-[2rem] bg-[#07172D] p-8 text-center text-white sm:p-10">
            <BookOpen
              className="mx-auto text-[#C9A24D]"
              size={26}
            />

            <blockquote className="mx-auto mt-5 max-w-3xl font-serif text-2xl italic leading-10 text-white/90">
              “Before you learn how we work, understand why we exist.”
            </blockquote>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#C9A24D]">
              The Epoch Foundation
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}