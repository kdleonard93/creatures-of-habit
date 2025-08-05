import { config } from 'dotenv';
import { Resend } from 'resend';

// Load environment variables from .env file
config();

// Get the API key from environment variables
const resendToken = process.env.RESEND_API_KEY;

if (resendToken) {
  try {
    const resend = new Resend(resendToken);
    
    // Test sending an email
    // Using Resend's sandbox domain for local testing
    // Note: With sandbox domain, you can only send emails to your verified email address
    const result = await resend.emails.send({
      from: 'Creatures of Habit <onboarding@resend.dev>',
      to: 'kdleonard@icloud.com', // Your verified Resend email address
      subject: 'Test Email from Creatures of Habit',
      html: '<p>This is a test email to verify Resend integration.</p>'
    });
    
    console.log('Test email sent successfully:', result);
  } catch (error) {
    console.error('Error with Resend integration:', error);
  }
} else {
  console.log('RESEND_API_KEY not found in environment variables');
  console.log('Please make sure to set the RESEND_API_KEY environment variable');
}
