// Le parole di tutti, dette una volta sola: `parole()` (`src/domain/words.testi.ts`)
// tiene tasti ed etichette comuni («Salva», «Annulla», «Togli», «Dal»…). Su tutti
// i cataloghi si cerca:
//
//   - **una copia**: una voce identica, nelle quattro lingue, a una parola di
//     tutti. Si toglie e si legge da `parole()`;
//
//   - **un omonimo non dichiarato**: stesso italiano, altra traduzione. O è
//     un'altra cosa detta con la stessa parola («Annulla» che disfa un gesto,
//     Rückgängig/Undo, non chiude una finestra, Abbrechen/Cancel) e si scrive
//     qui sotto perché; o è una svista, e si legge da `parole()`.
//
// Le due liste sono le eccezioni, e una voce elencata che non c'è più fa
// fallire la prova.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const { CATALOGHI, LINGUE } = await import('../../dist-tests/i18n.mjs')

const PAROLE = 'src/domain/words.testi.ts'

/**
 * Le copie che restano, una per una, con il perché. La chiave è
 * `file › esportazione.percorso`.
 */
const COPIE_AMMESSE = {
  // I titoli dei comandi sono una tabella intera, uno per `IdComando`: il tipo
  // vuole che non ne manchi nessuno.
  'src/manifest.testi.ts › testi.comandi.registroDocenti.oggi': 'titolo di comando, nella tabella dei comandi',
}

/**
 * Le voci della guida fatte a elenco «termine — spiegazione»: il termine è la
 * parola che la pagina spiega, dentro la sua voce di glossario, e sta con la
 * sua spiegazione. Non è un tasto disegnato: non lo si stacca.
 */
const TERMINE_DELLA_GUIDA = /^src\/ui\/views\/help\/.* › testi\.[\w.]*\.voci\.\d+\.termine$/

/**
 * Gli omonimi: stesso italiano di una parola di tutti, un'altra cosa. Ognuno
 * con quel che vuol dire davvero.
 */
const OMONIMI = {
  'shell/windows/menu.testi.ts › testi.annullaGesto': 'disfa l’ultimo gesto (Rückgängig, Undo)',
  'src/ui/commands.testi.ts › testi.annulla': 'disfa l’ultimo gesto (Rückgängig, Undo)',
  'shell/windows/menu.testi.ts › testi.modifica': 'il menu Modifica (Édition)',
  'src/ui/commands.testi.ts › testi.gruppi.modifica': 'il gruppo di comandi Modifica, come il menu (Édition)',
  'shell/windows/menu.testi.ts › testi.altro': 'il menu delle altre voci (Weitere, More)',
  'src/domain/lexicon.testi.ts › lessico.tipiAttivita.altro': 'un tipo di attività: «un altro tipo» (Anderes)',
  'src/domain/lexicon.testi.ts › lessico.tipiConsegna.altro': 'un tipo di consegna: «un altro tipo» (Anderes)',
  'src/domain/lexicon.testi.ts › lessico.categorieDocumento.altro': 'una categoria di documento (Anderes)',
  'src/domain/lexicon.testi.ts › lessico.ora.breve': 'l’ora di lezione, non l’ora del giorno (Std., Leçon)',
  'src/ui/views/help/lesson.testi.ts › testi.piani.scritte.ora': 'l’ora di lezione, non l’ora del giorno (Stunde)',
  'src/api/procedures/aggiornamenti/aggiornamenti.testi.ts › testi.stato.presentazione.stato':
    'a che punto è l’aggiornamento (Stand)',
  'src/api/procedures/ore/ore.testi.ts › testi.appello.leggi.presentazione.stato':
    'lo stato dell’appello di una persona (fr «Statut»)',
  'src/api/procedures/ore/ore.testi.ts › testi.elenco.presentazione.stato':
    'lo stato dell’ora: svolta, da fare, saltata (fr «Statut»)',
  'src/api/procedures/ore/ore.testi.ts › testi.leggi.presentazione.stato':
    'lo stato dell’ora: svolta, da fare, saltata (fr «Statut»)',
  'src/data/exports.testi.ts › testi.stato': 'lo stato dell’ora nel riassunto della lezione (fr «Statut»)',
  'src/ui/forms/class.testi.ts › testi.persona.nomeAzienda': 'il nome di un’azienda, non il nome di battesimo',
  'src/ui/views/student/registry.testi.ts › testi.nomeAzienda': 'il nome di un’azienda, non il nome di battesimo',
  'src/ui/forms/subject.testi.ts › testi.nome': 'il nome di una materia, non il nome di battesimo',
  'src/ui/views/classes.testi.ts › testi.nomeClasse': 'il nome di una classe, non il nome di battesimo',
  'src/ui/forms/classTeacher.testi.ts › testi.recapito.indirizzo': 'l’indirizzo e-mail, non quello di casa',
  'src/ui/views/help/behind.testi.ts › testi.salvataggio.scritte.modifica': 'una modifica, il nome (Änderung)',
  'src/ui/views/help/behind.testi.ts › testi.salvataggio.scritte.copia': 'una copia, il nome (Kopie)',
  'src/ui/views/help/lesson.testi.ts › testi.piani.scritte.copia': 'una copia, il nome (Kopie)',
  'src/ui/views/todo.testi.ts › testi.fatto': 'un impegno sbrigato (Erledigt), non «ho finito»',
}

