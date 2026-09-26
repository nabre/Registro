// Un archivio vero su una cartella usa e getta: il preambolo delle prove che
// girano sul registro aperto (cartella di lavoro, `userData`, impostazioni,
// bundle dell'API, `Archivio` aperto, anno creato). Quel che ogni prova mette
// nell'anno resta nella prova.
//
// Le cartelle si fanno **prima** di caricare i bundle, che leggono
// `REGISTRO_USERDATA` al caricamento: `cartelleDiProva` va in testa al file,
// l'API si importa dentro `archivioDiProva`.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'

/**
 * Una cartella temporanea con dentro la cartella di lavoro e i dati: imposta
 * `REGISTRO_USERDATA` sulla sua `userData`.
 */
export function cartelleDiProva (prefisso) {
  const radice = mkdtempSync(percorso.join(tmpdir(), prefisso))
  const lavoro = percorso.join(radice, 'lavoro')
  const dati = percorso.join(lavoro, 'registro')
  process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')
  return { radice, lavoro, dati }
}

/**
 * L'API di `dist-tests/api.mjs` con un archivio aperto e un anno creato in
 * `dati/file`.
 *
 * - `impostazioni`: quel che va in `impostazioni.json` (di serie la sola
 *   cartella di lavoro).
 * - `registra: false`: le procedure vere non si registrano, per chi registra
 *   le sue finte.
 * - `confine`: l'ultimo giorno del primo semestre, per `creaAnno`.
 * - `deposito: true`: registra il deposito dell'anno, per chi scrive file.
 * - `pdfAutomatici`: nelle impostazioni del documento; `'mai'` evita fogli
 *   rifatti in sottofondo.
 */
export async function archivioDiProva ({
  lavoro,
  dati,
  dal = '2026-09-01',
  al = '2027-06-30',
  file = '2026-2027.regi',
  impostazioni = { cartellaLavoro: lavoro },
  registra = true,
  confine,
  deposito = false,
  pdfAutomatici,
} = {}) {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify(impostazioni),
  )

  const api = await import('../../dist-tests/api.mjs')
  if (registra) api.registraTutte()

  const { Archivio, Uri, creaAnno } = api
  const archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    confine === undefined ? creaAnno(dal, al) : creaAnno(dal, al, undefined, confine),
    Uri.file(percorso.join(dati, file)),
  )
  if (deposito) api.registraDeposito(archivio.deposito)
  if (pdfAutomatici !== undefined) {
    archivio.modifica((r) => { r.impostazioni.pdfAutomatici = pdfAutomatici }, ['registro'])
  }

  const anno = archivio.registro.anni[0]
  return { api, archivio, anno, annoId: anno.id }
}

/** Per `after`: chiude quel che è aperto — condotti, archivi — e butta la cartella. */
export function smonta (radice, ...aperti) {
  for (const cosa of aperti) cosa?.dispose()
  rmSync(radice, { recursive: true, force: true })
}
