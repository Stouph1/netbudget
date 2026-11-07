#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Textes de la fiche App Store pour la 2.0, dans les huit langues de l'app.

Un seul fichier source : les limites d'Apple sont vérifiées ici (sous-titre
30, texte promotionnel 170, mots-clés 100, description et nouveautés 4 000),
puis chaque langue est écrite dans textes/<lang>.md, prête à coller champ par
champ dans App Store Connect.

    marketing/promo-video/.venv/bin/python marketing/appstore/2.0/textes.py

Règles tenues : aucun prix (ils viennent des stores), aucun emoji, aucune
mention d'un concurrent, rien que l'app ne fasse pas (voir frontend/).
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
LIMITS = {"subtitle": 30, "promo": 170, "keywords": 100, "description": 4000, "whatsnew": 4000}

T = {
"fr": {
"subtitle": "Budget, reste à vivre, Coach",
"promo": "Combien te reste-t-il vraiment ce mois-ci ? La 2.0 ajoute le budget à deux ou en famille et un Coach de 282 conseils sourcés dans 17 pays. Sans connexion bancaire.",
"keywords": "budget,reste à vivre,dépenses,épargne,finances,couple,famille,conseils,argent,prêt,convertisseur",
"description": """Combien te reste-t-il vraiment à la fin du mois ?

NETbudget calcule ton reste à vivre en quelques minutes : tu saisis tes revenus et tes dépenses, l'app fait le reste. Aucune connexion à ta banque, jamais. Ton budget vit sur ton téléphone, et avec un compte, ce qui se synchronise est chiffré avant de partir, avec une clé que toi seul possèdes.

UN BUDGET QUI SE LIT D'UN COUP D'ŒIL
• Reste à vivre du mois, dépenses par famille (besoins, loisirs, épargne) et tableau de l'année
• Un pictogramme par poste, trouvé depuis son nom : basketball, Navigo, mutuelle
• Dépenses par période : le ski en hiver, les vacances en été
• Plusieurs sources de revenus, chacune avec ses charges, et l'impôt prélevé à la source dans 32 pays
• Prêts avec échéancier, convertisseur de 15 devises, export PDF

DES REPÈRES OFFICIELS, PAS DES OPINIONS
Ta part logement, courses ou sorties face à la moyenne des ménages de ton pays : Eurostat en Europe, BLS aux États-Unis, ONS au Royaume-Uni, Statistique Canada, ABS en Australie. La source et l'année sont toujours affichées. Un repère 50/30/20 qui s'adapte à ton profil, à ta ville et à ton logement.

UN COACH QUI CITE SES SOURCES
282 conseils dans 17 pays, triés par ton âge, ton foyer, ton logement et ton pays. Chacun cite sa page officielle et sa date de vérification : droits non réclamés, épargne réglementée, fiscalité, prévoyance. Un conseil de la semaine chaque lundi.

UN BUDGET À PLUSIEURS
Un code d'invitation, et le budget commun se voit des deux côtés. Chacun garde son espace privé. En famille : jusqu'à six personnes, trois espaces, les anniversaires et les projets du foyer.

UN ESPACE PAR PROJET
Mariage, voyage, naissance, fête : trois questions, et le budget est posé avec ses postes, son rétro-planning et ses rappels.

DES NOTIFICATIONS QUI VALENT LE DÉRANGEMENT
Le point du mois, le conseil de la semaine, un jalon de projet qui approche. Tu fixes le plafond hebdomadaire.

GRATUIT POUR COMMENCER
Le budget, les prêts et le convertisseur sont gratuits, sans compte et sans limite de temps. Les formules ajoutent le Coach, le conseil du lundi, les projets, tous les repères et les revenus sans limite. Duo et Famille y ajoutent le budget partagé : les membres invités en profitent sans payer.

Huit langues, 59 pays, 499 villes avec leur coût de la vie. Développé en France par un développeur indépendant.""",
"whatsnew": """NETbudget 2.0, la plus grande mise à jour depuis le lancement.

• Budget à plusieurs : en couple, en famille ou en colocation, avec un simple code d'invitation. Chacun garde son espace privé.
• Coach : 282 conseils sourcés dans 17 pays, choisis selon ton âge, ton foyer, ton logement et ton pays. Un nouveau conseil chaque lundi.
• Repères officiels : ta part logement, courses ou sorties face à la moyenne des ménages de ton pays, avec la source et l'année.
• Projets : mariage, voyage, naissance, fête, avec un budget guidé, un rétro-planning et des rappels.
• Budget plus clair : un pictogramme par poste, des dépenses par période, un repère 50/30/20 adapté à ton profil.
• Impôt prélevé à la source dans 32 pays.
• Objectifs d'épargne avec échéance, export PDF refait.
• Notifications utiles, avec un plafond par semaine que tu choisis.
• Données synchronisées chiffrées de bout en bout.
• Huit langues, dont l'arabe et le japonais.""",
},
"en": {
"subtitle": "Budget, money left, Coach",
"promo": "How much do you really have left this month? 2.0 adds budgets for couples and families, and a Coach with 282 sourced tips across 17 countries. No bank connection.",
"keywords": "budget,money left,expenses,savings,finance,couple,family,tips,money,loan,converter,planner",
"description": """How much do you really have left at the end of the month?

NETbudget works it out in minutes: you enter your income and expenses, the app does the rest. No connection to your bank, ever. Your budget lives on your phone, and with an account, whatever syncs is encrypted before it leaves, with a key only you hold.

A BUDGET YOU READ AT A GLANCE
• Money left this month, expenses by family (needs, wants, savings) and the whole year in one table
• A pictogram for every line, found from its name: basketball, transit pass, health plan
• Expenses by period: skiing in winter, holidays in summer
• Several income sources, each with its own deductions, plus income tax withheld at source in 32 countries
• Loans with a full schedule, a 15-currency converter, PDF export

OFFICIAL BENCHMARKS, NOT OPINIONS
Your housing, grocery or dining share against the average household in your country: Eurostat in Europe, BLS in the United States, ONS in the United Kingdom, Statistics Canada, ABS in Australia. The source and the year are always shown. A 50/30/20 benchmark that adapts to your profile, your city and your housing.

A COACH THAT CITES ITS SOURCES
282 tips across 17 countries, filtered by your age, household, housing and country. Each one cites its official page and its verification date: unclaimed benefits, regulated savings, taxes, insurance. A tip of the week every Monday.

A BUDGET FOR TWO, OR MORE
One invitation code, and the shared budget shows on both sides. Each of you keeps a private space. As a family: up to six people, three spaces, the household's birthdays and projects.

ONE SPACE PER PROJECT
Wedding, trip, baby, party: three questions, and the budget is set with its lines, its timeline and its reminders.

NOTIFICATIONS WORTH THE INTERRUPTION
The monthly check-in, the tip of the week, a project milestone coming up. You set the weekly cap.

FREE TO START
Budget, loans and converter are free, with no account and no time limit. The plans add the Coach, the Monday tip, projects, all benchmarks and unlimited incomes. Duo and Family add the shared budget: invited members enjoy it without paying.

Eight languages, 59 countries, 499 cities with their cost of living. Built in France by an independent developer.""",
"whatsnew": """NETbudget 2.0, the biggest update since launch.

• Shared budgets: as a couple, a family or flatmates, with a simple invite code. Everyone keeps a private space.
• Coach: 282 sourced tips across 17 countries, picked for your age, household, housing and country. A new tip every Monday.
• Official benchmarks: your share for housing, groceries or going out against the average household in your country, with source and year.
• Projects: wedding, trip, new baby, party, with a guided budget, a countdown plan and reminders.
• A clearer budget: an icon for each item, seasonal expenses, a 50/30/20 guide tuned to your profile.
• Tax withheld at source in 32 countries.
• Savings goals with a deadline, a rebuilt PDF export.
• Useful notifications, with a weekly cap you choose.
• Synced data is end-to-end encrypted.
• Eight languages, including Arabic and Japanese.""",
},
"es": {
"subtitle": "Presupuesto, lo que te queda",
"promo": "¿Cuánto te queda de verdad este mes? La 2.0 añade el presupuesto en pareja o en familia y un Coach con 282 consejos con fuente en 17 países. Sin conexión bancaria.",
"keywords": "presupuesto,gastos,ahorro,finanzas,pareja,familia,consejos,dinero,préstamo,conversor,planificador",
"description": """¿Cuánto te queda de verdad a final de mes?

NETbudget lo calcula en minutos: introduces tus ingresos y tus gastos, la app hace el resto. Sin conexión a tu banco, nunca. Tu presupuesto vive en tu teléfono y, con una cuenta, lo que se sincroniza se cifra antes de salir, con una clave que solo tú tienes.

UN PRESUPUESTO QUE SE LEE DE UN VISTAZO
• Lo que te queda este mes, gastos por familia (necesidades, ocio, ahorro) y todo el año en una tabla
• Un pictograma por partida, encontrado a partir de su nombre: baloncesto, abono transporte, seguro médico
• Gastos por periodo: el esquí en invierno, las vacaciones en verano
• Varias fuentes de ingresos, cada una con sus retenciones, y el impuesto retenido en nómina en 32 países
• Préstamos con cuadro de amortización, conversor de 15 divisas, exportación en PDF

REFERENCIAS OFICIALES, NO OPINIONES
Tu parte de vivienda, compra o salidas frente al hogar medio de tu país: Eurostat en Europa, BLS en Estados Unidos, ONS en el Reino Unido, Statistics Canada, ABS en Australia. La fuente y el año siempre a la vista. Una referencia 50/30/20 que se adapta a tu perfil, tu ciudad y tu vivienda.

UN COACH QUE CITA SUS FUENTES
282 consejos en 17 países, filtrados por tu edad, tu hogar, tu vivienda y tu país. Cada uno cita su página oficial y su fecha de verificación: ayudas no reclamadas, ahorro regulado, impuestos, previsión. Un consejo de la semana cada lunes.

UN PRESUPUESTO A VARIOS
Un código de invitación, y el presupuesto común se ve en los dos lados. Cada uno conserva su espacio privado. En familia: hasta seis personas, tres espacios, los cumpleaños y los proyectos del hogar.

UN ESPACIO POR PROYECTO
Boda, viaje, nacimiento, fiesta: tres preguntas, y el presupuesto queda listo con sus partidas, su calendario y sus recordatorios.

NOTIFICACIONES QUE MERECEN LA PENA
El balance del mes, el consejo de la semana, un hito de proyecto que se acerca. Tú fijas el límite semanal.

GRATIS PARA EMPEZAR
El presupuesto, los préstamos y el conversor son gratuitos, sin cuenta y sin límite de tiempo. Los planes añaden el Coach, el consejo del lunes, los proyectos, todas las referencias y los ingresos sin límite. Dúo y Familia suman el presupuesto compartido: los miembros invitados lo disfrutan sin pagar.

Ocho idiomas, 59 países, 499 ciudades con su coste de vida. Desarrollada en Francia por un desarrollador independiente.""",
"whatsnew": """NETbudget 2.0, la mayor actualización desde el lanzamiento.

• Presupuesto compartido: en pareja, en familia o entre compañeros de piso, con un simple código de invitación. Cada uno conserva su espacio privado.
• Coach: 282 consejos con fuente en 17 países, elegidos según tu edad, tu hogar, tu vivienda y tu país. Un consejo nuevo cada lunes.
• Referencias oficiales: tu parte de vivienda, compra u ocio frente a la media de los hogares de tu país, con la fuente y el año.
• Proyectos: boda, viaje, nacimiento, fiesta, con presupuesto guiado, cuenta atrás y recordatorios.
• Un presupuesto más claro: un pictograma por partida, gastos por temporada, una referencia 50/30/20 adaptada a tu perfil.
• Impuesto retenido en origen en 32 países.
• Objetivos de ahorro con fecha límite, exportación PDF renovada.
• Notificaciones útiles, con un límite semanal que eliges tú.
• Datos sincronizados cifrados de extremo a extremo.
• Ocho idiomas, entre ellos el árabe y el japonés.""",
},
"pt": {
"subtitle": "Orçamento, o que te sobra",
"promo": "Quanto te sobra mesmo este mês? A 2.0 traz o orçamento a dois ou em família e um Coach com 282 dicas com fonte em 17 países. Sem ligação ao banco.",
"keywords": "orçamento,despesas,poupança,finanças,casal,família,dicas,dinheiro,empréstimo,conversor,planeador",
"description": """Quanto te sobra mesmo no fim do mês?

O NETbudget calcula-o em minutos: introduzes os teus rendimentos e as tuas despesas, a app faz o resto. Sem ligação ao teu banco, nunca. O teu orçamento vive no teu telemóvel e, com uma conta, o que se sincroniza é cifrado antes de sair, com uma chave que só tu tens.

UM ORÇAMENTO QUE SE LÊ NUM RELANCE
• O que te sobra este mês, despesas por família (necessidades, lazer, poupança) e o ano inteiro numa tabela
• Um pictograma por rubrica, encontrado a partir do nome: basquetebol, passe de transportes, seguro de saúde
• Despesas por período: o esqui no inverno, as férias no verão
• Várias fontes de rendimento, cada uma com os seus descontos, e o imposto retido na fonte em 32 países
• Empréstimos com plano de amortização, conversor de 15 moedas, exportação em PDF

REFERÊNCIAS OFICIAIS, NÃO OPINIÕES
A tua parte de habitação, compras ou saídas face ao agregado médio do teu país: Eurostat na Europa, BLS nos Estados Unidos, ONS no Reino Unido, Statistics Canada, ABS na Austrália. A fonte e o ano estão sempre visíveis. Uma referência 50/30/20 que se adapta ao teu perfil, à tua cidade e à tua habitação.

UM COACH QUE CITA AS FONTES
282 dicas em 17 países, filtradas pela tua idade, o teu agregado, a tua habitação e o teu país. Cada uma cita a página oficial e a data de verificação: apoios por reclamar, poupança regulada, impostos, proteção. Uma dica da semana todas as segundas.

UM ORÇAMENTO A VÁRIOS
Um código de convite, e o orçamento comum vê-se dos dois lados. Cada um mantém o seu espaço privado. Em família: até seis pessoas, três espaços, os aniversários e os projetos do agregado.

UM ESPAÇO POR PROJETO
Casamento, viagem, nascimento, festa: três perguntas e o orçamento fica montado, com as rubricas, o calendário e os lembretes.

NOTIFICAÇÕES QUE VALEM A PENA
O ponto do mês, a dica da semana, um marco de projeto que se aproxima. Tu defines o limite semanal.

GRÁTIS PARA COMEÇAR
O orçamento, os empréstimos e o conversor são gratuitos, sem conta e sem limite de tempo. Os planos acrescentam o Coach, o conselho de segunda-feira, os projetos, todas as referências e os rendimentos sem limite. Duo e Família juntam o orçamento partilhado: os membros convidados usufruem dele sem pagar.

Oito idiomas, 59 países, 499 cidades com o seu custo de vida. Desenvolvida em França por um programador independente.""",
"whatsnew": """NETbudget 2.0, a maior atualização desde o lançamento.

• Orçamento partilhado: a dois, em família ou entre colegas de casa, com um simples código de convite. Cada um mantém o seu espaço privado.
• Coach: 282 dicas com fonte em 17 países, escolhidas pela tua idade, agregado, habitação e país. Uma dica nova todas as segundas-feiras.
• Referências oficiais: a tua parte de habitação, supermercado ou lazer face à média dos agregados do teu país, com a fonte e o ano.
• Projetos: casamento, viagem, nascimento, festa, com orçamento guiado, contagem decrescente e lembretes.
• Um orçamento mais claro: um pictograma por rubrica, despesas por época, uma referência 50/30/20 adaptada ao teu perfil.
• Imposto retido na fonte em 32 países.
• Objetivos de poupança com prazo, exportação PDF renovada.
• Notificações úteis, com um limite semanal que tu escolhes.
• Dados sincronizados cifrados de ponta a ponta.
• Oito idiomas, incluindo árabe e japonês.""",
},
"de": {
"subtitle": "Budget, was wirklich bleibt",
"promo": "Wie viel bleibt dir diesen Monat wirklich? Die 2.0 bringt das Budget zu zweit oder als Familie und einen Coach mit 282 belegten Tipps aus 17 Ländern. Ohne Bankanbindung.",
"keywords": "budget,haushalt,ausgaben,sparen,finanzen,paar,familie,tipps,geld,kredit,währungsrechner,planer",
"description": """Wie viel bleibt dir am Monatsende wirklich übrig?

NETbudget rechnet es in wenigen Minuten aus: Du trägst Einnahmen und Ausgaben ein, die App erledigt den Rest. Keine Verbindung zu deiner Bank, niemals. Dein Budget lebt auf deinem Telefon, und mit einem Konto wird alles, was synchronisiert wird, vor dem Versand verschlüsselt, mit einem Schlüssel, den nur du besitzt.

EIN BUDGET AUF EINEN BLICK
• Was diesen Monat bleibt, Ausgaben nach Familie (Bedarf, Wünsche, Sparen) und das ganze Jahr in einer Tabelle
• Ein Piktogramm pro Posten, gefunden über den Namen: Basketball, Monatskarte, Krankenversicherung
• Ausgaben nach Zeitraum: Skifahren im Winter, Urlaub im Sommer
• Mehrere Einkommensquellen mit jeweils eigenen Abzügen, dazu die einbehaltene Lohnsteuer in 32 Ländern
• Kredite mit vollständigem Tilgungsplan, Währungsrechner mit 15 Währungen, PDF-Export

OFFIZIELLE VERGLEICHSWERTE, KEINE MEINUNGEN
Dein Anteil für Wohnen, Einkäufe oder Ausgehen im Vergleich zum Durchschnittshaushalt deines Landes: Eurostat in Europa, BLS in den USA, ONS in Großbritannien, Statistics Canada, ABS in Australien. Quelle und Jahr werden immer angezeigt. Eine 50/30/20-Orientierung, die sich an dein Profil, deine Stadt und deine Wohnsituation anpasst.

EIN COACH, DER SEINE QUELLEN NENNT
282 Tipps aus 17 Ländern, gefiltert nach Alter, Haushalt, Wohnsituation und Land. Jeder nennt seine offizielle Seite und sein Prüfdatum: nicht beantragte Leistungen, geregeltes Sparen, Steuern, Vorsorge. Jeden Montag ein Tipp der Woche.

EIN BUDGET ZU ZWEIT ODER MEHR
Ein Einladungscode, und das gemeinsame Budget ist auf beiden Seiten sichtbar. Jeder behält seinen privaten Bereich. Als Familie: bis zu sechs Personen, drei Bereiche, Geburtstage und Projekte des Haushalts.

EIN BEREICH PRO PROJEKT
Hochzeit, Reise, Baby, Feier: drei Fragen, und das Budget steht, mit Posten, Zeitplan und Erinnerungen.

BENACHRICHTIGUNGEN, DIE SICH LOHNEN
Der Monatscheck, der Tipp der Woche, ein näher rückender Projektschritt. Die Wochenobergrenze legst du fest.

KOSTENLOS STARTEN
Budget, Kredite und Währungsrechner sind kostenlos, ohne Konto und ohne Zeitlimit. Die Tarife ergänzen den Coach, den Montags-Tipp, Projekte, alle Vergleichswerte und unbegrenzt Einkommen. Duo und Familie fügen das gemeinsame Budget hinzu: Eingeladene Mitglieder nutzen es, ohne zu zahlen.

Acht Sprachen, 59 Länder, 499 Städte mit ihren Lebenshaltungskosten. Entwickelt in Frankreich von einem unabhängigen Entwickler.""",
"whatsnew": """NETbudget 2.0, das größte Update seit dem Start.

• Gemeinsames Budget: als Paar, Familie oder WG, mit einem einfachen Einladungscode. Jeder behält seinen privaten Bereich.
• Coach: 282 belegte Tipps aus 17 Ländern, ausgewählt nach Alter, Haushalt, Wohnsituation und Land. Jeden Montag ein neuer Tipp.
• Offizielle Vergleichswerte: dein Anteil für Wohnen, Einkauf oder Freizeit im Vergleich zum Durchschnittshaushalt deines Landes, mit Quelle und Jahr.
• Projekte: Hochzeit, Reise, Geburt, Feier, mit geführtem Budget, Zeitplan und Erinnerungen.
• Ein übersichtlicheres Budget: ein Symbol pro Posten, saisonale Ausgaben, eine 50/30/20-Orientierung passend zu deinem Profil.
• Quellensteuer in 32 Ländern.
• Sparziele mit Frist, neu gestalteter PDF-Export.
• Nützliche Benachrichtigungen, mit einer Wochengrenze, die du festlegst.
• Synchronisierte Daten sind Ende-zu-Ende-verschlüsselt.
• Acht Sprachen, darunter Arabisch und Japanisch.""",
},
"it": {
"subtitle": "Budget, quanto ti resta",
"promo": "Quanto ti resta davvero questo mese? La 2.0 aggiunge il budget in coppia o in famiglia e un Coach con 282 consigli con fonte in 17 paesi. Senza collegamento alla banca.",
"keywords": "budget,spese,risparmio,finanze,coppia,famiglia,consigli,soldi,prestito,convertitore,pianificatore",
"description": """Quanto ti resta davvero a fine mese?

NETbudget lo calcola in pochi minuti: inserisci entrate e spese, l'app fa il resto. Nessun collegamento alla tua banca, mai. Il tuo budget vive sul tuo telefono e, con un account, ciò che si sincronizza viene cifrato prima di partire, con una chiave che solo tu possiedi.

UN BUDGET CHE SI LEGGE A COLPO D'OCCHIO
• Quanto ti resta questo mese, spese per famiglia (necessità, svago, risparmio) e tutto l'anno in una tabella
• Un pittogramma per ogni voce, trovato dal nome: basket, abbonamento ai mezzi, assicurazione sanitaria
• Spese per periodo: lo sci d'inverno, le vacanze d'estate
• Più fonti di reddito, ciascuna con le sue trattenute, e l'imposta trattenuta alla fonte in 32 paesi
• Prestiti con piano di ammortamento, convertitore di 15 valute, esportazione in PDF

RIFERIMENTI UFFICIALI, NON OPINIONI
La tua quota di casa, spesa o uscite rispetto alla famiglia media del tuo paese: Eurostat in Europa, BLS negli Stati Uniti, ONS nel Regno Unito, Statistics Canada, ABS in Australia. Fonte e anno sempre visibili. Un riferimento 50/30/20 che si adatta al tuo profilo, alla tua città e alla tua casa.

UN COACH CHE CITA LE FONTI
282 consigli in 17 paesi, filtrati per età, nucleo familiare, abitazione e paese. Ognuno cita la sua pagina ufficiale e la data di verifica: diritti non richiesti, risparmio regolamentato, fisco, previdenza. Un consiglio della settimana ogni lunedì.

UN BUDGET IN DUE, O PIÙ
Un codice di invito, e il budget comune si vede da entrambe le parti. Ognuno conserva il proprio spazio privato. In famiglia: fino a sei persone, tre spazi, i compleanni e i progetti di casa.

UNO SPAZIO PER OGNI PROGETTO
Matrimonio, viaggio, nascita, festa: tre domande, e il budget è pronto con le sue voci, il suo calendario e i suoi promemoria.

NOTIFICHE CHE VALGONO IL DISTURBO
Il punto del mese, il consiglio della settimana, una tappa di progetto che si avvicina. Il tetto settimanale lo decidi tu.

GRATIS PER INIZIARE
Budget, prestiti e convertitore sono gratuiti, senza account e senza limiti di tempo. I piani aggiungono il Coach, il consiglio del lunedì, i progetti, tutti i riferimenti e le entrate senza limiti. Duo e Famiglia aggiungono il budget condiviso: i membri invitati lo usano senza pagare.

Otto lingue, 59 paesi, 499 città con il loro costo della vita. Sviluppata in Francia da uno sviluppatore indipendente.""",
"whatsnew": """NETbudget 2.0, il più grande aggiornamento dal lancio.

• Budget condiviso: in coppia, in famiglia o tra coinquilini, con un semplice codice di invito. Ognuno mantiene il proprio spazio privato.
• Coach: 282 consigli con fonte in 17 paesi, scelti in base a età, famiglia, abitazione e paese. Un consiglio nuovo ogni lunedì.
• Riferimenti ufficiali: la tua quota per casa, spesa o svago rispetto alla media delle famiglie del tuo paese, con fonte e anno.
• Progetti: matrimonio, viaggio, nascita, festa, con budget guidato, conto alla rovescia e promemoria.
• Un budget più chiaro: un pittogramma per voce, spese per periodo, un riferimento 50/30/20 adatto al tuo profilo.
• Imposta trattenuta alla fonte in 32 paesi.
• Obiettivi di risparmio con scadenza, esportazione PDF rinnovata.
• Notifiche utili, con un limite settimanale che scegli tu.
• Dati sincronizzati cifrati end-to-end.
• Otto lingue, tra cui arabo e giapponese.""",
},
"ar": {
"subtitle": "ميزانية، ما يتبقّى لك فعلًا",
"promo": "كم يتبقى لك فعلاً هذا الشهر؟ يضيف الإصدار 2.0 الميزانية المشتركة للزوجين والعائلة، ومرشداً بـ 282 نصيحة موثّقة في 17 بلداً. دون ربط بالبنك.",
"keywords": "ميزانية,مصاريف,ادخار,مال,زوجين,عائلة,نصائح,قرض,محوّل عملات,مخطط,راتب,تخطيط",
"description": """كم يتبقّى لك فعلًا في نهاية الشهر؟

يحسبه NETbudget في دقائق: تدخل دخلك ومصاريفك، والتطبيق يتولّى الباقي. لا ربط ببنكك، أبدًا. ميزانيتك تبقى على هاتفك، ومع حساب، يُشفَّر كل ما يُزامَن قبل أن يغادر، بمفتاح لا يملكه سواك.

ميزانية تُقرأ بنظرة واحدة
• ما يتبقّى لك هذا الشهر، المصاريف حسب العائلة (ضروريات، ترفيه، ادخار) والسنة كاملة في جدول واحد
• رمز لكل بند، يُستنتج من اسمه: كرة السلة، اشتراك المواصلات، التأمين الصحي
• مصاريف حسب الفترة: التزلج في الشتاء، والعطلة في الصيف
• عدة مصادر دخل، لكل منها اقتطاعاتها، إضافة إلى ضريبة الدخل المقتطعة من المصدر في 32 بلدًا
• قروض مع جدول سداد كامل، محوّل لـ 15 عملة، تصدير PDF

معايير رسمية، لا آراء
حصة السكن أو المشتريات أو الخروج لديك مقارنة بمتوسط الأسر في بلدك: يوروستات في أوروبا، BLS في الولايات المتحدة، ONS في المملكة المتحدة، إحصاءات كندا، ABS في أستراليا. المصدر والسنة ظاهران دائمًا. معيار 50/30/20 يتكيّف مع ملفك ومدينتك وسكنك.

مرشد يذكر مصادره
282 نصيحة في 17 بلدًا، مصنّفة حسب عمرك وأسرتك وسكنك وبلدك. كل نصيحة تذكر صفحتها الرسمية وتاريخ التحقق منها: حقوق لم تُطالب بها، ادخار منظّم، ضرائب، تأمين. نصيحة الأسبوع كل يوم اثنين.

ميزانية لاثنين أو أكثر
رمز دعوة واحد، وتظهر الميزانية المشتركة لدى الطرفين. يحتفظ كل واحد بمساحته الخاصة. للعائلة: حتى ستة أشخاص، ثلاث مساحات، أعياد ميلاد الأسرة ومشاريعها.

مساحة لكل مشروع
زفاف، سفر، مولود، حفلة: ثلاثة أسئلة وتكون الميزانية جاهزة ببنودها وجدولها الزمني وتذكيراتها.

إشعارات تستحق الإزعاج
مراجعة الشهر، نصيحة الأسبوع، مرحلة مشروع تقترب. أنت من يحدد السقف الأسبوعي.

مجاني للبدء
الميزانية والقروض والمحوّل مجانية، دون حساب ودون حد زمني. تضيف الباقات المرشد ونصيحة يوم الاثنين والمشاريع وكل المؤشرات ومداخيل بلا حدود. وتضيف باقتا ثنائي وعائلة الميزانية المشتركة: يستفيد منها الأعضاء المدعوون دون دفع.

ثماني لغات، 59 بلدًا، 499 مدينة مع تكلفة معيشتها. طُوّر في فرنسا على يد مطوّر مستقل.""",
"whatsnew": """NETbudget 2.0، أكبر تحديث منذ الإطلاق.

• ميزانية مشتركة: للزوجين أو العائلة أو شركاء السكن، برمز دعوة بسيط. ويحتفظ كل شخص بمساحته الخاصة.
• المرشد: 282 نصيحة موثّقة في 17 بلداً، مختارة حسب عمرك وأسرتك وسكنك وبلدك. نصيحة جديدة كل يوم اثنين.
• معايير رسمية: حصتك من السكن أو المشتريات أو الترفيه مقارنةً بمتوسط الأسر في بلدك، مع ذكر المصدر والسنة.
• المشاريع: زفاف، سفر، ولادة، حفلة، مع ميزانية موجهة وجدول زمني وتذكيرات.
• ميزانية أوضح: رمز لكل بند، ومصاريف حسب الموسم، ومعيار 50/30/20 يناسب وضعك.
• الضريبة المقتطعة من المصدر في 32 بلداً.
• أهداف ادخار بموعد محدد، وتصدير PDF مُعاد تصميمه.
• إشعارات مفيدة، بحد أسبوعي تختاره أنت.
• البيانات المتزامنة مشفّرة من طرف إلى طرف.
• ثماني لغات، منها العربية واليابانية.""",
},
"ja": {
"subtitle": "家計簿、本当に残るお金",
"promo": "今月、本当に残るお金はいくら？ バージョン2.0では、カップル・家族で共有できる家計と、17か国・出典つき282のアドバイスを持つコーチが加わりました。銀行連携なし。",
"keywords": "家計簿,予算,支出,貯金,家計,カップル,家族,アドバイス,お金,ローン,為替,計画",
"description": """月末に本当に残るお金はいくら？

NETbudget は数分で答えを出します。収入と支出を入力すれば、あとはアプリが計算します。銀行との連携は一切ありません。家計データはあなたのスマートフォンに置かれ、アカウントを使う場合も、同期されるデータは送信前に暗号化され、その鍵を持つのはあなただけです。

ひと目でわかる家計
• 今月残るお金、家族ごとの支出（必要・娯楽・貯蓄）、一年分を一つの表で
• 項目名から見つかるピクトグラム：バスケットボール、定期券、医療保険
• 期間つきの支出：冬のスキー、夏の休暇
• 複数の収入源、それぞれの控除、さらに32か国の源泉徴収税
• 返済計画つきのローン、15通貨の為替計算、PDF書き出し

意見ではなく、公的な目安
住居・食料・外食の割合を、あなたの国の平均世帯と比較：欧州のユーロスタット、米国のBLS、英国のONS、カナダ統計局、豪州のABS。出典と年は常に表示。プロフィール・都市・住まいに合わせて調整される50/30/20の目安。

出典を示すコーチ
年齢・世帯・住まい・国で絞り込まれた、17か国・282のアドバイス。それぞれが公式ページと確認日を示します：未申請の給付、規制貯蓄、税、保障。毎週月曜に今週のアドバイス。

二人以上で使う家計
招待コードひとつで、共有家計が双方に表示されます。それぞれにプライベートな領域も残ります。家族なら最大6人、3つのスペース、家族の誕生日とプロジェクト。

プロジェクトごとのスペース
結婚式、旅行、出産、パーティー：3つの質問で、項目・スケジュール・リマインダーつきの予算が整います。

邪魔にならない通知
月次チェック、今週のアドバイス、近づくプロジェクトの節目。週ごとの上限はあなたが決めます。

無料で始められます
家計・ローン・為替計算は、アカウントなしで、期間制限なく無料。有料プランでは、コーチ、毎週月曜日のアドバイス、プロジェクト、すべての支出の目安、無制限の収入登録が加わります。デュオとファミリーでは家計の共有も。招待したメンバーは無料で利用できます。

8言語、59か国、生活費の目安つき499都市。フランスの個人開発者が開発。""",
"whatsnew": """NETbudget 2.0、リリース以来最大のアップデートです。

• 共有の家計：カップル、家族、ルームメイトと、招待コードひとつで共有。それぞれのプライベートな空間はそのまま。
• コーチ：17か国・出典つきの282のアドバイスを、年齢・世帯・住まい・国に合わせて表示。毎週月曜に新しいアドバイス。
• 公的統計との比較：住居・食料品・娯楽の割合を、あなたの国の平均世帯と比較。出典と年を明記。
• プロジェクト：結婚式、旅行、出産、パーティー。ガイド付きの予算、逆算スケジュール、リマインダー。
• より見やすい家計：項目ごとのアイコン、季節ごとの支出、プロフィールに合わせた50/30/20の目安。
• 32か国の源泉徴収に対応。
• 期限付きの貯蓄目標、PDF書き出しを刷新。
• 役立つ通知。1週間の上限は自分で設定。
• 同期データはエンドツーエンドで暗号化。
• アラビア語と日本語を含む8言語。""",
},
}

