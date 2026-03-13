// api/create-account.js
// POST { session_id, username, password }
// → vérifie que session_id est bien payée, username dispo, crée le compte

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { session_id, username, password } = req.body;

  if (!session_id || !username || !password) {
    return res.status(400).json({ error: 'Champs manquants.' });
  }

  // Validation basique
  if (username.length < 3 || username.length > 24) {
    return res.status(400).json({ error: 'Username : 3 à 24 caractères.' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username : lettres, chiffres et _ uniquement.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Mot de passe : 8 caractères minimum.' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Vérifier que le session_id est valide et non utilisé
  const { data: paid, error: paidErr } = await supabase
    .from('paid_sessions')
    .select('*')
    .eq('session_id', session_id)
    .single();

  if (paidErr || !paid) {
    return res.status(403).json({ error: 'Session de paiement invalide.' });
  }
  if (paid.account_created) {
    return res.status(403).json({ error: 'Un compte a déjà été créé avec ce paiement.' });
  }

  // 2. Vérifier que le username n'est pas déjà pris
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', username.toLowerCase())
    .single();

  if (existing) {
    return res.status(409).json({ error: 'Ce username est déjà pris.' });
  }

  // 3. Hash du mot de passe
  const password_hash = await bcrypt.hash(password, 12);

  // 4. Créer le compte
  const { data: newUser, error: insertErr } = await supabase
    .from('users')
    .insert({
      username: username.toLowerCase(),
      password_hash,
      stripe_session_id: session_id,
      created_at: new Date().toISOString(),
    })
    .select('id, username')
    .single();

  if (insertErr) {
    console.error('Erreur création user:', insertErr);
    return res.status(500).json({ error: 'Erreur lors de la création du compte.' });
  }

  // 5. Marquer la session comme utilisée
  await supabase
    .from('paid_sessions')
    .update({ account_created: true, user_id: newUser.id })
    .eq('session_id', session_id);

  // 6. Retourner un token de session simple (à stocker côté client)
  const token = Buffer.from(`${newUser.id}:${Date.now()}`).toString('base64');

  // Stocker le token dans Supabase pour validation future
  await supabase.from('sessions').insert({
    user_id: newUser.id,
    token,
    created_at: new Date().toISOString(),
  });

  res.status(200).json({ success: true, token, username: newUser.username });
};
