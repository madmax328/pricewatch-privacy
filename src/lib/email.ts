import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'Kidshade <commandes@kidshade.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kidshade.com';

export async function sendOrderShippedEmail(params: {
  to: string;
  childName: string;
  storyTitle: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}) {
  const { to, childName, storyTitle, carrier, trackingNumber, trackingUrl } = params;

  const trackingLine = trackingUrl
    ? `<p style="margin:16px 0;"><a href="${trackingUrl}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block;">Suivre mon colis →</a></p>`
    : trackingNumber
    ? `<p style="color:#6b7280;font-size:14px;">Numéro de suivi${carrier ? ` (${carrier})` : ''} : <strong>${trackingNumber}</strong></p>`
    : '';

  await resend.emails.send({
    from: FROM,
    to,
    subject: `📦 Votre livre "${storyTitle}" est en route !`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="text-align:center;margin-bottom:32px;">
          <span style="font-size:32px;">📚</span>
          <h1 style="color:#7c3aed;font-size:24px;margin:8px 0;">Kidshade</h1>
        </div>
        <h2 style="color:#111827;font-size:20px;margin-bottom:8px;">Votre livre est parti !</h2>
        <p style="color:#374151;line-height:1.6;">
          Le livre <strong>"${storyTitle}"</strong> pour <strong>${childName}</strong> a été expédié et est en route vers vous. 🎉
        </p>
        ${trackingLine}
        <p style="color:#6b7280;font-size:14px;margin-top:24px;">
          Vous pouvez aussi suivre l'état de votre commande directement sur
          <a href="${APP_URL}/fr/account" style="color:#7c3aed;">votre compte Kidshade</a>.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          © ${new Date().getFullYear()} Kidshade — Des histoires magiques pour les enfants
        </p>
      </div>
    `,
  });
}

export async function sendOrderConfirmationEmail(params: {
  to: string;
  childName: string;
  storyTitle: string;
  amountPaid: number;
}) {
  const { to, childName, storyTitle, amountPaid } = params;
  const amount = (amountPaid / 100).toFixed(2);

  await resend.emails.send({
    from: FROM,
    to,
    subject: `✅ Commande confirmée — "${storyTitle}"`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="text-align:center;margin-bottom:32px;">
          <span style="font-size:32px;">📚</span>
          <h1 style="color:#7c3aed;font-size:24px;margin:8px 0;">Kidshade</h1>
        </div>
        <h2 style="color:#111827;font-size:20px;margin-bottom:8px;">Merci pour votre commande !</h2>
        <p style="color:#374151;line-height:1.6;">
          Votre commande du livre <strong>"${storyTitle}"</strong> pour <strong>${childName}</strong> a bien été reçue.
        </p>
        <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:24px 0;">
          <p style="margin:0;color:#374151;"><strong>Montant payé :</strong> ${amount}€</p>
          <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">Le livre est envoyé en impression. Vous recevrez un email dès l'expédition avec le numéro de suivi.</p>
        </div>
        <p style="color:#6b7280;font-size:14px;">
          Suivez votre commande sur
          <a href="${APP_URL}/fr/account" style="color:#7c3aed;">votre compte Kidshade</a>.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          © ${new Date().getFullYear()} Kidshade — Des histoires magiques pour les enfants
        </p>
      </div>
    `,
  });
}
