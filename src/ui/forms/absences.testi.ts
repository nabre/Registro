// I testi di `forms/absences.ts`: il periodo di assenze con la sua lettera
// all'azienda, e l'importazione dei fogli in blocco.

import { catalogo, perNumero } from '../../i18n/index.js'
import { PERSONE, PIF, Maiuscola, del, il, quanti } from '../../domain/lexicon.js'

const it = {
  modificaPeriodo: 'Modifica periodo',
  nuovoPeriodo: 'Nuovo periodo di assenze',
  aiutoPeriodo:
    'Il periodo è queste due date, e nient’altro: finiscono nel nome dei fogli ' +
    'archiviati e nella lettera all’azienda. Un periodo che sta dentro un semestre ' +
    'ne prende il nome da sé; gli altri si leggono dai loro estremi.',
  dentroLAnno: (anno: string, inizio: string, fine: string) =>
    `Stanno dentro l’anno ${anno}, dal ${inizio} al ${fine}.`,
  emailAllAzienda: 'L’e-mail all’azienda',
  aiutoEmail:
    `Parte un’e-mail per ${PIF.singolare}, all’indirizzo ${del(PERSONE.datore)} ` +
    'che sta nella sua scheda, con dentro i suoi fogli vergini. In chiaro e non in ' +
    'copia nascosta: chi deve firmare deve vedere che è per lui.',
  oggetto: 'Oggetto',
  testo: 'Testo',
  segnaposto: (elenco: string) => `Segnaposto: ${elenco}`,
  ancheA: 'Anche a',
  aPif: Maiuscola(il(PIF)),
  aRappresentante: Maiuscola(il(PERSONE.rappresentante)),
  aggiornato: 'Periodo aggiornato.',
  creato: 'Periodo creato.',
  eliminare: (nome: string) => `Eliminare il periodo ${nome}?`,
  nessunFoglio: 'Non c’è ancora dentro nessun foglio.',
  seNeVannoIFogli: (interessati: number) =>
    `Se ne vanno anche i fogli di ${quanti(interessati, PIF)}, ` +
    'vergini e firmati: escono dal documento dell’anno, e non vanno nel cestino del sistema.',
  eliminato: 'Periodo eliminato.',
  importaIFogli: 'Importa i fogli',
  cheFogli: 'Che fogli sono',
  assenze: 'Assenze',
  ritardi: 'Ritardi',
  inCheVersione: 'In che versione',
  vergini: 'Vergini, da spedire',
  firmati: 'Firmati dal datore',
  aiutoImporta:
    'Si scelgono più file insieme. Ognuno va a chi nomina — «Rossi Maria» o ' +
    '«maria_rossi» — e chi non si riconosce resta fuori e viene elencato: due fratelli ' +
    'con lo stesso cognome non si tirano a indovinare.',
  scegliIFile: 'Scegli i file',
}

