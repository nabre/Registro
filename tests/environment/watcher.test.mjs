// L'osservatore dei file e la difesa contro l'eco. `archive.ts` scarta gli
// eventi delle proprie scritture con una mappa chiavata su `uri.toString()` e
// la finestra `FINESTRA_ECO_MS`: se l'`Uri` dell'osservatore desse un'altra
// stringa, il registro si ricaricherebbe a ogni salvataggio. Si rifà quel che
// fa `archive.ts` (pattern con le graffe, `.tmp` e rinomina, stessa finestra)
// e si contano le ricariche: zero.

import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, beforeEach, describe, it } from 'node:test'

const { ModelloRelativo, Uri, aEspressione, file, senzaGraffe, osserva: creaOsservatore } =
  await import('../../dist-tests/environment.mjs')

/** Il pattern di `archive.ts`, alla lettera. Vedi `paths.ts`: INDICE e DATI. */
const PATTERN_ARCHIVIO = '{registro.json,*/dati/*.json}'

/** La finestra di tolleranza di `archive.ts`, alla lettera. */
const FINESTRA_ECO_MS = 1500

const RADICE = percorso.join(tmpdir(), 'registro-prove-osservatore')
const ANNO = '2026-2027'

/** Aspetta che una condizione si avveri, o rinuncia: gli eventi dei file non sono immediati. */
async function finoA (condizione, entro = 5000) {
  const scadenza = Date.now() + entro
  while (Date.now() < scadenza) {
    if (condizione()) return true
    await new Promise((risolvi) => setTimeout(risolvi, 25))
  }
  return condizione()
}

/** Un osservatore già avviato, con gli eventi raccolti per tipo. */
async function osserva (base, pattern) {
  const osservatore = creaOsservatore(new ModelloRelativo(base, pattern))
  const eventi = { creati: [], cambiati: [], cancellati: [] }
  osservatore.onDidCreate((uri) => eventi.creati.push(uri))
  osservatore.onDidChange((uri) => eventi.cambiati.push(uri))
  osservatore.onDidDelete((uri) => eventi.cancellati.push(uri))
  await osservatore.pronto
  return { osservatore, eventi }
}

/** Tutti gli uri annunciati, in qualunque modo. */
function tutti (eventi) {
  return [...eventi.creati, ...eventi.cambiati, ...eventi.cancellati]
}

before(() => {
  rmSync(RADICE, { recursive: true, force: true })
  mkdirSync(percorso.join(RADICE, ANNO, 'dati'), { recursive: true })
  mkdirSync(percorso.join(RADICE, ANNO, 'documentazione', '1A'), { recursive: true })
  mkdirSync(percorso.join(RADICE, ANNO, '.storico'), { recursive: true })
  mkdirSync(percorso.join(RADICE, ANNO, 'in-arrivo', 'sotto'), { recursive: true })
})

after(() => {
  rmSync(RADICE, { recursive: true, force: true })
})

describe('la traduzione del pattern', () => {
  it('scioglie le graffe in due pattern, che è quel che chokidar vuole', () => {
    assert.deepEqual(senzaGraffe(PATTERN_ARCHIVIO), ['registro.json', '*/dati/*.json'])
  })

  it('lascia stare un pattern che di graffe non ne ha', () => {
    assert.deepEqual(senzaGraffe('**/*.pdf'), ['**/*.pdf'])
  })

  it('`*` si ferma alla barra, `**` no', () => {
    const uno = aEspressione('*/dati/*.json', false)
    assert.ok(uno.test('2026-2027/dati/lezioni.json'))
    assert.ok(!uno.test('2026-2027/documentazione/1A/dati/x.json'))
    assert.ok(!uno.test('2026-2027/dati/sotto/lezioni.json'))

    const tanti = aEspressione('**/*.pdf', false)
    assert.ok(tanti.test('foglio.pdf'), 'i file appena dentro la cassetta ci sono')
    assert.ok(tanti.test('marzo/prima/foglio.pdf'))
    assert.ok(!tanti.test('foglio.txt'))
  })

  it('il punto è un punto e non «un carattere qualunque»', () => {
    const espressione = aEspressione('registro.json', false)
    assert.ok(espressione.test('registro.json'))
    assert.ok(!espressione.test('registroXjson'))
  })
})

