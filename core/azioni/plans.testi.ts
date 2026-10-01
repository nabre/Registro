// I testi di `plans.ts`: i piani di lezione e le loro risorse.

import { catalogo, perNumero } from '#core/i18n/index.js'
import { plurale } from '#core/dominio/text.js'

const it = {
  fileEstranei: (n: number) =>
    `Il piano nomina ${plurale(n, 'file che non è suo', 'file che non sono suoi')}: ` +
    'i file si allegano con «risorse.aggiungi», non riscrivendo il piano.',
  altroCorso: 'Il piano è di un altro corso: si assegna solo alle lezioni del suo corso.',
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
    altroCorso: 'Der Plan gehört zu einem anderen Kurs: Er wird nur Stunden seines Kurses zugewiesen.',
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
    altroCorso: 'Le plan appartient à un autre cours : il ne s’attribue qu’aux leçons de son cours.',
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
    altroCorso: 'The plan belongs to another course: it can only be assigned to lessons of its course.',
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
