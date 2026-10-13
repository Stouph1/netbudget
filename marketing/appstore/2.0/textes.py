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
"promo": "2.0 : budget partagé en couple ou en famille, Coach avec 282 conseils sourcés, repères officiels. Sans connexion bancaire, sans publicité.",
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
282 conseils, triés par ton âge, ton foyer, ton logement et ton pays. Chacun cite sa page officielle et sa date de vérification : droits non réclamés, épargne réglementée, fiscalité, prévoyance. Un conseil de la semaine chaque lundi.

UN BUDGET À PLUSIEURS
Un code d'invitation, et le budget commun se voit des deux côtés. Chacun garde son espace privé. En famille : jusqu'à six personnes, trois espaces, les anniversaires et les projets du foyer.

UN ESPACE PAR PROJET
Mariage, voyage, naissance, fête : trois questions, et le budget est posé avec ses postes, son rétro-planning et ses rappels.

DES NOTIFICATIONS QUI VALENT LE DÉRANGEMENT
Le point du mois, le conseil de la semaine, un jalon de projet qui approche. Tu fixes le plafond hebdomadaire.

GRATUIT POUR COMMENCER
Le budget, les prêts et le convertisseur sont gratuits, sans compte et sans limite de temps. Les formules Solo, Duo et Famille ajoutent le Coach, les projets, les espaces partagés et la synchronisation chiffrée. Sans publicité, à aucun moment.

Huit langues, 59 pays, 499 villes avec leur coût de la vie. Développé en France par un développeur indépendant.""",
"whatsnew": """NETbudget 2.0, la plus grande mise à jour depuis le lancement.

