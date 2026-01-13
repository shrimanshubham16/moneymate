export type FeatureFlag =
  | "health_thresholds_configurable"
  | "onboarding_flow"
  | "income_update_btn"
  | "emoji_standardization"
  | "expense_chart_adaptive"
  | "notif_prefs_verified"
  | "welcome_email"
  | "about_known_ok"
  | "theme_switcher"
  | "modal_unification"
  | "walkthrough_guided";

type FlagConfig = Record<FeatureFlag, boolean>;

const defaultFlags: FlagConfig = {
  health_thresholds_configurable: true,
  onboarding_flow: true,
  income_update_btn: true,
  emoji_standardization: true,
  expense_chart_adaptive: true,
  notif_prefs_verified: true,
  welcome_email: true,
  about_known_ok: true,
  theme_switcher: true,
  modal_unification: true,
  walkthrough_guided: true,
};

function parseEnvFlag(key: string): boolean | undefined {
  const raw = (import.meta as any).env?.[key];
  if (raw === undefined) return undefined;
  return raw === "1" || raw === "true" || raw === true;
}

const envOverrides: Partial<FlagConfig> = {
  health_thresholds_configurable: parseEnvFlag("VITE_FLAG_HEALTH_THRESHOLDS"),
  onboarding_flow: parseEnvFlag("VITE_FLAG_ONBOARDING"),
  income_update_btn: parseEnvFlag("VITE_FLAG_INCOME_UPDATE"),
  emoji_standardization: parseEnvFlag("VITE_FLAG_EMOJI_STANDARD"),
  expense_chart_adaptive: parseEnvFlag("VITE_FLAG_EXPENSE_CHART"),
  notif_prefs_verified: parseEnvFlag("VITE_FLAG_NOTIF_PREFS"),
  welcome_email: parseEnvFlag("VITE_FLAG_WELCOME_EMAIL"),
  about_known_ok: parseEnvFlag("VITE_FLAG_ABOUT_KNOWN_OK"),
  theme_switcher: parseEnvFlag("VITE_FLAG_THEME_SWITCHER"),
  modal_unification: parseEnvFlag("VITE_FLAG_MODAL_UNIFICATION"),
  walkthrough_guided: parseEnvFlag("VITE_FLAG_WALKTHROUGH"),
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const override = envOverrides[flag];
  if (override !== undefined) return override;
  return defaultFlags[flag];
}

export function getAllFeatureFlags(): FlagConfig {
  const result: any = {};
  (Object.keys(defaultFlags) as FeatureFlag[]).forEach((k) => {
    result[k] = isFeatureEnabled(k);
  });
  return result as FlagConfig;
}
