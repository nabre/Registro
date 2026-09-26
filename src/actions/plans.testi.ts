// I testi di `plans.ts`: i piani di lezione e le loro risorse.

import { catalogo, perNumero } from '../i18n/index.js'
import { plurale } from '../domain/text.js'

const it = {
  fileEstranei: (n: number) =>
    `Il piano nomina ${plurale(n, 'file che non è suo', 'file che non sono suoi')}: ` +
    'i file si allegano con «risorse.aggiungi», non riscrivendo il piano.',
  giaUnPiano: 'La lezione ha già un piano: resta quello.',
  senzaCorso: 'La lezione non è agganciata a nessun corso.',
  origineSparita: 'Il piano da copiare non esiste più.',
  /** `classe` è vuota quando il corso non ne ha una. */
  copiato: (data: string, classe: string) =>
    `Piano copiato per la lezione del ${data}${classe ? ` di ${classe}` : ''}.`,
  creato: (data: string, classe: string) =>
    `Piano da completare creato per la lezione del ${data}${classe ? ` di ${classe}` : ''}.`,
  attivitaNonTrovata: 'Attività non trovata in questo piano.',
  attivitaSparita: 'Attività non trovata in questo piano: forse è già sparita.',
  titoloImmagine: 'Aggiungi un’immagine al piano',
  titoloFile: 'Aggiungi un file al piano',
  tastoImmagine: 'Aggiungi immagine',
  tastoFile: 'Aggiungi file',
  nonImmagine: (nome: string) => `«${nome}» non è un'immagine che il registro sappia mostrare.`,
  copiaNonRiuscita: (errore: string) => `Copia della risorsa non riuscita: ${errore}`,
  senzaIndirizzo: 'Questo collegamento non ha un indirizzo.',
}

export const testi = catalogo(it, {
  de: {
    fileEstranei: (n) =>
      `Der Plan nennt ${plurale(n, 'Datei', 'Dateien')}, ` +
      `${perNumero(n, 'die nicht zu ihm gehört', 'die nicht zu ihm gehören')}: ` +
      'Dateien werden mit «risorse.aggiungi» angehängt, nicht durch Überschreiben des Plans.',
    giaUnPiano: 'Die Stunde hat schon einen Plan: Dieser bleibt.',
    senzaCorso: 'Die Stunde gehört zu keinem Kurs.',
    origineSparita: 'Der zu kopierende Plan existiert nicht mehr.',
    copiato: (data, classe) =>
      `Plan für die Stunde vom ${data}${classe ? ` (${classe})` : ''} kopiert.`,
    creato: (data, classe) =>
      `Auszufüllender Plan für die Stunde vom ${data}${classe ? ` (${classe})` : ''} ` +
      'erstellt.',
    attivitaNonTrovata: 'Aktivität in diesem Plan nicht gefunden.',
    attivitaSparita: 'Aktivität in diesem Plan nicht gefunden: Vielleicht ist sie schon weg.',
    titoloImmagine: 'Ein Bild zum Plan hinzufügen',
    titoloFile: 'Eine Datei zum Plan hinzufügen',
    tastoImmagine: 'Bild hinzufügen',
    tastoFile: 'Datei hinzufügen',
    nonImmagine: (nome) => `«${nome}» ist kein Bild, das das Klassenbuch anzeigen kann.`,
    copiaNonRiuscita: (errore) => `Kopieren der Ressource fehlgeschlagen: ${errore}`,
    senzaIndirizzo: 'Dieser Link hat keine Adresse.',
  },
  fr: {
    fileEstranei: (n) =>
      `Le plan cite ${plurale(n, 'fichier', 'fichiers')} ` +
      `${perNumero(n, 'qui n’est pas le sien', 'qui ne sont pas les siens')} : ` +
      'les fichiers se joignent avec « risorse.aggiungi », pas en réécrivant le plan.',
    giaUnPiano: 'La leçon a déjà un plan : c’est celui-là qui reste.',
    senzaCorso: 'La leçon n’est rattachée à aucun cours.',
    origineSparita: 'Le plan à copier n’existe plus.',
    copiato: (data, classe) =>
      `Plan copié pour la leçon du ${data}${classe ? ` de ${classe}` : ''}.`,
    creato: (data, classe) =>
      `Plan à compléter créé pour la leçon du ${data}${classe ? ` de ${classe}` : ''}.`,
    attivitaNonTrovata: 'Activité introuvable dans ce plan.',
    attivitaSparita: 'Activité introuvable dans ce plan : elle a peut-être déjà disparu.',
    titoloImmagine: 'Ajouter une image au plan',
    titoloFile: 'Ajouter un fichier au plan',
    tastoImmagine: 'Ajouter l’image',
    tastoFile: 'Ajouter le fichier',
    nonImmagine: (nome) => `« ${nome} » n’est pas une image que le registre sache afficher.`,
    copiaNonRiuscita: (errore) => `Copie de la ressource impossible : ${errore}`,
    senzaIndirizzo: 'Ce lien n’a pas d’adresse.',
  },
  en: {
    fileEstranei: (n) =>
      `The plan names ${plurale(n, 'file that isn’t its own', 'files that aren’t its own')}: ` +
      'files are attached with “risorse.aggiungi”, not by rewriting the plan.',
    giaUnPiano: 'The lesson already has a plan: that one stays.',
    senzaCorso: 'The lesson isn’t linked to any course.',
    origineSparita: 'The plan to copy no longer exists.',
    copiato: (data, classe) =>
      `Plan copied for the lesson on ${data}${classe ? ` (${classe})` : ''}.`,
    creato: (data, classe) =>
      `Plan created for the lesson on ${data}${classe ? ` (${classe})` : ''}, ready to fill in.`,
    attivitaNonTrovata: 'Activity not found in this plan.',
    attivitaSparita: 'Activity not found in this plan: it may already have gone.',
    titoloImmagine: 'Add an image to the plan',
    titoloFile: 'Add a file to the plan',
    tastoImmagine: 'Add image',
    tastoFile: 'Add file',
    nonImmagine: (nome) => `“${nome}” isn’t an image the register can show.`,
    copiaNonRiuscita: (errore) => `Copying the resource failed: ${errore}`,
    senzaIndirizzo: 'This link has no address.',
  },
})
