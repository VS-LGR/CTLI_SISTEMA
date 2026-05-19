import React from "react";

/** Bloco posicionado em em no canvas PDF24 */
export function AbsBlock({ style, className = "", children }) {
  return (
    <div className={`coleta-abs ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
