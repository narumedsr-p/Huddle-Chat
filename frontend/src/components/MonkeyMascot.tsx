interface MonkeyMascotProps {
  className?: string;
}

export function MonkeyMascot({ className }: MonkeyMascotProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="1Carry3Monkey — monkey eating a banana"
    >
      {/* ears */}
      <circle cx="13" cy="24" r="8" fill="#8B5E34" />
      <circle cx="51" cy="24" r="8" fill="#8B5E34" />
      <circle cx="13" cy="24" r="4.1" fill="#F4E2C4" />
      <circle cx="51" cy="24" r="4.1" fill="#F4E2C4" />

      {/* head + muzzle */}
      <circle cx="32" cy="33" r="18" fill="#6B4226" />
      <ellipse cx="32" cy="40" rx="10.5" ry="9.5" fill="#F4E2C4" />

      {/* eyes */}
      <circle cx="25.5" cy="30" r="2.2" fill="#3B2415" />
      <circle cx="38.5" cy="30" r="2.2" fill="#3B2415" />
      <circle cx="26.1" cy="28.9" r="0.65" fill="#fff" opacity="0.85" />
      <circle cx="39.1" cy="28.9" r="0.65" fill="#fff" opacity="0.85" />

      {/* nose */}
      <ellipse cx="32" cy="37.5" rx="1.9" ry="1.2" fill="#8B5E34" opacity="0.7" />

      {/* open mouth, biting down on the banana */}
      <path d="M26.5 43c2 4.2 9 4.2 11 0c-2 3-9 3-11 0z" fill="#3B2415" />

      {/* banana, tip disappearing into the mouth */}
      <path
        d="M32 44.5c6.5-2 12.5-7.8 16-17"
        stroke="#F4B942"
        strokeWidth="7.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M34.3 42.5c5.4-2.3 10.3-7.2 13.3-14.8"
        stroke="#FFDE85"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <ellipse cx="49.5" cy="26.5" rx="2.9" ry="2.3" fill="#7A5A34" transform="rotate(-25 49.5 26.5)" />
    </svg>
  );
}
