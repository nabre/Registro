// I testi delle procedure di `smistamento`. Le chiavi seguono le sottocartelle
// (`pdf.carica` è `smistamento/pdf/carica.ts`); `comune` è `common.ts`. Si
// leggono al momento dell'uso (`titolo: () => t().titolo`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  comune: {
    pagina: 'Numero di pagina, contato da 1',
    pagine: 'Le pagine scelte, in qualunque ordine',
    modo: 'Dove cadono le forbici: dai nomi, ogni N pagine, o da nessuna parte',
    passo: 'Solo con «passo»: quante pagine per documento. Il gestore lo arrotonda fra 1 e 999',
    divisione: 'Come dividere il PDF. Senza, vale «nomi»',
  },
  assenze: {
    assegna: {
      titolo: 'Archivia le pagine scelte come rapporto di assenze o ritardi di una persona',
      bloccoId: 'Il periodo dentro cui sta la riga di quella persona',
      genere: 'Quale rapporto: lo dice la casella, non il file',
      firmato: 'Vergine o già controfirmato',
    },
  },
  bozza: {
    conferma: {
      titolo: 'Archivia in blocco tutte le proposte che hanno già un nome',
    },
  },
  firme: {
    assegna: {
      titolo: 'Archivia le pagine scelte come foglio firme di una richiesta',
      consegnaId: 'La richiesta di cui questo è il foglio firme',
    },
  },
  lettura: {
    attive: {
      titolo: 'Accoda la rilettura OCR di tutte le pagine ancora in attesa. Torna subito',
      smistamentiId: 'I PDF da rileggere. Gli id che non esistono più si ignorano',
    },
    ferma: {
      titolo: 'Svuota la coda di lettura: quel che si sta leggendo finisce la pagina',
    },
    impostazioni: {
      titolo: 'Apre le impostazioni sulla lettura automatica delle scansioni',
    },
    pagine: {
      titolo: 'Accoda la rilettura OCR delle pagine scelte. Torna subito',
    },
    tutto: {
      titolo: 'Accoda la lettura OCR di tutte le pagine mute di un PDF. Torna subito',
    },
  },
  pagine: {
    apri: {
      titolo: 'Ritaglia le pagine scelte in un file di servizio e le apre nel lettore',
    },
    assegna: {
      titolo: 'Archivia le pagine scelte come documento di una persona',
    },
    assegnaManuale: {
      titolo: 'Archivia un intervallo di pagine a una persona (legacy: la usano le prove)',
      consegnaId: 'Il documento sotto cui archiviare',
    },
    riprendi: {
      titolo: 'Riporta in quarantena i documenti di cui quelle pagine facevano parte',
      pagine: 'Basta una pagina per riprendere il documento intero',
      giaInQuarantena: 'Quelle pagine sono già in quarantena.',
    },
    scarta: {
      titolo: 'Toglie dalla quarantena le pagine che non sono di nessuno',
    },
  },
  pdf: {
    apri: {
      titolo: 'Apre il PDF originale nel lettore del sistema',
    },
    attribuisci: {
      titolo: 'Dice di quale classe è un PDF, e rifà la bozza con i nomi nuovi',
      classeId: 'La classe a cui passa quel che resta da decidere',
    },
    carica: {
      titolo: 'Sceglie dei PDF dal disco e li porta in quarantena',
      consegnaId: 'La richiesta a cui appartengono, se la si sa',
      classeId: 'La classe da cui si sta caricando',
    },
    deposita: {
      titolo: 'Posa in quarantena un PDF arrivato con i suoi byte',
      consegnaId: 'La richiesta a cui appartiene, o null',
      classeId: 'La classe da cui è stato lasciato cadere',
      nome: 'Il nome che aveva il file. Il gestore ne toglie i caratteri impossibili',
      contenuto: 'I byte del PDF in base64. Senza tetto: vedi la nota sopra',
    },
    dividi: {
      titolo: 'Cambia dove cadono le forbici e rifà la bozza (legacy: la usano le prove)',
    },
    elimina: {
      titolo:
        'Toglie il PDF dal documento dell’anno (non va nel cestino di sistema), e la riga che ' +
        'lo aspettava',
    },
  },
}

