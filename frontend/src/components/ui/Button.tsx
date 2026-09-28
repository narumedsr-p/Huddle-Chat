import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-brown-600 text-cream hover:bg-brown-700 shadow-pop disabled:bg-brown-300 disabled:text-cream/80",
  secondary:
    "bg-gold-400 text-brown-900 hover:bg-gold-500 shadow-pop disabled:opacity-50",
  ghost:
    "bg-transparent text-brown-600 hover:bg-brown-50 disabled:opacity-40",
  danger:
    "bg-red-500 text-white hover:bg-red-600 shadow-pop disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
