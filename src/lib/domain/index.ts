/**
 * UseCasesX™ domain layer.
 *
 * Import services from here rather than reaching for the Supabase client in
 * components. See `docs/architecture/domain-boundaries.md`.
 */
export * from "./errors";
export * from "./ownership";
export * from "./validation";
export * as admin from "./admin.repository";
export * as portfolios from "./portfolios.repository";
export * as savedUseCases from "./saved-use-cases.repository";
export * as studio from "./studio.repository";
