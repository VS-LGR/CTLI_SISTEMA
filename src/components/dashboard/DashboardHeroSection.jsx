import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

function HeroButton({ shortcut }) {
  const Icon = shortcut.icon;
  const content = (
    <>
      <span className="text-left text-balance leading-snug uppercase tracking-wide text-sm sm:text-[0.8125rem] font-medium flex-1 min-w-0">
        {shortcut.label}
      </span>
      {Icon && (
        <Icon
          size={40}
          weight="thin"
          className="shrink-0 opacity-90 hidden sm:block"
          aria-hidden
        />
      )}
    </>
  );

  const className = cn(
    "flex items-center justify-between gap-3 w-full min-h-[5.5rem] sm:min-h-[6.5rem]",
    "rounded-lg px-4 py-4 text-white shadow-sm transition-colors",
    shortcut.bgClass,
    !shortcut.active && "opacity-60 cursor-not-allowed",
  );

  if (shortcut.active && shortcut.to) {
    return (
      <Link
        to={shortcut.to}
        className={className}
        data-testid={`dashboard-shortcut-${shortcut.id}`}
        data-tour={shortcut.id === "cert-peso" ? "tour-dashboard-cert-peso" : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled
      title={shortcut.disabledReason}
      className={className}
      data-testid={`dashboard-shortcut-${shortcut.id}`}
    >
      {content}
    </button>
  );
}

export default function DashboardHeroSection({ shortcuts = [], greetingName }) {
  if (!shortcuts.length) return null;

  return (
    <div className="space-y-3 min-w-0" data-testid="dashboard-hero" data-tour="tour-dashboard-atalhos">
      {greetingName && (
        <p className="text-base sm:text-lg font-medium text-slate-800">
          Olá, {greetingName}!
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
        {shortcuts.map((s) => (
          <HeroButton key={s.id} shortcut={s} />
        ))}
      </div>
    </div>
  );
}
