export type ViewScope = "current" | "all";

const STORAGE_KEY = "ui:viewScope";
const DEFAULT_SCOPE: ViewScope = "current";

export const getViewScope = (): ViewScope => {
  if (typeof window === "undefined") return DEFAULT_SCOPE;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  return raw === "all" || raw === "current" ? raw : DEFAULT_SCOPE;
};

export const setViewScope = (scope: ViewScope) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, scope);
  window.dispatchEvent(new CustomEvent("viewScopeChanged", { detail: { scope } }));
};

