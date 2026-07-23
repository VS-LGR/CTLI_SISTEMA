const STORAGE_PREFIX = "pv_tour_seen";

function storageKey(userId, moduleKey) {
  return `${STORAGE_PREFIX}:${userId || "anon"}:${moduleKey}`;
}

export function hasSeenTour(userId, moduleKey) {
  if (!moduleKey || typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(storageKey(userId, moduleKey)) === "1";
  } catch {
    return true;
  }
}

export function markTourSeen(userId, moduleKey) {
  if (!moduleKey || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId, moduleKey), "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function resetTour(userId, moduleKey) {
  if (!moduleKey || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(userId, moduleKey));
  } catch {
    /* ignore */
  }
}
