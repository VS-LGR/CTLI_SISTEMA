import React from "react";

/** Esquemas simplificados de plataforma (preview HTML — alinhado ao PDF). */
export function ColetaPlatformDiagrams() {
  return (
    <div className="coleta-platform-diagrams" aria-hidden>
      <svg viewBox="0 0 52 36" className="coleta-platform-diagram">
        <rect x="10" y="8" width="32" height="20" fill="none" stroke="#333" strokeWidth="0.8" />
        {[
          [10, 8, "1"],
          [42, 8, "2"],
          [42, 28, "3"],
          [10, 28, "4"],
        ].map(([cx, cy, n]) => (
          <g key={n}>
            <circle cx={cx} cy={cy} r="2" fill="#333" />
            <text x={cx} y={cy + 1} fontSize="4" textAnchor="middle" dominantBaseline="middle">
              {n}
            </text>
          </g>
        ))}
      </svg>
      <svg viewBox="0 0 52 36" className="coleta-platform-diagram">
        <circle cx="26" cy="18" r="12" fill="none" stroke="#333" strokeWidth="0.8" />
        {[
          [26, 6, "1"],
          [38, 18, "2"],
          [26, 30, "3"],
          [14, 18, "4"],
        ].map(([cx, cy, n]) => (
          <g key={n}>
            <circle cx={cx} cy={cy} r="2" fill="#333" />
            <text x={cx} y={cy + 1} fontSize="4" textAnchor="middle" dominantBaseline="middle">
              {n}
            </text>
          </g>
        ))}
      </svg>
      <svg viewBox="0 0 52 36" className="coleta-platform-diagram">
        <line x1="4" y1="32" x2="48" y2="32" stroke="#333" strokeWidth="0.8" />
        <rect x="16" y="10" width="20" height="12" fill="none" stroke="#333" strokeWidth="0.8" />
        <circle cx="10" cy="32" r="2" fill="#333" />
        <circle cx="42" cy="32" r="2" fill="#333" />
        <text x="22" y="14" fontSize="4">
          1
        </text>
        <text x="30" y="14" fontSize="4">
          2
        </text>
      </svg>
    </div>
  );
}
