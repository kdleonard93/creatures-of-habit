/**
 * Polls the verification status endpoint until the email is verified.
 *
 * Design goals (see docs/audit-backlog.md O-8):
 * - Never produce an unhandled promise rejection. Every failure is caught.
 * - Back off exponentially on failure instead of hammering every 5 seconds.
 * - Stop after a cap of consecutive failures so a broken network does not poll
 *   forever.
 * - Pause (and back off) while the tab is hidden.
 * - Stop immediately once verification succeeds.
 *
 * The timing primitives are injectable so the behavior is unit testable.
 */
export interface VerificationPollerOptions {
	/** Resolves true when the email is verified, false otherwise. May throw. */
	poll: () => Promise<boolean>;
	/** Called once when verification succeeds. */
	onVerified: () => void;
	/** Called once when the failure cap is reached. */
	onGiveUp?: () => void;
	/** Base interval between polls in milliseconds. Defaults to 5000. */
	baseIntervalMs?: number;
	/** Maximum backoff interval in milliseconds. Defaults to 60000. */
	maxIntervalMs?: number;
	/** Number of consecutive failures before giving up. Defaults to 20. */
	maxAttempts?: number;
	/** Returns true when the page is hidden. Defaults to always visible. */
	isHidden?: () => boolean;
	setTimer?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
	clearTimer?: (id: ReturnType<typeof setTimeout>) => void;
}

export interface VerificationPoller {
	start(): void;
	stop(): void;
	readonly stopped: boolean;
}

export function createVerificationPoller(options: VerificationPollerOptions): VerificationPoller {
	const base = options.baseIntervalMs ?? 5000;
	const max = options.maxIntervalMs ?? 60000;
	const maxAttempts = options.maxAttempts ?? 20;
	const isHidden = options.isHidden ?? (() => false);
	const setTimer = options.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
	const clearTimer = options.clearTimer ?? ((id: ReturnType<typeof setTimeout>) => clearTimeout(id));

	let stopped = false;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let delay = base;
	let failures = 0;

	function schedule() {
		if (stopped) return;
		timer = setTimer(tick, delay);
	}

	async function tick() {
		if (stopped) return;

		if (isHidden()) {
			delay = Math.min(delay * 2, max);
			schedule();
			return;
		}

		try {
			const verified = await options.poll();
			if (stopped) return;
			failures = 0;
			delay = base;
			if (verified) {
				stopped = true;
				options.onVerified();
				return;
			}
		} catch {
			if (stopped) return;
			failures += 1;
			delay = Math.min(delay * 2, max);
		}

		if (stopped) return;
		if (failures >= maxAttempts) {
			stopped = true;
			options.onGiveUp?.();
			return;
		}
		schedule();
	}

	return {
		start() {
			if (stopped || timer !== null) return;
			schedule();
		},
		stop() {
			stopped = true;
			if (timer !== null) {
				clearTimer(timer);
				timer = null;
			}
		},
		get stopped() {
			return stopped;
		}
	};
}
