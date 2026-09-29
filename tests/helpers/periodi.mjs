// I casi che ogni lettura raggruppata per periodo (`persone.assenze`,
// `persone.medie`, `persone.scheda`, `corso.presenze`) deve reggere allo stesso
// modo: un semestre inventato, un semestre solo, `dal`/`al` che tagliano i
// semestri, un anno senza semestri. Qui le verifiche comuni; quel che ogni
// procedura aggiunge sulle sue cifre resta nella sua prova.

import assert from 'node:assert/strict'

/** Un id di semestre che nessun anno ha. */
export const SEMESTRE_INVENTATO = 'sem-inventato-0001'

/**
 * Un `semestreId` che non esiste è «non-trovato», non una busta vuota che si
 * leggerebbe «niente da dire»; e il messaggio dice dove prendere l'id buono.
 */
export function eNonTrovato (esito) {
  assert.equal(esito.ok, false, 'un id che non esiste ha risposto come se ci fosse')
  assert.equal(esito.codice, 'non-trovato')
  assert.match(esito.messaggi.join(' '), /anni\.elenco/)
}

/**
 * Con `semestreId` il periodo è uno, e la busta ha i giorni di quel semestre
 * (o quelli dati, se la prova li sa scritti per sé).
 */
export function eUnSemestreSolo (esito, semestre, estremi = {}) {
  const { dal = semestre.inizio, al = semestre.fine } = estremi
  assert.equal(esito.ok, true, JSON.stringify(esito))
  assert.equal(esito.dati.periodi.length, 1)
  assert.equal(esito.dati.periodi[0].semestreId, semestre.id)
  assert.equal(esito.dati.dal, dal)
  assert.equal(esito.dati.al, al)
}

/**
 * `dal` e `al` che tagliano i due semestri: i periodi sono le intersezioni, con
 * gli estremi chiesti e non quelli del semestre (un denominatore più largo del
 * chiesto darebbe una quota più bassa del vero), e la busta li rimanda.
 */
export function sonoIntersecati (esito, dal, al, [primo, secondo]) {
  assert.equal(esito.ok, true, JSON.stringify(esito))
  assert.deepEqual(
    esito.dati.periodi.map((p) => [p.semestreId, p.dal, p.al]),
    [[primo.id, dal, primo.fine], [secondo.id, secondo.inizio, al]],
  )
  assert.equal(esito.dati.dal, dal)
  assert.equal(esito.dati.al, al)
}

/**
 * Senza semestri il raggruppamento non sparisce: un periodo solo, con l'id
 * vuoto e i giorni dell'anno, così chi legge ha una strada sola.
 */
export function eUnPeriodoSenzaSemestri (esito, dal, al) {
  assert.equal(esito.ok, true, JSON.stringify(esito))
  assert.equal(esito.dati.periodi.length, 1)
  const [solo] = esito.dati.periodi
  assert.equal(solo.semestreId, '', 'senza semestri non c’è nessun id da dichiarare')
  assert.equal(solo.numero, 0)
  assert.equal(solo.dal, dal)
  assert.equal(solo.al, al)
  assert.equal(esito.dati.dal, dal)
  assert.equal(esito.dati.al, al)
}

/**
 * Toglie i semestri al primo anno per il tempo di `fare`, poi li rimette. Un
 * anno senza semestri non è valido, ma arriva da un documento vecchio o
 * riparato a mano, e le letture devono reggerlo.
 */
export async function senzaSemestri (archivio, fare) {
  const suoi = archivio.registro.anni[0].semestri
  archivio.modifica((r) => { r.anni[0].semestri = [] }, ['registro'])
  try {
    return await fare()
  } finally {
    archivio.modifica((r) => { r.anni[0].semestri = suoi }, ['registro'])
  }
}
