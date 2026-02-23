import { Webhook } from 'svix'

export interface Env {
  CLERK_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    if (request.method !== 'POST' || url.pathname !== '/api/webhooks/clerk') {
      return new Response('Method Not Allowed or Path Not Found', { status: 405 });
    }

    const payloadString = await request.text();
    const svixHeaders = {
      'svix-id': request.headers.get('svix-id') || '',
      'svix-timestamp': request.headers.get('svix-timestamp') || '',
      'svix-signature': request.headers.get('svix-signature') || ''
    };

    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
    let evt;
    try {
      evt = wh.verify(payloadString, svixHeaders) as any;
    } catch (err) {
      return new Response('Webhook signature verification failed', { status: 400 });
    }

    // Handle the specific 'sms/email created' webhook to intercept OTP messages
    if (evt.type === 'email.created') {
      const emailObj = evt.data;
      const recipient = emailObj.to_email_address;
      const subject = emailObj.subject;
      const body = emailObj.body; // Will contain the OTP code within HTML
      
      // Sending email via Resend
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'OpenCERN Authentication <auth@frugal-hummingbird-911.convex.site>', // This needs to be a verified domain on Resend, fallback to default standard for now or 'onboarding@resend.dev' for sandbox
          to: [recipient],
          subject: subject,
          html: `<div style="font-family: monospace; padding: 20px; background: #080b14; color: #f3f4f6; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #1f1f26;">
                  <h1 style="color: #3b82f6; font-size: 20px;">OpenCERN Desktop Login</h1>
                  <div style="margin: 24px 0;">${body}</div>
                  <hr style="border-color: #232328; margin: 20px 0;">
                  <p style="font-size: 12px; color: #6b7280;">Secure access requested via Clerk Identity.</p>
                 </div>`
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        return new Response(`Failed to send email via Resend: ${errorText}`, { status: 500 });
      }
    }

    return new Response('Webhook received properly', { status: 200 });
  },
};