# Exigé par Apple pour les abonnements (règle 3.1.2) : un lien vers les
# conditions d'utilisation dans la description, pour chaque langue. On utilise
# le CLUF standard d'Apple (le site garde ses propres conditions) et on rappelle
# la politique de confidentialité. Ajouté à l'écriture des fichiers : la
# description de Google Play (fiche.py) reste sans ces lignes.
EULA = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
PRIVACY = "https://www.netbudget.app/privacy"
LEGAL = {
 "fr": f"Conditions d'utilisation (CLUF standard d'Apple) : {EULA}\nPolitique de confidentialité : {PRIVACY}",
 "en": f"Terms of Use (Apple standard EULA): {EULA}\nPrivacy Policy: {PRIVACY}",
 "es": f"Condiciones de uso (CLUF estándar de Apple): {EULA}\nPolítica de privacidad: {PRIVACY}",
 "pt": f"Termos de utilização (CLUF padrão da Apple): {EULA}\nPolítica de privacidade: {PRIVACY}",
 "de": f"Nutzungsbedingungen (Standard-EULA von Apple): {EULA}\nDatenschutzerklärung: {PRIVACY}",
 "it": f"Termini di utilizzo (EULA standard di Apple): {EULA}\nInformativa sulla privacy: {PRIVACY}",
 "ar": f"شروط الاستخدام (اتفاقية Apple القياسية): {EULA}\nسياسة الخصوصية: {PRIVACY}",
 "ja": f"利用規約（Apple標準EULA）: {EULA}\nプライバシーポリシー: {PRIVACY}",
}

