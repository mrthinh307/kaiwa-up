import type { ReactNode } from "react";

import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthFormCardProps = {
  children: ReactNode;
  description: string;
  footer: ReactNode;
  title: string;
};

export function AuthFormCard({ children, description, footer, title }: AuthFormCardProps) {
  return (
    <section className="flex flex-col gap-7">
      <CardHeader className="gap-3 px-0">
        <CardTitle className="text-3xl sm:text-4xl">{title}</CardTitle>
        <CardDescription className="text-base leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">{children}</CardContent>
      <CardFooter className="border-t-2 border-border px-0 pt-5">{footer}</CardFooter>
    </section>
  );
}
