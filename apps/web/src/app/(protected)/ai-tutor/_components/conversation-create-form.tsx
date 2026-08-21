"use client";

import type {
  JlptLevel,
  TutorConversationCreateRequest,
  TutorConversationCreateResponse,
  TutorExplanationLanguage,
} from "@kaiwa-app/api-client";
import type { FormEvent } from "react";

import { Check, ChevronsUpDown, MessageCircleMore } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { normalizeApiFieldName } from "@/lib/api-errors";
import { cn } from "@/lib/utils";

import { isTutorRequestError } from "../_lib/ai-tutor-request";

const DIFFICULTY_OPTIONS: readonly JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];
const EXPLANATION_LANGUAGE_OPTIONS = [
  { label: "Vietnamese", value: "vi" },
  { label: "English", value: "en" },
  { label: "Japanese", value: "ja" },
] as const satisfies readonly { label: string; value: TutorExplanationLanguage }[];
type CreateState = "idle" | "creating" | "error";
type ConversationCreateFormProps = {
  onCreate: (request: TutorConversationCreateRequest) => Promise<TutorConversationCreateResponse>;
  retryAttempt: number;
};

export function ConversationCreateForm({ onCreate, retryAttempt }: ConversationCreateFormProps) {
  const clientConversationIdRef = useRef<string | null>(null);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<JlptLevel | "">("");
  const [isDifficultyOpen, setIsDifficultyOpen] = useState(false);
  const [explanationLanguage, setExplanationLanguage] = useState<TutorExplanationLanguage>("vi");
  const [isExplanationLanguageOpen, setIsExplanationLanguageOpen] = useState(false);
  const [scenario, setScenario] = useState("");
  const [createState, setCreateState] = useState<CreateState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const normalizedTopic = topic.trim();
  const normalizedScenario = scenario.trim();
  const topicError = normalizedTopic.length > 255;
  const scenarioError = normalizedScenario.length > 2000;
  const isInvalid =
    !normalizedTopic || !difficulty || !explanationLanguage || topicError || scenarioError;
  const isCreating = createState === "creating";

  function handleDifficultyChange(value: string) {
    const selectedDifficulty = DIFFICULTY_OPTIONS.find((level) => level === value);

    if (!selectedDifficulty) {
      return;
    }

    setDifficulty(selectedDifficulty);
    setIsDifficultyOpen(false);
    clientConversationIdRef.current = null;
    clearCreateError();
  }

  function handleExplanationLanguageChange(value: string) {
    const selectedLanguage = EXPLANATION_LANGUAGE_OPTIONS.find(
      (option) => option.value === value,
    )?.value;

    if (!selectedLanguage) {
      return;
    }

    setExplanationLanguage(selectedLanguage);
    setIsExplanationLanguageOpen(false);
    clientConversationIdRef.current = null;
    clearCreateError();
  }

  function clearCreateError() {
    setFieldErrors({});
    if (createState === "error") {
      setCreateState("idle");
      setErrorMessage("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isInvalid || !difficulty || isCreating) {
      return;
    }

    const requestWithoutId = {
      topic: normalizedTopic,
      difficulty,
      scenario: normalizedScenario || null,
      explanation_language: explanationLanguage,
    };
    const clientConversationId = clientConversationIdRef.current ?? globalThis.crypto.randomUUID();
    clientConversationIdRef.current = clientConversationId;
    const request: TutorConversationCreateRequest = {
      ...requestWithoutId,
      client_conversation_id: clientConversationId,
    };

    setCreateState("creating");
    setErrorMessage("");
    setFieldErrors({});

    try {
      await onCreate(request);
    } catch (error) {
      setCreateState("error");
      if (isTutorRequestError(error)) {
        const nextFieldErrors: Record<string, string> = {};
        for (const fieldError of error.failure.fieldErrors) {
          const fieldName = normalizeApiFieldName(fieldError.field);
          if (!nextFieldErrors[fieldName]) {
            nextFieldErrors[fieldName] = fieldError.message;
          }
        }
        setFieldErrors(nextFieldErrors);
      }
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not start this conversation. Please try again.",
      );
    }
  }

  return (
    <Card className="w-full max-w-[680px] border-4 bg-secondary-background">
      <CardHeader className="border-b-2 border-border pb-5">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow">
            <MessageCircleMore aria-hidden="true" className="size-5" />
          </span>
          <div>
            <CardTitle className="text-2xl">Start a conversation</CardTitle>
            <CardDescription className="mt-1">
              Choose what you want to practice with your AI Tutor.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="tutor-topic">Topic</Label>
              <span className="text-xs text-foreground/60">{topic.length} / 255</span>
            </div>
            <Input
              aria-describedby="tutor-topic-help tutor-topic-error"
              aria-invalid={topicError || Boolean(fieldErrors.topic) || undefined}
              id="tutor-topic"
              maxLength={255}
              onChange={(event) => {
                setTopic(event.target.value);
                clientConversationIdRef.current = null;
                clearCreateError();
              }}
              placeholder="e.g. Japanese travel conversation"
              value={topic}
            />
            <p className="text-sm text-foreground/65" id="tutor-topic-help">
              Enter any topic you want to practice.
            </p>
            {topicError || fieldErrors.topic ? (
              <p className="text-sm text-destructive" id="tutor-topic-error" role="alert">
                {fieldErrors.topic ?? "Topic must be 255 characters or fewer."}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tutor-difficulty">Difficulty</Label>
              <Popover onOpenChange={setIsDifficultyOpen} open={isDifficultyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    aria-describedby="tutor-difficulty-help"
                    aria-expanded={isDifficultyOpen}
                    className="w-full justify-between"
                    id="tutor-difficulty"
                    role="combobox"
                    type="button"
                    variant="noShadow"
                  >
                    <span className={cn("truncate", !difficulty && "text-foreground/50")}>
                      {difficulty || "Choose a JLPT level"}
                    </span>
                    <ChevronsUpDown aria-hidden="true" className="opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-(--radix-popover-trigger-width) p-0 shadow-shadow"
                >
                  <Command className="border-0">
                    <CommandInput aria-label="Search JLPT difficulty" placeholder="Search level" />
                    <CommandList>
                      <CommandEmpty>No JLPT level found.</CommandEmpty>
                      <CommandGroup>
                        {DIFFICULTY_OPTIONS.map((level) => (
                          <CommandItem key={level} onSelect={handleDifficultyChange} value={level}>
                            <Check
                              aria-hidden="true"
                              className={cn("opacity-0", difficulty === level && "opacity-100")}
                            />
                            {level}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-sm text-foreground/65" id="tutor-difficulty-help">
                The Tutor will adjust vocabulary and grammar to this level.
              </p>
              {fieldErrors.difficulty ? (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.difficulty}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tutor-explanation-language">Explanation language</Label>
              <Popover onOpenChange={setIsExplanationLanguageOpen} open={isExplanationLanguageOpen}>
                <PopoverTrigger asChild>
                  <Button
                    aria-describedby="tutor-explanation-language-help"
                    aria-expanded={isExplanationLanguageOpen}
                    className="w-full justify-between"
                    id="tutor-explanation-language"
                    role="combobox"
                    type="button"
                    variant="noShadow"
                  >
                    <span className="truncate">
                      {
                        EXPLANATION_LANGUAGE_OPTIONS.find(
                          (option) => option.value === explanationLanguage,
                        )?.label
                      }
                    </span>
                    <ChevronsUpDown aria-hidden="true" className="opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-(--radix-popover-trigger-width) p-0 shadow-shadow"
                >
                  <Command className="border-0">
                    <CommandInput
                      aria-label="Search explanation language"
                      placeholder="Search language"
                    />
                    <CommandList>
                      <CommandEmpty>No language found.</CommandEmpty>
                      <CommandGroup>
                        {EXPLANATION_LANGUAGE_OPTIONS.map((option) => (
                          <CommandItem
                            key={option.value}
                            onSelect={handleExplanationLanguageChange}
                            value={option.value}
                          >
                            <Check
                              aria-hidden="true"
                              className={cn(
                                "opacity-0",
                                explanationLanguage === option.value && "opacity-100",
                              )}
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-sm text-foreground/65" id="tutor-explanation-language-help">
                Feedback and translations will use this language.
              </p>
              {fieldErrors.explanation_language ? (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.explanation_language}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="tutor-scenario">Scenario</Label>
              <span className="text-xs text-foreground/60">{scenario.length} / 2000</span>
            </div>
            <Textarea
              aria-describedby="tutor-scenario-help tutor-scenario-error"
              aria-invalid={scenarioError || Boolean(fieldErrors.scenario) || undefined}
              id="tutor-scenario"
              maxLength={2000}
              onChange={(event) => {
                setScenario(event.target.value);
                clientConversationIdRef.current = null;
                clearCreateError();
              }}
              placeholder="Optional context, roles, or situation for the conversation"
              rows={4}
              value={scenario}
            />
            <p className="text-sm text-foreground/65" id="tutor-scenario-help">
              Optional. Add context to help the Tutor set the scene.
            </p>
            {scenarioError || fieldErrors.scenario ? (
              <p className="text-sm text-destructive" id="tutor-scenario-error" role="alert">
                {fieldErrors.scenario ?? "Scenario must be 2000 characters or fewer."}
              </p>
            ) : null}
          </div>

          {createState === "error" ? (
            <p
              aria-live="polite"
              className="border-2 border-destructive p-3 text-sm text-destructive"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}

          <Button className="w-full sm:w-auto" disabled={isInvalid || isCreating} type="submit">
            {isCreating
              ? retryAttempt > 0
                ? "Retrying conversation…"
                : "Starting conversation…"
              : "Start conversation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
