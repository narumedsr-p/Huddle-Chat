import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "brown" | "gold";
}

const TONE_CLASSES = {
  brown: "bg-brown-50 text-brown-600",
  gold: "bg-gold-300/60 text-brown-700",
};

export function Badge({ children, tone = "brown" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
