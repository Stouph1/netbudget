#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Un document par profil de test : contrat + liste de vérifications.

POURQUOI UN SEUL FICHIER PAR TESTEUR plutôt qu'une charte commune et quatre
protocoles séparés : on distribue un document, pas un dossier. « Tu es le
testeur Famille sur Android, voici ton PDF » ne laisse aucune place au malentendu,
et personne ne se retrouve à tester des fonctionnalités qu'il n'a pas.

CHAQUE DOCUMENT CONTIENT :
  page 1     le contrat, à signer, avec le profil et l'appareil déjà remplis ;
  pages 2+   les vérifications, dans l'ordre, avec la place pour écrire ce qui
             s'est réellement passé.

CE QUI EST ÉCRIT NOIR SUR BLANC dans chaque contrat : le palier est accordé à la
main, sans paiement, et il sera retiré à la fin. Un testeur qui croit avoir
gagné un abonnement à vie et se retrouve en gratuit au lancement est un testeur
perdu, et il a raison de le prendre mal.

Usage :
    marketing/promo-video/.venv/bin/python docs/testeurs/generer-profils.py
"""

import json
import os
from datetime import date

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LOGO = os.path.join(ROOT, "website", "public", "logo.png")

# Le contrat vient du MÊME fichier que celui affiché dans l'application.
# Il vit sous frontend/ parce que Metro ne résout pas les imports hors de son
# dossier — pas parce que c'est sa place naturelle. Le PDF vient donc le
# chercher là plutôt que d'en garder une copie : deux copies finissent
# toujours par diverger, et un contrat signé qui diffère de celui approuvé à
# l'écran ne vaut rien.
CONTRAT = os.path.join(ROOT, "frontend", "src", "data", "testerContract.json")

with open(CONTRAT, encoding="utf-8") as fh:
    CONTRAT_DATA = json.load(fh)

MINT = colors.HexColor("#0E9F6E")
INK = colors.HexColor("#111827")
GREY = colors.HexColor("#6B7280")
LIGHT = colors.HexColor("#E5E7EB")
PALE = colors.HexColor("#F3F4F6")

VERSION = "2.0.0"
# Version du TEXTE du contrat, distincte de celle de l'app.
# C'est elle qui est enregistrée avec chaque approbation.
CONTACT = "contact@netbudget.app"

base = getSampleStyleSheet()

S = {
    "title": ParagraphStyle("t", parent=base["Title"], fontName="Helvetica-Bold",
                            fontSize=20, leading=25, textColor=INK, alignment=0, spaceAfter=2),
    "subtitle": ParagraphStyle("st", parent=base["Normal"], fontName="Helvetica",
                               fontSize=9.5, leading=13, textColor=GREY, spaceAfter=14),
    "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="Helvetica-Bold",
                         fontSize=11.5, leading=15, textColor=INK, spaceBefore=13, spaceAfter=5),
    "h3": ParagraphStyle("h3", parent=base["Heading3"], fontName="Helvetica-Bold",
                         fontSize=10, leading=13, textColor=MINT, spaceBefore=11, spaceAfter=4),
    "body": ParagraphStyle("b", parent=base["Normal"], fontName="Helvetica",
                           fontSize=9.5, leading=14, textColor=INK, alignment=TA_JUSTIFY, spaceAfter=6),
    "small": ParagraphStyle("s", parent=base["Normal"], fontName="Helvetica",
                            fontSize=8, leading=11, textColor=GREY, spaceAfter=4),
    "cell": ParagraphStyle("c", parent=base["Normal"], fontName="Helvetica",
                           fontSize=8.5, leading=12, textColor=INK),
    "cellb": ParagraphStyle("cb", parent=base["Normal"], fontName="Helvetica-Bold",
                            fontSize=8.5, leading=12, textColor=INK),
    "cellhead": ParagraphStyle("ch", parent=base["Normal"], fontName="Helvetica-Bold",
                               fontSize=8, leading=11, textColor=colors.white),
}


def header(story, title, subtitle):
    if os.path.exists(LOGO):
        story.append(Image(LOGO, width=13 * mm, height=13 * mm))
        story.append(Spacer(1, 5))
    story.append(Paragraph(title, S["title"]))
    story.append(Paragraph(subtitle, S["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1.1, color=MINT, spaceAfter=10))


def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(t, S["body"]), leftIndent=10) for t in items],
        bulletType="bullet", bulletFontName="Helvetica", start="•",
        leftIndent=12, bulletFontSize=8,
    )


def cases(labels, blanc=False):
    """Une rangée « libellé + case vide », en cases DESSINÉES.

    Le caractère ☐ n'existe pas dans Helvetica : reportlab lui substitue un
    carré PLEIN, et le document part à l'impression avec toutes les cases déjà
    cochées. On dessine donc de vraies cases avec une bordure.
    """
    cells, widths = [], []
    for i, lab in enumerate(labels):
        style = S["cellhead"] if blanc else S["cell"]
        cells.append(Paragraph(lab, style))
        # Large : un libellé à l'étroit se coupe en deux lignes (« O » puis
        # « K »), et la case à cocher devient illisible.
        widths.append(max(len(lab) * 6.2 + 10, 20))
        cells.append("")
        widths.append(5 * mm)
    t = Table([cells], colWidths=widths, rowHeights=[5.6 * mm])
    style = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]
    for i in range(len(labels)):
        col = i * 2 + 1
        style.append(("BOX", (col, 0), (col, 0), 0.8, colors.white if blanc else INK))
    t.setStyle(TableStyle(style))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(GREY)
    canvas.drawString(20 * mm, 12 * mm, f"NETbudget {VERSION} — {CONTACT}")
    canvas.drawRightString(A4[0] - 20 * mm, 12 * mm, f"Page {doc.page}")
    canvas.restoreState()


def document(path, title):
    return SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=16 * mm, bottomMargin=20 * mm,
        title=title, author="NETbudget",
    )


# ===========================================================================
# Les quatre profils
# ===========================================================================
#
# `limites` est ce que le testeur doit VÉRIFIER, pas seulement ce qu'il obtient.
# Un testeur à qui on annonce « tu as tout » ne teste jamais les refus — or
# c'est précisément là que se cachent les impasses.

PROFILS = {
    "gratuit": {
        "nom": "Gratuit",
        "palier": "free",
        "resume": "Sans abonnement. C'est le profil qui rencontre le plus de "
                  "limites, donc celui dont les retours comptent le plus.",
        "limites": [
            "Un seul objectif d'épargne.",
            "Aucun budget d'événement.",
            "Échéancier de prêt : l'année en cours et le passé, pas la projection.",
            "Conseils : le questionnaire se remplit en entier, le résultat est réservé.",
            "Anniversaires : réservés à la formule Famille.",
            "Espaces partagés : on peut REJOINDRE sur invitation, pas en créer.",
        ],
    },
    "solo": {
        "nom": "Solo",
        "palier": "solo",
        "resume": "La première formule payante. Une personne seule, un projet "
                  "à la fois.",
        "limites": [
            "Trois objectifs d'épargne.",
            "Un budget d'événement à la fois.",
            "Pas de budget mariage : il demande Duo ou Famille.",
            "Pas d'espace partagé à créer.",
            "Anniversaires : réservés à la formule Famille.",
        ],
    },
    "duo": {
        "nom": "Duo",
        "palier": "duo",
        "resume": "Deux personnes sur un même budget. C'est le profil qui teste "
                  "l'invitation, donc le seul qui a besoin d'un second appareil.",
        "limites": [
            "Objectifs et événements sans limite, mariage compris.",
            "Un espace partagé, deux personnes.",
            "Anniversaires : réservés à la formule Famille.",
        ],
    },
    "famille": {
        "nom": "Famille",
        "palier": "family",
        "resume": "Le foyer complet. Seul profil à voir les anniversaires.",
        "limites": [
            "Tout ce que contient Duo.",
            "Trois espaces partagés, six personnes par espace.",
            "Anniversaires : le sien, ceux des enfants et des animaux.",
        ],
    },
}


# ===========================================================================
# Le contrat — page 1
# ===========================================================================

def contrat(story, profil):
    p = PROFILS[profil]
    header(
        story,
        f"Testeur NETbudget — profil {p['nom']}",
        f"Version {VERSION} · session de test fermée · à approuver dans l'application",
    )

    # Ce qui est déjà rempli évite quatre questions par testeur.
    t = Table(
        [
            [Paragraph("Profil de test", S["cellhead"]), Paragraph("Détail", S["cellhead"])],
            [Paragraph("Formule à tester", S["cellb"]), Paragraph(p["nom"], S["cell"])],
            [Paragraph("Appareil", S["cellb"]), cases(["iPhone", "Android"])],
            [Paragraph("Adresse du compte", S["cellb"]), Paragraph(" ", S["cell"])],
            [Paragraph("Début de la session", S["cellb"]), Paragraph(" ", S["cell"])],
        ],
        colWidths=[45 * mm, 125 * mm],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("GRID", (0, 0), (-1, -1), 0.4, LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 6))
    story.append(Paragraph(p["resume"], S["body"]))

    for sec in CONTRAT_DATA["sections"]:
        story.append(Paragraph(sec["title"], S["h2"]))
        for para in sec.get("body", []):
            story.append(Paragraph(para.replace("{formule}", p["nom"]), S["body"]))
        if sec.get("bullets"):
            story.append(bullets([b.replace("{formule}", p["nom"]) for b in sec["bullets"]]))

    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=0.6, color=LIGHT, spaceAfter=10))

    sig = Table(
        [
            [Paragraph("Le testeur", S["cellb"]), Paragraph("NETbudget", S["cellb"])],
            [Paragraph("Nom et prénom", S["small"]), Paragraph("Stéphane Pizeuil", S["cell"])],
            [Paragraph(" ", S["cell"]), Paragraph(" ", S["cell"])],
            [Paragraph("Date", S["small"]), Paragraph(f"Date : {date.today().isoformat()}", S["cell"])],
            [Paragraph(" ", S["cell"]), Paragraph(" ", S["cell"])],
            [Paragraph("Signature, précédée de « lu et approuvé »", S["small"]),
             Paragraph("Signature", S["small"])],
            [Paragraph(" ", S["cell"]), Paragraph(" ", S["cell"])],
            [Paragraph(" ", S["cell"]), Paragraph(" ", S["cell"])],
        ],
        colWidths=[85 * mm, 85 * mm],
    )
    sig.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 1), (0, 1), 0.5, LIGHT),
        ("LINEBELOW", (0, 3), (0, 3), 0.5, LIGHT),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(sig)

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "<b>La session se déroule entièrement à distance : tu n'as rien à "
        "imprimer.</b> Ce document est ta copie. L'approbation se fait dans "
        "l'application, à sa première ouverture — le texte affiché est "
        "exactement celui-ci, et ton nom y remplace la signature. Le bloc "
        "ci-dessus n'est là que si tu préfères garder une trace papier.",
        S["small"]))
    story.append(Paragraph(
        "Une question sur ce document : " + CONTACT + ". Ce texte est une charte "
        "de bonne conduite entre nous ; pour lui donner une portée contractuelle "
        "plus large, fais-le relire par un juriste.",
        S["small"]))


# ===========================================================================
# Les vérifications
# ===========================================================================
#
# CHAQUE LIGNE DIT CE QUI DOIT SE PASSER, pas seulement quoi faire. « Ouvre
# l'échéancier » ne permet pas de conclure ; « l'année en cours est nette, les
# suivantes sont estompées avec les trois formules dessous » permet de dire oui
# ou non — et c'est ce oui ou non qui a de la valeur.

COMMUN_DEBUT = [
    ("Première ouverture",
     "La visite guidée démarre seule après quelques secondes. Elle change "
     "d'onglet toute seule et entoure le vrai bouton dont elle parle.",
     "Le bouton entouré est bien celui que la bulle décrit."),
    ("Inscription",
     "Crée ton compte avec l'adresse que tu nous as donnée, puis dis-le-nous : "
     "c'est à ce moment qu'on active ta formule.",
     "Après notre message, la pastille à côté de ton pseudo affiche ta formule."),
    ("Budget du mois",
     "Saisis tes revenus (plusieurs sources si tu en as), ton loyer ou ton prêt, "
     "et tes charges.",
     "Le « reste à vivre » en haut change à chaque ligne ajoutée."),
    ("Convertisseur",
     "Change de devise, ferme l'application complètement, rouvre-la.",
     "La devise choisie est toujours là."),
]

COMMUN_FIN = [
    ("Changement d'appareil",
     "Réglages → Récupération → Sauvegarder ma clé. Note les douze mots. "
     "Déconnecte-toi, reconnecte-toi, saisis-les.",
     "Tes données reviennent. Sans les douze mots, elles resteraient illisibles — "
     "c'est voulu."),
    ("Notifications",
     "Réglages → notifications → personnaliser. Coupe une catégorie.",
     "Tu ne reçois plus ce type de rappel, et les autres continuent."),
    ("Langue",
     "Change la langue de l'application.",
     "Tout l'écran est traduit, sans texte bizarre ni clé technique visible."),
    ("Suppression du compte",
     "À faire EN DERNIER, seulement quand tu as fini : Réglages → zone rouge → "
     "supprimer le compte.",
     "Double confirmation, puis le compte et les données disparaissent."),
]

VERIF = {
    "gratuit": [
        ("Objectif d'épargne",
         "Crée un objectif. Essaie d'en créer un deuxième.",
         "Le premier passe. Au deuxième, la fenêtre des offres s'ouvre avec les "
         "trois formules illustrées."),
        ("Quota annoncé",
         "Regarde la ligne au-dessus de la liste des objectifs.",
         "Elle dit combien il t'en reste AVANT que tu te heurtes à la limite."),
        ("Échéancier de prêt",
         "Ajoute un prêt (montant, taux, durée, date de première échéance), "
         "puis ouvre son échéancier.",
         "L'année en cours est nette. Les suivantes s'estompent, et les trois "
         "formules apparaissent dessous. Taper une carte ferme la feuille et "
         "ouvre l'écran des formules — l'écran ne doit PAS rester figé."),
        ("Conseils",
         "Ouvre Conseils et remplis TOUT le questionnaire jusqu'au bout.",
         "Il se remplit entièrement, sans blocage. À la fin, le résultat est "
         "voilé avec les trois formules. Ressors et reviens : tes réponses sont "
         "toujours là."),
        ("Événements",
         "Onglet Événements, essaie d'en créer un.",
         "La fenêtre des offres s'ouvre."),
        ("Anniversaires",
         "Onglet Profil, tuile Anniversaires.",
         "La tuile est bien VISIBLE, et elle propose la formule Famille."),
        ("Espace partagé sur invitation",
         "Demande au testeur Duo de t'inviter dans son espace, puis rejoins-le.",
         "Tu peux rejoindre SANS abonnement, et tu vois ses objectifs. Tu ne "
         "peux pas en créer : une ligne te l'explique sans te le reprocher."),
    ],
    "solo": [
        ("Pastille de formule",
         "Onglet Profil, à côté de ton pseudo.",
         "Elle affiche Solo. En tapant dessus, tu arrives sur les formules."),
        ("Un événement à la fois",
         "Crée un événement, puis essaie d'en créer un second.",
         "Le premier passe. Au second, la fenêtre explique que ta formule en "
         "suit un seul et propose de terminer celui en cours OU de changer."),
        ("Budget mariage",
         "Dans les types d'événement, choisis Mariage.",
         "Il est marqué comme réservé, et la formule mise en avant est celle "
         "qui le débloque — pas « la plus populaire »."),
        ("Trois objectifs",
         "Crée trois objectifs, puis essaie un quatrième.",
         "Les trois passent. Le quatrième ouvre la fenêtre des offres."),
        ("Échéancier complet",
         "Ajoute un prêt et ouvre son échéancier.",
         "Toutes les années sont lisibles, aucune n'est estompée. Déplie une "
         "année : le détail mois par mois s'affiche."),
        ("Conseils",
         "Ouvre Conseils.",
         "Les conseils s'affichent, chacun avec sa source officielle. Aucun "
         "voile."),
        ("Anniversaires",
         "Tuile Anniversaires.",
         "Elle propose la formule Famille."),
        ("Écran de déverrouillage",
         "Réglages → Test → Écran de déverrouillage → Solo.",
         "L'animation joue une fois puis se fige, et l'écran continue de vivre : "
         "rayons qui tournent, éclats qui scintillent."),
    ],
    "duo": [
        ("Créer un espace",
         "Onglet Profil → Espaces partagés → créer.",
         "L'espace est créé et le détail s'ouvre avec le code d'invitation."),
        ("Inviter",
         "Envoie le code au testeur Gratuit et attends qu'il rejoigne.",
         "Il apparaît dans la liste des membres. Il a pu rejoindre SANS "
         "abonnement — c'est le point le plus important de ton test."),
        ("Budget commun",
         "Crée un objectif dans l'espace partagé, demande-lui ce qu'il voit.",
         "Il voit le même objectif, avec les mêmes montants, depuis son "
         "téléphone. Il ne peut pas en créer."),
        ("Deuxième membre refusé",
         "Essaie d'inviter une troisième personne.",
         "Ta formule en accepte deux : le refus doit être clair et proposer "
         "Famille."),
        ("Objectifs et mariage",
         "Crée cinq objectifs, puis un budget mariage.",
         "Aucune limite d'objectif. Le mariage est disponible."),
        ("Anniversaires",
         "Tuile Anniversaires.",
         "Elle propose la formule Famille."),
        ("Écran de déverrouillage",
         "Réglages → Test → Écran de déverrouillage → Duo.",
         "Deux anneaux, l'éclair au moment où ils se referment."),
    ],
    "famille": [
        ("Plusieurs espaces",
         "Crée trois espaces, puis essaie un quatrième.",
         "Les trois passent, le quatrième est refusé avec une explication."),
        ("Six membres",
         "Invite plusieurs personnes dans un espace.",
         "Jusqu'à six, l'invitation fonctionne."),
        ("Anniversaires — le tien",
         "Renseigne ta date de naissance dans ton profil, puis Réglages → Test "
         "→ Anniversaires → Le mien.",
         "La fête s'ouvre : ballons, cartes à faire glisser. Glisser à droite "
         "garde le conseil, à gauche le jette."),
        ("Anniversaires — un enfant",
         "Onglet Profil → Anniversaires → ajoute un enfant avec sa date. Puis "
         "Réglages → Test → Anniversaires → Un enfant.",
         "Les cartes sont adaptées à SON âge, pas au tien."),
        ("Anniversaires — un animal",
         "Ajoute un animal, puis Réglages → Test → Anniversaires → Un animal.",
         "Les cartes parlent bien de l'animal."),
        ("Conseils gardés",
         "Après avoir gardé des cartes, ouvre Profil → Conseils gardés.",
         "Elles y sont toutes, et seulement celles que tu as gardées."),
        ("Notification d'anniversaire",
         "Laisse passer une journée avec une date proche.",
         "Le rappel arrive. Dis-nous à quelle heure il est tombé."),
        ("Écran de déverrouillage",
         "Réglages → Test → Écran de déverrouillage → Famille.",
         "Le grand anneau et ses trois satellites tiennent dans le cadre sans "
         "être tassés."),
    ],
}


def verifications(story, profil):
    p = PROFILS[profil]
    story.append(PageBreak())
    header(
        story,
        f"Vérifications — profil {p['nom']}",
        "Coche ce qui fonctionne. Écris ce qui ne fonctionne pas, même à moitié.",
    )

    story.append(Paragraph("Ce que ta formule doit permettre — et refuser", S["h3"]))
    story.append(bullets(p["limites"]))
    story.append(Paragraph(
        "Les refus comptent autant que le reste. Un refus mal expliqué, sans "
        "issue proposée, est un défaut : signale-le comme tel.",
        S["small"]))

    lignes = COMMUN_DEBUT + VERIF[profil] + COMMUN_FIN

    story.append(Spacer(1, 6))
    for i, (titre, quoi, attendu) in enumerate(lignes, start=1):
        t = Table(
            [
                [Paragraph(f"{i}. {titre}", S["cellhead"]),
                 cases(["OK", "KO"], blanc=True)],
                [Paragraph("<b>À faire</b> — " + quoi, S["cell"]), ""],
                [Paragraph("<b>Attendu</b> — " + attendu, S["cell"]), ""],
                [Paragraph("Ce qui s'est passé :", S["small"]), ""],
                [Paragraph(" ", S["cell"]), ""],
                [Paragraph(" ", S["cell"]), ""],
            ],
            colWidths=[130 * mm, 40 * mm],
        )
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), INK),
            ("SPAN", (0, 1), (1, 1)),
            ("SPAN", (0, 2), (1, 2)),
            ("SPAN", (0, 3), (1, 3)),
            ("SPAN", (0, 4), (1, 4)),
            ("SPAN", (0, 5), (1, 5)),
            ("BACKGROUND", (0, 3), (-1, 5), PALE),
            ("GRID", (0, 0), (-1, -1), 0.4, LIGHT),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 7))

    story.append(Spacer(1, 4))
    story.append(Paragraph("Trois questions pour finir", S["h2"]))
    story.append(Paragraph(
        "Réponds librement — c'est souvent ici que se trouve ce qu'on n'aurait "
        "jamais pensé à demander.",
        S["small"]))
    for q in [
        "Qu'est-ce qui t'a agacé, même une seconde ?",
        "À quel moment as-tu hésité, sans savoir quoi faire ?",
        "Si tu devais payer pour cette application, qu'est-ce qui te ferait "
        "dire oui ? Et qu'est-ce qui te ferait dire non ?",
    ]:
        t = Table([[Paragraph(q, S["cell"])], [Paragraph(" ", S["cell"])],
                   [Paragraph(" ", S["cell"])], [Paragraph(" ", S["cell"])]],
                  colWidths=[170 * mm])
        t.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.4, LIGHT),
            ("BACKGROUND", (0, 1), (-1, -1), PALE),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        story.append(t)
        story.append(Spacer(1, 8))

    story.append(Paragraph(
        "Renvoie ce document rempli, ou écris-nous à " + CONTACT + ". Une photo "
        "des pages annotées convient parfaitement.",
        S["small"]))


def generer(profil):
    story = []
    contrat(story, profil)
    verifications(story, profil)
    nom = f"testeur-{profil}.pdf"
    doc = document(os.path.join(HERE, nom), f"NETbudget — testeur {PROFILS[profil]['nom']}")
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return doc.filename


if __name__ == "__main__":
    for profil in PROFILS:
        f = generer(profil)
        print(f"  {os.path.basename(f)}  ({os.path.getsize(f) // 1024} Ko)")
