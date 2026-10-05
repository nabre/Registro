// I testi della guida sui progetti: la biblioteca dell'anno (pagina Progetti)
// e la loro integrazione nei corsi. Struttura in `projects.ts`.

import { catalogo } from '#core/i18n/index.js'
import type { TestiSezione } from './types.js'

const it: { progetti: TestiSezione, integrazione: TestiSezione } = {
  progetti: {
    titolo: 'Progetti',
    sommario:
      'La biblioteca dei progetti dell’anno, di nessun corso: obiettivi, fasi con le attività ' +
      'da portare nei piani lezione, criteri a livelli e risorse. Si integrano poi nei corsi.',
    voci: [
      {
        termine: 'La pagina Progetti',
        testo:
          'Sta nel gruppo **Anno scolastico**. A sinistra tutti i progetti dell’anno, per titolo, con quante ' +
          'fasi e attività hanno e in quanti corsi sono integrati. **Nuovo progetto** ne crea uno; ' +
          '**Modifica** cambia titolo, descrizione, obiettivi (uno per riga) e collegamenti. A ' +
          'destra la testata con obiettivi e **Risorse e strumenti**, poi **Fasi e attività**, ' +
          '**Criteri e livelli** e **Integrato in**.',
      },
      {
        termine: 'Le fasi e la scaletta',
        testo:
          'Un progetto si divide in fasi; ce n’è sempre almeno una, con titolo e descrizione. ' +
          '**Fasi** le aggiunge, le rinomina, le mette in fila e le toglie: le attività dei piani ' +
          'di una fase tolta passano a quella prima. **Modifica scaletta**, accanto a ogni fase, ' +
          'prepara le sue attività didattiche con le durate indicative: sono quel che si importa ' +
          'nei piani lezione dei corsi.',
      },
      {
        termine: 'Criteri e livelli',
        testo:
          '**Criteri** dà le righe di giudizio della matrice, **Livelli** la scala, dal basso, ' +
          'con il colore di ognuno. Si nasce con quattro livelli: non raggiunto, parzialmente, ' +
          'raggiunto, pienamente. Valgono in tutti i corsi in cui il progetto è integrato.',
      },
      {
        termine: 'Integrare in un corso',
        testo:
          '**Integrato in** elenca i corsi in cui il progetto lavora con la classe, con lo stato e ' +
          'il periodo; il nome del corso apre la sua pagina **Integrazione progetti**. **Integra ' +
          'in un corso…** lo porta in un altro corso dell’anno, in bozza.',
      },
      {
        termine: 'Assegnare un’attività del piano',
        testo:
          'Nella pagina **Piani lezione**, apri il dettaglio di un’attività: il pulsante ' +
          '**Progetto** dice la scelta di adesso e apre l’elenco dei progetti dell’anno con le ' +
          'loro fasi; prima quelli già integrati nel corso del piano, poi gli altri, segnati ' +
          '«non ancora nel corso». Un progetto con una fase sola si sceglie direttamente; in ' +
          'fondo **Nuova fase in …** e **Nuovo progetto…**. Le frecce scelgono, Invio conferma, ' +
          'Esc chiude.',
      },
    ],
    note: [
      'Legare un’attività di un piano a un progetto lo integra nel corso del piano, se non lo ' +
        'era già. Il contenuto delle attività importate resta allineato con la scaletta nei ' +
        'due sensi; la durata nel piano resta sua.',
      'Eliminare un progetto lo toglie da tutti i corsi, con compiti, giudizi e matrici; piani ' +
        'e valutazioni restano, sganciati. Togliere un criterio o un livello toglie le caselle ' +
        'che lo usano in ogni corso: prima lo si chiede.',
    ],
  },
  integrazione: {
    titolo: 'Integrazione progetti',
    sommario:
      'I progetti della biblioteca al lavoro con la classe di un corso: in quali piani stanno ' +
      'le loro attività, e compiti, matrice a livelli e giudizi.',
    voci: [
      {
        termine: 'La pagina Integrazione progetti',
        testo:
          'Sta nella progettazione del corso, accanto a **Panoramica** e **Piani lezione**; nella ' +
          'pagina **Corsi** la scheda del corso dice quanti progetti ha e porta qui. A ' +
          'sinistra i progetti integrati nel corso, con lo stato, il periodo e quanto se n’è ' +
          'fatto; **Integra un progetto…** ne porta uno dalla biblioteca, o ne crea uno nuovo già ' +
          'integrato. A destra la testata, i compiti sempre in vista e tre linguette: **Fasi nei ' +
          'piani**, **Matrice** ed **Esiti** (giudizi, valutazioni e presenze).',
      },
      {
        termine: 'Lo stato nel corso',
        testo:
          'Nella testata **Bozza**, **In corso** e **Concluso** dicono a che punto è il progetto ' +
          'con questa classe: lo stesso progetto può essere concluso in un corso e in bozza in un ' +
          'altro. **Apri nella pagina Progetti** porta alla biblioteca, dove si scrivono testata, ' +
          'scaletta, criteri e livelli.',
      },
      {
        termine: 'Le fasi nei piani',
        testo:
          'Ogni fase mostra le attività della scaletta: accanto, le lezioni del corso in cui sono ' +
          'già programmate, o **Da pianificare**. **Programma in un piano…** offre le prossime ' +
          'lezioni del corso e i piani non ancora in una lezione: si apre il piano con ' +
          '**Importa dal progetto** già sulla fase. Sotto, le attività dei piani nelle lezioni, ' +
          'col loro stato, e le prove nate lì. Ogni fase si apre e si chiude con un clic sul ' +
          'titolo; di serie è aperta quella in cui cade oggi.',
      },
      {
        termine: 'Il periodo',
        testo:
          'Non si scrive: va dalla prima all’ultima lezione del corso il cui piano ha un’attività ' +
          'del progetto, e lo stesso per ogni fase.',
      },
      {
        termine: 'I compiti',
        testo:
          'Ogni compito ha la sua linguetta, con quanti hanno finito su quanti e un pallino rosso ' +
          'se qualcuno è oltre la fine; sotto c’è la griglia del compito scelto. **+** (**Nuovo ' +
          'compito**) ne crea uno: titolo, descrizione e la fine per tutti, una data o una ' +
          'lezione; **Modifica**, accanto alla fine, li cambia. Nella griglia, per ogni persona: ' +
          'l’inizio (clic: comincia oggi; tasto destro: un altro giorno o togli), la fine (clic: ' +
          'proroga solo sua), lo stato calcolato — **Da cominciare**, **In corso**, **Scaduto**, ' +
          '**Finito** — e la spunta di finito.',
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
          'attività assegnate a un progetto. Mostra i compiti a linguette (l’inizio si lega ' +
          'all’ora), la matrice di quell’ora e i giudizi dell’ora; con più progetti, una ' +
          'linguetta per progetto, col nome della fase. Nella scheda **Lezione**, l’attività ' +
          'assegnata porta un pulsante col nome del progetto che apre questa scheda su di lui.',
      },
      {
        termine: 'Le valutazioni e i PDF',
        testo:
          '**Valutazioni del progetto** elenca le prove collegate; **Collega una valutazione…** ' +
          'aggiunge una prova del corso nata prima. Il rapporto della classe e quello di ogni ' +
          'persona stanno nella pagina **Documenti** del corso; **Documenti del progetto** porta lì.',
      },
      {
        termine: 'Togliere dal corso',
        testo:
          '**Togli dal corso** chiede prima e dice che cosa se ne va: compiti, giudizi e caselle ' +
          'della matrice di questa classe. Le attività dei piani del corso restano, sganciate; il ' +
          'progetto resta nella biblioteca.',
      },
    ],
    note: [
      'Ogni giorno ha le sue caselle: due giudizi dati in due lezioni non si coprono, si ' +
        'mettono in fila. Dentro un’ora la casella è di quell’ora e ne segue la data se ' +
        'la lezione si sposta.',
      'Un’ora conclusa si guarda e non si cambia: inizi, caselle e giudizi di quell’ora sono ' +
        'fermi finché non la riapri.',
      'Lo stesso progetto in due classi: la scaletta è una sola, compiti, matrice e giudizi ' +
        'sono di ognuna. Una correzione alla scaletta arriva a tutti i piani che la importano.',
    ],
  },
}

