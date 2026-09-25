# Gabarits d'e-mails Supabase

Un gabarit par type d'e-mail, bilingue FR/EN dans le même message (Supabase n'a pas de traduction par utilisateur). À coller dans **Supabase → Authentication → Email Templates**, un onglet par type : le corps dans « Message body », l'objet dans « Subject ».

| Onglet Supabase | Fichier | Objet |
|---|---|---|
| Confirm signup | `confirm-signup.html` | `✅ Confirme ton adresse · Confirm your address` |
| Reset password | `reset-password.html` | `🔑 Nouveau mot de passe · Reset your password` |
| Magic Link | `magic-link.html` | `✨ Ton lien de connexion · Your sign-in link` |
| Change Email Address | `change-email.html` | `📮 Confirme ta nouvelle adresse · Confirm your new address` |
| Reauthentication | `reauthentication.html` | `🔐 Ton code de vérification · Your verification code` |

## Réglages à faire une fois, dans le même menu Authentication

1. **URL Configuration** : Site URL `https://www.netbudget.app` ; Redirect URLs : ajouter `https://www.netbudget.app/confirmation`. Sans ça, Supabase refuse la page de retour et renvoie sur le Site URL.
2. **Providers → Email** : laisser « Confirm email » activé. L'app gère le message « vérifie ta boîte mail ».
3. **SMTP Settings** : activer un SMTP personnalisé (Resend, Brevo, Postmark…) avec l'expéditeur `NETbudget <no-reply@netbudget.app>`. L'envoi intégré de Supabase affiche « Supabase Auth » comme expéditeur et se limite à quelques messages par heure : suffisant pour tester, pas pour des inscriptions réelles.

## Comment le lien revient dans l'app

Le bouton du mail ouvre `{{ .ConfirmationURL }}` : Supabase vérifie le jeton, puis redirige vers `https://www.netbudget.app/confirmation?type=…&lang=…` en y joignant un `code`. Cette page affiche « c'est bon » et un bouton qui ouvre l'app (`netbudget://auth-callback?code=…` ou `netbudget://reset-password?code=…`). Le `code` s'échange contre une session **dans l'app** (flux PKCE) : ouvert sur un autre appareil, il ne donne rien, mais l'adresse est confirmée quand même et la personne se connecte avec son mot de passe.

Les variables disponibles : `{{ .ConfirmationURL }}`, `{{ .Token }}` (code à 6 chiffres), `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .SiteURL }}`.
