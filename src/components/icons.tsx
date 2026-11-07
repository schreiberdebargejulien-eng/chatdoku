import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...rest }: IconProps): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...rest,
  };
}

export const IconBack = (p: IconProps) => (
  <svg {...base(p)}><path d="M15 5l-7 7 7 7" /></svg>
);
export const IconClose = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconPause = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 6v12M15 6v12" strokeWidth={2.6} /></svg>
);
export const IconPlay = (p: IconProps) => (
  <svg {...base(p)}><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
);
export const IconUndo = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 010 11H11" /></svg>
);
export const IconBulb = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 00-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0012 3z" />
  </svg>
);
export const IconCross = (p: IconProps) => (
  <svg {...base(p)}><path d="M7 7l10 10M17 7L7 17" strokeWidth={2.8} /></svg>
);
export const IconEraser = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 20H9.5" />
    <path d="M4.6 14.6l8.9-8.9a2 2 0 012.8 0l3 3a2 2 0 010 2.8L12 18.8a2 2 0 01-1.4.6H8.4a2 2 0 01-1.4-.6l-2.4-2.4a1.3 1.3 0 010-1.8z" />
    <path d="M9 10l5 5" />
  </svg>
);
export const IconPaw = (p: IconProps) => (
  <svg {...base({ ...p, stroke: 'none' })} fill="currentColor">
    <ellipse cx="6.2" cy="10.2" rx="2.1" ry="2.6" />
    <ellipse cx="10" cy="6.4" rx="2.1" ry="2.7" />
    <ellipse cx="14.4" cy="6.4" rx="2.1" ry="2.7" />
    <ellipse cx="18" cy="10.2" rx="2.1" ry="2.6" />
    <path d="M12.2 11.2c2.8 0 5.6 3.6 5.6 6 0 1.8-1.4 2.6-3 2.6-1 0-1.7-.5-2.6-.5s-1.6.5-2.6.5c-1.6 0-3-.8-3-2.6 0-2.4 2.8-6 5.6-6z" />
  </svg>
);
export const IconChart = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 20V10M12 20V4M19 20v-7" strokeWidth={2.6} /></svg>
);
export const IconGear = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </svg>
);
export const IconHelp = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.3a2.6 2.6 0 015 .9c0 1.7-2.5 2.3-2.5 3.8" />
    <path d="M12 17.2h.01" strokeWidth={2.8} />
  </svg>
);
export const IconRestart = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 12a8 8 0 108-8 8.6 8.6 0 00-6 2.5L4 8.5" /><path d="M4 4v4.5h4.5" /></svg>
);
export const IconHome = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-4.5v-5.5h-5V20H5a1 1 0 01-1-1z" /></svg>
);
export const IconClock = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IconTrophy = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 4h8v5a4 4 0 01-8 0z" />
    <path d="M16 6h3a3 3 0 01-3 4M8 6H5a3 3 0 003 4M12 13v4M8.5 20h7M10 17h4" />
  </svg>
);

export function Heart({ filled, size = 22 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.4 0 5.5 3.3 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z"
        fill={filled ? '#EF7F7B' : 'none'}
        stroke={filled ? '#E06A66' : '#CFC6BA'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {filled && <ellipse cx="7.6" cy="8.6" rx="1.8" ry="1.2" fill="#fff" opacity="0.55" transform="rotate(-30 7.6 8.6)" />}
    </svg>
  );
}
