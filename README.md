# FakeTillReal — Setup Guide

## Structure du projet
```
faketillreal/
├── api/
│   ├── create-checkout.js   → POST /api/create-checkout
│   ├── webhook.js           → POST /api/webhook  (Stripe)
│   ├── create-account.js    → POST /api/create-account
│   ├── login.js             → POST /api/login
│   └── verify-token.js      → POST /api/verify-token
├── public/
│   ├── index.html           → L'app wallet
│   └── setup-account.html  → Page post-paiement
├── supabase-schema.sql      → À exécuter dans Supabase
├── .env.example             → Variables d'env à configurer
├── package.json
└── vercel.json
```

---

## 1. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor** et exécuter le contenu de `supabase-schema.sql`
3. Récupérer dans **Settings > API** :
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Stripe

1. Créer un compte sur [stripe.com](https://stripe.com)
2. Récupérer la **Secret key** dans Dashboard > Developers > API keys → `STRIPE_SECRET_KEY`
3. Adapter le prix dans `api/create-checkout.js` (`unit_amount` en centimes)
4. Après déploiement, créer un **Webhook** dans Stripe :
   - URL : `https://TON_DOMAINE.vercel.app/api/webhook`
   - Event : `checkout.session.completed`
   - Copier le **Signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## 3. Vercel

1. Push le projet sur GitHub
2. Importer sur [vercel.com](https://vercel.com)
3. Dans **Settings > Environment Variables**, ajouter toutes les variables de `.env.example`
4. Déployer

---

## Flow utilisateur

```
1. Utilisateur clique "Obtenir l'accès à vie"
      ↓
2. /api/create-checkout → redirige vers Stripe Checkout
      ↓
3. Paiement confirmé → Stripe envoie webhook → /api/webhook
   → enregistre la session dans paid_sessions
      ↓
4. Stripe redirige vers /setup-account?session_id=cs_xxx
      ↓
5. Utilisateur choisit username + password
   → /api/create-account → crée user dans Supabase → retourne token
      ↓
6. Token sauvegardé dans localStorage → accès au wallet
      ↓
7. Connexions suivantes : /api/login → token → localStorage
8. Reload app : /api/verify-token → auto-login si token valide
```
