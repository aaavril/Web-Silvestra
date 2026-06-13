/* global React */

function Sprig({ color = 'var(--verde-400)', berry = 'var(--rosa-400)', size = 90, flip = false }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={flip ? 'sprig is-flipped' : 'sprig'}
      aria-hidden="true"
    >
      <g className="sprig-sway">
        <path d="M60 112 Q58 60 60 16" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M60 78 Q34 66 22 40" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M60 64 Q86 54 98 30" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="60" cy="14" r="5.5" fill={berry} />
        <circle cx="20" cy="37" r="4.5" fill={berry} />
        <circle cx="100" cy="27" r="4.5" fill={berry} />
      </g>
    </svg>
  );
}

window.Sprig = Sprig;