export const testi = catalogo(it, {
  de: {
    comune: {
      pagina: 'Seitennummer, ab 1 gezählt',
      pagine: 'Die gewählten Seiten, in beliebiger Reihenfolge',
      modo: 'Wo die Schere ansetzt: bei den Namen, alle N Seiten oder nirgends',
      passo:
        'Nur mit «passo»: wie viele Seiten pro Dokument. Der Handler rundet auf einen Wert ' +
        'zwischen 1 und 999',
      divisione: 'Wie das PDF aufgeteilt wird. Ohne Angabe gilt «nomi»',
    },
    assenze: {
      assegna: {
        titolo:
          'Legt die gewählten Seiten als Absenzen- oder Verspätungsbericht einer Person ab',
        bloccoId: 'Der Zeitraum, in dem die Zeile dieser Person steht',
        genere: 'Welcher Bericht: Das sagt das Feld, nicht die Datei',
        firmato: 'Leer oder bereits gegengezeichnet',
      },
    },
    bozza: {
      conferma: {
        titolo: 'Legt alle Vorschläge, die schon einen Namen haben, auf einmal ab',
      },
    },
    firme: {
      assegna: {
        titolo: 'Legt die gewählten Seiten als Unterschriftenblatt einer Anfrage ab',
        consegnaId: 'Die Anfrage, zu der dies das Unterschriftenblatt ist',
      },
    },
    lettura: {
      attive: {
        titolo:
          'Reiht das erneute Lesen (OCR) aller noch wartenden Seiten ein. Kehrt sofort zurück',
        smistamentiId:
          'Die erneut zu lesenden PDFs. IDs, die es nicht mehr gibt, werden übergangen',
      },
      ferma: {
        titolo: 'Leert die Lesewarteschlange: Was gerade gelesen wird, beendet seine Seite',
      },
      impostazioni: {
        titolo: 'Öffnet die Einstellungen zum automatischen Lesen der Scans',
      },
      pagine: {
        titolo: 'Reiht das erneute Lesen (OCR) der gewählten Seiten ein. Kehrt sofort zurück',
      },
      tutto: {
        titolo:
          'Reiht das Lesen (OCR) aller stummen Seiten eines PDFs ein. Kehrt sofort zurück',
      },
    },
    pagine: {
      apri: {
        titolo:
          'Schneidet die gewählten Seiten in eine Hilfsdatei aus und öffnet sie im Viewer',
      },
      assegna: {
        titolo: 'Legt die gewählten Seiten als Dokument einer Person ab',
      },
      assegnaManuale: {
        titolo: 'Legt einen Seitenbereich bei einer Person ab (Altlast: die Tests verwenden sie)',
        consegnaId: 'Das Dokument, unter dem abgelegt wird',
      },
      riprendi: {
        titolo:
          'Bringt die Dokumente, zu denen diese Seiten gehörten, zurück in die Quarantäne',
        pagine: 'Eine Seite genügt, um das ganze Dokument zurückzuholen',
        giaInQuarantena: 'Diese Seiten sind bereits in der Quarantäne.',
      },
      scarta: {
        titolo: 'Entfernt aus der Quarantäne die Seiten, die niemandem gehören',
      },
    },
    pdf: {
      apri: {
        titolo: 'Öffnet das Original-PDF im Viewer des Systems',
      },
      attribuisci: {
        titolo:
          'Sagt, zu welcher Klasse ein PDF gehört, und erstellt den Entwurf mit den neuen ' +
          'Namen neu',
        classeId: 'Die Klasse, an die übergeht, was noch zu entscheiden ist',
      },
      carica: {
        titolo: 'Wählt PDFs auf der Festplatte aus und bringt sie in die Quarantäne',
        consegnaId: 'Die Anfrage, zu der sie gehören, falls bekannt',
        classeId: 'Die Klasse, aus der gerade geladen wird',
      },
      deposita: {
        titolo: 'Legt ein PDF, das mit seinen Bytes angekommen ist, in die Quarantäne',
        consegnaId: 'Die Anfrage, zu der es gehört, oder null',
        classeId: 'Die Klasse, auf die es fallen gelassen wurde',
        nome: 'Der Name, den die Datei hatte. Der Handler entfernt unmögliche Zeichen',
        contenuto: 'Die Bytes des PDFs in Base64. Ohne Obergrenze: siehe die Notiz oben',
      },
      dividi: {
        titolo:
          'Ändert, wo die Schere ansetzt, und erstellt den Entwurf neu (Altlast: die Tests ' +
          'verwenden sie)',
      },
      elimina: {
        titolo:
          'Entfernt das PDF aus dem Jahresdokument (es kommt nicht in den Papierkorb des ' +
          'Systems) und die Zeile, die darauf wartete',
      },
    },
  },
  fr: {
    comune: {
      pagina: 'Numéro de page, compté à partir de 1',
      pagine: 'Les pages choisies, dans n’importe quel ordre',
      modo: 'Où tombent les ciseaux : aux noms, toutes les N pages, ou nulle part',
      passo:
        'Seulement avec « passo » : combien de pages par document. Le gestionnaire arrondit ' +
        'entre 1 et 999',
      divisione: 'Comment découper le PDF. Sans, vaut « nomi »',
    },
    assenze: {
      assegna: {
        titolo:
          'Classe les pages choisies comme rapport d’absences ou de retards d’une personne',
        bloccoId: 'La période dans laquelle se trouve la ligne de cette personne',
        genere: 'Quel rapport : c’est la case qui le dit, pas le fichier',
        firmato: 'Vierge ou déjà contresigné',
      },
    },
    bozza: {
      conferma: {
        titolo: 'Classe en bloc toutes les propositions qui ont déjà un nom',
      },
    },
    firme: {
      assegna: {
        titolo: 'Classe les pages choisies comme feuille de signatures d’une demande',
        consegnaId: 'La demande dont ceci est la feuille de signatures',
      },
    },
    lettura: {
      attive: {
        titolo:
          'Met en file la relecture OCR de toutes les pages encore en attente. Rend la main ' +
          'aussitôt',
        smistamentiId: 'Les PDF à relire. Les id qui n’existent plus sont ignorés',
      },
      ferma: {
        titolo: 'Vide la file de lecture : ce qui est en cours de lecture termine sa page',
      },
      impostazioni: {
        titolo: 'Ouvre les paramètres de la lecture automatique des scans',
      },
      pagine: {
        titolo: 'Met en file la relecture OCR des pages choisies. Rend la main aussitôt',
      },
      tutto: {
        titolo:
          'Met en file la lecture OCR de toutes les pages muettes d’un PDF. Rend la main ' +
          'aussitôt',
      },
    },
    pagine: {
      apri: {
        titolo:
          'Découpe les pages choisies dans un fichier de travail et les ouvre dans la ' +
          'visionneuse',
      },
      assegna: {
        titolo: 'Classe les pages choisies comme document d’une personne',
      },
      assegnaManuale: {
        titolo: 'Classe une plage de pages pour une personne (héritage : les tests l’utilisent)',
        consegnaId: 'Le document sous lequel classer',
      },
      riprendi: {
        titolo: 'Remet en quarantaine les documents dont ces pages faisaient partie',
        pagine: 'Une seule page suffit pour reprendre le document entier',
        giaInQuarantena: 'Ces pages sont déjà en quarantaine.',
      },
      scarta: {
        titolo: 'Retire de la quarantaine les pages qui n’appartiennent à personne',
      },
    },
    pdf: {
      apri: {
        titolo: 'Ouvre le PDF original dans la visionneuse du système',
      },
      attribuisci: {
        titolo:
          'Indique à quelle classe appartient un PDF, et refait le brouillon avec les ' +
          'nouveaux noms',
        classeId: 'La classe à laquelle passe ce qui reste à décider',
      },
      carica: {
        titolo: 'Choisit des PDF sur le disque et les met en quarantaine',
        consegnaId: 'La demande à laquelle ils appartiennent, si on la connaît',
        classeId: 'La classe depuis laquelle on charge',
      },
      deposita: {
        titolo: 'Dépose en quarantaine un PDF arrivé avec ses octets',
        consegnaId: 'La demande à laquelle il appartient, ou null',
        classeId: 'La classe sur laquelle il a été déposé',
        nome:
          'Le nom qu’avait le fichier. Le gestionnaire en retire les caractères impossibles',
        contenuto: 'Les octets du PDF en base64. Sans plafond : voir la note ci-dessus',
      },
      dividi: {
        titolo:
          'Change l’endroit où tombent les ciseaux et refait le brouillon (héritage : les ' +
          'tests l’utilisent)',
      },
      elimina: {
        titolo:
          'Retire le PDF du document de l’année (il ne va pas dans la corbeille du système), ' +
          'ainsi que la ligne qui l’attendait',
      },
    },
  },
  en: {
    comune: {
      pagina: 'Page number, counted from 1',
      pagine: 'The chosen pages, in any order',
      modo: 'Where the scissors fall: at the names, every N pages, or nowhere',
      passo:
        'Only with “passo”: how many pages per document. The handler rounds it to between ' +
        '1 and 999',
      divisione: 'How to split the PDF. Without it, “nomi” applies',
    },
    assenze: {
      assegna: {
        titolo: 'Files the chosen pages as a person’s absence or lateness report',
        bloccoId: 'The period containing that person’s row',
        genere: 'Which report: the box says so, not the file',
        firmato: 'Blank or already countersigned',
      },
    },
    bozza: {
      conferma: {
        titolo: 'Files in one go all the proposals that already have a name',
      },
    },
    firme: {
      assegna: {
        titolo: 'Files the chosen pages as the signature sheet of a request',
        consegnaId: 'The request this is the signature sheet of',
      },
    },
    lettura: {
      attive: {
        titolo: 'Queues OCR re-reading of all pages still waiting. Returns straight away',
        smistamentiId: 'The PDFs to re-read. Ids that no longer exist are ignored',
      },
      ferma: {
        titolo: 'Empties the reading queue: whatever is being read finishes its page',
      },
      impostazioni: {
        titolo: 'Opens the settings for automatic reading of scans',
      },
      pagine: {
        titolo: 'Queues OCR re-reading of the chosen pages. Returns straight away',
      },
      tutto: {
        titolo: 'Queues OCR reading of all silent pages of a PDF. Returns straight away',
      },
    },
    pagine: {
      apri: {
        titolo: 'Cuts the chosen pages into a working file and opens them in the viewer',
      },
      assegna: {
        titolo: 'Files the chosen pages as a person’s document',
      },
      assegnaManuale: {
        titolo: 'Files a range of pages to a person (legacy: the tests use it)',
        consegnaId: 'The document to file under',
      },
      riprendi: {
        titolo: 'Puts back into quarantine the documents those pages were part of',
        pagine: 'One page is enough to take back the whole document',
        giaInQuarantena: 'Those pages are already in quarantine.',
      },
      scarta: {
        titolo: 'Removes from quarantine the pages that belong to nobody',
      },
    },
    pdf: {
      apri: {
        titolo: 'Opens the original PDF in the system viewer',
      },
      attribuisci: {
        titolo: 'Says which class a PDF belongs to, and redoes the draft with the new names',
        classeId: 'The class that takes over what is still to be decided',
      },
      carica: {
        titolo: 'Picks PDFs from disk and brings them into quarantine',
        consegnaId: 'The request they belong to, if known',
        classeId: 'The class they are being loaded from',
      },
      deposita: {
        titolo: 'Places into quarantine a PDF that arrived with its bytes',
        consegnaId: 'The request it belongs to, or null',
        classeId: 'The class it was dropped onto',
        nome: 'The name the file had. The handler strips impossible characters',
        contenuto: 'The PDF bytes in base64. No cap: see the note above',
      },
      dividi: {
        titolo: 'Changes where the scissors fall and redoes the draft (legacy: the tests use it)',
      },
      elimina: {
        titolo:
          'Removes the PDF from the year document (it does not go to the system recycle bin), along ' +
          'with the row that was waiting for it',
      },
    },
  },
})
