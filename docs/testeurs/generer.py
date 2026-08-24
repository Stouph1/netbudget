#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genere les deux documents de la session de test.

DEUX FICHIERS, DEUX ROLES DISTINCTS :

  charte-testeur.pdf   a signer une fois, avant de commencer. Confidentialite,
                       donnees personnelles, ce que le testeur accepte et ce
                       qu'on lui doit.

  protocole-test.pdf   a garder ouvert pendant le test. Les scenarios dans
                       l'ordre, ce qui doit se passer, et de la place pour
                       ecrire ce qui s'est reellement passe.

POURQUOI LES SEPARER : on ne fait pas signer un document de quinze pages. La
charte tient sur une page et se lit ; le protocole est un outil de travail
qu'on annote. Les melanger, c'est garantir que ni l'un ni l'autre n'est lu.

Usage :
    marketing/promo-video/.venv/bin/python docs/testeurs/generer.py
"""

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
    KeepTogether,
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

# Couleurs de la marque. Un document imprimable reste lisible en noir et blanc :
# le vert ne porte jamais une information a lui seul.
MINT = colors.HexColor("#0E9F6E")
INK = colors.HexColor("#111827")
GREY = colors.HexColor("#6B7280")
LIGHT = colors.HexColor("#E5E7EB")

VERSION = "2.0.0"
CONTACT = "contact@netbudget.app"

base = getSampleStyleSheet()

S = {
    "title": ParagraphStyle(
        "t", parent=base["Title"], fontName="Helvetica-Bold",
        fontSize=20, leading=25, textColor=INK, alignment=0, spaceAfter=2,
    ),
    "subtitle": ParagraphStyle(
        "st", parent=base["Normal"], fontName="Helvetica",
        fontSize=9.5, leading=13, textColor=GREY, spaceAfter=14,
    ),
    "h2": ParagraphStyle(
        "h2", parent=base["Heading2"], fontName="Helvetica-Bold",
        fontSize=11.5, leading=15, textColor=INK, spaceBefore=13, spaceAfter=5,
    ),
    "body": ParagraphStyle(
        "b", parent=base["Normal"], fontName="Helvetica",
        fontSize=9.5, leading=14, textColor=INK, alignment=TA_JUSTIFY, spaceAfter=6,
    ),
    "small": ParagraphStyle(
        "s", parent=base["Normal"], fontName="Helvetica",
        fontSize=8, leading=11, textColor=GREY, spaceAfter=4,
    ),
    "cell": ParagraphStyle(
        "c", parent=base["Normal"], fontName="Helvetica",
        fontSize=8.5, leading=12, textColor=INK,
    ),
    "cellb": ParagraphStyle(
        "cb", parent=base["Normal"], fontName="Helvetica-Bold",
        fontSize=8.5, leading=12, textColor=INK,
    ),
    "cellhead": ParagraphStyle(
        "ch", parent=base["Normal"], fontName="Helvetica-Bold",
        fontSize=8, leading=11, textColor=colors.white,
    ),
}


def header(story, title, subtitle):
    """En-tête commun : logo, titre, sous-titre, filet."""
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


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(GREY)
    canvas.drawString(20 * mm, 12 * mm, f"NETbudget {VERSION} — {CONTACT}")
    canvas.drawRightString(A4[0] - 20 * mm, 12 * mm, f"Page {doc.page}")
    canvas.restoreState()


def document(path):
    return SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=16 * mm, bottomMargin=20 * mm,
        title="NETbudget", author="NETbudget",
    )


# ===========================================================================
# 1. LA CHARTE — une page, à signer
#
# Volontairement courte. Un document de test qui fait cinq pages n'est pas lu,
# et une signature au bas d'un texte non lu ne vaut rien — ni juridiquement,
# ni humainement.
# ===========================================================================

def charte():
    story = []
    header(
        story,
        "Charte du testeur",
        f"NETbudget {VERSION} · session de test fermée · document à signer avant de commencer",
    )

    story.append(Paragraph("Ce que tu acceptes de faire", S["h2"]))
    story.append(Paragraph(
        "Utiliser l'application pendant la durée de la session, avec tes vraies "
        "habitudes plutôt qu'en cherchant à bien faire. Suivre le protocole de "
        "test fourni à part, et signaler ce qui ne va pas — y compris ce qui te "
        "semble anodin ou de mauvaise foi. Un retour tiède ne sert à rien : "
        "c'est ce qui t'agace qu'on a besoin d'entendre.",
        S["body"]))

    story.append(Paragraph("Confidentialité", S["h2"]))
    story.append(Paragraph(
        "L'application n'est pas publique. Jusqu'à sa sortie, tu t'engages à ne "
        "pas diffuser de captures d'écran, de vidéos ni de description "
        "détaillée des fonctionnalités en dehors du cercle de test. En parler "
        "autour de toi en termes généraux ne pose aucun problème.",
        S["body"]))

    story.append(Paragraph("Tes données", S["h2"]))
    story.append(Paragraph(
        "Tu peux tester sans créer de compte : dans ce cas rien ne quitte ton "
        "téléphone. Si tu crées un compte, tes données sont synchronisées et "
        "chiffrées de bout en bout — la clé reste sur ton appareil et nous ne "
        "pouvons pas les lire. Nous te conseillons quand même d'utiliser des "
        "montants approchants plutôt que tes chiffres exacts : c'est une "
        "version de test, un défaut est toujours possible.",
        S["body"]))
    story.append(Paragraph(
        "Tu peux supprimer ton compte à tout moment depuis l'application, ce qui "
        "efface définitivement les données associées. Tes retours écrits, eux, "
        "sont conservés pour améliorer l'application ; ils ne sont jamais "
        "publiés avec ton nom sans ton accord explicite.",
        S["body"]))

    story.append(Paragraph("Ce que nous te devons", S["h2"]))
    story.append(bullets([
        "Te répondre sous 48 heures en semaine.",
        "Te dire ce qui a été corrigé grâce à toi, et ce qui ne le sera pas — avec la raison.",
        "Ne jamais utiliser tes données financières à d'autres fins que de faire fonctionner l'application.",
        "Te prévenir avant tout changement qui élargirait l'usage de tes données.",
    ]))

    story.append(Paragraph("Ce que ce document n'est pas", S["h2"]))
    story.append(Paragraph(
        "Un contrat de travail ni une promesse de rémunération. La participation "
        "est bénévole et tu peux l'interrompre quand tu veux, sans avoir à te "
        "justifier — il suffit de nous écrire.",
        S["body"]))

    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=0.6, color=LIGHT, spaceAfter=10))

    # Bloc de signature. Deux colonnes : chacun garde une trace.
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

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Une question sur ce document : " + CONTACT + ". "
        "Ce texte est une charte de bonne conduite entre nous ; si tu souhaites "
        "lui donner une portée contractuelle plus large, fais-le relire par un "
        "juriste avant de le faire signer.",
        S["small"]))

    doc = document(os.path.join(HERE, "charte-testeur.pdf"))
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return doc.filename


# ===========================================================================
# 2. LE PROTOCOLE — les scénarios, dans l'ordre
#
# POURQUOI CET ORDRE : on commence sans compte, parce que c'est ce que fait un
# vrai utilisateur et parce que c'est le cœur du produit. Le compte, la
# synchronisation et le partage viennent après. Les scénarios destructifs
# (suppression, changement d'appareil) sont en dernier : les mettre au début
# obligerait à tout recommencer.
#
# CHAQUE LIGNE porte ce qui DOIT se passer. Sans attendu écrit, un testeur ne
# signale que les plantages — or ce qui compte autant, c'est ce qui marche mais
# qu'il n'a pas compris.
# ===========================================================================

SCENARIOS = [
    ("A. Sans compte, la première fois", [
        ("Installer et ouvrir l'app, sans rien créer.",
         "L'écran Budget s'affiche directement. Aucune demande d'inscription."),
        ("Saisir un revenu, un loyer, deux dépenses.",
         "Le reste à vivre se met à jour immédiatement, en bas."),
        ("Ajouter un prêt avec sa date de première échéance.",
         "La mensualité se calcule seule, et l'échéancier mois par mois s'ouvre."),
        ("Toucher le repère 50/30/20 en haut à droite.",
         "Une explication s'ouvre, avec la répartition adaptée à ta situation."),
        ("Couper le wifi et les données, puis relancer l'app.",
         "Tout est encore là. Seul le convertisseur signale l'absence de réseau."),
    ]),
    ("B. Le convertisseur", [
        ("Convertir depuis ta devise vers une autre, peu courante.",
         "Le taux s'affiche, avec sa date de mise à jour."),
        ("Quitter complètement l'app, puis la rouvrir sur le convertisseur.",
         "La MÊME paire de devises est encore sélectionnée, et l'historique aussi."),
    ]),
    ("C. Créer un compte", [
        ("Créer un compte par e-mail. Noter le temps que ça prend.",
         "Case de consentement, puis compte créé. Rien d'autre à remplir pour commencer."),
        ("Fermer l'app, la rouvrir, aller dans le profil.",
         "Tu es toujours connecté. Aucune phrase, aucun code, aucune explication de chiffrement."),
        ("Se déconnecter, puis utiliser « Mot de passe oublié ».",
         "Un écran demande l'adresse. L'e-mail arrive, et le lien ouvre l'app sur un écran de nouveau mot de passe."),
    ]),
    ("D. Les conseils", [
        ("Remplir le profil : âge, situation, logement, pays.",
         "Des conseils apparaissent, groupés par thème."),
        ("Ouvrir un conseil et regarder ses sources.",
         "Chaque conseil cite ses références officielles et sa date de vérification."),
        ("Chercher un conseil dont tu ignorais l'existence.",
         "Note lequel, et s'il te concerne vraiment. C'est le retour le plus utile de tout le protocole."),
    ]),
    ("E. Un événement", [
        ("Créer un événement Voyage avec une destination lointaine et une durée.",
         "Un encadré indique la ville reconnue, la distance, le vol estimé et le coût de la vie sur place."),
        ("Regarder le budget proposé.",
         "Les postes sur place suivent le coût du pays ; le transport suit la distance."),
        ("Si tu as des animaux déclarés dans ton profil, vérifier la ligne de garde.",
         "Une ligne « Garde des animaux » apparaît, chiffrée sur la durée du séjour."),
        ("Supprimer l'événement.",
         "Il disparaît en fondu et NE REVIENT PAS après un aller-retour dans l'app."),
    ]),
    ("F. Les notifications", [
        ("Ouvrir Réglages → Notifications personnalisées.",
         "Sept catégories, une fréquence, une heure, et un APERÇU de ce qui est réellement programmé."),
        ("Ramener la fréquence à 1 par semaine.",
         "L'aperçu se réduit immédiatement."),
        ("Couper une catégorie.",
         "Les notifications de cette catégorie disparaissent de l'aperçu, les autres restent."),
    ]),
    ("G. À plusieurs", [
        ("Créer un espace partagé et générer une invitation.",
         "Un code apparaît, à usage unique."),
        ("Depuis un AUTRE compte, sur un autre appareil, accepter ce code.",
         "L'espace apparaît, et son contenu est lisible tout de suite — sans attendre quoi que ce soit."),
        ("Modifier le budget partagé depuis un compte.",
         "L'autre compte voit la modification après rafraîchissement."),
        ("Vérifier que l'espace personnel de chacun reste invisible à l'autre.",
         "Aucune donnée personnelle ne doit apparaître dans l'espace partagé."),
    ]),
    ("H. Changement d'appareil — à faire en DERNIER", [
        ("Dans le profil, toucher « Sauvegarder ma clé » et noter les douze mots.",
         "Douze mots numérotés, avec un bouton copier."),
        ("Désinstaller l'app, la réinstaller, se reconnecter au même compte.",
         "Une tuile « Retrouver mes données » apparaît."),
        ("Saisir les douze mots.",
         "Les données redeviennent lisibles. Un mot faux doit être signalé PRÉCISÉMENT."),
        ("Supprimer le compte depuis les réglages.",
         "Double confirmation, puis suppression effective. Le budget local reste intact."),
    ]),
]


def protocole():
    story = []
    header(
        story,
        "Protocole de test",
        f"NETbudget {VERSION} · à garder ouvert pendant le test · une ligne par action",
    )

    story.append(Paragraph("Comment s'en servir", S["h2"]))
    story.append(Paragraph(
        "Suis les blocs dans l'ordre : le dernier détruit des données, le mettre "
        "avant obligerait à tout recommencer. Pour chaque ligne, compare ce qui "
        "se passe à ce qui devrait se passer, et écris dans la dernière colonne "
        "<b>uniquement si ça diffère</b> — ou si quelque chose t'a fait hésiter, "
        "même une seconde. Une hésitation est un défaut de l'application, pas "
        "du testeur.",
        S["body"]))
    story.append(Paragraph(
        "Note aussi le modèle de ton téléphone et sa version de système : la "
        "moitié des défauts n'existent que sur certains appareils.",
        S["body"]))

    for titre, lignes in SCENARIOS:
        rows = [[
            Paragraph("Action", S["cellhead"]),
            Paragraph("Ce qui doit se passer", S["cellhead"]),
            Paragraph("Ce qui s'est passé", S["cellhead"]),
        ]]
        for action, attendu in lignes:
            rows.append([
                Paragraph(action, S["cell"]),
                Paragraph(attendu, S["cell"]),
                Paragraph(" ", S["cell"]),
            ])

        # Hauteur imposee ligne par ligne : l'en-tete reste compact, chaque
        # ligne de test recoit de quoi ecrire trois lignes a la main.
        heights = [None] + [17 * mm] * (len(rows) - 1)
        table = Table(
            rows, colWidths=[52 * mm, 65 * mm, 53 * mm],
            rowHeights=heights, repeatRows=1,
        )
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), MINT),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.4, LIGHT),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(KeepTogether([Paragraph(titre, S["h2"]), table]))
        story.append(Spacer(1, 4))

    story.append(PageBreak())
    story.append(Paragraph("Les trois questions de la fin", S["h2"]))
    story.append(Paragraph(
        "Elles valent plus que tout le tableau. Prends cinq minutes et réponds "
        "franchement — un compliment ne nous apprend rien.",
        S["body"]))

    fin = [
        "Qu'est-ce qui t'a agacé, même une fois, même brièvement ?",
        "À quel moment as-tu pensé « je ne comprends pas ce qu'on attend de moi » ?",
        "Est-ce que tu recommanderais l'app à quelqu'un ? À qui, et avec quelle phrase ?",
    ]
    rows = [[Paragraph(q, S["cellb"])] for q in fin]
    blocs = []
    for r in rows:
        t = Table(
            [r, [Paragraph(" ", S["cell"])]],
            colWidths=[170 * mm], rowHeights=[None, 30 * mm],
        )
        t.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.4, LIGHT),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        blocs.append(t)
        blocs.append(Spacer(1, 8))
    story.extend(blocs)

    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Renvoie ce document rempli, ou écris-nous simplement à " + CONTACT +
        ". Une photo des pages annotées convient parfaitement.",
        S["small"]))

    doc = document(os.path.join(HERE, "protocole-test.pdf"))
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return doc.filename


if __name__ == "__main__":
    for f in (charte(), protocole()):
        print(f"  {os.path.basename(f)}  ({os.path.getsize(f) // 1024} Ko)")