• Espaces partagés : un budget commun en couple, en famille, en colocation, par simple code d'invitation. Chacun garde son espace privé.
• Coach : 282 conseils sourcés, adaptés à ton âge, ton foyer, ton logement et ton pays, avec un conseil de la semaine chaque lundi.
• Repères face aux moyennes nationales : Eurostat, BLS, ONS, Statistique Canada, ABS, avec la source et l'année.
• Projets et événements : mariage, voyage, naissance, fête, avec budget guidé, rétro-planning et rappels.
• Budget épuré : pictogrammes par poste, dépenses par période, repère 50/30/20 adapté à ton profil.
• Impôt prélevé à la source dans 32 pays, avec le barème officiel en un tap.
• Notifications utiles, avec un plafond hebdomadaire que tu choisis.
• Chiffrement de bout en bout : tes données partent chiffrées, une phrase de douze mots les rend sur un nouveau téléphone.
• Export PDF refait, objectifs d'épargne avec échéance, anniversaires du foyer.
• Huit langues complètes, dont l'arabe et le japonais.""",
},
"en": {
"subtitle": "Budget, money left, Coach",
"promo": "2.0: shared budgets for couples and families, a Coach with 282 sourced tips, official benchmarks. No bank connection, no ads.",
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
282 tips, filtered by your age, household, housing and country. Each one cites its official page and its verification date: unclaimed benefits, regulated savings, taxes, insurance. A tip of the week every Monday.

A BUDGET FOR TWO, OR MORE
One invitation code, and the shared budget shows on both sides. Each of you keeps a private space. As a family: up to six people, three spaces, the household's birthdays and projects.

ONE SPACE PER PROJECT
Wedding, trip, baby, party: three questions, and the budget is set with its lines, its timeline and its reminders.

NOTIFICATIONS WORTH THE INTERRUPTION
The monthly check-in, the tip of the week, a project milestone coming up. You set the weekly cap.

FREE TO START
Budget, loans and converter are free, with no account and no time limit. The Solo, Duo and Family plans add the Coach, projects, shared spaces and encrypted sync. No advertising, ever.

Eight languages, 59 countries, 499 cities with their cost of living. Built in France by an independent developer.""",
"whatsnew": """NETbudget 2.0, the biggest update since launch.

• Shared spaces: a common budget as a couple, a family or flatmates, with a simple invitation code. Each person keeps a private space.
• Coach: 282 sourced tips, adapted to your age, household, housing and country, with a tip of the week every Monday.
• Benchmarks against national averages: Eurostat, BLS, ONS, Statistics Canada, ABS, with the source and the year.
• Projects and events: wedding, trip, baby, party, with a guided budget, a timeline and reminders.
• A lighter budget: pictograms per line, expenses by period, a 50/30/20 benchmark adapted to your profile.
• Income tax withheld at source in 32 countries, with the official tables one tap away.
• Useful notifications, with a weekly cap you choose.
• End-to-end encryption: your data leaves encrypted, and a twelve-word phrase brings it back on a new phone.
• Rebuilt PDF export, savings goals with deadlines, household birthdays.
• Eight complete languages, including Arabic and Japanese.""",
},
"es": {
"subtitle": "Presupuesto, lo que te queda",
"promo": "2.0: presupuesto compartido en pareja o en familia, un Coach con 282 consejos con fuente, referencias oficiales. Sin conexión bancaria, sin anuncios.",
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
282 consejos, filtrados por tu edad, tu hogar, tu vivienda y tu país. Cada uno cita su página oficial y su fecha de verificación: ayudas no reclamadas, ahorro regulado, impuestos, previsión. Un consejo de la semana cada lunes.

UN PRESUPUESTO A VARIOS
Un código de invitación, y el presupuesto común se ve en los dos lados. Cada uno conserva su espacio privado. En familia: hasta seis personas, tres espacios, los cumpleaños y los proyectos del hogar.

UN ESPACIO POR PROYECTO
Boda, viaje, nacimiento, fiesta: tres preguntas, y el presupuesto queda listo con sus partidas, su calendario y sus recordatorios.

NOTIFICACIONES QUE MERECEN LA PENA
El balance del mes, el consejo de la semana, un hito de proyecto que se acerca. Tú fijas el límite semanal.

GRATIS PARA EMPEZAR
El presupuesto, los préstamos y el conversor son gratuitos, sin cuenta y sin límite de tiempo. Los planes Solo, Dúo y Familia añaden el Coach, los proyectos, los espacios compartidos y la sincronización cifrada. Sin publicidad, nunca.

Ocho idiomas, 59 países, 499 ciudades con su coste de vida. Desarrollada en Francia por un desarrollador independiente.""",
"whatsnew": """NETbudget 2.0, la mayor actualización desde el lanzamiento.

• Espacios compartidos: un presupuesto común en pareja, en familia o entre compañeros de piso, con un simple código de invitación. Cada uno conserva su espacio privado.
• Coach: 282 consejos con fuente, adaptados a tu edad, tu hogar, tu vivienda y tu país, con un consejo de la semana cada lunes.
• Referencias frente a las medias nacionales: Eurostat, BLS, ONS, Statistics Canada, ABS, con la fuente y el año.
• Proyectos y eventos: boda, viaje, nacimiento, fiesta, con presupuesto guiado, calendario y recordatorios.
• Presupuesto más ligero: pictogramas por partida, gastos por periodo, referencia 50/30/20 adaptada a tu perfil.
• Impuesto retenido en nómina en 32 países, con las tablas oficiales a un toque.
• Notificaciones útiles, con un límite semanal que eliges tú.
• Cifrado de extremo a extremo: tus datos salen cifrados y una frase de doce palabras los recupera en un teléfono nuevo.
• Exportación en PDF renovada, objetivos de ahorro con fecha, cumpleaños del hogar.
• Ocho idiomas completos, incluidos el árabe y el japonés.""",
},
"pt": {
"subtitle": "Orçamento, o que te sobra",
"promo": "2.0: orçamento partilhado a dois ou em família, um Coach com 282 dicas com fonte, referências oficiais. Sem ligação ao banco, sem anúncios.",
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
282 dicas, filtradas pela tua idade, o teu agregado, a tua habitação e o teu país. Cada uma cita a página oficial e a data de verificação: apoios por reclamar, poupança regulada, impostos, proteção. Uma dica da semana todas as segundas.

UM ORÇAMENTO A VÁRIOS
Um código de convite, e o orçamento comum vê-se dos dois lados. Cada um mantém o seu espaço privado. Em família: até seis pessoas, três espaços, os aniversários e os projetos do agregado.

UM ESPAÇO POR PROJETO
Casamento, viagem, nascimento, festa: três perguntas e o orçamento fica montado, com as rubricas, o calendário e os lembretes.

NOTIFICAÇÕES QUE VALEM A PENA
O ponto do mês, a dica da semana, um marco de projeto que se aproxima. Tu defines o limite semanal.

GRÁTIS PARA COMEÇAR
O orçamento, os empréstimos e o conversor são gratuitos, sem conta e sem limite de tempo. Os planos Solo, Duo e Família acrescentam o Coach, os projetos, os espaços partilhados e a sincronização cifrada. Sem publicidade, nunca.

Oito idiomas, 59 países, 499 cidades com o seu custo de vida. Desenvolvida em França por um programador independente.""",
"whatsnew": """NETbudget 2.0, a maior atualização desde o lançamento.

• Espaços partilhados: um orçamento comum a dois, em família ou entre colegas de casa, com um simples código de convite. Cada um mantém o seu espaço privado.
• Coach: 282 dicas com fonte, adaptadas à tua idade, ao teu agregado, à tua habitação e ao teu país, com uma dica da semana todas as segundas.
• Referências face às médias nacionais: Eurostat, BLS, ONS, Statistics Canada, ABS, com a fonte e o ano.
• Projetos e eventos: casamento, viagem, nascimento, festa, com orçamento guiado, calendário e lembretes.
• Orçamento mais leve: pictogramas por rubrica, despesas por período, referência 50/30/20 adaptada ao teu perfil.
• Imposto retido na fonte em 32 países, com as tabelas oficiais a um toque.
• Notificações úteis, com um limite semanal à tua escolha.
• Cifra de ponta a ponta: os teus dados saem cifrados e uma frase de doze palavras recupera-os num telemóvel novo.
• Exportação em PDF renovada, objetivos de poupança com prazo, aniversários do agregado.
• Oito idiomas completos, incluindo árabe e japonês.""",
},
"de": {
"subtitle": "Budget, was wirklich bleibt",
"promo": "2.0: gemeinsames Budget für Paare und Familien, ein Coach mit 282 belegten Tipps, offizielle Vergleichswerte. Ohne Bankverbindung, ohne Werbung.",
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
282 Tipps, gefiltert nach Alter, Haushalt, Wohnsituation und Land. Jeder nennt seine offizielle Seite und sein Prüfdatum: nicht beantragte Leistungen, geregeltes Sparen, Steuern, Vorsorge. Jeden Montag ein Tipp der Woche.

EIN BUDGET ZU ZWEIT ODER MEHR
Ein Einladungscode, und das gemeinsame Budget ist auf beiden Seiten sichtbar. Jeder behält seinen privaten Bereich. Als Familie: bis zu sechs Personen, drei Bereiche, Geburtstage und Projekte des Haushalts.

EIN BEREICH PRO PROJEKT
Hochzeit, Reise, Baby, Feier: drei Fragen, und das Budget steht, mit Posten, Zeitplan und Erinnerungen.

BENACHRICHTIGUNGEN, DIE SICH LOHNEN
Der Monatscheck, der Tipp der Woche, ein näher rückender Projektschritt. Die Wochenobergrenze legst du fest.

KOSTENLOS STARTEN
Budget, Kredite und Währungsrechner sind kostenlos, ohne Konto und ohne Zeitlimit. Die Tarife Solo, Duo und Familie ergänzen den Coach, Projekte, gemeinsame Bereiche und verschlüsselte Synchronisierung. Ohne Werbung, zu keinem Zeitpunkt.

Acht Sprachen, 59 Länder, 499 Städte mit ihren Lebenshaltungskosten. Entwickelt in Frankreich von einem unabhängigen Entwickler.""",
"whatsnew": """NETbudget 2.0, das größte Update seit dem Start.

• Gemeinsame Bereiche: ein gemeinsames Budget als Paar, Familie oder WG, per einfachem Einladungscode. Jeder behält seinen privaten Bereich.
• Coach: 282 belegte Tipps, angepasst an Alter, Haushalt, Wohnsituation und Land, mit einem Tipp der Woche jeden Montag.
• Vergleichswerte gegenüber nationalen Durchschnitten: Eurostat, BLS, ONS, Statistics Canada, ABS, mit Quelle und Jahr.
• Projekte und Ereignisse: Hochzeit, Reise, Baby, Feier, mit geführtem Budget, Zeitplan und Erinnerungen.
• Schlankeres Budget: Piktogramme pro Posten, Ausgaben nach Zeitraum, 50/30/20-Orientierung passend zu deinem Profil.
• Einbehaltene Lohnsteuer in 32 Ländern, mit den offiziellen Tabellen auf einen Tipp.
• Nützliche Benachrichtigungen mit einer Wochenobergrenze nach deiner Wahl.
• Ende-zu-Ende-Verschlüsselung: deine Daten verlassen das Gerät verschlüsselt, zwölf Wörter holen sie auf ein neues Telefon zurück.
• Neuer PDF-Export, Sparziele mit Frist, Geburtstage des Haushalts.
• Acht vollständige Sprachen, darunter Arabisch und Japanisch.""",
},
"it": {
"subtitle": "Budget, quanto ti resta",
"promo": "2.0: budget condiviso in coppia o in famiglia, un Coach con 282 consigli con fonte, riferimenti ufficiali. Senza collegamento alla banca, senza pubblicità.",
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
282 consigli, filtrati per età, nucleo familiare, abitazione e paese. Ognuno cita la sua pagina ufficiale e la data di verifica: diritti non richiesti, risparmio regolamentato, fisco, previdenza. Un consiglio della settimana ogni lunedì.

UN BUDGET IN DUE, O PIÙ
Un codice di invito, e il budget comune si vede da entrambe le parti. Ognuno conserva il proprio spazio privato. In famiglia: fino a sei persone, tre spazi, i compleanni e i progetti di casa.

UNO SPAZIO PER OGNI PROGETTO
Matrimonio, viaggio, nascita, festa: tre domande, e il budget è pronto con le sue voci, il suo calendario e i suoi promemoria.

NOTIFICHE CHE VALGONO IL DISTURBO
Il punto del mese, il consiglio della settimana, una tappa di progetto che si avvicina. Il tetto settimanale lo decidi tu.

GRATIS PER INIZIARE
Budget, prestiti e convertitore sono gratuiti, senza account e senza limiti di tempo. I piani Solo, Duo e Famiglia aggiungono il Coach, i progetti, gli spazi condivisi e la sincronizzazione cifrata. Senza pubblicità, mai.

Otto lingue, 59 paesi, 499 città con il loro costo della vita. Sviluppata in Francia da uno sviluppatore indipendente.""",
"whatsnew": """NETbudget 2.0, il più grande aggiornamento dal lancio.

• Spazi condivisi: un budget comune in coppia, in famiglia o tra coinquilini, con un semplice codice di invito. Ognuno conserva il proprio spazio privato.
• Coach: 282 consigli con fonte, adattati a età, nucleo familiare, abitazione e paese, con un consiglio della settimana ogni lunedì.
• Riferimenti rispetto alle medie nazionali: Eurostat, BLS, ONS, Statistics Canada, ABS, con fonte e anno.
• Progetti ed eventi: matrimonio, viaggio, nascita, festa, con budget guidato, calendario e promemoria.
• Budget più leggero: pittogrammi per voce, spese per periodo, riferimento 50/30/20 adattato al tuo profilo.
• Imposta trattenuta alla fonte in 32 paesi, con le tabelle ufficiali a un tocco.
• Notifiche utili, con un tetto settimanale a tua scelta.
• Cifratura end-to-end: i tuoi dati partono cifrati e una frase di dodici parole li riporta su un nuovo telefono.
• Esportazione PDF rinnovata, obiettivi di risparmio con scadenza, compleanni di casa.
• Otto lingue complete, tra cui arabo e giapponese.""",
},
"ar": {
"subtitle": "ميزانية، ما يتبقّى لك فعلًا",
"promo": "الإصدار 2.0: ميزانية مشتركة للزوجين والعائلة، مرشد بـ 282 نصيحة موثّقة، ومعايير رسمية. دون ربط بالبنك، ودون إعلانات.",
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
282 نصيحة مصنّفة حسب عمرك وأسرتك وسكنك وبلدك. كل نصيحة تذكر صفحتها الرسمية وتاريخ التحقق منها: حقوق لم تُطالب بها، ادخار منظّم، ضرائب، تأمين. نصيحة الأسبوع كل يوم اثنين.

ميزانية لاثنين أو أكثر
رمز دعوة واحد، وتظهر الميزانية المشتركة لدى الطرفين. يحتفظ كل واحد بمساحته الخاصة. للعائلة: حتى ستة أشخاص، ثلاث مساحات، أعياد ميلاد الأسرة ومشاريعها.

مساحة لكل مشروع
زفاف، سفر، مولود، حفلة: ثلاثة أسئلة وتكون الميزانية جاهزة ببنودها وجدولها الزمني وتذكيراتها.

إشعارات تستحق الإزعاج
مراجعة الشهر، نصيحة الأسبوع، مرحلة مشروع تقترب. أنت من يحدد السقف الأسبوعي.

مجاني للبدء
الميزانية والقروض والمحوّل مجانية، دون حساب ودون حد زمني. تضيف باقات فردي وثنائي وعائلة المرشد والمشاريع والمساحات المشتركة والمزامنة المشفّرة. دون إعلانات، في أي وقت.

ثماني لغات، 59 بلدًا، 499 مدينة مع تكلفة معيشتها. طُوّر في فرنسا على يد مطوّر مستقل.""",
"whatsnew": """NETbudget 2.0، أكبر تحديث منذ الإطلاق.

• مساحات مشتركة: ميزانية مشتركة للزوجين أو العائلة أو شركاء السكن، برمز دعوة بسيط. يحتفظ كل واحد بمساحته الخاصة.
• المرشد: 282 نصيحة موثّقة، متكيّفة مع عمرك وأسرتك وسكنك وبلدك، مع نصيحة الأسبوع كل يوم اثنين.
• معايير مقارنة بالمتوسطات الوطنية: يوروستات، BLS، ONS، إحصاءات كندا، ABS، مع المصدر والسنة.
• مشاريع ومناسبات: زفاف، سفر، مولود، حفلة، مع ميزانية موجّهة وجدول زمني وتذكيرات.
• ميزانية أخف: رموز لكل بند، مصاريف حسب الفترة، معيار 50/30/20 متكيّف مع ملفك.
• ضريبة الدخل المقتطعة من المصدر في 32 بلدًا، مع الجداول الرسمية بلمسة واحدة.
• إشعارات مفيدة، بسقف أسبوعي تختاره أنت.
• تشفير من طرف إلى طرف: بياناتك تغادر مشفّرة، وعبارة من اثنتي عشرة كلمة تستعيدها على هاتف جديد.
• تصدير PDF مُعاد بناؤه، أهداف ادخار بمواعيد، أعياد ميلاد الأسرة.
• ثماني لغات كاملة، منها العربية واليابانية.""",
},
"ja": {
"subtitle": "家計簿、本当に残るお金",
"promo": "2.0：カップル・家族で共有できる家計、出典つき282のアドバイスを持つコーチ、公的統計との比較。銀行連携なし、広告なし。",
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
年齢・世帯・住まい・国で絞り込まれた282のアドバイス。それぞれが公式ページと確認日を示します：未申請の給付、規制貯蓄、税、保障。毎週月曜に今週のアドバイス。

二人以上で使う家計
招待コードひとつで、共有家計が双方に表示されます。それぞれにプライベートな領域も残ります。家族なら最大6人、3つのスペース、家族の誕生日とプロジェクト。

プロジェクトごとのスペース
結婚式、旅行、出産、パーティー：3つの質問で、項目・スケジュール・リマインダーつきの予算が整います。

邪魔にならない通知
月次チェック、今週のアドバイス、近づくプロジェクトの節目。週ごとの上限はあなたが決めます。

無料で始められます
家計・ローン・為替計算は、アカウントなしで、期間制限なく無料。Solo・Duo・Family プランで、コーチ、プロジェクト、共有スペース、暗号化同期が加わります。広告は一切ありません。

8言語、59か国、生活費の目安つき499都市。フランスの個人開発者が開発。""",
"whatsnew": """NETbudget 2.0、リリース以来最大のアップデートです。

• 共有スペース：カップル、家族、ルームシェアで、招待コードひとつで共有家計。それぞれのプライベート領域はそのまま。
• コーチ：年齢・世帯・住まい・国に合わせた、出典つき282のアドバイス。毎週月曜に今週のアドバイス。
• 全国平均との比較：ユーロスタット、BLS、ONS、カナダ統計局、ABS。出典と年を表示。
• プロジェクトと行事：結婚式、旅行、出産、パーティー。ガイドつき予算、スケジュール、リマインダー。
• より軽い家計画面：項目ごとのピクトグラム、期間つき支出、プロフィールに合わせた50/30/20の目安。
• 32か国の源泉徴収税。公式の税額表にワンタップ。
• 役に立つ通知。週ごとの上限はあなたが選択。
• エンドツーエンド暗号化：データは暗号化して送信され、12単語のフレーズで新しい端末に復元。
• 刷新されたPDF書き出し、期限つきの貯蓄目標、家族の誕生日。
• アラビア語と日本語を含む8言語に完全対応。""",
},
}

NAMES = {"fr": "Français", "en": "English", "es": "Español", "pt": "Português", "de": "Deutsch", "it": "Italiano", "ar": "العربية", "ja": "日本語"}
FIELDS = [("subtitle", "Sous-titre"), ("promo", "Texte promotionnel"), ("keywords", "Mots-clés"), ("description", "Description"), ("whatsnew", "Nouveautés de cette version")]

def main():
    out = os.path.join(HERE, "textes"); os.makedirs(out, exist_ok=True)
    bad = []
    for lang, t in T.items():
        lines = [f"# App Store · {NAMES[lang]} ({lang})", ""]
        for key, label in FIELDS:
            v = t[key].strip(); n = len(v); lim = LIMITS[key]
            if n > lim: bad.append((lang, key, n, lim))
            lines += [f"## {label} ({n}/{lim})", "", "```", v, "```", ""]
        open(os.path.join(out, f"{lang}.md"), "w", encoding="utf-8").write("\n".join(lines))
        print(f"{lang}: " + ", ".join(f"{k} {len(t[k].strip())}/{LIMITS[k]}" for k, _ in FIELDS))
    if bad:
        raise SystemExit("DÉPASSEMENT : " + ", ".join(f"{l}.{k} {n}>{lim}" for l, k, n, lim in bad))

if __name__ == "__main__":
    main()
