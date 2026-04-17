/**
 * Feature Flag system for Kagerou/PULSE redesign rollout.
 *
 * Usage:
 *   const flags = useFeatureFlags();
 *   if (flags.new_dashboard) return <NewDashboard />;
 *   return <Dashboard />;
 *
 * Override via URL: ?ff=new_dashboard,new_command_palette
 * Override via localStorage: localStorage.setItem('featureFlags', JSON.stringify({new_dashboard: true}))
 */

export type FeatureFlag =
  | 'new_ui_enabled'        // Global kill switch for all v2 UI
  | 'new_dashboard'         // New Command Center dashboard
  | 'new_command_palette'   // Enhanced Cmd+K with action execution
  | 'new_inbox'             // Unified inbox
  | 'copilot_readonly'      // Read-only AI Copilot panel
  | 'copilot_mutation'      // Full AI Copilot with mutations
  | 'new_brand_tokens'      // PULSE design tokens active
  | 'pulse_green_primary'   // Swap primary color to PULSE green
  | 'mobile_bottom_nav'     // Mobile bottom navigation
  | 'swipe_review'          // Swipe-to-act post review
  | 'generative_ui';        // Generative UI artifacts

// Default states (all off for safety)
const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  new_ui_enabled: false,
  new_dashboard: false,
  new_command_palette: false,
  new_inbox: false,
  copilot_readonly: false,
  copilot_mutation: false,
  new_brand_tokens: false,
  pulse_green_primary: false,
  mobile_bottom_nav: false,
  swipe_review: false,
  generative_ui: false,
};

function parseUrlFlags(): Partial<Record<FeatureFlag, boolean>> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const ff = params.get('ff');
  if (!ff) return {};
  const out: Partial<Record<FeatureFlag, boolean>> = {};
  ff.split(',').forEach(name => {
    const trimmed = name.trim() as FeatureFlag;
    if (trimmed) out[trimmed] = true;
  });
  return out;
}

function parseLocalStorageFlags(): Partial<Record<FeatureFlag, boolean>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('featureFlags');
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<FeatureFlag, boolean>>;
  } catch {
    return {};
  }
}

export function getFeatureFlags(): Record<FeatureFlag, boolean> {
  return {
    ...DEFAULT_FLAGS,
    ...parseLocalStorageFlags(),
    ...parseUrlFlags(),
  };
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const flags = getFeatureFlags();
  return !!flags[flag];
}

export function setFeatureFlag(flag: FeatureFlag, value: boolean): void {
  if (typeof window === 'undefined') return;
  const current = parseLocalStorageFlags();
  localStorage.setItem('featureFlags', JSON.stringify({ ...current, [flag]: value }));
  window.location.reload();
}

export function clearFeatureFlags(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('featureFlags');
  window.location.reload();
}
