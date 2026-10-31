# Annonce NETbudget 2.0 · vidéo de lancement (30 s)

Rendus : `annonce-2.0-16x9.mp4` (site, YouTube, LinkedIn, Google Ads) et `annonce-2.0-9x16.mp4` (Reels, TikTok, Shorts).

## Structure (124 BPM, une mesure = 1,935 s, coupes sur les temps)

| Temps | Rôle | Contenu |
|---|---|---|
| 0 – 2,0 | accroche (creux musical) | « Fin du mois. » / « Il te reste combien ? » |
| 2,0 | drop | logo, « NETbudget 2.0 » |
| 3,9 – 17,5 | démo, six plans réels | Vois ce qu'il reste · Saisis · Compare · Planifie · Apprends · Partage |
| 17,5 – 21,3 | trois frappes | Sans banque. Sans pub. Chiffré de bout en bout. |
| 21,3 – 25,2 | appel à l'action | « Disponible maintenant. » puis « Gratuit pour commencer. », App Store, Google Play |
| 25,2 – 30 | sortie | netbudget.app · Et ce n'est qu'un début. |

Références Launch Scene : Revolut « Your Way In » (20 s, 48 coupes/min, démo plein cadre sur téléphone, titre qui bascule à l'appel), Pulse Local (25 s, cartes de texte frappées), Mercury (mot + action côte à côte). Tempo médian du corpus : 123 BPM.

## Fabrication

- `tools/record_clips.sh` : enregistre les six plans sur le simulateur iPhone (app en français, euro, Paris) ; `tools/ios-helpers.sh` et `tools/setlang.py` sont ses dépendances. Il faut Metro (`npx expo start --dev-client --port 8081`), le simulateur booté avec Simulator.app ouvert, et le compagnon idb (`~/.local/idb/idb_companion --udid <iPhone> --grpc-port 10882` puis `idb connect localhost 10882`).
- `build.py` : transcode `rec/*.mp4` en 30 i/s, dérive `video-reels/` de `video/`, vérifie, et avec `render` rend les deux et copie les mp4 ici.
- Musique : « Take this Higher » (Michael Ramir C., Mixkit, licence libre, usage commercial, sans mention), 124 BPM ; le morceau démarre à 50,26 s pour que son drop (52,26 s) tombe à 2,0 s.
