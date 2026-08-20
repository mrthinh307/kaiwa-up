import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  description: "Practice free-form Japanese conversations with the KaiwaUp AI Tutor.",
  title: "AI Tutor | KaiwaUp",
};

export default function AiTutorLayout({ children }: { children: ReactNode }) {
  return children;
}