/** Ogni foglia stringa di un valore, con il suo percorso. */
function foglie (valore, percorso = [], raccolte = []) {
  if (typeof valore === 'string') raccolte.push({ percorso, testo: valore })
  else if (Array.isArray(valore)) valore.forEach((v, i) => foglie(v, [...percorso, i], raccolte))
  else if (valore && typeof valore === 'object') {
    for (const [chiave, dentro] of Object.entries(valore)) {
      foglie(dentro, [...percorso, chiave], raccolte)
    }
  }
  return raccolte
}

const prendi = (oggetto, percorso) => percorso.reduce((dentro, chiave) => dentro?.[chiave], oggetto)

/** Ogni catalogo tranne `parole()`, con il suo nome. */
function altriCataloghi () {
  const trovati = []
  for (const { file, esporta } of CATALOGHI) {
    if (file === PAROLE) continue
    for (const [nome, valore] of Object.entries(esporta)) {
      if (typeof valore === 'function' && typeof valore.in === 'function') trovati.push({ file, nome, catalogo: valore })
    }
  }
  return trovati
}

const parole = CATALOGHI.find((c) => c.file === PAROLE).esporta.parole
const italiano = parole.in('it')
/** Una parola di tutti, come impronta: le quattro lingue di fila. */
const impronta = (catalogo, percorso) => LINGUE.map((l) => prendi(catalogo.in(l), percorso)).join('\u0000')
const perImpronta = new Map(
  Object.keys(italiano).map((chiave) => [impronta(parole, [chiave]), chiave]),
)
const perItaliano = new Map(Object.entries(italiano).map(([chiave, testo]) => [testo, chiave]))

/** Tutte le voci degli altri cataloghi che somigliano a una parola di tutti. */
function somiglianze () {
  const copie = []
  const omonimi = []
  for (const { file, nome, catalogo } of altriCataloghi()) {
    for (const { percorso, testo } of foglie(catalogo.in('it'))) {
      const dove = `${file} › ${[nome, ...percorso].join('.')}`
      const uguale = perImpronta.get(impronta(catalogo, percorso))
      if (uguale) copie.push({ dove, chiave: uguale })
      else if (perItaliano.has(testo)) omonimi.push({ dove, chiave: perItaliano.get(testo) })
    }
  }
  return { copie, omonimi }
}

describe('le parole di tutti', () => {
  const { copie, omonimi } = somiglianze()

  it('parole() non ha due voci con lo stesso italiano', () => {
    const viste = new Map()
    const doppie = []
    for (const [chiave, testo] of Object.entries(italiano)) {
      if (viste.has(testo)) doppie.push(`${viste.get(testo)} e ${chiave}: «${testo}»`)
      viste.set(testo, chiave)
    }
    assert.deepEqual(doppie, [])
  })

  it('nessun catalogo ricopia una parola di tutti: la legge da parole()', () => {
    const fuori = copie
      .filter(({ dove }) => !(dove in COPIE_AMMESSE) && !TERMINE_DELLA_GUIDA.test(dove))
      .map(({ dove, chiave }) => `${dove} → parole().${chiave}`)
    assert.deepEqual(fuori, [], 'Voci da togliere dal catalogo e da leggere con parole().')
  })

  it('ogni omonimo di una parola di tutti è dichiarato, con il perché', () => {
    const nuovi = omonimi
      .filter(({ dove }) => !(dove in OMONIMI))
      .map(({ dove, chiave }) => `${dove} (italiano di parole().${chiave}, altra traduzione)`)
    assert.deepEqual(
      nuovi,
      [],
      'Stesso italiano di una parola di tutti, altra traduzione: se è la stessa cosa, si legge da ' +
        'parole(); se è un’altra, la si scrive in OMONIMI con il perché.',
    )
  })

  it('le eccezioni elencate esistono ancora', () => {
    const copieViste = new Set(copie.map((c) => c.dove))
    const omonimiVisti = new Set(omonimi.map((o) => o.dove))
    const vecchie = [
      ...Object.keys(COPIE_AMMESSE).filter((dove) => !copieViste.has(dove)).map((d) => `COPIE_AMMESSE: ${d}`),
      ...Object.keys(OMONIMI).filter((dove) => !omonimiVisti.has(dove)).map((d) => `OMONIMI: ${d}`),
    ]
    assert.deepEqual(vecchie, [], 'Eccezioni che non servono più: toglierle dalla lista.')
  })

  it('ogni eccezione dice perché', () => {
    for (const [dove, perche] of Object.entries({ ...COPIE_AMMESSE, ...OMONIMI })) {
      assert.ok(perche.trim().length > 0, dove)
    }
  })
})
