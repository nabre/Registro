// I testi di `forms/composition.ts`: la finestra che dà il nome a una
// composizione di documenti.

import { catalogo } from '../../i18n/index.js'

const it = {
  almenoDue: 'Spunta almeno due documenti da combinare.',
  titolo: 'Combina in una composizione',
  combina: 'Combina',
  documentiInOrdine: (n: number) => `${n} documenti, in quest’ordine. `,
  aiuto:
    'La composizione si rifà quando serve: l’elenco resta scritto, e «aggiorna» la ' +
    'ricompone con i fogli di adesso.',
  composizione: 'Composizione',
  nome: 'Nome della composizione',
  segnapostoNome: 'Schede 1° semestre',
  aiutoNome: 'È anche il nome del file PDF',
  serveUnNome: 'La composizione ha bisogno di un nome.',
  nonComposto: 'Fascicolo non composto.',
}

export const testi = catalogo(it, {
  de: {
    almenoDue: 'Wähle mindestens zwei Dokumente zum Zusammenstellen aus.',
    titolo: 'Zu einer Zusammenstellung verbinden',
    combina: 'Zusammenstellen',
    documentiInOrdine: (n) => `${n} Dokumente, in dieser Reihenfolge. `,
    aiuto:
      'Die Zusammenstellung lässt sich bei Bedarf neu erstellen: Die Liste bleibt gespeichert, ' +
      'und «Aktualisieren» setzt sie mit den aktuellen Blättern neu zusammen.',
    composizione: 'Zusammenstellung',
    nome: 'Name der Zusammenstellung',
    segnapostoNome: 'Blätter 1. Semester',
    aiutoNome: 'Ist auch der Name der PDF-Datei',
    serveUnNome: 'Die Zusammenstellung braucht einen Namen.',
    nonComposto: 'Zusammenstellung nicht erstellt.',
  },
  fr: {
    almenoDue: 'Coche au moins deux documents à combiner.',
    titolo: 'Combiner en une compilation',
    combina: 'Combiner',
    documentiInOrdine: (n) => `${n} documents, dans cet ordre. `,
    aiuto:
      'La compilation se refait au besoin : la liste reste enregistrée, et « Mettre à jour » ' +
      'la recompose avec les feuilles actuelles.',
    composizione: 'Compilation',
    nome: 'Nom de la compilation',
    segnapostoNome: 'Fiches 1er semestre',
    aiutoNome: 'C’est aussi le nom du fichier PDF',
    serveUnNome: 'La compilation a besoin d’un nom.',
    nonComposto: 'Compilation non créée.',
  },
  en: {
    almenoDue: 'Tick at least two documents to combine.',
    titolo: 'Combine into a compilation',
    combina: 'Combine',
    documentiInOrdine: (n) => `${n} documents, in this order. `,
    aiuto:
      'The compilation can be redone whenever needed: the list is kept, and “Update” ' +
      'rebuilds it with the current sheets.',
    composizione: 'Compilation',
    nome: 'Name of the compilation',
    segnapostoNome: 'Sheets semester 1',
    aiutoNome: 'It’s also the name of the PDF file',
    serveUnNome: 'The compilation needs a name.',
    nonComposto: 'Compilation not created.',
  },
})
