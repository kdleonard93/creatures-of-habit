import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { db } from "$lib/server/db";
import { Resend } from "resend";
import "dotenv/config";
import type { ContactFormData } from "$lib/types";
import {contacts} from "$lib/server/db/schema";

const resendToken = process.env.RESEND_API_KEY;

// Create Resend instance
let resend: Resend | null = null;
if (resendToken) {
  resend = new Resend(resendToken);
}

export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const name = data.get("name")?.toString();
    const email = data.get("email")?.toString();
    const message = data.get("message")?.toString();
    
    // Create form data object with proper typing
    const formData: Partial<ContactFormData> = {
      name,
      email,
      message
    };

    if (!name || !email || !message) {
      return fail(400, {
        error: "All fields are required",
        data: formData,
      });
    }

    try {
      // Send email using Resend
      if (resend) {
        await resend.emails.send({
          from: "Contact Form <no-reply@digitaldopamine.dev>",
          to: "contact@digitaldopamine.dev",
          subject: `New Contact Form Submission from ${name}`,
          text: `
          Name: ${name}
          Email: ${email}
          Message: ${message}
          `,
          replyTo: email,
        });
      } else {
        console.info('Email sending skipped - Resend API key not configured');
      }

        // Save to db
        await db.insert(contacts).values({
            name,
            email,
            message,
            createdAt: new Date().toISOString()
        });


      return {
        success: true,
        message: "Thank you for your message. We will get back to you soon!",
      };
    } catch (error) {
      console.error("Failed to send message:", error);
      return fail(500, {
        error: "Failed to send message. Please try again later.",
        data: formData,
      });
    }
  },
} satisfies Actions;
