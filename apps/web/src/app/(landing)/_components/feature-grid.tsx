import type { ComponentType } from "react";

import { Code2, GitFork, Waves, Wrench } from "lucide-react";

const features: Array<{
  description: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}> = [
  {
    description:
      "These components efficiently utilize Tailwind and its versatile utility classes, enabling swift and straightforward styling.",
    icon: Waves,
    title: "Made with Tailwind",
  },
  {
    description:
      "This project is open source with an MIT License, fostering collaboration and allowing widespread adoption and modification.",
    icon: GitFork,
    title: "Open source",
  },
  {
    description:
      "Most of the components are based on shadcn/ui, meaning high-quality components with best practices.",
    icon: Code2,
    title: "Based on Shadcn/ui",
  },
  {
    description: "You can easily customize these components to suit your needs.",
    icon: Wrench,
    title: "Customizable",
  },
];

export function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 border-y-4 border-border md:grid-cols-2">
      {features.map(({ description, icon: Icon, title }, index) => (
        <section
          className={`border-border p-5 py-7 sm:p-8 lg:p-10 2xl:p-14 2xl:py-16 ${
            index % 2 === 0 ? "md:border-r-4" : ""
          } ${index < 2 ? "border-b-4" : index === 2 ? "border-b-4 md:border-b-0" : ""} ${
            index === 1 || index === 2 ? "bg-main text-main-foreground" : "bg-background"
          }`}
          key={title}
        >
          <div className="mb-4 flex items-center gap-4 sm:mb-6 sm:gap-6">
            <div className="flex size-10 items-center justify-center sm:size-12 lg:size-[55px] xl:size-[70px]">
              <Icon className="size-full stroke-[2.5]" />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl">{title}</h3>
          </div>
          <p className="text-base sm:text-lg md:text-base xl:text-xl 2xl:text-2xl">{description}</p>
        </section>
      ))}
    </div>
  );
}
