/** Deteta se o atalho de pasta/PR corresponde à rota atual. */
export function isModuleLinkActive(location, to) {
  const [path] = to.split("?");
  if (location.pathname === path) return true;
  if (path !== "/" && location.pathname.startsWith(`${path}/`)) return true;
  if (to.includes("?")) {
    const expected = new URLSearchParams(to.split("?")[1] || "");
    const current = new URLSearchParams(location.search);
    for (const [key, value] of expected.entries()) {
      if (current.get(key) !== value) return false;
    }
    return location.pathname === path;
  }
  return false;
}
