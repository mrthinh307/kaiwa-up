import { HelpCircle } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { DecorativeStar } from "./decorative-star";

const questions = [
  {
    answer:
      "KaiwaUp is built for learners who know some Japanese vocabulary and grammar but still struggle to understand natural speech or respond confidently in real conversations.",
    question: "Who is KaiwaUp for?",
  },
  {
    answer:
      "Guests can explore the learning methods and see how practice works. You need an account to complete exercises, save results, earn EXP, unlock achievements, and track personal progress.",
    question: "Can I practice without creating an account?",
  },
  {
    answer:
      "Dual Shadowing combines the original Japanese audio with your own recording. You listen, follow the speaker, record your voice, and replay both tracks to compare rhythm, pitch, and pronunciation.",
    question: "What makes Dual Shadowing different?",
  },
  {
    answer:
      "The timer measures how quickly you begin responding after a Japanese question or situation ends. You have three seconds to start speaking—not to finish your entire answer.",
    question: "How does the 3-Second Reflex exercise work?",
  },
  {
    answer:
      "KaiwaUp uses your microphone only after you grant permission and clearly shows when recording is active. Recordings and learning data are used only to provide practice, feedback, and personal progress features.",
    question: "When does KaiwaUp use my microphone?",
  },
  {
    answer:
      "Speaking exercises can provide guidance on pronunciation, pitch, rhythm, response relevance, grammar, and more natural wording. The exact feedback depends on the exercise you complete.",
    question: "What kind of AI feedback will I receive?",
  },
  {
    answer:
      "Yes. AI Tutor 1-on-1 lets you choose a topic and difficulty, practice a contextual conversation by voice or text, and receive suggestions that help your Japanese sound more natural.",
    question: "Can I practice open conversations with AI?",
  },
];

export function FaqSection() {
  return (
    <section
      aria-labelledby="faq-heading"
      className="relative overflow-hidden border-b-4 border-border bg-secondary-background px-5 py-16 sm:px-8 lg:py-24"
      id="faq"
    >
      <DecorativeStar
        className="absolute -right-14 -top-14 hidden size-52 opacity-15 lg:block"
        variant={22}
      />

      <div className="relative z-10 mx-auto grid max-w-[1300px] gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <div>
          <p className="mb-5 inline-flex border-2 border-border bg-main px-3 py-1 font-heading text-sm text-main-foreground shadow-shadow sm:text-base">
            FAQ
          </p>
          <h2
            className="max-w-[520px] text-3xl leading-tight sm:text-4xl md:text-5xl xl:text-6xl"
            id="faq-heading"
          >
            Questions before your first session?
          </h2>
          <p className="mt-6 max-w-[500px] text-base leading-relaxed sm:text-lg xl:text-xl">
            Here is what to expect from practice, progress tracking, voice recording, and AI-guided
            feedback.
          </p>

          <div className="mt-10 flex max-w-[500px] gap-4 rounded-base border-2 border-border bg-background p-5 shadow-shadow">
            <HelpCircle aria-hidden="true" className="size-8 shrink-0 text-main" />
            <div>
              <p className="font-heading sm:text-lg">Not sure where to begin?</p>
              <p className="mt-2 text-sm leading-relaxed sm:text-base">
                Start with Dual Shadowing to connect careful listening, pronunciation, and speaking
                in one short exercise.
              </p>
            </div>
          </div>
        </div>

        <Accordion className="text-base sm:text-lg" collapsible defaultValue="item-0" type="single">
          {questions.map(({ answer, question }, index) => (
            <AccordionItem className="mb-3 last:mb-0" key={question} value={"item-" + index}>
              <AccordionTrigger className="text-left">{question}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed sm:text-base">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
