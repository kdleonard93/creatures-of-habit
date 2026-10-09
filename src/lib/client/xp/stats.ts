/**
 * Client entry point for the stats system.
 *
 * The implementation lives in `$lib/shared/stats` (the single source of truth).
 * The previous divergent client copy has been deleted; this module re-exports
 * the shared functions so character creation and the server agree. See
 * `docs/stats-design.md` and `docs/reports/05-correctness.md` C-4.
 */
export * from '$lib/shared/stats';
