// api/login.js
// POST { username, password } → retourne token si valide

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Champs manquants.' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Récupérer le user
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, password_hash')
    .eq('username', username.toLowerCase())
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  // 2. Vérifier le mot de passe
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  // 3. Créer une session
  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

  await supabase.from('sessions').insert({
    user_id: user.id,
    token,
    created_at: new Date().toISOString(),
  });

  res.status(200).json({ success: true, token, username: user.username });
};
