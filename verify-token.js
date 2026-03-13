// api/verify-token.js
// POST { token } → vérifie si le token est valide → retourne username

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token manquant.' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: session, error } = await supabase
    .from('sessions')
    .select('user_id, users(username)')
    .eq('token', token)
    .single();

  if (error || !session) {
    return res.status(401).json({ error: 'Token invalide.' });
  }

  res.status(200).json({ valid: true, username: session.users.username });
};
