import { z } from 'zod';

/**
 * Shared validation for habit write bodies (create and full update).
 *
 * See docs/reports/01-server-api.md S-1: both habit write endpoints previously
 * cast the raw request body to `HabitData` with no schema, so `difficulty`,
 * dates, and `customFrequency.days` were written unvalidated. Keep the accepted
 * shape aligned with `HabitData` (src/lib/types.ts) and the habit form.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string): boolean {
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

const dateOnly = (label: string) =>
	z
		.string()
		.regex(DATE_ONLY, `${label} must be a date in YYYY-MM-DD format`)
		.refine(isCalendarDate, `${label} must be a valid calendar date`);

export const habitWriteSchema = z
	.object({
		title: z
			.string()
			.trim()
			.min(1, 'Title is required')
			.max(200, 'Title must be 200 characters or fewer'),
		description: z
			.string()
			.max(2000, 'Description must be 2000 characters or fewer')
			.nullable()
			.optional(),
		difficulty: z.enum(['easy', 'medium', 'hard'], {
			errorMap: () => ({ message: 'Difficulty must be easy, medium, or hard' })
		}),
		frequency: z.enum(['daily', 'weekly', 'custom'], {
			errorMap: () => ({ message: 'Frequency must be daily, weekly, or custom' })
		}),
		startDate: dateOnly('Start date'),
		endDate: z.preprocess(
			(value) => (value === '' || value === null ? undefined : value),
			dateOnly('End date').optional()
		),
		categoryId: z
			.string()
			.min(1, 'Category id must not be empty')
			.max(100, 'Category id is too long')
			.nullable()
			.optional(),
		customFrequency: z
			.object({
				days: z
					.array(
						z
							.number()
							.int('Frequency days must be whole numbers')
							.min(0, 'Frequency days must be between 0 and 6')
							.max(6, 'Frequency days must be between 0 and 6')
					)
					.optional()
			})
			.nullable()
			.optional()
	})
	.superRefine((data, ctx) => {
		if (data.frequency === 'custom' && (data.customFrequency?.days?.length ?? 0) === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Custom frequency requires at least one day',
				path: ['customFrequency', 'days']
			});
		}
	});

export type HabitWriteInput = z.infer<typeof habitWriteSchema>;

/** The archive/restore branch accepts only a single, boolean `isArchived`. */
export const habitArchiveSchema = z.object({ isArchived: z.boolean() });

/** The first human-readable validation message, for a 400 response body. */
export function firstZodMessage(error: z.ZodError): string {
	return error.issues[0]?.message ?? 'Invalid habit data';
}
