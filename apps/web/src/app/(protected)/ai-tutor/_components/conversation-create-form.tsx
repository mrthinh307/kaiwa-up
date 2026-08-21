"use client";

import type { JlptLevel, TutorConversationCreateRequest } from "@kaiwa-app/api-client";
import type { FormEvent } from "react";

import { Check, ChevronsUpDown, MessageCircleMore } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { cn } from "@/lib/utils";

import { createMockTutorConversation } from "../_mocks/ai-tutor-mock-api";
import { MOCK_TRAVEL_CONVERSATION_ID } from "../_mocks/ai-tutor-mock-data";

const DIFFICULTY_OPTIONS: readonly JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];
const MOCK_CONVERSATION_PATH = `/ai-tutor/${MOCK_TRAVEL_CONVERSATION_ID}`;

type CreateState = "idle" | "creating" | "error";

export function ConversationCreateForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<JlptLevel | "">("");
  const [isDifficultyOpen, setIsDifficultyOpen] = useState(false);
  const [scenario, setScenario] = useState("");
  const [createState, setCreateState] = useState<CreateState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedTopic = topic.trim();
  const normalizedScenario = scenario.trim();
  const topicError = normalizedTopic.length > 255;
  const scenarioError = normalizedScenario.length > 2000;
  const isInvalid = !normalizedTopic || !difficulty || topicError || scenarioError;
  const isCreating = createState === "creating";

  function handleDifficultyChange(value: string) {
    const selectedDifficulty = DIFFICULTY_OPTIONS.find((level) => level === value);

    if (!selectedDifficulty) {
      return;
    }

    setDifficulty(selectedDifficulty);
    setIsDifficultyOpen(false);
    clearCreateError();
  }

  function clearCreateError() {
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

    const request: TutorConversationCreateRequest = {
      topic: normalizedTopic,
      difficulty,
      scenario: normalizedScenario || null,
    };

    setCreateState("creating");
    setErrorMessage("");

    try {
      await createMockTutorConversation(request);
      router.push(MOCK_CONVERSATION_PATH);
    } catch {
      setCreateState("error");
      setErrorMessage("We could not start this mock conversation. Please try again.");
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
              aria-invalid={topicError || undefined}
              id="tutor-topic"
              maxLength={255}
              onChange={(event) => {
                setTopic(event.target.value);
                clearCreateError();
              }}
              placeholder="e.g. Japanese travel conversation"
              value={topic}
            />
            <p className="text-sm text-foreground/65" id="tutor-topic-help">
              Enter any topic you want to practice.
            </p>
            {topicError ? (
              <p className="text-sm text-destructive" id="tutor-topic-error" role="alert">
                Topic must be 255 characters or fewer.
              </p>
            ) : null}
          </div>

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
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="tutor-scenario">Scenario</Label>
              <span className="text-xs text-foreground/60">{scenario.length} / 2000</span>
            </div>
            <Textarea
              aria-describedby="tutor-scenario-help tutor-scenario-error"
              aria-invalid={scenarioError || undefined}
              id="tutor-scenario"
              maxLength={2000}
              onChange={(event) => {
                setScenario(event.target.value);
                clearCreateError();
              }}
              placeholder="Optional context, roles, or situation for the conversation"
              rows={4}
              value={scenario}
            />
            <p className="text-sm text-foreground/65" id="tutor-scenario-help">
              Optional. Add context to help the Tutor set the scene.
            </p>
            {scenarioError ? (
              <p className="text-sm text-destructive" id="tutor-scenario-error" role="alert">
                Scenario must be 2000 characters or fewer.
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
            {isCreating ? "Starting conversation…" : "Start conversation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
