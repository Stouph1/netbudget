# -*- coding: utf-8 -*-
"""Textes Google Ads (campagne pour applications) par langue. Titres 30 car. max, descriptions 90 max.
Uniquement des faits vérifiés : 8 langues, 59 pays, 499 villes, 282 conseils, sans connexion bancaire, sans pub."""
TEXTES = {
 "fr": {
  "titres": ["Sache ce qu'il te reste", "Budget sans connexion bancaire", "Ton reste à vivre en 5 minutes", "Budget en couple ou en famille", "282 conseils, sources citées"],
  "descriptions": [
   "Revenus, dépenses, reste à vivre. Ton budget reste sur ton téléphone, jamais ta banque.",
   "Un budget partagé par code d'invitation, un espace privé pour chacun. Sans publicité.",
   "Mariage, voyage, naissance : un budget guidé par projet, avec rétro-planning et rappels.",
   "Repères face aux moyennes officielles de ton pays : logement, courses, sorties.",
   "Gratuit pour commencer. Huit langues, 59 pays, 499 villes."]},
 "en": {
  "titres": ["Know what you have left", "Budget, no bank connection", "Your monthly budget, clear", "Budget as a couple or family", "282 tips, sources cited"],
  "descriptions": [
   "Income, spending, what's left. Your budget stays on your phone, never with your bank.",
   "Share a budget with an invite code, with a private space for everyone. No ads.",
   "Wedding, trip, new baby: a guided budget per project, with a timeline and reminders.",
   "Compare with your country's official averages: housing, groceries, going out.",
   "Free to start. Eight languages, 59 countries, 499 cities."]},
 "es": {
  "titres": ["Sabe cuánto te queda", "Presupuesto sin tu banco", "Tu presupuesto, claro", "Presupuesto en pareja", "282 consejos con fuentes"],
  "descriptions": [
   "Ingresos, gastos y lo que te queda. Tu presupuesto vive en tu móvil, nunca en tu banco.",
   "Comparte un presupuesto con un código, con un espacio privado para cada uno. Sin anuncios.",
   "Boda, viaje, nacimiento: un presupuesto guiado por proyecto, con calendario y avisos.",
   "Compárate con las medias oficiales de tu país: vivienda, compra, ocio.",
   "Gratis para empezar. Ocho idiomas, 59 países, 499 ciudades."]},
 "pt": {
  "titres": ["Veja quanto sobra no mês", "Orçamento sem acesso ao banco", "O seu orçamento, simples", "Orçamento a dois ou em família", "282 dicas com fontes citadas"],
  "descriptions": [
   "Rendimentos, despesas e o que sobra. O orçamento fica no seu telefone, nunca no banco.",
   "Partilhe um orçamento com um código, com um espaço privado para cada um. Sem anúncios.",
   "Casamento, viagem, nascimento: um orçamento guiado por projeto, com prazos e lembretes.",
   "Compare-se com as médias oficiais do seu país: habitação, compras, lazer.",
   "Grátis para começar. Oito idiomas, 59 países, 499 cidades."]},
 "de": {
  "titres": ["Wisse, was dir bleibt", "Budget ohne Bankverbindung", "Dein Monatsbudget, klar", "Budget zu zweit oder Familie", "282 Tipps mit Quellen"],
  "descriptions": [
   "Einnahmen, Ausgaben, was übrig bleibt. Dein Budget bleibt auf dem Handy, nie bei der Bank.",
   "Gemeinsames Budget per Einladungscode, privater Bereich für jeden. Ohne Werbung.",
   "Hochzeit, Reise, Geburt: ein geführtes Budget pro Projekt, mit Zeitplan und Erinnerungen.",
   "Vergleiche dich mit den offiziellen Durchschnittswerten deines Landes.",
   "Kostenlos starten. Acht Sprachen, 59 Länder, 499 Städte."]},
 "it": {
  "titres": ["Sai quanto ti resta", "Budget senza la tua banca", "Il tuo budget, chiaro", "Budget di coppia o famiglia", "282 consigli con fonti"],
  "descriptions": [
   "Entrate, spese e quanto resta. Il budget resta sul telefono, mai in banca.",
   "Budget condiviso con un codice invito, spazio privato per ciascuno. Senza pubblicità.",
   "Matrimonio, viaggio, nascita: un budget guidato per progetto, con tappe e promemoria.",
   "Confrontati con le medie ufficiali del tuo paese: casa, spesa, uscite.",
   "Gratis per iniziare. Otto lingue, 59 paesi, 499 città."]},
}

if __name__ == "__main__":
    bad = [(l, k, x, len(x)) for l, t in TEXTES.items() for k, lim in (("titres", 30), ("descriptions", 90)) for x in t[k] if len(x) > lim]
    print("dépassements:", bad or "aucun")
