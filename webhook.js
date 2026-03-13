// api/webhook.js
// Stripe webhook → reçoit l'événement checkout.session.completed
// → enregistre le payment_intent dans Supabase comme "accès payé, compte non créé"

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Désactiver le body parsing automatique de Vercel (requis pour vérifier la signature Stripe)
module.exports.config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // service role = accès total (côté serveur uniquement)
  );

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature invalide:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Insérer dans la table "paid_sessions" — sera utilisée lors de la création de compte
    const { error } = await supabase.from('paid_sessions').insert({
      session_id: session.id,
      payment_intent: session.payment_intent,
      amount_total: session.amount_total,
      currency: session.currency,
      account_created: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(200).json({ received: true });
};
