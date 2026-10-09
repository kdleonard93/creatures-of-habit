/**
 * Server entry point for the stats system.
 *
 * The implementation lives in `$lib/shared/stats` (the single source of truth)
 * so the server and client cannot diverge. This module re-exports it to keep
 * existing imports working. See `docs/stats-design.md`.
 */
export * from '$lib/shared/stats';
