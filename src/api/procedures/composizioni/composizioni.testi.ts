// I testi delle procedure di `composizioni`. «Fascicolo» qui è la composizione
// (più fogli in un PDF), non il fascicolo di classe: nelle altre lingue si usa
// la parola della pagina (`forms/composition.testi.ts`). Si leggono al momento
// dell'uso (`titolo: () => …`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  aggiorna: {
    titolo: 'Rifà il PDF di un fascicolo con i fogli che ci sono adesso',
    id: 'La composizione da rifare',
  },
  crea: {
    titolo: 'Mette i documenti scelti in un PDF solo, sotto un nome',
    nome: 'È anche il nome del file che ne esce',
    percorsi: 'I documenti da combinare, nell’ordine in cui vanno in fila',
  },
  elimina: {
    titolo: 'Butta via un fascicolo: la ricetta e il suo PDF',
  },
}

export const testi = catalogo(it, {
  de: {
    aggiorna: {
      titolo: 'Erstellt das PDF einer Zusammenstellung mit den Blättern neu, die es jetzt gibt',
      id: 'Die Zusammenstellung, die neu erstellt werden soll',
    },
    crea: {
      titolo: 'Fügt die gewählten Dokumente unter einem Namen zu einem einzigen PDF zusammen',
      nome: 'Ist auch der Name der Datei, die daraus entsteht',
      percorsi: 'Die Dokumente, die zusammengefügt werden, in der Reihenfolge, in der sie folgen',
    },
    elimina: {
      titolo: 'Löscht eine Zusammenstellung: das Rezept und sein PDF',
    },
  },
  fr: {
    aggiorna: {
      titolo: 'Refait le PDF d’une compilation avec les feuilles qui existent maintenant',
      id: 'La compilation à refaire',
    },
    crea: {
      titolo: 'Réunit les documents choisis en un seul PDF, sous un nom',
      nome: 'C’est aussi le nom du fichier qui en sort',
      percorsi: 'Les documents à combiner, dans l’ordre où ils se suivent',
    },
    elimina: {
      titolo: 'Supprime une compilation : la recette et son PDF',
    },
  },
  en: {
    aggiorna: {
      titolo: 'Rebuilds the PDF of a compilation from the sheets that exist now',
      id: 'The compilation to rebuild',
    },
    crea: {
      titolo: 'Puts the chosen documents into a single PDF, under a name',
      nome: 'It is also the name of the file that comes out',
      percorsi: 'The documents to combine, in the order they follow each other',
    },
    elimina: {
      titolo: 'Deletes a compilation: the recipe and its PDF',
    },
  },
})
