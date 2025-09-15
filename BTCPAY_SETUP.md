# Configuration BTCPay

## Variables d'environnement requises

Ajoutez ces variables à votre fichier `.env.local` :

```bash
# BTCPay Configuration
BTCPAY_URL=https://pay.qgchatting.com
BTCPAY_STORE_ID=your_store_id_here
BTCPAY_API_KEY=your_api_key_here
BTCPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ROOT_DOMAIN=qgchatting.com
```

## Configuration BTCPay Server

1. **Créer un store** sur votre instance BTCPay Server
2. **Générer une API Key** avec les permissions suivantes :
   - `btcpay.store.canviewinvoices`
   - `btcpay.store.cancreateinvoice`
   - `btcpay.store.canviewstore`
3. **Configurer le webhook** :
   - URL : `https://votre-domaine.com/api/btcpay/webhook`
   - Événements : `InvoiceSettled`
   - Secret : générer un secret aléatoire

## Fonctionnalités implémentées

- ✅ Popup de paiement avec sélection de cryptomonnaie
- ✅ Création d'invoice BTCPay
- ✅ Vérification du statut de paiement
- ✅ Webhook pour traitement automatique
- ✅ Intégration dans le processus d'onboarding
- ✅ Gestion des erreurs et timeouts

## Utilisation

Le popup de paiement s'affiche automatiquement à la fin de l'étape 4 de l'onboarding (section "Finalisation") quand l'utilisateur clique sur "Terminer & Publier l'agence".

## Support des cryptomonnaies

- Bitcoin (BTC)
- USDT
- USDC

## Sécurité

- Signature des webhooks vérifiée
- Tokens d'authentification requis
- Validation des données d'entrée
- Gestion des erreurs robuste
