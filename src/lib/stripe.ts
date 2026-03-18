import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
});

export const PLANS = {
  free: {
    name: 'Gratuit',
    nameEn: 'Free',
    price: 0,
    storiesPerMonth: 3,
    storiesPerDay: null,
    features: {
      fr: ['3 histoires / mois', 'Toutes les langues', 'Sauvegarde cloud'],
      en: ['3 stories / month', 'All languages', 'Cloud backup'],
      es: ['3 cuentos / mes', 'Todos los idiomas', 'Nube'],
      pt: ['3 histórias / mês', 'Todos os idiomas', 'Nuvem'],
      de: ['3 Geschichten / Monat', 'Alle Sprachen', 'Cloud'],
    },
  },
  premium: {
    name: 'Premium',
    nameEn: 'Premium',
    price: 2.99,
    storiesPerMonth: null,
    storiesPerDay: 1,
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    features: {
      fr: ['1 histoire / jour', 'Illustrations IA', 'Lecture audio', 'Sauvegarde cloud', 'Option livre physique'],
      en: ['1 story / day', 'AI illustrations', 'Audio reading', 'Cloud backup', 'Physical book option'],
      es: ['1 cuento / día', 'Ilustraciones IA', 'Lectura en audio', 'Nube', 'Opción libro físico'],
      pt: ['1 história / dia', 'Ilustrações IA', 'Leitura em áudio', 'Nuvem', 'Livro físico'],
      de: ['1 Geschichte / Tag', 'KI-Illustrationen', 'Audiovorlesen', 'Cloud', 'Physisches Buch'],
    },
  },
  superpremium: {
    name: 'Super Premium',
    nameEn: 'Super Premium',
    price: 5.99,
    storiesPerMonth: null,
    storiesPerDay: null,
    priceId: process.env.STRIPE_SUPERPREMIUM_PRICE_ID,
    features: {
      fr: ['Histoires illimitées', 'Illustrations IA', 'Lecture audio', 'Sauvegarde cloud', 'Option livre physique', 'Priorité support'],
      en: ['Unlimited stories', 'AI illustrations', 'Audio reading', 'Cloud backup', 'Physical book option', 'Priority support'],
      es: ['Cuentos ilimitados', 'Ilustraciones IA', 'Lectura en audio', 'Nube', 'Opción libro físico', 'Soporte prioritario'],
      pt: ['Histórias ilimitadas', 'Ilustrações IA', 'Leitura em áudio', 'Nuvem', 'Livro físico', 'Suporte prioritário'],
      de: ['Unbegrenzte Geschichten', 'KI-Illustrationen', 'Audiovorlesen', 'Cloud', 'Physisches Buch', 'Prioritäts-Support'],
    },
  },
} as const;