describe('quel che l’osservatore annuncia', () => {
  let osservatore
  let eventi

  beforeEach(async () => {
    osservatore?.dispose()
    const avviato = await osserva(Uri.file(RADICE), PATTERN_ARCHIVIO)
    osservatore = avviato.osservatore
    eventi = avviato.eventi
  })

  after(() => osservatore?.dispose())

  it('annuncia i JSON dell’anno e l’indice in radice', async () => {
    writeFileSync(percorso.join(RADICE, ANNO, 'dati', 'lezioni.json'), '[]')
    writeFileSync(percorso.join(RADICE, 'registro.json'), '{}')

    await finoA(() => eventi.creati.length >= 2)
    const nomi = eventi.creati.map((uri) => uri.path.split('/').pop()).sort()
    assert.deepEqual(nomi, ['lezioni.json', 'registro.json'])
  })

  it('tace su quel che non è suo: il temporaneo, lo storico, la documentazione', async () => {
    // Il `.tmp` di `scriviJson` non conta: prima della rinomina il file non è
    // leggibile.
    writeFileSync(percorso.join(RADICE, ANNO, 'dati', 'lezioni.json.tmp'), '[]')
    writeFileSync(percorso.join(RADICE, ANNO, '.storico', 'lezioni.2026-01-01.json'), '[]')
    writeFileSync(percorso.join(RADICE, ANNO, 'documentazione', '1A', 'nota.json'), '{}')
    // Uno dei nostri, scritto per ultimo: quando arriva lui, gli altri sono già
    // arrivati.
    writeFileSync(percorso.join(RADICE, ANNO, 'dati', 'allievi.json'), '[]')

    await finoA(() => eventi.creati.length >= 1)
    const nomi = tutti(eventi).map((uri) => uri.path.split('/').pop())
    assert.deepEqual(nomi, ['allievi.json'], nomi.join(' · '))
  })

  it('dice le cancellazioni', async () => {
    const file = percorso.join(RADICE, ANNO, 'dati', 'piani.json')
    writeFileSync(file, '[]')
    await finoA(() => eventi.creati.length >= 1)
    rmSync(file)
    assert.ok(await finoA(() => eventi.cancellati.length >= 1), 'la cancellazione non è arrivata')
  })
})

describe('la cassetta dei PDF', () => {
  it('li prende a qualunque profondità, e solo i PDF', async () => {
    const cassetta = Uri.file(percorso.join(RADICE, ANNO, 'in-arrivo'))
    const { osservatore, eventi } = await osserva(cassetta, '**/*.pdf')
    try {
      writeFileSync(percorso.join(RADICE, ANNO, 'in-arrivo', 'appunti.txt'), 'niente')
      writeFileSync(percorso.join(RADICE, ANNO, 'in-arrivo', 'sotto', 'prova.pdf'), '%PDF-1.4')
      writeFileSync(percorso.join(RADICE, ANNO, 'in-arrivo', 'foglio.pdf'), '%PDF-1.4')

      await finoA(() => eventi.creati.length >= 2)
      const nomi = tutti(eventi).map((uri) => uri.path.split('/').pop()).sort()
      assert.deepEqual(nomi, ['foglio.pdf', 'prova.pdf'], nomi.join(' · '))
    } finally {
      osservatore.dispose()
    }
  })
})

