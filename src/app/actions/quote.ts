'use server';

import { getPayload } from 'payload';
import config from '@payload-config';
import { Resend } from 'resend';
import { SITE_EMAIL, SITE_PHONE } from '@/lib/site';

const TO = SITE_EMAIL;
// Until the domain is DNS-verified in Resend, `EMAIL_FROM` can be set to a
// verified address (e.g. onboarding@resend.dev for testing). We default to
// the HPM address because that's what Tom wants in production.
const FROM =
  process.env.EMAIL_FROM ||
  process.env.CONTACT_FORM_FROM ||
  'HPM Quote Form <quotes@hampshirepaddockmanagement.com>';

export type QuoteState = {
  ok: boolean;
  message: string;
};

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function submitQuote(
  _prev: QuoteState | undefined,
  formData: FormData,
): Promise<QuoteState> {
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const emailRaw = String(formData.get('email') ?? '').trim();
  const email = emailRaw && isEmail(emailRaw) ? emailRaw : '';
  const location = String(formData.get('location') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const serviceSlug = String(formData.get('serviceSlug') ?? '').trim();
  const serviceTitle = String(formData.get('serviceTitle') ?? '').trim();
  // Honeypot — should always be empty; bots fill it.
  const trap = String(formData.get('website') ?? '').trim();

  if (trap) {
    return { ok: true, message: 'Thanks — we’ll be in touch.' };
  }
  if (!name || !phone || !location) {
    return { ok: false, message: 'Please fill in name, phone, and location.' };
  }

  // 1) Persist as an Enquiry so nothing is lost if email fails
  try {
    const payload = await getPayload({ config });
    // Look up the referenced service if slug provided
    let serviceId: number | undefined;
    if (serviceSlug) {
      const s = await payload.find({
        collection: 'services',
        where: { slug: { equals: serviceSlug } },
        limit: 1,
        depth: 0,
      });
      const raw = s.docs[0]?.id;
      if (typeof raw === 'number') serviceId = raw;
    }
    await payload.create({
      collection: 'enquiries',
      data: {
        name,
        // Enquiries.email is required in the schema; fall back to a
        // syntactically valid `.invalid` placeholder if none supplied.
        email: email || `no-email-${Date.now()}@placeholder.invalid`,
        phone,
        location,
        message: message || '(none)',
        service: serviceId,
        status: 'new',
      },
    });
  } catch (err) {
    console.warn('[quote] payload persist failed:', (err as Error).message);
    // continue to try email — better to get the lead than drop it
  }

  // 2) Send Tom an email via Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[quote] RESEND_API_KEY missing — cannot send email');
    return { ok: false, message: `Sorry — our form is misconfigured. Please call ${SITE_PHONE}.` };
  }

  const resend = new Resend(apiKey);
  const displayTitle = serviceTitle || (serviceSlug ? humanise(serviceSlug) : 'Paddock work');
  // Reply-to goes to the enquirer when they gave us an email; otherwise to
  // Tom so pressing Reply in his client lands in the right place (and not
  // back at the HPM sending domain).
  const replyTo = email || TO;

  try {
    await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo,
      subject: `Quote: ${displayTitle} — ${name}`,
      text: [
        `Quote request via the website.`,
        ``,
        `Service: ${displayTitle}${serviceSlug ? ` (${serviceSlug})` : ''}`,
        `Name:    ${name}`,
        `Phone:   ${phone}`,
        `Email:   ${email || '(not provided)'}`,
        `Area:    ${location}`,
        ``,
        `Message:`,
        message || '(none)',
      ].join('\n'),
    });
  } catch (err) {
    console.error('[quote] Resend send failed:', (err as Error).message);
    return {
      ok: false,
      message: `Sorry — we couldn’t send that. Please call ${SITE_PHONE} or email ${SITE_EMAIL}.`,
    };
  }

  return {
    ok: true,
    message: 'Thanks — we’ll be in touch within 24 hours.',
  };
}

function humanise(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