NAMES = {"fr": "Français", "en": "English", "es": "Español", "pt": "Português", "de": "Deutsch", "it": "Italiano", "ar": "العربية", "ja": "日本語"}
FIELDS = [("subtitle", "Sous-titre"), ("promo", "Texte promotionnel"), ("keywords", "Mots-clés"), ("description", "Description"), ("whatsnew", "Nouveautés de cette version")]

def main():
    out = os.path.join(HERE, "textes"); os.makedirs(out, exist_ok=True)
    bad = []
    for lang, t in T.items():
        lines = [f"# App Store · {NAMES[lang]} ({lang})", ""]
        for key, label in FIELDS:
            v = t[key].strip()
            if key == "description": v += "\n\n" + LEGAL[lang]
            n = len(v); lim = LIMITS[key]
            if n > lim: bad.append((lang, key, n, lim))
            lines += [f"## {label} ({n}/{lim})", "", "```", v, "```", ""]
        open(os.path.join(out, f"{lang}.md"), "w", encoding="utf-8").write("\n".join(lines))
        print(f"{lang}: " + ", ".join(f"{k} {len(t[k].strip())}/{LIMITS[k]}" for k, _ in FIELDS))
    if bad:
        raise SystemExit("DÉPASSEMENT : " + ", ".join(f"{l}.{k} {n}>{lim}" for l, k, n, lim in bad))

if __name__ == "__main__":
    main()