export const testi = catalogo(it, {
  de: {
    modificaPeriodo: 'Zeitraum bearbeiten',
    nuovoPeriodo: 'Neuer Absenzenzeitraum',
    aiutoPeriodo:
      'Der Zeitraum, das sind diese zwei Daten und nichts anderes: Sie kommen in den Namen der ' +
      'archivierten Blätter und in den Brief an den Lehrbetrieb. Ein Zeitraum innerhalb ' +
      'eines Semesters übernimmt von selbst dessen Namen; die anderen liest man an ihren ' +
      'Grenzen ab.',
    dentroLAnno: (anno, inizio, fine) =>
      `Sie liegen im Schuljahr ${anno}, vom ${inizio} bis ${fine}.`,
    emailAllAzienda: 'Die E-Mail an den Lehrbetrieb',
    aiutoEmail:
      'Pro lernende Person geht eine E-Mail an die Adresse des Arbeitgebers aus ihrem Personenblatt, ' +
      'mit ihren noch nicht unterschriebenen Blättern darin. Offen, nicht als ' +
      'Blindkopie: Wer unterschreiben muss, soll sehen, dass es ihn betrifft.',
    oggetto: 'Betreff',
    testo: 'Text',
    segnaposto: (elenco) => `Platzhalter: ${elenco}`,
    ancheA: 'Auch an',
    aPif: 'Lernende',
    aRappresentante: 'Gesetzliche Vertretung',
    aggiornato: 'Zeitraum aktualisiert.',
    creato: 'Zeitraum erstellt.',
    eliminare: (nome) => `Zeitraum ${nome} löschen?`,
    nessunFoglio: 'Es sind noch keine Blätter darin.',
    seNeVannoIFogli: (interessati) =>
      `Mitgelöscht werden auch die Blätter ${perNumero(interessati, 'einer lernenden Person',
        `von ${interessati} Lernenden`)}, unterschrieben oder nicht: Sie verschwinden aus ` +
      'dem Dokument des Schuljahrs und kommen nicht in den Papierkorb des Systems.',
    eliminato: 'Zeitraum gelöscht.',
    importaIFogli: 'Blätter importieren',
    cheFogli: 'Welche Blätter',
    assenze: 'Absenzen',
    ritardi: 'Verspätungen',
    inCheVersione: 'Welche Fassung',
    vergini: 'Nicht unterschrieben, zum Versand',
    firmati: 'Vom Arbeitgeber unterschrieben',
    aiutoImporta:
      'Du kannst mehrere Dateien auf einmal wählen. Jede geht an die Person, die sie nennt ' +
      '— «Muster Anna» oder «anna_muster» —, und wer nicht erkannt wird, bleibt draussen und ' +
      'wird aufgelistet: Bei zwei Geschwistern mit demselben Nachnamen wird nicht geraten.',
    scegliIFile: 'Dateien auswählen',
  },
  fr: {
    modificaPeriodo: 'Modifier la période',
    nuovoPeriodo: 'Nouvelle période d’absences',
    aiutoPeriodo:
      'La période, ce sont ces deux dates et rien d’autre : elles figurent dans le nom des ' +
      'feuilles archivées et dans la lettre à l’entreprise formatrice. Une période comprise ' +
      'dans un semestre en prend le nom d’elle-même ; les autres se lisent à leurs bornes.',
    dentroLAnno: (anno, inizio, fine) =>
      `Elles sont comprises dans l’année ${anno}, du ${inizio} au ${fine}.`,
    emailAllAzienda: 'L’e-mail à l’entreprise formatrice',
    aiutoEmail:
      'Un e-mail part pour chaque personne en formation, à l’adresse de l’employeur qui ' +
      'figure dans sa fiche, avec ses feuilles non signées. En clair et non en copie ' +
      'cachée : qui doit signer doit voir que c’est pour lui.',
    oggetto: 'Objet',
    testo: 'Texte',
    segnaposto: (elenco) => `Variables : ${elenco}`,
    ancheA: 'Aussi à',
    aPif: 'La personne en formation',
    aRappresentante: 'Le représentant légal',
    aggiornato: 'Période mise à jour.',
    creato: 'Période créée.',
    eliminare: (nome) => `Supprimer la période ${nome} ?`,
    nessunFoglio: 'Il n’y a encore aucune feuille dedans.',
    seNeVannoIFogli: (interessati) =>
      `Les feuilles ${perNumero(interessati, 'd’une personne en formation',
        `de ${interessati} personnes en formation`)} disparaissent aussi, signées ou non : ` +
      'elles sortent du document de l’année et ne vont pas dans la corbeille du système.',
    eliminato: 'Période supprimée.',
    importaIFogli: 'Importer les feuilles',
    cheFogli: 'Quelles feuilles',
    assenze: 'Absences',
    ritardi: 'Retards',
    inCheVersione: 'Quelle version',
    vergini: 'Non signées, à envoyer',
    firmati: 'Signées par l’employeur',
    aiutoImporta:
      'Tu peux choisir plusieurs fichiers à la fois. Chacun va à la personne qu’il nomme — ' +
      '« Dupont Marie » ou « marie_dupont » — et qui n’est pas reconnu reste de côté et est ' +
      'listé : pour deux frères et sœurs du même nom, on ne devine pas au hasard.',
    scegliIFile: 'Choisir les fichiers',
  },
  en: {
    modificaPeriodo: 'Edit period',
    nuovoPeriodo: 'New absence period',
    aiutoPeriodo:
      'The period is these two dates and nothing else: they go into the names of the ' +
      'archived sheets and into the letter to the training company. A period that falls ' +
      'within a semester takes its name automatically; the others are read from their dates.',
    dentroLAnno: (anno, inizio, fine) =>
      `They fall within the ${anno} year, from ${inizio} to ${fine}.`,
    emailAllAzienda: 'The email to the training company',
    aiutoEmail:
      'One email goes out per learner, to the employer’s address on their record, with ' +
      'their unsigned sheets attached. Visible, not in Bcc: whoever has to sign must see it’s ' +
      'meant for them.',
    oggetto: 'Subject',
    testo: 'Text',
    segnaposto: (elenco) => `Placeholders: ${elenco}`,
    ancheA: 'Also to',
    aPif: 'The learner',
    aRappresentante: 'The legal guardian',
    aggiornato: 'Period updated.',
    creato: 'Period created.',
    eliminare: (nome) => `Delete the period ${nome}?`,
    nessunFoglio: 'There are no sheets in it yet.',
    seNeVannoIFogli: (interessati) =>
      `The sheets of ${perNumero(interessati, 'one learner', `${interessati} learners`)} go ` +
      'too, signed or not: they leave the year’s document, and don’t go to the system ' +
      'Recycle Bin.',
    eliminato: 'Period deleted.',
    importaIFogli: 'Import the sheets',
    cheFogli: 'Which sheets',
    assenze: 'Absences',
    ritardi: 'Late arrivals',
    inCheVersione: 'Which version',
    vergini: 'Unsigned, to send',
    firmati: 'Signed by the employer',
    aiutoImporta:
      'You can choose several files at once. Each goes to whoever it names — “Smith Mary” ' +
      'or “mary_smith” — and anyone not recognised stays out and is listed: two siblings ' +
      'with the same surname aren’t left to guesswork.',
    scegliIFile: 'Choose the files',
  },
})
