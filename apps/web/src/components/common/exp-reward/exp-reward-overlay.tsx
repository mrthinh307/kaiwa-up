"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import styles from "./exp-reward-overlay.module.css";

const COUNTER_DELAY_MS = 120;
const COUNTER_DURATION_MS = 650;
const OVERLAY_DURATION_MS = 1450;
const REDUCED_MOTION_DURATION_MS = 1200;

const REWARD_PARTICLES = [
  {
    className: "-top-3 left-1/2 bg-main",
    motionClassName: styles.particleTop,
  },
  {
    className: "top-1/2 -right-3 bg-success",
    motionClassName: styles.particleRight,
  },
  {
    className: "-bottom-3 left-1/2 bg-main",
    motionClassName: styles.particleBottom,
  },
  {
    className: "top-1/2 -left-3 bg-success",
    motionClassName: styles.particleLeft,
  },
] as const;

type ExpRewardOverlayProps = {
  expEarned: number;
};

export function ExpRewardOverlay({ expEarned }: ExpRewardOverlayProps) {
  const [announcement, setAnnouncement] = useState("");
  const [displayedExp, setDisplayedExp] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (expEarned <= 0) {
      return;
    }

    let animationFrameId: number | undefined;
    let hideTimeoutId: number | undefined;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const showTimeoutId = window.setTimeout(
      () => {
        setIsVisible(true);
        hideTimeoutId = window.setTimeout(
          () => setIsVisible(false),
          prefersReducedMotion ? REDUCED_MOTION_DURATION_MS : OVERLAY_DURATION_MS,
        );

        if (prefersReducedMotion) {
          setDisplayedExp(expEarned);
          setAnnouncement(`You earned ${expEarned} EXP.`);
          return;
        }

        let animationStartTime: number | undefined;

        const updateCounter = (timestamp: number) => {
          animationStartTime ??= timestamp;
          const elapsedTime = timestamp - animationStartTime;
          const progress = Math.min(elapsedTime / COUNTER_DURATION_MS, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          const nextDisplayedExp = Math.round(expEarned * easedProgress);

          setDisplayedExp((currentExp) =>
            currentExp === nextDisplayedExp ? currentExp : nextDisplayedExp,
          );

          if (progress < 1) {
            animationFrameId = window.requestAnimationFrame(updateCounter);
            return;
          }

          setAnnouncement(`You earned ${expEarned} EXP.`);
        };

        animationFrameId = window.requestAnimationFrame(updateCounter);
      },
      prefersReducedMotion ? 0 : COUNTER_DELAY_MS,
    );

    return () => {
      window.clearTimeout(showTimeoutId);
      if (hideTimeoutId !== undefined) {
        window.clearTimeout(hideTimeoutId);
      }
      if (animationFrameId !== undefined) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [expEarned]);

  return (
    <>
      {isVisible ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-5"
        >
          <div
            className={cn(
              "relative min-w-[240px] rounded-base border-4 border-border bg-main px-8 py-6 text-center text-main-foreground shadow-shadow sm:min-w-[320px] sm:px-12 sm:py-8",
              styles.rewardCard,
            )}
          >
            <p className="text-sm font-heading tracking-[0.18em] uppercase sm:text-base">
              EXP earned
            </p>
            <p
              className={cn(
                "mt-2 text-5xl leading-none font-heading tabular-nums sm:text-7xl",
                styles.counter,
              )}
            >
              +{displayedExp} EXP
            </p>
            {REWARD_PARTICLES.map((particle) => (
              <span
                className={cn(
                  "absolute size-4 border-2 border-border",
                  styles.particle,
                  particle.motionClassName,
                  particle.className,
                )}
                key={particle.motionClassName}
              />
            ))}
          </div>
        </div>
      ) : null}
      <span aria-live="polite" className="sr-only" role="status">
        {announcement}
      </span>
    </>
  );
}
