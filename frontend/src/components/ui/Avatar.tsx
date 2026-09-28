interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  online?: boolean;
  showStatusDot?: boolean;
}

const SIZE_CLASSES = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-14 w-14 text-lg",
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Avatar({ name, size = "md", online = true, showStatusDot = true }: AvatarProps) {
  return (
    <div className="relative shrink-0">
      <div
        className={`${SIZE_CLASSES[size]} flex items-center justify-center rounded-full font-semibold shadow-pop transition ${
          online
            ? "bg-gradient-to-br from-gold-400 to-brown-500 text-brown-900"
            : "bg-brown-100 text-brown-400 grayscale opacity-70"
        }`}
      >
        {initials(name)}
      </div>
      {showStatusDot && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-cream ${
            online ? "bg-emerald-400" : "bg-brown-200"
          }`}
        />
      )}
    </div>
  );
}
