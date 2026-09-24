"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MagicRings from "@/components/MagicRings";

gsap.registerPlugin(ScrollTrigger);

const springValues = {
  damping: 30,
  stiffness: 100,
  mass: 1.2,
};

type TiltProps = {
  children: ReactNode;
  className?: string;
  rotateAmplitude?: number;
  scaleOnHover?: number;
};

export function SoulXTiltCard({
  children,
  className = "",
  rotateAmplitude = 3,
  scaleOnHover = 1.02,
}: TiltProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!ref.current || reduceMotion) return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - rect.width / 2;
    const offsetY = event.clientY - rect.top - rect.height / 2;

    rotateX.set((offsetY / (rect.height / 2)) * -rotateAmplitude);
    rotateY.set((offsetX / (rect.width / 2)) * rotateAmplitude);
  }

  function handleMouseEnter() {
    if (!reduceMotion) {
      scale.set(scaleOnHover);
    }
  }

  function handleMouseLeave() {
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      className={`soulx-tilt-card ${className}`.trim()}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        scale,
        transformPerspective: 1000,
      }}
    >
      {children}
    </motion.div>
  );
}

type AnimatedContentProps = {
  children: ReactNode;
  className?: string;
  distance?: number;
  direction?: "vertical" | "horizontal";
  reverse?: boolean;
  duration?: number;
  delay?: number;
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  threshold?: number;
};

export function AnimatedContent({
  children,
  className = "",
  distance = 22,
  direction = "vertical",
  reverse = false,
  duration = 0.65,
  delay = 0,
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.1,
}: AnimatedContentProps) {
  const reduceMotion = useReducedMotion();

  const initial = reduceMotion
    ? { opacity: 1, y: 0, x: 0, scale: 1 }
    : {
        opacity: initialOpacity,
        y: direction === "vertical" ? (reverse ? -distance : distance) : 0,
        x: direction === "horizontal" ? (reverse ? -distance : distance) : 0,
        scale,
      };

  const animate = { opacity: animateOpacity ? 1 : initialOpacity, y: 0, x: 0, scale: 1 };

  return (
    <motion.div
      className={className}
      initial={initial}
      animate={animate}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, amount: threshold }}
    >
      {children}
    </motion.div>
  );
}

type ScrollRevealTag = "div" | "p" | "h2" | "span" | "section" | "article" | "header" | "footer";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  as?: ScrollRevealTag;
  enableBlur?: boolean;
  baseOpacity?: number;
  baseRotation?: number;
  blurStrength?: number;
};

export function ScrollReveal({
  children,
  className = "",
  as: Component = "div",
  enableBlur = true,
  baseOpacity = 0.2,
  baseRotation = 1,
  blurStrength = 3,
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLElement | null>(null);

  const text = typeof children === "string" ? children : "";

  const words = useMemo(() => {
    if (!text) return null;
    return text.split(/(\s+)/).map((word, index) => {
      if (/^\s+$/.test(word)) return word;
      return (
        <span className="scroll-reveal-word" key={`${word}-${index}`}>
          {word}
        </span>
      );
    });
  }, [text]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !text) return;

    const ctx = gsap.context(() => {
      const wordElements = el.querySelectorAll(".scroll-reveal-word");

      gsap.fromTo(
        el,
        {
          rotate: baseRotation,
          transformOrigin: "0% 50%",
        },
        {
          rotate: 0,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            end: "bottom 60%",
            scrub: true,
          },
        },
      );

      gsap.fromTo(
        wordElements,
        {
          opacity: baseOpacity,
          filter: enableBlur ? `blur(${blurStrength}px)` : "none",
        },
        {
          opacity: 1,
          filter: "blur(0px)",
          stagger: 0.025,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            end: "bottom 60%",
            scrub: true,
          },
        },
      );
    }, containerRef);

    return () => ctx.revert();
  }, [baseOpacity, baseRotation, blurStrength, enableBlur, text]);

  const Tag = Component === "span" ? "span" : Component === "p" ? "p" : Component === "h2" ? "h2" : "div";

  return (
    <Tag
      ref={(node) => {
        containerRef.current = node as HTMLElement | null;
      }}
      className={`scroll-reveal ${className}`.trim()}
    >
      {words ?? children}
    </Tag>
  );
}

export function HeroPersonaOrbit() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return null;
  }

  return (
    <div className="hero-persona-orbit" aria-hidden="true">
      <MagicRings
        color="#53E5F5"
        colorTwo="#4285FF"
        ringCount={5}
        speed={0.65}
        opacity={0.18}
        attenuation={8}
        lineThickness={1.4}
        baseRadius={0.35}
        radiusStep={0.12}
        scaleRate={0.08}
        rotation={18}
        fadeIn={0.6}
        fadeOut={0.8}
      />
    </div>
  );
}

type ShineBorderProps = {
  children: ReactNode;
  className?: string;
};

export function ShineBorder({ children, className = "" }: ShineBorderProps) {
  return (
    <div className={`soulx-shine-border-wrap ${className}`.trim()}>
      <motion.div
        className="soulx-shine-border"
        animate={{ backgroundPosition: ["200% 50%", "-100% 50%"] }}
        transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
      />
      <div className="soulx-shine-content">{children}</div>
    </div>
  );
}
