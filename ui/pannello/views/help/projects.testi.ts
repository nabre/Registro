// I testi della guida sui progetti del corso. Struttura in `projects.ts`.

import { catalogo } from '#core/i18n/index.js'
import type { TestiSezione } from './types.js'

const it: { progetti: TestiSezione } = {
  progetti: {
    titolo: 'Progetti',
    sommario:
      'Un lavoro lungo del corso, diviso in fasi: compiti per tutti che ognuno comincia quando ' +
      'tocca a lui, criteri giudicati a livelli giorno per giorno, giudizi, e le lezioni in cui ' +
      'ci si lavora.',
    voci: [
      {
        termine: 'La pagina Progetti',
        testo:
          'A sinistra i progetti del corso, con lo stato (**Bozza**, **In corso**, **Concluso**), ' +
          'il periodo e quanto se n’è fatto. **Nuovo progetto** ne crea uno; **Modifica** cambia ' +
          'titolo, stato, descrizione, obiettivi (uno per riga) e collegamenti. A destra testata, ' +
          'criteri e compiti restano sempre in vista; sotto, tre linguette: **Fasi**, **Matrice** ' +
          'ed **Esiti** (giudizi, valutazioni e presenze). Le frecce passano da una all’altra, e ' +
          'ogni progetto riapre quella che hai lasciato.',
      },
      {
        termine: 'Le fasi',
        testo:
          'Un progetto si divide in fasi; ce n’è sempre almeno una. **Fasi** le aggiunge, le ' +
          'rinomina, le mette in fila e le toglie: le attività di una fase tolta passano a ' +
          'quella prima. Ogni fase si apre e si chiude con un clic sul titolo: chiusa mostra numero, ' +
          'titolo, periodo e quanto se n’è fatto; aperta anche le attività dei piani nelle loro ' +
          'lezioni, col loro stato, e le prove nate lì. Di serie è aperta la fase in cui cade oggi.',
      },
      {
        termine: 'Il periodo',
        testo:
          'Non si scrive: va dalla prima all’ultima lezione il cui piano ha un’attività del ' +
          'progetto, e lo stesso per ogni fase.',
      },
      {
        termine: 'Assegnare un’attività del piano',
        testo:
          'Nella pagina **Piani lezione**, apri il dettaglio di un’attività: il pulsante ' +
          '**Progetto** dice la scelta di adesso e apre l’elenco dei progetti del corso con le ' +
          'loro fasi, col periodo e quante attività ha già ognuna. Un progetto con una fase sola ' +
          'si sceglie direttamente; in fondo **Nuova fase in …** e **Nuovo progetto…**. Le ' +
          'frecce scelgono, Invio conferma, Esc chiude.',
      },
      {
        termine: 'Criteri e livelli',
        testo:
          '**Criteri** dà le righe di giudizio della matrice, **Livelli** la scala, dal basso, ' +
          'con il colore di ognuno. Si nasce con quattro livelli: non raggiunto, parzialmente, ' +
          'raggiunto, pienamente.',
      },
      {
        termine: 'I compiti',
        testo:
          'Ogni compito ha la sua linguetta, con quanti hanno finito su quanti e un pallino rosso ' +
          'se qualcuno è oltre la fine; sotto c’è la griglia del compito scelto, che resta aperto ' +
          'quando torni. Le frecce passano da una linguetta all’altra. **+** (**Nuovo compito**) ' +
          'ne crea uno: titolo, descrizione e la fine per tutti, una data o una lezione; ' +
          '**Modifica**, accanto alla fine, li cambia. Nella griglia, per ogni persona: l’inizio (clic: comincia oggi; tasto destro: un ' +
          'altro giorno o togli), la fine (clic: proroga solo sua), lo stato calcolato — ' +
          '**Da cominciare**, **In corso**, **Scaduto**, **Finito** — e la spunta di finito.',
      },
      {
        termine: 'Gesti di gruppo',
        testo:
          'Spunta le persone a sinistra e premi **cominciano oggi** (dentro un’ora: in questa ' +
          'lezione). **Comincia chi manca** tocca solo chi non ha ancora cominciato. **Finito ' +
          'per tutti** spunta chi frequenta; **Togli tutte le spunte** chiede prima.',
      },
      {
        termine: 'La matrice',
        testo:
          'Persone in riga, criteri in colonna, in un giorno: scegli la data o una lezione del ' +
          'progetto. Un clic porta la casella al livello dopo; il tasto destro sceglie il livello, ' +
          'scrive una nota o svuota. **Progressione** mostra una persona: i livelli di ogni ' +
          'criterio, giorno dopo giorno.',
      },
      {
        termine: 'I giudizi',
        testo:
          'Note datate su una persona o su **Tutta la classe**: si scrivono al volo nella riga in ' +
          'cima (Invio aggiunge) o con **Aggiungi**; la matita le corregge o le elimina.',
      },
      {
        termine: 'La scheda Progetto dell’ora',
        testo:
          'Nel registro dell’ora la scheda **Progetto** c’è solo se il piano di quell’ora ha ' +
          'attività assegnate a un progetto; senza piano o senza attività di progetto non ' +
          'compare. Mostra i compiti a linguette (l’inizio si lega all’ora), la matrice di ' +
          'quell’ora e i giudizi dell’ora. Con più progetti nella stessa ora, una linguetta per ' +
          'progetto, col nome della fase. Nella scheda **Lezione**, l’attività assegnata porta ' +
          'un pulsante col nome del progetto che apre questa scheda su di lui.',
      },
      {
        termine: 'Le valutazioni del progetto',
        testo:
          'Nella pagina, **Valutazioni del progetto** elenca le prove collegate; **Collega una ' +
          'valutazione…** aggiunge una prova del corso nata prima. Nella finestra di un momento ' +
          'di valutazione, la tendina **Progetto** fa lo stesso.',
      },
      {
        termine: 'I PDF',
        testo:
          'Il rapporto della classe e quello di ogni persona stanno nella pagina **Documenti** ' +
          'del corso, con gli altri fogli; **Documenti del progetto**, nella testata, porta lì.',
      },
    ],
    note: [
      'Ogni giorno ha le sue caselle: due giudizi dati in due lezioni non si coprono, si ' +
        'mettono in fila. Dentro un’ora la casella è di quell’ora e ne segue la data se ' +
        'la lezione si sposta.',
      'Un’ora conclusa si guarda e non si cambia: inizi, caselle e giudizi di quell’ora sono ' +
        'fermi finché non la riapri. Togliere un criterio o un livello toglie le caselle che ' +
        'lo usano: prima lo si chiede.',
      'Eliminare un progetto non tocca piani e valutazioni: le attività e le prove restano, ' +
        'sganciate.',
    ],
  },
}

