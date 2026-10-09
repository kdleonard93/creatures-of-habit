import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createVerificationPoller } from '$lib/client/verificationPoller';

describe('createVerificationPoller', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('calls onVerified once and stops once verified', async () => {
		const poll = vi.fn().mockResolvedValue(true);
		const onVerified = vi.fn();
		const poller = createVerificationPoller({ poll, onVerified, baseIntervalMs: 1000 });

		poller.start();
		await vi.advanceTimersByTimeAsync(1000);

		expect(poll).toHaveBeenCalledTimes(1);
		expect(onVerified).toHaveBeenCalledTimes(1);
		expect(poller.stopped).toBe(true);

		await vi.advanceTimersByTimeAsync(5000);
		expect(poll).toHaveBeenCalledTimes(1);
	});

	it('keeps polling until the email is verified', async () => {
		const poll = vi
			.fn()
			.mockResolvedValueOnce(false)
			.mockResolvedValueOnce(false)
			.mockResolvedValueOnce(true);
		const onVerified = vi.fn();
		const poller = createVerificationPoller({ poll, onVerified, baseIntervalMs: 1000 });

		poller.start();
		await vi.advanceTimersByTimeAsync(1000);
		await vi.advanceTimersByTimeAsync(1000);
		await vi.advanceTimersByTimeAsync(1000);

		expect(poll).toHaveBeenCalledTimes(3);
		expect(onVerified).toHaveBeenCalledTimes(1);
	});

	it('backs off exponentially on failure and gives up after the cap without unhandled rejections', async () => {
		const poll = vi.fn().mockRejectedValue(new Error('offline'));
		const onVerified = vi.fn();
		const onGiveUp = vi.fn();
		const poller = createVerificationPoller({
			poll,
			onVerified,
			onGiveUp,
			baseIntervalMs: 100,
			maxIntervalMs: 800,
			maxAttempts: 5
		});

		poller.start();

		await vi.advanceTimersByTimeAsync(100);
		expect(poll).toHaveBeenCalledTimes(1);

		// Next attempt is scheduled 200ms later (backoff doubled).
		await vi.advanceTimersByTimeAsync(199);
		expect(poll).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(poll).toHaveBeenCalledTimes(2);

		// Run out the remaining attempts.
		await vi.advanceTimersByTimeAsync(10000);
		expect(onGiveUp).toHaveBeenCalledTimes(1);
		expect(onVerified).not.toHaveBeenCalled();
		expect(poller.stopped).toBe(true);
	});

	it('pauses while the page is hidden and resumes when visible', async () => {
		const poll = vi.fn().mockResolvedValue(false);
		let hidden = true;
		const poller = createVerificationPoller({
			poll,
			onVerified: vi.fn(),
			baseIntervalMs: 100,
			maxIntervalMs: 800,
			isHidden: () => hidden
		});

		poller.start();
		await vi.advanceTimersByTimeAsync(100);
		expect(poll).not.toHaveBeenCalled();

		hidden = false;
		await vi.advanceTimersByTimeAsync(200);
		expect(poll).toHaveBeenCalledTimes(1);
	});

	it('stop prevents any further polling', async () => {
		const poll = vi.fn().mockResolvedValue(false);
		const poller = createVerificationPoller({ poll, onVerified: vi.fn(), baseIntervalMs: 100 });

		poller.start();
		poller.stop();
		await vi.advanceTimersByTimeAsync(10000);
		expect(poll).not.toHaveBeenCalled();
	});
});