describe('la difesa contro l’eco delle proprie scritture', () => {
  /**
   * `archive.ts`, riga per riga: la mappa delle proprie scritture, la
   * tolleranza, e la ricarica che parte solo per quel che viene da fuori.
   */
  function comeArchivio (osservatore) {
    const ultimeScritture = new Map()
    const conteggio = { ricariche: 0 }
    const ricarica = (uri) => {
      const quando = ultimeScritture.get(uri.toString()) ?? 0
      if (Date.now() - quando < FINESTRA_ECO_MS) return
      conteggio.ricariche += 1
    }
    osservatore.onDidChange(ricarica)
    osservatore.onDidCreate(ricarica)
    osservatore.onDidDelete(ricarica)
    return { ultimeScritture, conteggio }
  }

  /** `scriviJson()`: si segna la scrittura, si scrive il `.tmp`, si rinomina, ci si risegna. */
  async function scriviJson (ultimeScritture, destinazione, testo) {
    const temporaneo = destinazione.with({ path: `${destinazione.path}.tmp` })
    ultimeScritture.set(destinazione.toString(), Date.now())
    await file.writeFile(temporaneo, new TextEncoder().encode(testo))
    await file.rename(temporaneo, destinazione, { overwrite: true })
    ultimeScritture.set(destinazione.toString(), Date.now())
  }

  it('l’uri annunciato è la stessa stringa di quello con cui si è scritto', async () => {
    const base = Uri.file(RADICE)
    const { osservatore, eventi } = await osserva(base, PATTERN_ARCHIVIO)
    try {
      // Composto come in `paths.ts`, un segmento alla volta: la via di *scrittura*.
      const destinazione = Uri.joinPath(base, ANNO, 'dati', 'valutazioni.json')
      await file.writeFile(destinazione, new TextEncoder().encode('[]'))

      assert.ok(await finoA(() => tutti(eventi).length >= 1), 'nessun evento')
      // E questa è la via di *lettura*: il percorso nativo che consegna chokidar.
      const annunciato = tutti(eventi)[0]
      assert.equal(annunciato.toString(), destinazione.toString())
      assert.equal(annunciato.fsPath, destinazione.fsPath)
    } finally {
      osservatore.dispose()
    }
  })

  it('salvare cinque collezioni non provoca nessuna ricarica', async () => {
    const base = Uri.file(RADICE)
    const { osservatore, eventi } = await osserva(base, PATTERN_ARCHIVIO)
    try {
      const { ultimeScritture, conteggio } = comeArchivio(osservatore)
      const collezioni = ['lezioni', 'allievi', 'classi', 'corsi', 'piani']
      for (const collezione of collezioni) {
        await scriviJson(
          ultimeScritture,
          Uri.joinPath(base, ANNO, 'dati', `${collezione}.json`),
          `{"collezione":"${collezione}"}\n`,
        )
      }

      // Gli eventi arrivano davvero: una prova senza eventi non prova niente.
      assert.ok(
        await finoA(() => tutti(eventi).length >= collezioni.length),
        `arrivati ${tutti(eventi).length} eventi su ${collezioni.length}`,
      )
      assert.equal(conteggio.ricariche, 0, 'il registro si sarebbe ricaricato da solo')
    } finally {
      osservatore.dispose()
    }
  })

  it('anche riscrivendo lo stesso file più volte di fila', async () => {
    const base = Uri.file(RADICE)
    const { osservatore, eventi } = await osserva(base, PATTERN_ARCHIVIO)
    try {
      const { ultimeScritture, conteggio } = comeArchivio(osservatore)
      const destinazione = Uri.joinPath(base, ANNO, 'dati', 'appello.json')
      // È l'appello: una presenza per allievo, tutte nello stesso mezzo minuto.
      for (let giro = 0; giro < 6; giro += 1) {
        await scriviJson(ultimeScritture, destinazione, `{"giro":${giro}}\n`)
      }

      assert.ok(await finoA(() => tutti(eventi).length >= 1), 'nessun evento')
      // Un attimo perché arrivi l'ultimo: la finestra di tolleranza li copre tutti.
      await new Promise((risolvi) => setTimeout(risolvi, 300))
      assert.equal(conteggio.ricariche, 0, 'il registro si sarebbe ricaricato da solo')
    } finally {
      osservatore.dispose()
    }
  })

  it('ma una modifica arrivata da fuori la ricarica c’è', async () => {
    const base = Uri.file(RADICE)
    const { osservatore } = await osserva(base, PATTERN_ARCHIVIO)
    try {
      const { conteggio } = comeArchivio(osservatore)
      // Un file cambiato da fuori (sceso dalla sincronizzazione): qui la ricarica
      // deve partire.
      writeFileSync(percorso.join(RADICE, ANNO, 'dati', 'dafuori.json'), '{"da":"fuori"}')
      assert.ok(await finoA(() => conteggio.ricariche >= 1), 'la modifica da fuori non si è vista')
    } finally {
      osservatore.dispose()
    }
  })

  it('la lettera di unità non cambia la chiave, comunque sia scritta', () => {
    // Le maiuscole del disco e il verso delle barre non cambiano la stringa: lo
    // decide il costruttore dell'`Uri`.
    assert.equal(Uri.file('c:\\dati\\2026-2027\\dati\\x.json').toString(), Uri.file('C:/dati/2026-2027/dati/x.json').toString())
  })
})
