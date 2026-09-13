export type Mail = { id: string; to: string; subject: string; text: string };
export type Delivery = {
  status: 'accepted' | 'failed' | 'unknown';
  providerId?: string;
};
export type MailSender = (mail: Mail) => Promise<Delivery>;
export const sendMail: MailSender = async (mail) => {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM)
    return { status: 'failed' };
  const body = JSON.stringify({
    from: process.env.MAIL_FROM,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
  });
  const deadline = Date.now() + 8000;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'email/' + mail.id,
        },
        body,
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(3900, deadline - Date.now())),
        ),
      });
      if (response.ok) {
        const result = (await response.json()) as { id?: string };
        return {
          status: 'accepted',
          ...(result.id ? { providerId: result.id } : {}),
        };
      }
      if (response.status === 429) {
        const wait = Number(response.headers.get('Retry-After') ?? 1) * 1000;
        if (
          !Number.isFinite(wait) ||
          wait < 0 ||
          Date.now() + wait + 100 >= deadline
        )
          return { status: 'failed' };
        await new Promise((resolve) => setTimeout(resolve, wait));
      } else if (response.status < 500) return { status: 'failed' };
    } catch {
      /* Retry the identical payload/key within this request only. */
    }
    if (Date.now() >= deadline) break;
  }
  return { status: 'unknown' };
};
