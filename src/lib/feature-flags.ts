/** Public-launch switches. Environment values may disable a surface for an emergency rollback. */
function enabled(value: string | undefined): boolean {
  return value == null ? true : value !== "false";
}

export const PUBLIC_LAUNCH_FEATURES = Object.freeze({
  studio: enabled(import.meta.env.VITE_PUBLIC_STUDIO_ENABLED),
  myUseCases: enabled(import.meta.env.VITE_PUBLIC_MY_USE_CASES_ENABLED),
  boards: enabled(import.meta.env.VITE_PUBLIC_BOARDS_ENABLED),
  lifecycleAnalytics: enabled(import.meta.env.VITE_PUBLIC_LIFECYCLE_ANALYTICS_ENABLED),
  /**
   * Tenancy v2 surfaces (workspace switcher, member management).
   * OFF by default — the data foundation ships before any UI does.
   */
  tenancyV2: import.meta.env.VITE_TENANCY_V2_ENABLED === "true",
});