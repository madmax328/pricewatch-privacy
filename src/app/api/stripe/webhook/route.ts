import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { stripe } from '@/lib/stripe';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import BookOrder from '@/models/BookOrder';
import Story from '@/models/Story';
import PromoCode from '@/models/PromoCode';
import Stripe from 'stripe';
import { generateInteriorPdf, generateCoverPdf } from '@/lib/pdf-generator';
import { createLuluPrintJob } from '@/lib/lulu';
import { put } from '@vercel/blob';
import { sendOrderConfirmationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature error:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  await connectToDatabase();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as 'premium' | 'superpremium' | undefined;
      if (!userId) break;

      if (session.mode === 'subscription' && plan) {
        await User.findByIdAndUpdate(userId, {
          plan,
          stripeSubscriptionId: session.subscription as string,
        });
        // Increment promo code usage if any
        const promoCode = session.metadata?.promoCode;
        if (promoCode) {
          await PromoCode.findOneAndUpdate({ code: promoCode }, { $inc: { usedCount: 1 } });
        }
      }

      if (session.mode === 'payment' && session.metadata?.type === 'book') {
        const storyId = session.metadata?.storyId;
        const promoCode = session.metadata?.promoCode;
        const discountAmount = parseInt(session.metadata?.discountAmount || '0');

        if (!storyId) break;

        const [user, story] = await Promise.all([
          User.findById(userId),
          Story.findById(storyId),
        ]);

        if (!user || !story) break;

        const addr = user.deliveryAddress;
        if (!addr) break;

        const deliveryAddress = {
          firstName: addr.firstName || '',
          lastName: addr.lastName || '',
          address: addr.address || '',
          city: addr.city || '',
          postalCode: addr.postalCode || '',
          country: addr.country || '',
          phone: addr.phone || '',
        };

        // Create BookOrder
        const bookOrder = await BookOrder.create({
          userId,
          storyId,
          storyTitle: story.title,
          childName: story.childName,
          deliveryAddress,
          amountPaid: session.amount_total || 2999,
          currency: session.currency || 'eur',
          promoCode: promoCode || undefined,
          discountAmount: discountAmount || 0,
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent as string | undefined,
          status: 'paid',
          paidAt: new Date(),
        });

        // Mark story as having a print order
        await Story.findByIdAndUpdate(storyId, { printOrdered: true });

        // Send order confirmation email
        try {
          await sendOrderConfirmationEmail({
            to: user.email,
            childName: story.childName,
            storyTitle: story.title,
            amountPaid: session.amount_total || 2999,
          });
        } catch (emailErr) {
          console.error('[Webhook] Order confirmation email failed:', emailErr);
          // Non-fatal
        }

        // Increment promo usage
        if (promoCode) {
          await PromoCode.findOneAndUpdate({ code: promoCode }, { $inc: { usedCount: 1 } });
        }

        // Generate a unique loyalty promo code for this customer
        const loyaltyCode = generateLoyaltyCode();
        try {
          await PromoCode.create({
            code: loyaltyCode,
            discountType: 'percent',
            discountValue: 5,
            appliesTo: 'book',
            maxUses: 1,
            active: true,
          });
          await BookOrder.findByIdAndUpdate(bookOrder._id, { loyaltyPromoCode: loyaltyCode });
        } catch (err) {
          console.error('[Loyalty] Failed to create promo code:', err);
          // Non-fatal: continue without loyalty code
        }

        // Convert illustrationUrls Map to plain object
        const illustrationUrlsObj: Record<number, string> = {};
        if (story.illustrationUrls) {
          story.illustrationUrls.forEach((url: string, key: string) => {
            const idx = parseInt(key);
            if (!isNaN(idx)) illustrationUrlsObj[idx] = url;
          });
        }

        // Submit to Lulu — use waitUntil so Vercel keeps the function alive
        // until PDF generation + Lulu API call complete, without blocking the Stripe response
        waitUntil(
          submitToLulu({
            orderId: String(bookOrder._id),
            userEmail: user.email,
            storyTitle: story.title,
            childName: story.childName,
            childAge: story.childAge || 6,
            storyContent: story.content,
            theme: story.theme || 'space',
            language: story.language || story.locale || 'fr',
            childAvatar: story.childAvatar,
            storyId: String(story._id),
            address: deliveryAddress,
            illustrationUrls: illustrationUrlsObj,
            loyaltyPromoCode: loyaltyCode,
          }).catch((err) => console.error('[Lulu] submission failed:', err))
        );
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const isActive = subscription.status === 'active';
      const item = subscription.items.data[0] as unknown as { current_period_end?: number };
      const periodEndTs = item?.current_period_end ?? (subscription as unknown as { current_period_end?: number }).current_period_end;
      const periodEnd = periodEndTs ? new Date(periodEndTs * 1000) : null;

      const priceId = subscription.items.data[0]?.price.id;
      let plan: 'free' | 'premium' | 'superpremium' = 'free';
      if (isActive) {
        if (priceId === process.env.STRIPE_SUPERPREMIUM_PRICE_ID) {
          plan = 'superpremium';
        } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
          plan = 'premium';
        }
      }

      await User.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        { plan, stripeCurrentPeriodEnd: periodEnd }
      );
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as { subscription?: string }).subscription;
      if (!subscriptionId) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const periodEnd = new Date(subscription.current_period_end * 1000);
      const priceId = subscription.items.data[0]?.price.id;

      let plan: 'premium' | 'superpremium' = 'premium';
      if (priceId === process.env.STRIPE_SUPERPREMIUM_PRICE_ID) {
        plan = 'superpremium';
      }

      await User.findOneAndUpdate(
        { stripeSubscriptionId: subscriptionId },
        { plan, stripeCurrentPeriodEnd: periodEnd }
      );
      break;
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      const subscription = event.data.object as Stripe.Subscription;
      await User.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        { plan: 'free', stripeSubscriptionId: null, stripeCurrentPeriodEnd: null }
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}

