// I testi delle procedure di `piani`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  assegna: {
    titolo: 'Aggancia un piano a un’ora, o lo stacca',
    pianoId: 'null stacca il piano dall’ora',
  },
  duplica: {
    titolo: 'Una copia del piano, con i file delle sue risorse ricopiati davvero',
  },
  elenco: {
    titolo: 'I piani lezione di un corso, con obiettivi e tappe',
    corsoId: 'Solo i piani di questo corso',
    classeId: 'Solo i piani dei corsi di questa classe',
    tag: 'Solo i piani con questa etichetta. Esatta, non a pezzi',
    dove: 'nome, obiettivo, tappa o etichetta',
    corsoChiesto: 'Il corso chiesto, o nullo se erano tutti',
    cerca: 'Il filtro di testo applicato. Vuoto quando non se n’è chiesto',
    id: 'Da passare a «piani.leggi» per avere le tappe',
    corsoDelPiano: 'Di quale corso è: serve quando si chiedono tutti',
    nome: 'Come si chiama nell’elenco: «3ª lezione», «bozza del 12.09»',
    assegnatoA: 'L’ora a cui è assegnato, o vuoto se è una bozza',
    ud: 'Quanto dura in unità didattiche, sommando le tappe',
    presentazione: {
      titolo: 'I piani del corso',
      piani: 'Piani',
      piano: 'Piano',
      assegnatoA: 'Assegnato a',
      tappe: 'Tappe',
      obiettivi: 'Obiettivi',
      etichette: 'Etichette',
    },
  },
  elimina: {
    titolo: 'Toglie un piano e la cartella di risorse che si porta dietro',
  },
  leggi: {
    titolo: 'Un piano lezione per intero: obiettivi, tappe, risorse',
    assegnatoA: 'L’ora a cui è assegnato, o vuoto se è una bozza',
    ud: 'Quanto dura in tutto, in unità didattiche',
    tipo: 'Che genere di attività è, come si legge',
    materiali: 'Che cosa serve in aula per quella tappa',
    valutata: 'Se da quella tappa esce una prova',
    genere: 'Che cos’è: un file, un collegamento, un’immagine',
    rimedio: 'I piani di un corso li elenca «piani.elenco».',
    presentazione: {
      titolo: 'Il piano lezione',
      piano: 'Piano',
      assegnatoA: 'Assegnato a',
      durata: 'Durata in UD',
      prerequisiti: 'Prerequisiti',
      obiettivi: 'Obiettivi',
      tappe: 'Le tappe, nell’ordine',
      tappa: 'Tappa',
      genere: 'Genere',
      materiali: 'Materiali',
      prova: 'Prova',
    },
  },
  perLezione: {
    titolo: 'Apre il piano di un’ora: vuoto da completare, o copiato da uno che c’è',
    daPianoId: 'Il piano da ricopiare. Senza, o nullo, ne nasce uno da completare',
  },
  salva: {
    titolo: 'Scrive un piano per intero: lo crea se non c’era, lo riscrive se c’era',
    piano: 'Il piano per intero: obiettivi, scaletta, risorse, etichette',
  },
}

