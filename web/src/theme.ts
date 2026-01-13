const THEME_KEY = "finflow_theme";
export type ThemeName = "dark" | "light";

export function getCurrentTheme(): ThemeName {
  const saved = localStorage.getItem(THEME_KEY) as ThemeName | null;
  return saved === "light" ? "light" : "dark";
}

export function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("theme-light");
  } else {
    root.classList.remove("theme-light");
  }
  localStorage.setItem(THEME_KEY, theme);
}
