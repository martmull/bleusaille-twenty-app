import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';

const RESEND_FROM = 'onboarding@resend.dev';

const ODDS_API_SUBSCRIPTIONS_URL = 'https://dash.the-odds-api.com/api-subscriptions';
const APP_SETTINGS_URL =
  'https://twenty-wnn6pbf1.twenty.com/settings/applications/cd62932f-e3c5-413e-a2ec-d0b76dab15b0#settings';

export const notifyOddsApiKeyExpired = async (context: {
  url: string;
  status: number;
}): Promise<void> => {
  if (!RESEND_API_KEY || !ADMIN_EMAIL) {
    return;
  }

  const subject = 'Cotes : la clé API The Odds API doit être mise à jour';
  const html = [
    `<p>La récupération des cotes a échoué (statut ${context.status}). La clé API The Odds API doit probablement être mise à jour.</p>`,
    '<p>Pour la mettre à jour :</p>',
    '<ol>',
    `<li>Récupérez la nouvelle clé sur <a href="${ODDS_API_SUBSCRIPTIONS_URL}">${ODDS_API_SUBSCRIPTIONS_URL}</a></li>`,
    `<li>Reportez-la dans les réglages de l'application : <a href="${APP_SETTINGS_URL}">${APP_SETTINGS_URL}</a></li>`,
    '</ol>',
    `<p>URL appelée : ${context.url}</p>`,
  ].join('');

  const resend = new Resend(RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: RESEND_FROM,
    to: ADMIN_EMAIL,
    subject,
    html,
  });

  if (error) {
    console.error('Failed to send odds API key notification email', error);
  }
};