// ── Illustration pre-fill ─────────────────────────────────────────────────────
const STORY_PAGES = 26;

function splitChunks(content: string, count: number): string[] {
  const paragraphs = content.split('\n\n').map(p => p.trim()).filter(Boolean);
  const chunks: string[] = [...paragraphs];
  while (chunks.length < count) {
    let li = 0;
    for (let i = 1; i < chunks.length; i++) if (chunks[i].length > chunks[li].length) li = i;
    const sents = chunks[li].match(/[^.!?]+[.!?]+\s*/g) ?? [chunks[li]];
    if (sents.length <= 1) break;
    const mid = Math.ceil(sents.length / 2);
    chunks.splice(li, 1, sents.slice(0, mid).join('').trim(), sents.slice(mid).join('').trim());
  }
  while (chunks.length < count) chunks.push('');
  return chunks;
}

function buildIllustrationPrompt(params: {
  childName: string;
  childAge: number;
  theme: string;
  childAvatar?: { gender: 'boy' | 'girl'; hair: string; skin: string };
  pageContent: string;
  isCover: boolean;
}): string {
  const { childName, childAge, theme, childAvatar, pageContent, isCover } = params;
  const gender = childAvatar?.gender === 'girl' ? 'little girl' : 'little boy';
  const skinMap: Record<string, string> = {
    fair: 'very fair pale skin', light: 'light skin', medium: 'medium brown skin',
    tan: 'dark tan skin', dark: 'very dark brown skin',
  };
  const hairMap: Record<string, string> = {
    blonde: 'blonde hair', brown: 'brown hair', black: 'black hair', red: 'red hair', white: 'white hair',
  };
  const skinDesc = childAvatar ? (skinMap[childAvatar.skin] ?? `${childAvatar.skin} skin`) : '';
  const hairDesc = childAvatar ? (hairMap[childAvatar.hair] ?? `${childAvatar.hair} hair`) : '';
  const traits = skinDesc && hairDesc ? `${skinDesc}, ${hairDesc}` : '';
  const character = traits ? `${gender} with ${traits}, named ${childName}` : `${gender} named ${childName}`;
  const scene = isCover ? `${theme} adventure, magical landscape` : pageContent.slice(0, 80).replace(/[^\w\s,.']/gi, '').trim() || `${theme} scene`;
  const styleAge = childAge <= 4
    ? "children's picture book illustration, watercolor, soft pastel colors, bright white background, very cute, simple shapes, cheerful warm lighting"
    : childAge <= 7
    ? "children's book illustration, colorful watercolor, bright white or light background, whimsical, friendly characters, soft natural lighting"
    : "illustrated storybook, digital painting, vibrant colors, bright background, adventurous, detailed, warm natural lighting";
  return `${styleAge}, ${character}, ${scene}`;
}

async function prefillIllustrations(params: {
  storyId: string;
  storyContent: string;
  childName: string;
  childAge: number;
  theme: string;
  childAvatar?: { gender: 'boy' | 'girl'; hair: string; skin: string };
  existing: Record<number, string>;
  hfToken: string;
}): Promise<Record<number, string>> {
  const { storyId, storyContent, childName, childAge, theme, childAvatar, existing, hfToken } = params;
  const result: Record<number, string> = { ...existing };
  const chunks = splitChunks(storyContent, STORY_PAGES);
  const HF_URL = 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell';
  const NO_TEXT = 'no text, no words, no letters, no watermark, no writing, no alphabet, no signs';
  const NEGATIVE = 'text, words, letters, alphabet, numbers, watermark, label, caption, title, signature, logo, writing, font, typography, inscription, signs, symbols';

  // Only generate pages not already stored
  const missingIndices = Array.from({ length: STORY_PAGES }, (_, i) => i).filter(i => !result[i]);

  // Process sequentially to avoid HF rate limits
  for (const i of missingIndices) {
    try {
      const isCover = i === 0;
      const prompt = buildIllustrationPrompt({ childName, childAge, theme, childAvatar, pageContent: chunks[i] || '', isCover });
      const fullPrompt = `${prompt}, ${NO_TEXT}`;

      // Use a consistent seed per story+page
      let seed = 0;
      for (const c of (storyId + i).split('')) seed = ((seed * 31) + c.charCodeAt(0)) >>> 0;

      const hfRes = await fetch(HF_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: fullPrompt, parameters: { seed, negative_prompt: NEGATIVE } }),
        signal: AbortSignal.timeout(25000),
      });

      if (!hfRes.ok) continue;
      const ct = hfRes.headers.get('content-type') || '';
      if (!ct.startsWith('image/')) continue;

      const buf = await hfRes.arrayBuffer();
      const blob = await put(`illustrations/${storyId}/${i}.jpg`, Buffer.from(buf), {
        access: 'public', contentType: 'image/jpeg', addRandomSuffix: false,
      });
      result[i] = blob.url;

      // Save to DB
      await Story.updateOne({ _id: storyId }, { $set: { [`illustrationUrls.${i}`]: blob.url } });
    } catch (err) {
      console.error(`[prefill] illustration ${i} failed:`, err);
      // Non-fatal — page will have placeholder in PDF
    }
  }

  return result;
}

