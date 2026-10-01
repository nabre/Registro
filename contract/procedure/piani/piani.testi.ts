// I testi delle procedure di `piani`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento.

import { catalogo } from '#core/i18n/index.js'

const it = {
  assegna: {
    titolo: 'Aggancia un piano a un’ora, o lo stacca',
    pianoId: 'null stacca il piano dall’ora. Un piano di un altro corso si rifiuta',
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
  salva: {
    titolo: 'Scrive un piano per intero: lo crea se non c’era, lo riscrive se c’era',
    piano: 'Il piano per intero: obiettivi, scaletta, risorse, etichette',
  },
}

export const testi = catalogo(it, {
  de: {
    assegna: {
      titolo: 'Hängt einen Plan an eine Stunde an oder löst ihn davon',
      pianoId: 'null löst den Plan von der Stunde. Ein Plan eines anderen Kurses wird abgelehnt',
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
      pianoId: 'null détache le plan de la leçon. Un plan d’un autre cours est refusé',
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
        etichette: 'Mots-clés',
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
    salva: {
      titolo:
        'Écrit un plan en entier : le crée s’il n’existait pas, le réécrit s’il existait',
      piano: 'Le plan en entier : objectifs, déroulement, ressources, mots-clés',
    },
  },
  en: {
    assegna: {
      titolo: 'Attaches a plan to a lesson, or detaches it',
      pianoId: 'null detaches the plan from the lesson. A plan from another course is refused',
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
    salva: {
      titolo: 'Writes a whole plan: creates it if it was not there, rewrites it if it was',
      piano: 'The whole plan: objectives, outline, resources, tags',
    },
  },
})
