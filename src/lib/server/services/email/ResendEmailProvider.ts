import { Resend } from 'resend';
import type { EmailProvider, EmailOptions } from '$lib/types';

export class ResendEmailProvider implements EmailProvider {
	private resend: Resend | null = null;

	constructor(apiKey: string | undefined) {
		if (apiKey) {
			this.resend = new Resend(apiKey);
		} else {
			console.warn('Resend API key not provided to ResendEmailProvider');
		}
	}

	async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
		if (!this.resend) {
			console.warn('Resend client not initialized - email not sent');
			return { success: false, error: 'Email service not configured' };
		}

		try {
			await this.resend.emails.send({
				from: options.from,
				to: options.to,
				subject: options.subject,
				html: options.html
			});
			return { success: true };
		} catch (error) {
			console.error('Failed to send email via Resend:', error);
			return { success: false, error: 'Failed to send email' };
		}
	}
}
