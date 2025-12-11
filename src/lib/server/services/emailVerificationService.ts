import { buildEmailVerificationUrl, getCanonicalBaseUrl } from '$lib/utils/url';
import { escapeHtml } from '$lib/utils/html';
import { z } from 'zod';
import type { EmailProvider } from '$lib/types';
import { ResendEmailProvider } from './email/ResendEmailProvider';

// Default configuration
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
const APP_NAME = 'Creatures of Habit';
const EMAIL_SUB_FOOTER = 'Building better habits, one creature at a time.';
const COMPANY = 'A Digital Dopamine App';

// Initialize default provider
const defaultEmailProvider = new ResendEmailProvider(process.env.RESEND_API_KEY);

// Validation schemas
const emailSchema = z.string().email('Invalid email format').max(255);
const usernameSchema = z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');
const tokenSchema = z.string().min(1, 'Token is required');

/**
 * Creates the HTML template for verification email
 */
export function createVerificationEmailTemplate(username: string, verificationLink: string): string {
    const safeUsername = escapeHtml(username);
    const safeLink = escapeHtml(verificationLink);
    const baseUrl = getCanonicalBaseUrl();
    const logoUrl = `${baseUrl}/logo.png`;
    
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #111827;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #1F2937;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #E09F3E 0%, #D97706 100%); padding: 40px 20px; text-align: center;">
                    <img src="${logoUrl}" alt="${APP_NAME}" style="max-width: 100px; height: auto; margin-bottom: 10px;" />
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px; background-color: #1F2937;">
                    <h2 style="color: #F9FAFB; margin: 0 0 20px 0; font-size: 24px;">Welcome, ${safeUsername}! 🎉</h2>
                    <p style="color: #D1D5DB; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                        Thank you for joining ${APP_NAME}! We're excited to have you on this journey to build better habits.
                    </p>
                    <p style="color: #D1D5DB; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                        To get started, please verify your email address by clicking the button below:
                    </p>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${safeLink}" 
                           style="display: inline-block; 
                                  padding: 14px 32px; 
                                  background: linear-gradient(135deg, #E09F3E 0%, #D97706 100%); 
                                  color: #ffffff; 
                                  text-decoration: none; 
                                  border-radius: 8px; 
                                  font-weight: 600;
                                  font-size: 16px;
                                  box-shadow: 0 4px 12px rgba(224, 159, 62, 0.4);">
                            Verify Email Address
                        </a>
                    </div>
                    
                    <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                        Or copy and paste this link into your browser:
                    </p>
                    <p style="color: #1424b8ff; font-size: 13px; word-break: break-all; margin: 10px 0;">
                        <a href="${safeLink}" style="color: #1424b8ff; text-decoration: none;">${safeLink}</a>
                    </p>
                    
                    <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #374151;">
                        <p style="color: #9CA3AF; font-size: 13px; line-height: 1.6; margin: 0;">
                            <strong>⏰ This link will expire in 24 hours</strong> for your security.
                        </p>
                        <p style="color: #9CA3AF; font-size: 13px; line-height: 1.6; margin: 10px 0 0 0;">
                            If you didn't create an account with ${APP_NAME}, you can safely ignore this email.
                        </p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #111827; padding: 30px; text-align: center; border-top: 1px solid #374151;">
                    <p style="color: #9CA3AF; font-size: 14px; margin: 0 0 10px 0;">
                        <strong>${APP_NAME}</strong>
                    </p>
                    <p style="color: #6B7280; font-size: 12px; margin: 0 0 5px 0;">
                        ${EMAIL_SUB_FOOTER}
                    </p>
                    <p style="color: #6B7280; font-size: 11px; margin: 0;">
                        ${COMPANY}
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
}

/**
 * Creates the HTML template for welcome email (sent after verification)
 */
export function createWelcomeEmailTemplate(username: string): string {
    const safeUsername = escapeHtml(username);
    const baseUrl = getCanonicalBaseUrl();
    const logoUrl = `${baseUrl}/logo.png`;
    
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to ${APP_NAME}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #111827;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #1F2937;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #E09F3E 0%, #D97706 100%); padding: 40px 20px; text-align: center;">
                    <img src="${logoUrl}" alt="${APP_NAME}" style="max-width: 100px; height: auto; margin-bottom: 10px;" />
                    <h1 style="color: #ffffff; margin: 10px 0 0 0; font-size: 28px; font-weight: 600;">You're All Set!</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px; background-color: #1F2937;">
                    <h2 style="color: #F9FAFB; margin: 0 0 20px 0; font-size: 24px;">Welcome aboard, ${safeUsername}!</h2>
                    <p style="color: #D1D5DB; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                        Your email has been verified and your account is fully activated!
                    </p>
                    
                    <div style="background-color: #111827; border-left: 4px solid #E09F3E; padding: 20px; margin: 30px 0;">
                        <h3 style="color: #F9FAFB; margin: 0 0 15px 0; font-size: 18px;">🚀 Quick Start Guide</h3>
                        <ul style="color: #D1D5DB; line-height: 1.8; margin: 0; padding-left: 20px;">
							<li>Create your first habit to start tracking</li>
							<li>Complete daily quests to earn EXP and level up your creature</li>
							<li>Earn stat boost points to customize your character</li>
							<li>Build streaks to unlock achievements</li>
						</ul>
					</div>
					
					<p style="color: #D1D5DB; line-height: 1.6; margin: 20px 0; font-size: 16px;">
						Remember: Small, consistent actions lead to extraordinary results. We're here to support you every step of the way.
					</p>
					
					<p style="color: #D1D5DB; line-height: 1.6; margin: 20px 0 0 0; font-size: 16px;">
						Happy habit building! ✌️
					</p>
				</div>
				
				<!-- Footer -->
				<div style="background-color: #111827; padding: 30px; text-align: center; border-top: 1px solid #374151;">
					<p style="color: #9CA3AF; font-size: 14px; margin: 0 0 10px 0;">
						<strong>${APP_NAME}</strong>
					</p>
					<p style="color: #6B7280; font-size: 12px; margin: 0 0 5px 0;">
						${EMAIL_SUB_FOOTER}
					</p>
					<p style="color: #6B7280; font-size: 11px; margin: 0;">
						${COMPANY}
					</p>
				</div>
			</div>
		</body>
		</html>
	`;
}

/**
 * Service class for handling email verification
 */
export class EmailVerificationService {
    constructor(private emailProvider: EmailProvider) {}

    async sendVerificationEmail(
        email: string,
        username: string,
        token: string
    ): Promise<{ success: boolean; error?: string }> {
        // Validate inputs using Zod
        const emailValidation = emailSchema.safeParse(email);
        if (!emailValidation.success) {
            return { success: false, error: emailValidation.error.errors[0].message };
        }
        
        const usernameValidation = usernameSchema.safeParse(username);
        if (!usernameValidation.success) {
            return { success: false, error: usernameValidation.error.errors[0].message };
        }
        
        const tokenValidation = tokenSchema.safeParse(token);
        if (!tokenValidation.success) {
            return { success: false, error: tokenValidation.error.errors[0].message };
        }
        
        try {
            const verificationLink = buildEmailVerificationUrl(token);
            const htmlContent = createVerificationEmailTemplate(username, verificationLink);
            
            return await this.emailProvider.sendEmail({
                from: `${APP_NAME} <${SENDER_EMAIL}>`,
                to: email,
                subject: `Verify Your Email - ${APP_NAME}`,
                html: htmlContent
            });
        } catch (error) {
            console.error('Failed to send verification email:', error);
            return { success: false, error: 'Failed to send email' };
        }
    }

    async sendWelcomeEmail(
        email: string,
        username: string
    ): Promise<{ success: boolean; error?: string }> {
        // Validate inputs using Zod
        const emailValidation = emailSchema.safeParse(email);
        if (!emailValidation.success) {
            return { success: false, error: emailValidation.error.errors[0].message };
        }
        
        const usernameValidation = usernameSchema.safeParse(username);
        if (!usernameValidation.success) {
            return { success: false, error: usernameValidation.error.errors[0].message };
        }
        
        try {
            const htmlContent = createWelcomeEmailTemplate(username);
            
            return await this.emailProvider.sendEmail({
                from: `${APP_NAME} <${SENDER_EMAIL}>`,
                to: email,
                subject: `🎉 Welcome to ${APP_NAME}!`,
                html: htmlContent
            });
        } catch (error) {
            console.error('Failed to send welcome email:', error);
            return { success: false, error: 'Failed to send email' };
        }
    }
}

// Export singleton for backward compatibility
const emailService = new EmailVerificationService(defaultEmailProvider);

export const sendVerificationEmail = emailService.sendVerificationEmail.bind(emailService);
export const sendWelcomeEmail = emailService.sendWelcomeEmail.bind(emailService);