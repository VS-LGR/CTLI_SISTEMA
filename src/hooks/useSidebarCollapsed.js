import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pv_sidebar_collapsed";

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (!collapsed) setOverlayOpen(false);
  }, [collapsed]);

  useEffect(() => {
    if (!overlayOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOverlayOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen]);

  const toggleDesktopMenu = useCallback(() => {
    if (!collapsed) {
      setCollapsed(true);
      setOverlayOpen(false);
    } else {
      setOverlayOpen((o) => !o);
    }
  }, [collapsed]);

  const expandSidebar = useCallback(() => {
    setCollapsed(false);
    setOverlayOpen(false);
  }, []);

  const closeOverlay = useCallback(() => setOverlayOpen(false), []);

  return {
    collapsed,
    overlayOpen,
    toggleDesktopMenu,
    expandSidebar,
    closeOverlay,
    setCollapsed,
  };
}