export const testi = catalogo(it, {
  de: {
    progetti: {
      titolo: 'Projekte',
      sommario:
        'Die Bibliothek der Projekte des Jahres, ohne Kurs: Ziele, Phasen mit den Aktivitäten ' +
        'für die Unterrichtspläne, Kriterien mit Stufen und Ressourcen. Danach bindet man sie in ' +
        'Kurse ein.',
      voci: [
        {
          termine: 'Die Seite Projekte',
          testo:
            'Sie liegt in der Gruppe **Schuljahr**. Links alle Projekte des Jahres nach Titel, mit der ' +
            'Zahl ihrer Phasen und Aktivitäten und in wie vielen Kursen sie eingebunden sind. ' +
            '**Neues Projekt** erstellt eines; **Bearbeiten** ändert Titel, Beschreibung, Ziele ' +
            '(eines pro Zeile) und Links. Rechts der Kopf mit Zielen und **Ressourcen und ' +
            'Hilfsmittel**, dann **Phasen und Aktivitäten**, **Kriterien und Stufen** und ' +
            '**Eingebunden in**.',
        },
        {
          termine: 'Phasen und Ablauf',
          testo:
            'Ein Projekt teilt sich in Phasen mit Titel und Beschreibung; es gibt immer mindestens ' +
            'eine. **Phasen** fügt sie hinzu, benennt sie um, ordnet und entfernt sie: Die ' +
            'Aktivitäten der Pläne einer entfernten Phase gehen zur vorherigen. **Ablauf ' +
            'bearbeiten** neben jeder Phase bereitet ihre Aktivitäten mit Richtzeiten vor: Das ' +
            'übernimmt man in die Unterrichtspläne der Kurse.',
        },
        {
          termine: 'Kriterien und Stufen',
          testo:
            '**Kriterien** gibt die Zeilen des Rasters, **Stufen** die Skala von unten, mit der ' +
            'Farbe jeder Stufe. Am Anfang gibt es vier Stufen: nicht erreicht, teilweise, ' +
            'erreicht, vollständig. Sie gelten in allen Kursen, in die das Projekt eingebunden ist.',
        },
        {
          termine: 'In einen Kurs einbinden',
          testo:
            '**Eingebunden in** listet die Kurse, in denen das Projekt mit der Klasse arbeitet, mit ' +
            'Status und Zeitraum; der Kursname öffnet seine Seite **Projekte einbinden**. **In ' +
            'einen Kurs einbinden…** bringt es als Entwurf in einen weiteren Kurs des Jahres.',
        },
        {
          termine: 'Eine Aktivität des Plans zuweisen',
          testo:
            'Auf der Seite **Unterrichtspläne** die Details einer Aktivität öffnen: Die ' +
            'Schaltfläche **Projekt** zeigt die aktuelle Wahl und öffnet die Liste der Projekte ' +
            'des Jahres mit ihren Phasen; zuerst die schon im Kurs des Plans eingebundenen, dann ' +
            'die anderen, markiert mit «noch nicht im Kurs». Ein Projekt mit nur einer Phase wird ' +
            'direkt gewählt; unten **Neue Phase in …** und **Neues Projekt…**. Pfeiltasten wählen, ' +
            'Enter bestätigt, Esc schliesst.',
        },
      ],
      note: [
        'Eine Aktivität eines Plans mit einem Projekt zu verbinden bindet es in den Kurs des ' +
          'Plans ein, falls es dort noch nicht ist. Der Inhalt übernommener Aktivitäten bleibt ' +
          'mit dem Ablauf in beide Richtungen abgeglichen; die Dauer im Plan bleibt seine.',
        'Ein Projekt zu löschen entfernt es aus allen Kursen, mit Aufgaben, Einschätzungen und ' +
          'Rastern; Pläne und Beurteilungen bleiben, losgelöst. Ein Kriterium oder eine Stufe zu ' +
          'entfernen entfernt die Felder, die sie in jedem Kurs verwenden: Zuerst wird gefragt.',
      ],
    },
    integrazione: {
      titolo: 'Projekte einbinden',
      sommario:
        'Die Projekte der Bibliothek bei der Arbeit mit der Klasse eines Kurses: in welchen ' +
        'Plänen ihre Aktivitäten stehen, dazu Aufgaben, Stufenraster und Einschätzungen.',
      voci: [
        {
          termine: 'Die Seite Projekte einbinden',
          testo:
            'Sie liegt in der Planung des Kurses, neben **Übersicht** und **Unterrichtspläne**; auf ' +
            'der Seite **Kurse** sagt die Karte des Kurses, wie viele Projekte er hat, und führt hierher. ' +
            'Links die im Kurs eingebundenen Projekte mit Status, Zeitraum und Fortschritt; ' +
            '**Projekt einbinden…** holt eines aus der Bibliothek oder erstellt ein neues, schon ' +
            'eingebunden. Rechts der Kopf, die Aufgaben immer sichtbar und drei Reiter: **Phasen ' +
            'in den Plänen**, **Raster** und **Ergebnisse** (Einschätzungen, Beurteilungen und ' +
            'Anwesenheit).',
        },
        {
          termine: 'Der Status im Kurs',
          testo:
            'Im Kopf sagen **Entwurf**, **Laufend** und **Abgeschlossen**, wo das Projekt mit ' +
            'dieser Klasse steht: Dasselbe Projekt kann in einem Kurs abgeschlossen und in einem ' +
            'anderen ein Entwurf sein. **Auf der Seite Projekte öffnen** führt zur Bibliothek, wo ' +
            'man Kopf, Ablauf, Kriterien und Stufen schreibt.',
        },
        {
          termine: 'Die Phasen in den Plänen',
          testo:
            'Jede Phase zeigt die Aktivitäten des Ablaufs: daneben die Stunden des Kurses, in ' +
            'denen sie schon eingeplant sind, oder **Noch einzuplanen**. **In einem Plan einplanen…** ' +
            'bietet die nächsten Stunden des Kurses und die Pläne, die noch in keiner Stunde ' +
            'sind: Der Plan öffnet sich mit dem Import aus dem Projekt schon auf der Phase. ' +
            'Darunter die Aktivitäten der Pläne in den Stunden, mit ihrem Stand, und die dort ' +
            'entstandenen Prüfungen. Jede Phase öffnet und schliesst sich mit einem Klick auf den ' +
            'Titel; zu Beginn ist die offen, in die der heutige Tag fällt.',
        },
        {
          termine: 'Der Zeitraum',
          testo:
            'Er wird nicht eingetragen: Er reicht von der ersten bis zur letzten Stunde des Kurses, ' +
            'deren Plan eine Aktivität des Projekts hat, und ebenso für jede Phase.',
        },
        {
          termine: 'Die Aufgaben',
          testo:
            'Jede Aufgabe hat ihren Reiter, mit wie viele von wie vielen fertig sind und einem ' +
            'roten Punkt, wenn jemand über dem Ende ist; darunter das Raster der gewählten ' +
            'Aufgabe. **+** (**Neue Aufgabe**) legt eine an: Titel, Beschreibung und das Ende für ' +
            'alle, ein Datum oder eine Stunde; **Bearbeiten**, neben dem Ende, ändert sie. Im ' +
            'Raster für jede Person: der Beginn (Klick: beginnt heute; Rechtsklick: ein anderer Tag ' +
            'oder entfernen), das Ende (Klick: eigene Verlängerung), der berechnete Status — ' +
            '**Noch nicht begonnen**, **In Arbeit**, **Überfällig**, **Fertig** — und das Häkchen ' +
            'für fertig.',
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
            'dieser Stunde Aktivitäten hat, die einem Projekt zugewiesen sind. Sie zeigt die ' +
            'Aufgaben als Reiter (der Beginn hängt an der Stunde), das Raster dieser Stunde und ' +
            'ihre Einschätzungen; mit mehreren Projekten einen Reiter pro Projekt, mit dem Namen ' +
            'der Phase. In der Registerkarte **Unterricht** trägt die zugewiesene Aktivität eine ' +
            'Schaltfläche mit dem Namen des Projekts, die diese Registerkarte bei ihm öffnet.',
        },
        {
          termine: 'Beurteilungen und PDF',
          testo:
            '**Beurteilungen des Projekts** listet die verbundenen Prüfungen auf; **Beurteilung ' +
            'verbinden…** fügt eine frühere Prüfung des Kurses hinzu. Der Bericht der Klasse und ' +
            'jener jeder Person liegen auf der Seite **Dokumente** des Kurses; **Dokumente des ' +
            'Projekts** führt dorthin.',
        },
        {
          termine: 'Aus dem Kurs entfernen',
          testo:
            '**Aus dem Kurs entfernen** fragt zuerst und sagt, was verschwindet: Aufgaben, ' +
            'Einschätzungen und Rasterfelder dieser Klasse. Die Aktivitäten der Pläne des Kurses ' +
            'bleiben, losgelöst; das Projekt bleibt in der Bibliothek.',
        },
      ],
      note: [
        'Jeder Tag hat seine Felder: Zwei Einschätzungen in zwei Stunden überdecken sich nicht, ' +
          'sie reihen sich auf. In einer Stunde gehört das Feld zu dieser Stunde und folgt ihrem ' +
          'Datum, wenn die Stunde verschoben wird.',
        'Eine abgeschlossene Stunde lässt sich ansehen, nicht ändern: Beginn, Felder und ' +
          'Einschätzungen dieser Stunde bleiben, bis du sie wieder öffnest.',
        'Dasselbe Projekt in zwei Klassen: Der Ablauf ist einer, Aufgaben, Raster und ' +
          'Einschätzungen gehören jeder Klasse. Eine Korrektur am Ablauf erreicht alle Pläne, ' +
          'die ihn übernehmen.',
      ],
    },
  },
  fr: {
    progetti: {
      titolo: 'Projets',
      sommario:
        'La bibliothèque des projets de l’année, sans cours : objectifs, phases avec les ' +
        'activités à reporter dans les plans de leçon, critères à niveaux et ressources. On les ' +
        'intègre ensuite aux cours.',
      voci: [
        {
          termine: 'La page Projets',
          testo:
            'Elle est dans le groupe **Année scolaire**. À gauche tous les projets de l’année, par titre, ' +
            'avec leur nombre de phases et d’activités et le nombre de cours où ils sont intégrés. ' +
            '**Nouveau projet** en crée un ; **Modifier** change titre, description, objectifs ' +
            '(un par ligne) et liens. À droite l’en-tête avec les objectifs et **Ressources et ' +
            'outils**, puis **Phases et activités**, **Critères et niveaux** et **Intégré dans**.',
        },
        {
          termine: 'Les phases et le déroulé',
          testo:
            'Un projet se divise en phases avec titre et description ; il y en a toujours au moins ' +
            'une. **Phases** les ajoute, les renomme, les ordonne et les retire : les activités ' +
            'des plans d’une phase retirée passent à la précédente. **Modifier le déroulement**, à ' +
            'côté de chaque phase, prépare ses activités avec leurs durées indicatives : c’est ce ' +
            'qu’on importe dans les plans de leçon des cours.',
        },
        {
          termine: 'Critères et niveaux',
          testo:
            '**Critères** donne les lignes de la grille, **Niveaux** l’échelle, du bas, avec la ' +
            'couleur de chacun. Au départ il y a quatre niveaux : non atteint, partiellement, ' +
            'atteint, pleinement. Ils valent dans tous les cours où le projet est intégré.',
        },
        {
          termine: 'Intégrer dans un cours',
          testo:
            '**Intégré dans** liste les cours où le projet travaille avec la classe, avec l’état ' +
            'et la période ; le nom du cours ouvre sa page **Intégration des projets**. ' +
            '**Intégrer dans un cours…** le porte dans un autre cours de l’année, en brouillon.',
        },
        {
          termine: 'Attribuer une activité du plan',
          testo:
            'Dans la page **Plans de leçon**, ouvre le détail d’une activité : le bouton ' +
            '**Projet** dit le choix actuel et ouvre la liste des projets de l’année avec leurs ' +
            'phases ; d’abord ceux déjà intégrés au cours du plan, puis les autres, marqués « pas ' +
            'encore dans le cours ». Un projet à une seule phase se choisit directement ; en bas ' +
            '**Nouvelle phase dans …** et **Nouveau projet…**. Les flèches choisissent, Entrée ' +
            'confirme, Échap ferme.',
        },
      ],
      note: [
        'Lier une activité d’un plan à un projet l’intègre au cours du plan, s’il ne l’était ' +
          'pas encore. Le contenu des activités importées reste aligné avec le déroulé dans les ' +
          'deux sens ; la durée dans le plan reste la sienne.',
        'Supprimer un projet le retire de tous les cours, avec tâches, appréciations et ' +
          'grilles ; plans et évaluations restent, détachés. Retirer un critère ou un niveau ' +
          'retire les cases qui l’utilisent dans chaque cours : on te le demande avant.',
      ],
    },
    integrazione: {
      titolo: 'Intégration des projets',
      sommario:
        'Les projets de la bibliothèque au travail avec la classe d’un cours : dans quels plans ' +
        'sont leurs activités, et tâches, grille à niveaux et appréciations.',
      voci: [
        {
          termine: 'La page Intégration des projets',
          testo:
            'Elle est dans la planification du cours, à côté de **Vue d’ensemble** et **Plans de ' +
            'leçon** ; dans la page **Cours**, la fiche du cours dit combien de projets il a et mène ' +
            'ici. À gauche les projets intégrés au cours, avec l’état, la période et ' +
            'l’avancement ; **Intégrer un projet…** en apporte un de la bibliothèque, ou en crée ' +
            'un nouveau déjà intégré. À droite l’en-tête, les tâches toujours visibles et trois ' +
            'onglets : **Phases dans les plans**, **Grille** et **Résultats** (appréciations, ' +
            'évaluations et présences).',
        },
        {
          termine: 'L’état dans le cours',
          testo:
            'Dans l’en-tête, **Brouillon**, **En cours** et **Terminé** disent où en est le projet ' +
            'avec cette classe : le même projet peut être terminé dans un cours et en brouillon ' +
            'dans un autre. **Ouvrir dans la page Projets** mène à la bibliothèque, où s’écrivent ' +
            'en-tête, déroulé, critères et niveaux.',
        },
        {
          termine: 'Les phases dans les plans',
          testo:
            'Chaque phase montre les activités du déroulé : à côté, les périodes du cours où elles ' +
            'sont déjà programmées, ou **À planifier**. **Programmer dans un plan…** propose les ' +
            'prochaines périodes du cours et les plans pas encore dans une période : le plan ' +
            's’ouvre avec l’import du projet déjà sur la phase. Dessous, les activités des plans ' +
            'dans les périodes, avec leur état, et les épreuves nées là. Chaque phase s’ouvre et ' +
            'se ferme d’un clic sur son titre ; au départ, celle où tombe aujourd’hui est ouverte.',
        },
        {
          termine: 'La période',
          testo:
            'Elle ne s’écrit pas : elle va de la première à la dernière période du cours dont le ' +
            'plan a une activité du projet, et de même pour chaque phase.',
        },
        {
          termine: 'Les tâches',
          testo:
            'Chaque tâche a son onglet, avec combien ont fini sur combien et un point rouge si ' +
            'quelqu’un a dépassé la fin ; dessous, la grille de la tâche choisie. **+** ' +
            '(**Nouvelle tâche**) en crée une : titre, description et la fin pour tous, une date ' +
            'ou une période ; **Modifier**, à côté de la fin, les change. Dans la grille, pour ' +
            'chaque personne : le début (clic : commence aujourd’hui ; clic droit : un autre jour ' +
            'ou retirer), la fin (clic : prolongation pour elle seule), l’état calculé — **À ' +
            'commencer**, **En cours**, **Échu**, **Fini** — et la coche de fini.',
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
            'Dans le registre de la période, l’onglet **Projet** n’existe que si le plan de cette ' +
            'période a des activités attribuées à un projet. Il montre les tâches en onglets (le ' +
            'début se lie à la période), la grille de cette période et ses appréciations ; avec ' +
            'plusieurs projets, un onglet par projet, avec le nom de la phase. Dans l’onglet ' +
            '**Leçon**, l’activité attribuée porte un bouton au nom du projet qui ouvre cet ' +
            'onglet sur lui.',
        },
        {
          termine: 'Les évaluations et les PDF',
          testo:
            '**Évaluations du projet** liste les épreuves reliées ; **Relier une évaluation…** ' +
            'ajoute une épreuve du cours née avant. Le rapport de la classe et celui de chaque ' +
            'personne sont dans la page **Documents** du cours ; **Documents du projet** y mène.',
        },
        {
          termine: 'Retirer du cours',
          testo:
            '**Retirer du cours** demande d’abord et dit ce qui disparaît : tâches, appréciations ' +
            'et cases de la grille de cette classe. Les activités des plans du cours restent, ' +
            'détachées ; le projet reste dans la bibliothèque.',
        },
      ],
      note: [
        'Chaque jour a ses cases : deux appréciations données dans deux périodes ne se ' +
          'recouvrent pas, elles se suivent. Dans une période, la case lui appartient et suit ' +
          'sa date si la période est déplacée.',
        'Une période terminée se regarde et ne se change pas : débuts, cases et appréciations ' +
          'de cette période restent figés tant que tu ne la rouvres pas.',
        'Le même projet dans deux classes : le déroulé est unique, tâches, grille et ' +
          'appréciations sont à chacune. Une correction du déroulé atteint tous les plans qui ' +
          'l’importent.',
      ],
    },
  },
  en: {
    progetti: {
      titolo: 'Projects',
      sommario:
        'The library of the year’s projects, belonging to no course: objectives, phases with ' +
        'the activities to bring into lesson plans, criteria with levels and resources. You then ' +
        'integrate them into courses.',
      voci: [
        {
          termine: 'The Projects page',
          testo:
            'It is in the **School year** group. On the left every project of the year, by title, with ' +
            'how many phases and activities it has and how many courses it is integrated in. ' +
            '**New project** creates one; **Edit** changes title, description, objectives (one per ' +
            'line) and links. On the right the header with objectives and **Resources and tools**, ' +
            'then **Phases and activities**, **Criteria and levels** and **Integrated in**.',
        },
        {
          termine: 'Phases and outline',
          testo:
            'A project is divided into phases with a title and description; there is always at ' +
            'least one. **Phases** adds, renames, orders and removes them: the plan activities of ' +
            'a removed phase move to the previous one. **Edit outline**, next to each phase, ' +
            'prepares its activities with indicative durations: that is what you import into the ' +
            'courses’ lesson plans.',
        },
        {
          termine: 'Criteria and levels',
          testo:
            '**Criteria** gives the rows of the grid, **Levels** the scale, from the bottom, with ' +
            'the colour of each. It starts with four levels: not achieved, partly, achieved, ' +
            'fully. They apply in every course the project is integrated in.',
        },
        {
          termine: 'Integrating into a course',
          testo:
            '**Integrated in** lists the courses where the project works with the class, with ' +
            'status and period; the course name opens its **Project integration** page. ' +
            '**Integrate in a course…** brings it into another course of the year, as a draft.',
        },
        {
          termine: 'Assigning a plan activity',
          testo:
            'On the **Lesson plans** page, open the details of an activity: the **Project** ' +
            'button shows the current choice and opens the list of the year’s projects with ' +
            'their phases; first those already integrated in the plan’s course, then the others, ' +
            'marked “not in the course yet”. A project with a single phase is chosen directly; at ' +
            'the bottom **New phase in …** and **New project…**. Arrow keys choose, Enter ' +
            'confirms, Esc closes.',
        },
      ],
      note: [
        'Linking a plan activity to a project integrates it in the plan’s course, if it was not ' +
          'already. The content of imported activities stays aligned with the outline both ' +
          'ways; the duration in the plan stays its own.',
        'Deleting a project removes it from every course, with tasks, comments and grids; plans ' +
          'and assessments stay, unlinked. Removing a criterion or a level removes the cells ' +
          'that use it in every course: you are asked first.',
      ],
    },
    integrazione: {
      titolo: 'Project integration',
      sommario:
        'The library’s projects at work with a course’s class: which plans hold their ' +
        'activities, plus tasks, level grid and comments.',
      voci: [
        {
          termine: 'The Project integration page',
          testo:
            'It is in the course’s planning, next to **Overview** and **Lesson plans**; on the ' +
            '**Courses** page the course card says how many projects it has and leads here. On the ' +
            'left the projects integrated in the course, with status, period and progress; ' +
            '**Integrate a project…** brings one from the library, or creates a new one already ' +
            'integrated. On the right the header, the tasks always in view and three tabs: ' +
            '**Phases in the plans**, **Grid** and **Results** (comments, assessments and ' +
            'attendance).',
        },
        {
          termine: 'Status in the course',
          testo:
            'In the header **Draft**, **In progress** and **Finished** say where the project stands ' +
            'with this class: the same project can be finished in one course and a draft in ' +
            'another. **Open on the Projects page** goes to the library, where header, outline, ' +
            'criteria and levels are written.',
        },
        {
          termine: 'Phases in the plans',
          testo:
            'Each phase shows the outline’s activities: next to them, the course lessons where ' +
            'they are already scheduled, or **To be planned**. **Schedule in a plan…** offers the ' +
            'course’s next lessons and the plans not yet in a lesson: the plan opens with the ' +
            'import from the project already on the phase. Below, the plan activities in the ' +
            'lessons, with their state, and the tests that came from them. Each phase opens and ' +
            'closes with a click on its title; at first the one today falls in is open.',
        },
        {
          termine: 'The period',
          testo:
            'It is not typed in: it runs from the first to the last course lesson whose plan has ' +
            'an activity of the project, and the same for each phase.',
        },
        {
          termine: 'Tasks',
          testo:
            'Each task has its own tab, showing how many of how many have finished and a red dot ' +
            'if someone is past the end; below, the grid of the chosen task. **+** (**New task**) ' +
            'creates one: title, description and the end for everyone, a date or a lesson; ' +
            '**Edit**, next to the end, changes them. In the grid, for each learner: the start ' +
            '(click: starts today; right-click: another day or remove), the end (click: their own ' +
            'extension), the computed status — **Not started**, **In progress**, **Overdue**, ' +
            '**Finished** — and the finished tick.',
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
            'activities assigned to a project. It shows the tasks as tabs (the start is tied to ' +
            'the lesson), the grid of that lesson and its comments; with several projects, one tab ' +
            'per project, with the phase’s name. In the **Lesson** tab, the assigned activity ' +
            'carries a button with the project’s name that opens this tab on it.',
        },
        {
          termine: 'Assessments and PDFs',
          testo:
            '**Assessments of the project** lists the linked tests; **Link an assessment…** adds ' +
            'an earlier course test. The class report and each learner’s report are on the ' +
            'course’s **Documents** page; **Project documents** takes you there.',
        },
        {
          termine: 'Removing from the course',
          testo:
            '**Remove from course** asks first and says what goes: tasks, comments and grid cells ' +
            'of this class. The activities in the course’s plans stay, unlinked; the project stays ' +
            'in the library.',
        },
      ],
      note: [
        'Each day has its own cells: two judgements given in two lessons do not cover each ' +
          'other, they line up. In a lesson the cell belongs to that lesson and follows its ' +
          'date if the lesson moves.',
        'A finished lesson can be viewed, not changed: starts, cells and comments of that ' +
          'lesson stay put until you reopen it.',
        'The same project in two classes: the outline is one, tasks, grid and comments belong ' +
          'to each. A correction to the outline reaches every plan that imports it.',
      ],
    },
  },
})
