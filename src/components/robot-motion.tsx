"use client";

import { Lottie } from "lottie-react";
import { useEffect, useState } from "react";

type AnimationData = Record<string, unknown>;

export function RobotMotion() {
  const [animationData, setAnimationData] = useState<AnimationData | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/motions/robot-futuristic-ai.json")
      .then((response) => response.json())
      .then((data: AnimationData) => {
        if (active) {
          setAnimationData(data);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  if (!animationData) {
    return <div className="h-16 w-16 animate-pulse rounded-full bg-cyan-500/10" aria-hidden="true" />;
  }

  return (
    <Lottie
      src={animationData}
      loop
      autoplay
      aria-label="Animated futuristic AI robot"
      className="h-16 w-16 sm:h-20 sm:w-20"
    />
  );
}
