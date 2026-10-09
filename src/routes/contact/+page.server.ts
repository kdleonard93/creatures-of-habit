import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { db } from "$lib/server/db";
import { Resend } from "resend";
import "dotenv/config";
import type { ContactFormData } from "$lib/types";
import { contacts } from "$lib/server/db/schema";
import { rateLimit, RateLimitPresets } from "$lib/server/rateLimit";
import { z } from "zod";

const resendToken = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'no-reply@digitaldopamine.dev';

// Create Resend instance
let resend: Resend | null = null;
if (resendToken) {
  resend = new Resend(resendToken);
}

/**
 * Server-side validation for the contact form. `website` is the honeypot and is
 * intentionally accepted as any string so a filled trap can be answered with a
 * silent success instead of a validation error. See docs/reports/06-abuse.md P-1, P-3, P-4.
 */
const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address")
    .max(254, "Email is too long"),
  message: z.string().trim().min(1, "Message is required").max(5000, "Message is too long"),
  website: z.string().optional(),
});

export const actions = {
  default: async (event) => {
    // Shared preset: 3 submissions per hour, keyed by client IP plus path.
    await rateLimit(event, RateLimitPresets.CONTACT);

    const raw = Object.fromEntries(await event.request.formData());

    const formData: Partial<ContactFormData> = {
      name: typeof raw.name === "string" ? raw.name : undefined,
      email: typeof raw.email === "string" ? raw.email : undefined,
      message: typeof raw.message === "string" ? raw.message : undefined,
    };

    const parsed = contactSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(400, {
        error: parsed.error.issues[0]?.message ?? "All fields are required",
        data: formData,
      });
    }

    const { name, email, message, website } = parsed.data;

    // Honeypot: a bot filled the hidden field. Pretend success, store nothing,
    // send nothing, so the trap is not disclosed.
    if (website) {
      return {
        success: true,
        message: "Thank you for your message. We will get back to you soon!",
      };
    }

    try {
      // Send email using Resend
      if (resend) {
        await resend.emails.send({
          from: `Contact Form <${SENDER_EMAIL}>`,
          to: "contact@digitaldopamine.dev",
          // Fixed, non-interpolated subject. The visitor's name never reaches a header.
          subject: "New contact form submission",
          // Plain-text body only. The address is included so the owner can reply
          // deliberately; `replyTo` is the validated, normalized address.
          text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
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
        status: "new",
        createdAt: new Date().toISOString(),
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