export const testi = catalogo(it, {
  de: {
    assegna: {
      titolo: 'Hängt einen Plan an eine Stunde an oder löst ihn davon',
      pianoId: 'null löst den Plan von der Stunde',
    },
    duplica: {
      titolo: 'Eine Kopie des Plans, mit den Dateien seiner Ressourcen wirklich mitkopiert',
    },
    elenco: {
      titolo: 'Die Unterrichtspläne eines Kurses, mit Lernzielen und Etappen',
      corsoId: 'Nur die Pläne dieses Kurses',
      classeId: 'Nur die Pläne der Kurse dieser Klasse',
      tag: 'Nur die Pläne mit diesem Schlagwort. Exakt, nicht in Teilen',
      dove: 'Name, Lernziel, Etappe oder Schlagwort',
      corsoChiesto: 'Der verlangte Kurs, oder null, wenn es alle waren',
      cerca: 'Der angewendete Textfilter. Leer, wenn keiner verlangt wurde',
      id: 'An «piani.leggi» zu übergeben, um die Etappen zu erhalten',
      corsoDelPiano: 'Zu welchem Kurs er gehört: nützlich, wenn alle verlangt werden',
      nome: 'Wie er in der Liste heisst: «3ª lezione», «bozza del 12.09»',
      assegnatoA:
        'Die Stunde, der er zugeordnet ist, oder leer, wenn er ein Entwurf ist',
      ud: 'Wie lange er dauert, in Lektionen, die Etappen zusammengezählt',
      presentazione: {
        titolo: 'Die Pläne des Kurses',
        piani: 'Pläne',
        piano: 'Plan',
        assegnatoA: 'Zugeordnet zu',
        tappe: 'Etappen',
        obiettivi: 'Lernziele',
        etichette: 'Schlagwörter',
      },
    },
    elimina: {
      titolo: 'Entfernt einen Plan und den Ordner mit den Ressourcen, den er mit sich führt',
    },
    leggi: {
      titolo: 'Ein Unterrichtsplan vollständig: Lernziele, Etappen, Ressourcen',
      assegnatoA:
        'Die Stunde, der er zugeordnet ist, oder leer, wenn er ein Entwurf ist',
      ud: 'Wie lange er insgesamt dauert, in Lektionen',
      tipo: 'Welche Art von Aktivität es ist, wie man sie liest',
      materiali: 'Was im Schulzimmer für diese Etappe gebraucht wird',
      valutata: 'Ob aus dieser Etappe eine Prüfung hervorgeht',
      genere: 'Was es ist: eine Datei, ein Link, ein Bild',
      rimedio: 'Die Pläne eines Kurses listet «piani.elenco» auf.',
      presentazione: {
        titolo: 'Der Unterrichtsplan',
        piano: 'Plan',
        assegnatoA: 'Zugeordnet zu',
        durata: 'Dauer in Lektionen',
        prerequisiti: 'Voraussetzungen',
        obiettivi: 'Lernziele',
        tappe: 'Die Etappen, der Reihe nach',
        tappa: 'Etappe',
        genere: 'Art',
        materiali: 'Material',
        prova: 'Prüfung',
      },
    },
    perLezione: {
      titolo:
        'Öffnet den Plan einer Stunde: leer zum Ausfüllen oder kopiert von einem ' +
        'bestehenden',
      daPianoId: 'Der zu kopierende Plan. Ohne ihn, oder mit null, entsteht einer zum Ausfüllen',
    },
    salva: {
      titolo:
        'Schreibt einen Plan vollständig: Legt ihn an, wenn es ihn nicht gab, und schreibt ihn ' +
        'neu, wenn es ihn gab',
      piano: 'Der Plan vollständig: Lernziele, Ablauf, Ressourcen, Schlagwörter',
    },
  },
  fr: {
    assegna: {
      titolo: 'Rattache un plan à une leçon, ou l’en détache',
      pianoId: 'null détache le plan de la leçon',
    },
    duplica: {
      titolo: 'Une copie du plan, avec les fichiers de ses ressources vraiment recopiés',
    },
    elenco: {
      titolo: 'Les plans de leçon d’un cours, avec objectifs et étapes',
      corsoId: 'Seulement les plans de ce cours',
      classeId: 'Seulement les plans des cours de cette classe',
      tag: 'Seulement les plans avec cette étiquette. Exacte, pas par fragments',
      dove: 'nom, objectif, étape ou étiquette',
      corsoChiesto: 'Le cours demandé, ou null si c’étaient tous',
      cerca: 'Le filtre de texte appliqué. Vide quand il n’y en a pas eu',
      id: 'À passer à « piani.leggi » pour obtenir les étapes',
      corsoDelPiano: 'À quel cours il appartient : utile quand on les demande tous',
      nome: 'Son nom dans la liste : « 3ª lezione », « bozza del 12.09 »',
      assegnatoA: 'La leçon à laquelle il est attribué, ou vide si c’est un brouillon',
      ud: 'Combien il dure en périodes, en additionnant les étapes',
      presentazione: {
        titolo: 'Les plans du cours',
        piani: 'Plans',
        piano: 'Plan',
        assegnatoA: 'Attribué à',
        tappe: 'Étapes',
        obiettivi: 'Objectifs',
        etichette: 'Étiquettes',
      },
    },
    elimina: {
      titolo: 'Retire un plan et le dossier de ressources qu’il emporte avec lui',
    },
    leggi: {
      titolo: 'Un plan de leçon en entier : objectifs, étapes, ressources',
      assegnatoA: 'La leçon à laquelle il est attribué, ou vide si c’est un brouillon',
      ud: 'Combien il dure en tout, en périodes',
      tipo: 'Quel genre d’activité c’est, tel qu’on le lit',
      materiali: 'Ce qu’il faut en classe pour cette étape',
      valutata: 'Si cette étape donne lieu à une épreuve',
      genere: 'Ce que c’est : un fichier, un lien, une image',
      rimedio: 'Les plans d’un cours sont listés par « piani.elenco ».',
      presentazione: {
        titolo: 'Le plan de leçon',
        piano: 'Plan',
        assegnatoA: 'Attribué à',
        durata: 'Durée en périodes',
        prerequisiti: 'Prérequis',
        obiettivi: 'Objectifs',
        tappe: 'Les étapes, dans l’ordre',
        tappa: 'Étape',
        genere: 'Genre',
        materiali: 'Matériel',
        prova: 'Épreuve',
      },
    },
    perLezione: {
      titolo:
        'Ouvre le plan d’une leçon : vide à compléter, ou copié d’un plan existant',
      daPianoId: 'Le plan à recopier. Sans, ou avec null, il en naît un à compléter',
    },
    salva: {
      titolo:
        'Écrit un plan en entier : le crée s’il n’existait pas, le réécrit s’il existait',
      piano: 'Le plan en entier : objectifs, déroulement, ressources, étiquettes',
    },
  },
  en: {
    assegna: {
      titolo: 'Attaches a plan to a lesson, or detaches it',
      pianoId: 'null detaches the plan from the lesson',
    },
    duplica: {
      titolo: 'A copy of the plan, with the files of its resources actually copied',
    },
    elenco: {
      titolo: 'The lesson plans of a course, with objectives and steps',
      corsoId: 'Only the plans of this course',
      classeId: 'Only the plans of this class’s courses',
      tag: 'Only the plans with this tag. Exact, not in pieces',
      dove: 'name, objective, step or tag',
      corsoChiesto: 'The course asked for, or null if they were all',
      cerca: 'The text filter applied. Empty when none was asked for',
      id: 'To pass to “piani.leggi” to get the steps',
      corsoDelPiano: 'Which course it belongs to: useful when asking for all of them',
      nome: 'What it is called in the list: “3ª lezione”, “bozza del 12.09”',
      assegnatoA: 'The lesson it is assigned to, or empty if it is a draft',
      ud: 'How long it lasts in periods, adding up the steps',
      presentazione: {
        titolo: 'The course’s plans',
        piani: 'Plans',
        piano: 'Plan',
        assegnatoA: 'Assigned to',
        tappe: 'Steps',
        obiettivi: 'Objectives',
        etichette: 'Tags',
      },
    },
    elimina: {
      titolo: 'Removes a plan and the resource folder it carries with it',
    },
    leggi: {
      titolo: 'A whole lesson plan: objectives, steps, resources',
      assegnatoA: 'The lesson it is assigned to, or empty if it is a draft',
      ud: 'How long it lasts in total, in periods',
      tipo: 'What kind of activity it is, as it reads',
      materiali: 'What is needed in the classroom for that step',
      valutata: 'Whether that step leads to a test',
      genere: 'What it is: a file, a link, an image',
      rimedio: 'The plans of a course are listed by “piani.elenco”.',
      presentazione: {
        titolo: 'The lesson plan',
        piano: 'Plan',
        assegnatoA: 'Assigned to',
        durata: 'Length in periods',
        prerequisiti: 'Prerequisites',
        obiettivi: 'Objectives',
        tappe: 'The steps, in order',
        tappa: 'Step',
        genere: 'Kind',
        materiali: 'Materials',
        prova: 'Test',
      },
    },
    perLezione: {
      titolo: 'Opens the plan of a lesson: empty to fill in, or copied from an existing one',
      daPianoId: 'The plan to copy. Without it, or with null, a new one to fill in is created',
    },
    salva: {
      titolo: 'Writes a whole plan: creates it if it was not there, rewrites it if it was',
      piano: 'The whole plan: objectives, outline, resources, tags',
    },
  },
})
