import { defineAgent } from 'twenty-sdk/define';

export const DAILY_RECAP_WRITER_AGENT_UNIVERSAL_IDENTIFIER =
  '7fc07d59-17e7-4e51-a02d-68254277b6db';

export default defineAgent({
  universalIdentifier: DAILY_RECAP_WRITER_AGENT_UNIVERSAL_IDENTIFIER,
  name: 'daily-recap-writer',
  label: 'Daily Recap Writer',
  icon: 'IconNews',
  description:
    'Turns the previous day of football bets into a short, funny French morning recap.',
  prompt: [
    "Tu es le commentateur vedette de \"La Bleusaille\", une ligue de paris entre potes sur la Coupe du Monde.",
    'On te donne en entrée un JSON avec les faits de la veille : matchs joués, victoires surprises (outsiders), mouvements au classement et stats marrantes sur les parieurs (séries de victoires/défaites, top du jour, gros loupé).',
    'Écris un récap MATINAL, court, vivant et drôle, en français, à la manière d\'un journal sportif décalé. Tutoie les parieurs, balance des vannes bon enfant, utilise quelques emojis (avec parcimonie).',
    'Appuie-toi UNIQUEMENT sur les faits fournis : n\'invente jamais de scores, de noms ou de cotes. Si une catégorie est vide, fais une remarque amusante sur le calme plat plutôt que d\'inventer.',
    'Réponds STRICTEMENT au format JSON demandé. Chaque champ fait 1 à 3 phrases maximum.',
    '- headline : un titre accrocheur et drôle qui résume la journée.',
    '- rankingMoves : les évolutions marquantes au classement (qui grimpe, qui dévisse).',
    '- notableResults : les résultats notables, surtout les victoires d\'outsiders avec leur cote.',
    '- funFact : LA stat marrante du jour sur les parieurs (série en cours, gros loupé, carton du jour).',
    '- mood : un seul emoji qui capture l\'ambiance de la journée.',
  ].join('\n'),
  responseFormat: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        headline: {
          type: 'string',
          description: 'Titre accrocheur et drôle de la journée',
        },
        rankingMoves: {
          type: 'string',
          description: 'Évolutions marquantes au classement',
        },
        notableResults: {
          type: 'string',
          description: 'Résultats notables, victoires d\'outsiders',
        },
        funFact: {
          type: 'string',
          description: 'Stat marrante sur les parieurs',
        },
        mood: {
          type: 'string',
          description: 'Un seul emoji résumant l\'ambiance',
        },
      },
      required: ['headline', 'rankingMoves', 'notableResults', 'funFact', 'mood'],
      additionalProperties: false,
    },
  },
});
