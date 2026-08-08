# Suppression de compte — déployer la fonction (corrige ton erreur)

L'erreur « Edge Function returned a non-2xx status code » vient du fait que la
fonction n'a jamais été déployée sur ton projet Supabase : le code existe en
local, mais Supabase ne le connaît pas.

## Option A — en une commande (recommandé)

Dans un terminal, à la racine du projet :

    cd frontend
    supabase login
    supabase link --project-ref TON_REF_PROJET
    supabase functions deploy delete-account

`TON_REF_PROJET` se trouve dans l'URL de ton dashboard Supabase :
`https://supabase.com/dashboard/project/XXXXXXXX` → c'est le `XXXXXXXX`.

## Option B — par le dashboard, sans terminal

1. Supabase → Edge Functions → **Deploy a new function**
2. Nom exact : `delete-account`
3. Colle le contenu de `frontend/supabase/functions/delete-account/index.ts`
4. Deploy

## Vérifier que ça marche

Dans l'app : Réglages → Supprimer mon compte. Si ça échoue encore, le message
d'erreur est désormais explicite (il distingue « fonction absente » d'une vraie
erreur) — envoie-le moi tel quel.

## Note

La fonction a été durcie en même temps : POST uniquement (une action
irréversible ne doit jamais partir sur un simple GET), et elle purge aussi les
photos des espaces que tu possèdes — sinon elles restaient publiques après la
suppression du compte.