// ── Loyalty promo code generator ──────────────────────────────────────────────
function generateLoyaltyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous I/O/0/1
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `KIDSHADE-${suffix}`;
}

// ── Lulu print job submission ─────────────────────────────────────────────────
async function submitToLulu(params: {
  orderId: string;
  userEmail: string;
  storyTitle: string;
  childName: string;
  childAge: number;
  storyContent: string;
  theme: string;
  language: string;
  childAvatar?: { gender: 'boy' | 'girl'; hair: string; skin: string };
  storyId: string;
  address: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  illustrationUrls?: Record<number, string>;
  loyaltyPromoCode?: string;
}) {
  const { orderId, userEmail, storyTitle, childName, childAge, storyContent, theme, language, childAvatar, storyId, address, loyaltyPromoCode } = params;
  let { illustrationUrls } = params;

  // Pre-generate any missing illustrations before PDF creation
  const hfToken = process.env.HUGGINGFACE_API_TOKEN;
  if (hfToken && storyId) {
    illustrationUrls = await prefillIllustrations({
      storyId,
      storyContent,
      childName,
      childAge,
      theme,
      childAvatar,
      existing: illustrationUrls ?? {},
      hfToken,
    });
  }

  // Cover illustration: use page 0 if available
  const coverIllustrationUrl = illustrationUrls?.[0];

  // Generate PDFs
  const [interiorBytes, coverBytes] = await Promise.all([
    generateInteriorPdf({ childName, storyTitle, storyContent, theme, language, illustrationUrls, loyaltyPromoCode }),
    generateCoverPdf({ childName, storyTitle, theme, language, coverIllustrationUrl }),
  ]);

  // Upload to Vercel Blob (publicly accessible for Lulu to fetch)
  const [interiorBlob, coverBlob] = await Promise.all([
    put(`lulu/${orderId}/interior.pdf`, Buffer.from(interiorBytes), { access: 'public', contentType: 'application/pdf' }),
    put(`lulu/${orderId}/cover.pdf`, Buffer.from(coverBytes), { access: 'public', contentType: 'application/pdf' }),
  ]);

  // Create Lulu print job
  const { luluJobId, luluOrderId } = await createLuluPrintJob({
    orderId,
    userEmail,
    storyTitle,
    coverUrl: coverBlob.url,
    interiorUrl: interiorBlob.url,
    address,
  });

  // Update BookOrder with Lulu IDs and status
  await BookOrder.findByIdAndUpdate(orderId, {
    luluJobId,
    luluOrderId,
    status: 'in_production',
  });

  console.log(`[Lulu] Print job created: jobId=${luluJobId} orderId=${luluOrderId}`);
}
