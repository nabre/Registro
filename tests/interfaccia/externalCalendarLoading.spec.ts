// Il calendario ICS si legge fuori dal disegno, su Chromium: sull'app vera,
// guardando solo i messaggi al ponte.
//
//   1. entrando nel calendario parte una lettura sola (`calendario.eventi`),
//      anche se la pagina si ridisegna più volte prima della risposta, e
//      niente si scrive finché gli eventi non ci sono;
//   2. arrivati gli eventi, le ore collegate che il calendario sposta si
//      allineano in una scrittura sola (`calendario.applica`), e un ridisegno
//      con gli stessi dati non ne fa partire un'altra;
//   3. fuori dal calendario non si legge e non si allinea; una copia nuova del
//   calendario, tornati lì, si rilegge e si allinea.
//
// Le letture restano senza risposta finché la prova non la manda, come
// arrivasse dall'host (`rispondi`).

import { expect, test, type Page } from '@playwright/test'

import { FOTOGRAMMA, FRAME, attendi, pannello, valuta } from './banco'

// Due ore di Matematica di DIC4a, che il calendario sposta di un quarto d'ora,
// e la regola che lega gli eventi «MAT» al corso. `copiatoIl` è la copia del
// calendario: cambiandola, la lettura è un'altra.
const PREPARA = `(copiatoIl) => {
  const r = prova.stato.registro
  const base = r.lezioni[0]
  const ora = (data) => ({ ...base, id: 'ics-' + data + '-' + copiatoIl, data, stato: 'pianificata',
    slot: [{ ...base.slot[0], inizio: '08:20', fine: '09:05', tipo: 'lezione' }] })
  const impostazioni = { ...r.impostazioni, minutiUd: 45, calendario: {
    calendari: [{ id: 'c1', nome: 'Scuola', origine: 'https://esempio.ch/scuola.ics', copiatoIl }],
    regole: [{ id: 'r1', testo: 'MAT', corsoId: base.corsoId }] } }
  return { ...r, impostazioni,
    lezioni: [...r.lezioni.filter((l) => !l.id.startsWith('ics-')), ora('2026-09-21'), ora('2026-09-22')] }
}`

const EVENTI = [
  { chiave: 'c1:2026-09-21T08:35', data: '2026-09-21', inizio: '08:35', fine: '09:20', titolo: 'MAT', luogo: 'A12', annullato: false },
  { chiave: 'c1:2026-09-22T08:35', data: '2026-09-22', inizio: '08:35', fine: '09:20', titolo: 'MAT', luogo: 'A12', annullato: false },
]

/** Le letture degli eventi partite finora, dall'inizio della pagina. */
const LETTURE = "() => tutte.filter(m => m.procedura === 'calendario.eventi').length"
/** Le scritture d'allineamento partite finora. */
const ALLINEAMENTI = "() => tutte.filter(m => m.azione?.tipo === 'calendario.applica').map(m => m.azione)"

/** Risponde alle letture degli eventi ancora aperte, come l'host. */
async function rispondi (page: Page): Promise<void> {
  await valuta(page, `(eventi) => {
    for (const m of tutte.filter(r => r.procedura === 'calendario.eventi' && !r.risposta)) {
      m.risposta = true
      window.dispatchEvent(new MessageEvent('message', { data: {
        tipo: 'riscontro', id: m.id, ok: true, dati: { eventi, guasti: [] } } }))
    }
  }`, EVENTI)
}

async function ridisegnaPiuVolte (page: Page): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    await valuta(page, 'prova.ridisegna()')
    await valuta(page, '() => prova.aggiorna({ registro: prova.stato.registro })')
  }
  await valuta(page, FRAME)
}

test('il calendario ICS: una lettura, una scrittura, e niente fuori dal calendario', async ({ browser }) => {
  // Il ponte di serie risponde «fatto» alle azioni e lascia le domande aperte:
  // le letture degli eventi le chiude `rispondi`.
  const { page, errori } = await pannello(browser)
  await valuta(page, `(copiatoIl) => prova.aggiorna({ registro: (${PREPARA})(copiatoIl) })`, '2026-09-01T08:00')
  await valuta(page, FOTOGRAMMA)
  // Fuori dal calendario non si legge niente.
  expect(await valuta(page, LETTURE)).toBe(0)

  // 1. Dentro il calendario: una lettura sola, anche ridisegnando prima della risposta.
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p => p.id === 'pagina.calendario'))")
  await valuta(page, "prova.aggiorna({ modoCalendario: 'settimana', data: '2026-09-21', editorCalendario: true, mostraCalendarioEsterno: true })")
  await attendi(page, `(${LETTURE})() === 1`)
  await ridisegnaPiuVolte(page)
  expect(await valuta(page, LETTURE)).toBe(1)
  expect(await valuta(page, ALLINEAMENTI), 'scritto prima di avere gli eventi').toEqual([])

  // 2. Arrivati gli eventi: una scrittura per le due ore, e nient'altro.
  await rispondi(page)
  await attendi(page, `(${ALLINEAMENTI})().length === 1`)
  const allinea = (await valuta<Array<{ allinea: unknown[], automatico?: boolean }>>(page, ALLINEAMENTI))[0]
  expect(allinea.allinea).toHaveLength(2)
  expect(allinea.automatico).toBe(true)
  await ridisegnaPiuVolte(page)
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, LETTURE), 'la chiave pronta si è riletta').toBe(1)
  expect(await valuta(page, ALLINEAMENTI)).toHaveLength(1)

  // 3. Una copia nuova del calendario mentre si guarda altrove: niente letture né scritture.
  await valuta(page, "prova.vai({ pagina: 'pagina.oggi' })")
  await valuta(page, `(copiatoIl) => prova.aggiorna({ registro: (${PREPARA})(copiatoIl) })`, '2026-09-02T08:00')
  await valuta(page, FRAME)
  expect(await valuta(page, LETTURE)).toBe(1)
  expect(await valuta(page, ALLINEAMENTI)).toHaveLength(1)

  // Tornati al calendario, la copia nuova si rilegge e le sue ore si allineano.
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p => p.id === 'pagina.calendario'))")
  await valuta(page, "prova.aggiorna({ modoCalendario: 'settimana', data: '2026-09-21' })")
  await attendi(page, `(${LETTURE})() === 2`)
  await rispondi(page)
  await attendi(page, `(${ALLINEAMENTI})().length === 2`)
  expect((await valuta<Array<{ allinea: unknown[] }>>(page, ALLINEAMENTI))[1].allinea).toHaveLength(2)

  expect(errori).toEqual([])
  await page.close()
})
