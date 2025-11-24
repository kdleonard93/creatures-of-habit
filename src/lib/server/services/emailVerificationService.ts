import { Resend } from 'resend';
import { buildEmailVerificationUrl, getCanonicalBaseUrl } from '$lib/utils/url';

const resendToken = process.env.RESEND_API_KEY;
let resend: Resend | null = null;
if (resendToken) {
	resend = new Resend(resendToken);
}

const SENDER_EMAIL = process.env.SENDER_EMAIL || 'contact@digitaldopamine.dev';

/**
 * Escapes HTML special characters to prevent XSS in email templates
 */
function escapeHtml(str: string): string {
	return str.replace(/[&<>"']/g, (ch) => (
		ch === '&' ? '&amp;' :
		ch === '<' ? '&lt;' :
		ch === '>' ? '&gt;' :
		ch === '"' ? '&quot;' :
		'&#39;'
	));
}

const APP_NAME = 'Creatures of Habit';
const EMAIL_SUB_FOOTER = 'Building better habits, one creature at a time.';

/**
 * Creates the HTML template for verification email
 */
function createVerificationEmailTemplate(username: string, verificationLink: string): string {
	const safeUsername = escapeHtml(username);
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
						<a href="${verificationLink}" 
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
					<p style="color: #14B8A6; font-size: 13px; word-break: break-all; margin: 10px 0;">
						${verificationLink}
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
					<p style="color: #6B7280; font-size: 12px; margin: 0;">
						${EMAIL_SUB_FOOTER}
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
function createWelcomeEmailTemplate(username: string): string {
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
					<p style="color: #6B7280; font-size: 12px; margin: 0;">
						${EMAIL_SUB_FOOTER}
					</p>
				</div>
			</div>
		</body>
		</html>
	`;
}

/**
 * Send email verification to user
 */
export async function sendVerificationEmail(
	email: string,
	username: string,
	token: string
): Promise<{ success: boolean; error?: string }> {
	if (!resend) {
		console.warn('Resend API key not configured - verification email not sent');
		return { success: false, error: 'Email service not configured' };
	}
	
	try {
		const verificationLink = buildEmailVerificationUrl(token);
		const htmlContent = createVerificationEmailTemplate(username, verificationLink);
		
		await resend.emails.send({
			from: `${APP_NAME} <${SENDER_EMAIL}>`,
			to: email,
			subject: `Verify Your Email - ${APP_NAME}`,
			html: htmlContent
		});
		
		return { success: true };
	} catch (error) {
		console.error('Failed to send verification email:', error);
		return { success: false, error: 'Failed to send email' };
	}
}

/**
 * Send welcome email after successful verification
 */
export async function sendWelcomeEmail(
	email: string,
	username: string
): Promise<{ success: boolean; error?: string }> {
	if (!resend) {
		console.warn('Resend API key not configured - welcome email not sent');
		return { success: false, error: 'Email service not configured' };
	}
	
	try {
		const htmlContent = createWelcomeEmailTemplate(username);
		
		await resend.emails.send({
			from: `${APP_NAME} <${SENDER_EMAIL}>`,
			to: email,
			subject: `🎉 Welcome to ${APP_NAME}!`,
			html: htmlContent
		});
		
		return { success: true };
	} catch (error) {
		console.error('Failed to send welcome email:', error);
		return { success: false, error: 'Failed to send email' };
	}
}