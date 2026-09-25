export type Plan = "free" | "pro" | "ultra";
export type PlanFeature = "premiumPersonas" | "priorityAi" | "advancedMemory" | "voice" | "fullChallenges" | "advancedStats" | "customization";
export const PLAN_DETAILS = {
  free: { label: "Free", price: 0, dailyMessages: 5, personaLimit: 3, features: [] as PlanFeature[] },
  pro: { label: "Pro", price: 5, dailyMessages: 50, personaLimit: 25, features: ["premiumPersonas", "priorityAi", "advancedMemory", "voice", "fullChallenges", "advancedStats", "customization"] as PlanFeature[] },
  ultra: { label: "Ultra", price: 0, dailyMessages: 200, personaLimit: 100, features: ["premiumPersonas", "priorityAi", "advancedMemory", "voice", "fullChallenges", "advancedStats", "customization"] as PlanFeature[] },
} as const;
export function hasPlanFeature(plan: Plan | undefined, feature: PlanFeature) { return Boolean(plan && PLAN_DETAILS[plan].features.includes(feature)); }
export function planLabel(plan: Plan | undefined) { return PLAN_DETAILS[plan ?? "free"].label; }