export const testi = catalogo(it, {
  de: {
    progetti: {
      titolo: 'Projekte',
      sommario:
        'Eine lange Arbeit des Kurses, in Phasen geteilt: Aufgaben für alle, die jede Person ' +
        'beginnt, wenn sie an der Reihe ist, Kriterien, die Tag für Tag in Stufen beurteilt ' +
        'werden, Einschätzungen und die Stunden, in denen daran gearbeitet wird.',
      voci: [
        {
          termine: 'Die Seite Projekte',
          testo:
            'Links die Projekte des Kurses mit Status (**Entwurf**, **Laufend**, ' +
            '**Abgeschlossen**), Zeitraum und Fortschritt. **Neues Projekt** erstellt eines; ' +
            '**Bearbeiten** ändert Titel, Status, Beschreibung, Ziele (eines pro Zeile) und Links. ' +
            'Rechts bleiben Kopf, Kriterien und Aufgaben immer sichtbar; darunter drei Reiter: ' +
            '**Phasen**, **Raster** und **Ergebnisse** (Einschätzungen, Beurteilungen und ' +
            'Anwesenheit). Die Pfeiltasten wechseln den Reiter, und jedes Projekt öffnet wieder ' +
            'den, den du verlassen hast.',
        },
        {
          termine: 'Die Phasen',
          testo:
            'Ein Projekt teilt sich in Phasen; es gibt immer mindestens eine. **Phasen** fügt sie ' +
            'hinzu, benennt sie um, ordnet und entfernt sie: Die Aktivitäten einer entfernten ' +
            'Phase gehen zur vorherigen. Jede Phase öffnet und schliesst sich mit einem Klick auf ' +
            'den Titel: geschlossen zeigt sie Nummer, Titel, Zeitraum und Fortschritt; offen auch ' +
            'die Aktivitäten der Pläne in ihren Stunden, mit ihrem Stand, und die dort entstandenen ' +
            'Prüfungen. Zu Beginn ist die Phase offen, in die der heutige Tag fällt.',
        },
        {
          termine: 'Der Zeitraum',
          testo:
            'Er wird nicht eingetragen: Er reicht von der ersten bis zur letzten Stunde, deren ' +
            'Plan eine Aktivität des Projekts hat, und ebenso für jede Phase.',
        },
        {
          termine: 'Eine Aktivität des Plans zuweisen',
          testo:
            'Auf der Seite **Unterrichtspläne** die Details einer Aktivität öffnen: Die ' +
            'Schaltfläche **Projekt** zeigt die aktuelle Wahl und öffnet die Liste der Projekte ' +
            'des Kurses mit ihren Phasen, mit Zeitraum und Anzahl Aktivitäten. Ein Projekt mit ' +
            'nur einer Phase wird direkt gewählt; unten **Neue Phase in …** und **Neues ' +
            'Projekt…**. Pfeiltasten wählen, Enter bestätigt, Esc schliesst.',
        },
        {
          termine: 'Kriterien und Stufen',
          testo:
            '**Kriterien** gibt die Zeilen des Rasters, **Stufen** die Skala von unten, mit der ' +
            'Farbe jeder Stufe. Am Anfang gibt es vier Stufen: nicht erreicht, teilweise, ' +
            'erreicht, vollständig.',
        },
        {
          termine: 'Die Aufgaben',
          testo:
            'Jede Aufgabe hat ihren Reiter, mit wie viele von wie vielen fertig sind und einem ' +
            'roten Punkt, wenn jemand über dem Ende ist; darunter das Raster der gewählten ' +
            'Aufgabe, die beim Zurückkommen offen bleibt. Die Pfeiltasten wechseln den Reiter. ' +
            '**+** (**Neue Aufgabe**) legt eine an: Titel, Beschreibung und das Ende für alle, ' +
            'ein Datum oder eine Stunde; **Bearbeiten**, neben dem Ende, ändert sie. Im Raster für jede Person: der Beginn (Klick: beginnt heute; Rechtsklick: ' +
            'ein anderer Tag oder entfernen), das Ende (Klick: eigene Verlängerung), der ' +
            'berechnete Status — **Noch nicht begonnen**, **In Arbeit**, **Überfällig**, ' +
            '**Fertig** — und das Häkchen für fertig.',
        },
        {
          termine: 'Gesten für die Gruppe',
          testo:
            'Personen links auswählen und **beginnen heute** drücken (in einer Stunde: in dieser ' +
            'Stunde). **Wer fehlt, beginnt** betrifft nur, wer noch nicht begonnen hat. **Fertig ' +
            'für alle** hakt alle Anwesenden ab; **Alle Häkchen entfernen** fragt zuerst.',
        },
        {
          termine: 'Das Raster',
          testo:
            'Personen in Zeilen, Kriterien in Spalten, an einem Tag: Wähle das Datum oder eine ' +
            'Stunde des Projekts. Ein Klick setzt das Feld auf die nächste Stufe; Rechtsklick ' +
            'wählt die Stufe, schreibt eine Notiz oder leert das Feld. **Verlauf** zeigt eine ' +
            'Person: die Stufen jedes Kriteriums, Tag für Tag.',
        },
        {
          termine: 'Die Einschätzungen',
          testo:
            'Datierte Notizen zu einer Person oder zur **Ganzen Klasse**: schnell in der Zeile ' +
            'oben (Enter fügt hinzu) oder mit **Hinzufügen**; der Stift korrigiert oder löscht sie.',
        },
        {
          termine: 'Die Registerkarte Projekt der Stunde',
          testo:
            'Im Klassenbuch der Stunde gibt es die Registerkarte **Projekt** nur, wenn der Plan ' +
            'dieser Stunde Aktivitäten hat, die einem Projekt zugewiesen sind; ohne Plan oder ' +
            'ohne Projektaktivität erscheint sie nicht. Sie zeigt die Aufgaben als Reiter (der ' +
            'Beginn hängt an der Stunde), das Raster dieser Stunde und ihre Einschätzungen. Mit ' +
            'mehreren Projekten in derselben Stunde gibt es einen Reiter pro Projekt, mit dem ' +
            'Namen der Phase. In der Registerkarte **Unterricht** trägt die zugewiesene Aktivität ' +
            'eine Schaltfläche mit dem Namen des Projekts, die diese Registerkarte bei ihm öffnet.',
        },
        {
          termine: 'Die Beurteilungen des Projekts',
          testo:
            'Auf der Seite listet **Beurteilungen des Projekts** die verbundenen Prüfungen auf; ' +
            '**Beurteilung verbinden…** fügt eine frühere Prüfung des Kurses hinzu. Im Fenster ' +
            'eines Beurteilungsanlasses macht die Auswahl **Projekt** dasselbe.',
        },
        {
          termine: 'Die PDF',
          testo:
            'Der Bericht der Klasse und jener jeder Person liegen auf der Seite **Dokumente** des ' +
            'Kurses, bei den anderen Blättern; **Dokumente des Projekts** im Kopf führt dorthin.',
        },
      ],
      note: [
        'Jeder Tag hat seine Felder: Zwei Einschätzungen in zwei Stunden überdecken sich nicht, ' +
          'sie reihen sich auf. In einer Stunde gehört das Feld zu dieser Stunde und folgt ihrem ' +
          'Datum, wenn die Stunde verschoben wird.',
        'Eine abgeschlossene Stunde lässt sich ansehen, nicht ändern: Beginn, Felder und ' +
          'Einschätzungen dieser Stunde bleiben, bis du sie wieder öffnest. Ein Kriterium oder ' +
          'eine Stufe zu entfernen entfernt die Felder, die sie verwenden: Zuerst wird gefragt.',
        'Ein Projekt zu löschen berührt Pläne und Beurteilungen nicht: Aktivitäten und Prüfungen ' +
          'bleiben, losgelöst.',
      ],
    },
  },
  fr: {
    progetti: {
      titolo: 'Projets',
      sommario:
        'Un long travail du cours, divisé en phases : des tâches pour tous que chacun commence ' +
        'quand vient son tour, des critères jugés par niveaux jour après jour, des ' +
        'appréciations, et les périodes où l’on y travaille.',
      voci: [
        {
          termine: 'La page Projets',
          testo:
            'À gauche les projets du cours, avec l’état (**Brouillon**, **En cours**, **Terminé**), ' +
            'la période et l’avancement. **Nouveau projet** en crée un ; **Modifier** change ' +
            'titre, état, description, objectifs (un par ligne) et liens. À droite, l’en-tête, ' +
            'les critères et les tâches restent toujours visibles ; dessous, trois onglets : ' +
            '**Phases**, **Grille** et **Résultats** (appréciations, évaluations et présences). ' +
            'Les flèches passent de l’un à l’autre, et chaque projet rouvre celui que vous avez quitté.',
        },
        {
          termine: 'Les phases',
          testo:
            'Un projet se divise en phases ; il y en a toujours au moins une. **Phases** les ' +
            'ajoute, les renomme, les ordonne et les retire : les activités d’une phase retirée ' +
            'passent à la précédente. Chaque phase s’ouvre et se ferme d’un clic sur son titre : ' +
            'fermée, elle montre numéro, titre, période et avancement ; ouverte, aussi les ' +
            'activités des plans dans leurs périodes, avec leur état, et les épreuves nées là. Au ' +
            'départ, la phase où tombe aujourd’hui est ouverte.',
        },
        {
          termine: 'La période',
          testo:
            'Elle ne s’écrit pas : elle va de la première à la dernière période dont le plan a ' +
            'une activité du projet, et de même pour chaque phase.',
        },
        {
          termine: 'Attribuer une activité du plan',
          testo:
            'Dans la page **Plans de leçon**, ouvre le détail d’une activité : le bouton ' +
            '**Projet** dit le choix actuel et ouvre la liste des projets du cours avec leurs ' +
            'phases, leur période et leur nombre d’activités. Un projet à une seule phase se ' +
            'choisit directement ; en bas **Nouvelle phase dans …** et **Nouveau projet…**. Les ' +
            'flèches choisissent, Entrée confirme, Échap ferme.',
        },
        {
          termine: 'Critères et niveaux',
          testo:
            '**Critères** donne les lignes de la grille, **Niveaux** l’échelle, du bas, avec la ' +
            'couleur de chacun. Au départ il y a quatre niveaux : non atteint, partiellement, ' +
            'atteint, pleinement.',
        },
        {
          termine: 'Les tâches',
          testo:
            'Chaque tâche a son onglet, avec combien ont fini sur combien et un point rouge si ' +
            'quelqu’un a dépassé la fin ; dessous, la grille de la tâche choisie, qui reste ' +
            'ouverte quand tu reviens. Les flèches passent d’un onglet à l’autre. **+** ' +
            '(**Nouvelle tâche**) en crée une : titre, description et la fin pour tous, une date ' +
            'ou une période ; **Modifier**, à côté de la fin, les change. Dans la grille, pour chaque personne : le début (clic : commence aujourd’hui ; clic ' +
            'droit : un autre jour ou retirer), la fin (clic : prolongation pour elle seule), ' +
            'l’état calculé — **À commencer**, **En cours**, **Échu**, **Fini** — et la coche de fini.',
        },
        {
          termine: 'Gestes de groupe',
          testo:
            'Coche les personnes à gauche et appuie sur **commencent aujourd’hui** (dans une ' +
            'période : dans cette période). **Ceux qui manquent commencent** ne touche que ceux ' +
            'qui n’ont pas commencé. **Fini pour tous** coche ceux qui fréquentent ; **Retirer ' +
            'toutes les coches** demande d’abord.',
        },
        {
          termine: 'La grille',
          testo:
            'Personnes en ligne, critères en colonne, un jour donné : choisis la date ou une ' +
            'période du projet. Un clic passe la case au niveau suivant ; le clic droit choisit ' +
            'le niveau, écrit une note ou vide la case. **Progression** montre une personne : ' +
            'les niveaux de chaque critère, jour après jour.',
        },
        {
          termine: 'Les appréciations',
          testo:
            'Des notes datées sur une personne ou sur **Toute la classe** : on les écrit vite dans ' +
            'la ligne du haut (Entrée ajoute) ou avec **Ajouter** ; le crayon les corrige ou les ' +
            'supprime.',
        },
        {
          termine: 'L’onglet Projet de la période',
          testo:
            'Dans le registre de la période, l’onglet **Projet** n’existe que si le plan de ' +
            'cette période a des activités attribuées à un projet ; sans plan ou sans activité ' +
            'de projet, il n’apparaît pas. Il montre les tâches en onglets (le début se lie à la ' +
            'période), la grille de cette période et ses appréciations. Avec plusieurs projets ' +
            'dans la même période, un onglet par projet, avec le nom de la phase. Dans l’onglet ' +
            '**Leçon**, l’activité attribuée porte un bouton au nom du projet qui ouvre cet ' +
            'onglet sur lui.',
        },
        {
          termine: 'Les évaluations du projet',
          testo:
            'Dans la page, **Évaluations du projet** liste les épreuves reliées ; **Relier une ' +
            'évaluation…** ajoute une épreuve du cours née avant. Dans la fenêtre d’un moment ' +
            'd’évaluation, la liste **Projet** fait de même.',
        },
        {
          termine: 'Les PDF',
          testo:
            'Le rapport de la classe et celui de chaque personne sont dans la page **Documents** ' +
            'du cours, avec les autres feuilles ; **Documents du projet**, dans l’en-tête, y mène.',
        },
      ],
      note: [
        'Chaque jour a ses cases : deux appréciations données dans deux périodes ne se ' +
          'recouvrent pas, elles se suivent. Dans une période, la case lui appartient et suit ' +
          'sa date si la période est déplacée.',
        'Une période terminée se regarde et ne se change pas : débuts, cases et appréciations ' +
          'de cette période restent figés tant que tu ne la rouvres pas. Retirer un critère ou ' +
          'un niveau retire les cases qui l’utilisent : on te le demande avant.',
        'Supprimer un projet ne touche ni les plans ni les évaluations : activités et épreuves ' +
          'restent, détachées.',
      ],
    },
  },
  en: {
    progetti: {
      titolo: 'Projects',
      sommario:
        'A long piece of course work, divided into phases: tasks for everyone that each learner ' +
        'starts when their turn comes, criteria judged by levels day by day, comments, and the ' +
        'lessons in which it is worked on.',
      voci: [
        {
          termine: 'The Projects page',
          testo:
            'On the left the course’s projects, with their status (**Draft**, **In progress**, ' +
            '**Finished**), the period and the progress. **New project** creates one; **Edit** ' +
            'changes title, status, description, objectives (one per line) and links. On the right ' +
            'the header, criteria and tasks always stay in view; below them, three tabs: ' +
            '**Phases**, **Grid** and **Results** (comments, assessments and attendance). The ' +
            'arrow keys move between them, and each project reopens the one you left.',
        },
        {
          termine: 'Phases',
          testo:
            'A project is divided into phases; there is always at least one. **Phases** adds, ' +
            'renames, orders and removes them: the activities of a removed phase move to the ' +
            'previous one. Each phase opens and closes with a click on its title: closed it shows ' +
            'number, title, period and progress; open, also the plan activities in their lessons, ' +
            'with their state, and the tests that came from them. At first the phase that today ' +
            'falls in is open.',
        },
        {
          termine: 'The period',
          testo:
            'It is not typed in: it runs from the first to the last lesson whose plan has an ' +
            'activity of the project, and the same for each phase.',
        },
        {
          termine: 'Assigning a plan activity',
          testo:
            'On the **Lesson plans** page, open the details of an activity: the **Project** ' +
            'button shows the current choice and opens the list of the course’s projects with ' +
            'their phases, period and number of activities. A project with a single phase is ' +
            'chosen directly; at the bottom **New phase in …** and **New project…**. Arrow keys ' +
            'choose, Enter confirms, Esc closes.',
        },
        {
          termine: 'Criteria and levels',
          testo:
            '**Criteria** gives the rows of the grid, **Levels** the scale, from the bottom, with ' +
            'the colour of each. It starts with four levels: not achieved, partly, achieved, fully.',
        },
        {
          termine: 'Tasks',
          testo:
            'Each task has its own tab, showing how many of how many have finished and a red dot ' +
            'if someone is past the end; below, the grid of the chosen task, which stays open ' +
            'when you come back. The arrow keys move between tabs. **+** (**New task**) creates ' +
            'one: title, description and the end for everyone, a date or a lesson; **Edit**, next ' +
            'to the end, changes them. In the grid, for each learner: the start (click: starts today; right-click: another day or ' +
            'remove), the end (click: their own extension), the computed status — **Not started**, ' +
            '**In progress**, **Overdue**, **Finished** — and the finished tick.',
        },
        {
          termine: 'Group actions',
          testo:
            'Select learners on the left and press **start today** (in a lesson: in this lesson). ' +
            '**Start the rest** only touches those who have not started. **Finished for everyone** ' +
            'ticks everyone attending; **Remove all ticks** asks first.',
        },
        {
          termine: 'The grid',
          testo:
            'Learners in rows, criteria in columns, on one day: choose the date or a lesson of the ' +
            'project. A click moves the cell to the next level; right-click chooses the level, ' +
            'writes a note or clears it. **Progress** shows one learner: the levels of each ' +
            'criterion, day after day.',
        },
        {
          termine: 'Comments',
          testo:
            'Dated notes on one learner or on the **Whole class**: write them quickly in the row at ' +
            'the top (Enter adds) or with **Add**; the pencil corrects or deletes them.',
        },
        {
          termine: 'The lesson’s Project tab',
          testo:
            'In the lesson register, the **Project** tab appears only if that lesson’s plan has ' +
            'activities assigned to a project; with no plan or no project activity it is not ' +
            'there. It shows the tasks as tabs (the start is tied to the lesson), the grid of ' +
            'that lesson and its comments. With several projects in the same lesson, one tab ' +
            'per project, with the phase’s name. In the **Lesson** tab, the assigned activity ' +
            'carries a button with the project’s name that opens this tab on it.',
        },
        {
          termine: 'The project’s assessments',
          testo:
            'On the page, **Assessments of the project** lists the linked tests; **Link an ' +
            'assessment…** adds an earlier course test. In the window of an assessment, the ' +
            '**Project** list does the same.',
        },
        {
          termine: 'PDFs',
          testo:
            'The class report and each learner’s report are on the course’s **Documents** page, ' +
            'with the other sheets; **Project documents**, in the header, takes you there.',
        },
      ],
      note: [
        'Each day has its own cells: two judgements given in two lessons do not cover each ' +
          'other, they line up. In a lesson the cell belongs to that lesson and follows its ' +
          'date if the lesson moves.',
        'A finished lesson can be viewed, not changed: starts, cells and comments of that ' +
          'lesson stay put until you reopen it. Removing a criterion or a level removes the ' +
          'cells that use it: you are asked first.',
        'Deleting a project does not touch plans or assessments: activities and tests stay, unlinked.',
      ],
    },
  },
})
