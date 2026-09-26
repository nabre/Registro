// I testi delle procedure piccole di `persone`; le letture grandi hanno il
// proprio catalogo accanto. Si leggono al momento dell'uso (`titolo: () => …`),
// mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  elimina: { titolo: 'Toglie una persona dalla classe con presenze, voti e osservazioni' },
  foto: {
    imposta: { titolo: 'Il ritratto di una persona: si sceglie dal disco e se ne tiene una copia' },
    togli: { titolo: 'Via il ritratto dall’anagrafica, e via il file' },
  },
  importa: {
    titolo: 'Aggiunge alla classe le persone riconosciute in un elenco incollato',
    testo: 'L’elenco incollato, una persona per riga',
  },
}

export const testi = catalogo(it, {
  de: {
    elimina: {
      titolo: 'Entfernt eine Person aus der Klasse, mit Anwesenheiten, Noten und Beobachtungen',
    },
    foto: {
      imposta: {
        titolo:
          'Das Porträt einer Person: Man wählt es auf dem Datenträger, und eine Kopie wird ' +
          'behalten',
      },
      togli: { titolo: 'Entfernt das Porträt aus den Personalien, und die Datei dazu' },
    },
    importa: {
      titolo: 'Fügt der Klasse die Personen hinzu, die in einer eingefügten Liste erkannt werden',
      testo: 'Die eingefügte Liste, eine Person pro Zeile',
    },
  },
  fr: {
    elimina: {
      titolo: 'Retire une personne de la classe avec présences, notes et observations',
    },
    foto: {
      imposta: {
        titolo: 'Le portrait d’une personne : on le choisit sur le disque et on en garde une copie',
      },
      togli: { titolo: 'Retire le portrait des données personnelles, et le fichier avec' },
    },
    importa: {
      titolo: 'Ajoute à la classe les personnes reconnues dans une liste collée',
      testo: 'La liste collée, une personne par ligne',
    },
  },
  en: {
    elimina: {
      titolo: 'Removes a person from the class with attendance, grades and observations',
    },
    foto: {
      imposta: {
        titolo: 'A person’s portrait: chosen from the disk, and a copy is kept',
      },
      togli: { titolo: 'Removes the portrait from the personal details, and the file with it' },
    },
    importa: {
      titolo: 'Adds to the class the people recognised in a pasted list',
      testo: 'The pasted list, one person per line',
    },
  },
})
