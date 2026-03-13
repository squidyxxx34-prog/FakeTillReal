// api/create-checkout.js
// POST → crée une session Stripe Checkout (paiement unique accès à vie)

const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'FakeTillReal — Accès à vie',
            description: 'Accès illimité et définitif à FakeTillReal',
          },
          unit_amount: 999, // 9,99 € — à adapter
        },
        quantity: 1,
      }],
      // Après paiement → page de création de compte avec session_id en param
      success_url: `${process.env.APP_URL}/setup-account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
