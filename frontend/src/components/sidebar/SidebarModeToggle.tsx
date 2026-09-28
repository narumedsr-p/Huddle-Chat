import { motion } from "framer-motion";
import { User, Users } from "lucide-react";

export type SidebarMode = "user" | "group";

interface SidebarModeToggleProps {
  mode: SidebarMode;
  onChange: (mode: SidebarMode) => void;
}

const OPTIONS: { value: SidebarMode; label: string; icon: typeof User }[] = [
  { value: "user", label: "Users", icon: User },
  { value: "group", label: "Groups", icon: Users },
];

export function SidebarModeToggle({ mode, onChange }: SidebarModeToggleProps) {
  return (
    <div className="flex rounded-2xl bg-brown-900/5 p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = mode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-sm font-medium transition-colors ${
              isActive ? "text-brown-900" : "text-ink-soft hover:text-ink"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="sidebar-mode-pill"
                className="absolute inset-0 rounded-xl bg-white shadow-soft"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon className="h-4 w-4" />
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
