// Il documento dell'anno, `2026-2027.regi`, su un disco vero: che cosa c'è
// dentro dopo un salvataggio, riaprendolo, e quando manca o è d'altro.
//
//   un file che non c'è        è un documento vuoto, e ci si scrive dentro
//   un file di un'altra cosa   si rifiuta, invece di ripartire da vuoto
//   un file più recente        si rifiuta, per non coprire quel che non legge

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, describe, it } from 'node:test'

import { Uri } from '../../dist-tests/environment.mjs'
import {
  ESTENSIONE,
  MANIFESTO,
  Pacchetto,
  STORICO,
  nomeDelPacchetto,
  èPacchetto,
} from '../../dist-tests/package.mjs'
import { leggiZip } from '../../dist-tests/zip.mjs'
import { readFileSync } from 'node:fs'

/** Una cartella tutta per questa prova, buttata alla fine. */
const cartella = mkdtempSync(percorso.join(tmpdir(), 'registro-pacchetto-'))
after(() => rmSync(cartella, { recursive: true, force: true }))

let contatore = 0
/** Un documento mai usato, così ogni prova parte da un file suo. */
function documento (nome = `anno-${(contatore += 1)}`) {
  return Uri.file(percorso.join(cartella, `${nome}${ESTENSIONE}`))
}

describe('il documento dell’anno', () => {
  it('un file che non c’è è un documento vuoto', async () => {
    const pacchetto = await Pacchetto.apri(documento())

    assert.deepEqual(pacchetto.nomi(), [])
    assert.equal(pacchetto.testo('classi.json'), null)
    assert.equal(pacchetto.sporco, false)
  })

  it('scrive, si riapre e ritrova quel che c’era', async () => {
    const file = documento('2026-2027')
    const primo = await Pacchetto.apri(file)
    primo.scrivi('classi.json', '[{"nome":"I MEC A"}]\n')
    assert.equal(primo.sporco, true)
    assert.equal(await primo.salva(), true)

    const secondo = await Pacchetto.apri(file)
    assert.equal(secondo.testo('classi.json'), '[{"nome":"I MEC A"}]\n')
    assert.equal(secondo.nome, '2026-2027')
    assert.equal(secondo.sporco, false)
  })

  it('non tocca il disco se non è cambiato niente', async () => {
    const file = documento()
    const pacchetto = await Pacchetto.apri(file)
    pacchetto.scrivi('classi.json', '[]\n')
    assert.equal(await pacchetto.salva(), true)

    // La stessa voce con lo stesso testo non è una modifica: su una cartella
    // sincronizzata ogni scrittura è una sincronizzazione.
    pacchetto.scrivi('classi.json', '[]\n')
    assert.equal(pacchetto.sporco, false)
    assert.equal(await pacchetto.salva(), false)
  })

  it('conta le riscritture di una voce, e non quelle che non cambiano niente', async () => {
    const file = documento()
    const pacchetto = await Pacchetto.apri(file)
    // Letto dal disco, o mai scritto: nessuna riscrittura da confrontare.
    assert.equal(pacchetto.revisioneDi('esportazioni/DIC4a_Presenze.pdf'), 0)

    pacchetto.deposita('esportazioni/DIC4a_Presenze.pdf', new Uint8Array([1, 2, 3]))
    const prima = pacchetto.revisioneDi('esportazioni/DIC4a_Presenze.pdf')
    assert.ok(prima > 0)

    // Lo stesso rapporto rifatto identico non è una copia nuova: la pagina non si
    // ricarica sotto gli occhi.
    pacchetto.deposita('esportazioni/DIC4a_Presenze.pdf', new Uint8Array([1, 2, 3]))
    assert.equal(pacchetto.revisioneDi('esportazioni/DIC4a_Presenze.pdf'), prima)

    // Stessa misura, contenuto diverso: la misura da sola non basta.
    pacchetto.deposita('esportazioni/DIC4a_Presenze.pdf', new Uint8Array([1, 2, 4]))
    assert.ok(pacchetto.revisioneDi('esportazioni/DIC4a_Presenze.pdf') > prima)
  })

  it('porta con sé il proprio manifesto', async () => {
    const file = documento()
    const pacchetto = await Pacchetto.apri(file)
    pacchetto.scrivi('classi.json', '[]\n')
    await pacchetto.salva()

    const voci = leggiZip(readFileSync(file.fsPath))
    const manifesto = voci.find((v) => v.nome === MANIFESTO)
    assert.ok(manifesto, 'il manifesto deve stare dentro l’archivio')
    const letto = JSON.parse(new TextDecoder().decode(manifesto.dati))
    assert.equal(letto.formato, 'registro-docenti/anno')
    assert.equal(letto.versione, 1)
    // Il manifesto non è fra le voci: è la carta d'identità dell'archivio.
    assert.deepEqual(pacchetto.nomi(), ['classi.json'])
  })

  it('tiene le ultime copie e butta le altre', async () => {
    const pacchetto = await Pacchetto.apri(documento())
    // Le copie portano la marca al minuto: per averne con giorni diversi si
    // scrive direttamente nello storico, datato 2020 perché la copia nuova (di
    // oggi) risulti l'ultima.
    for (let n = 1; n <= 12; n += 1) {
      pacchetto.scrivi(`${STORICO}/classi.2020-01-${String(n).padStart(2, '0')}-08-00.json`, `[${n}]`)
    }
    pacchetto.scrivi('classi.json', '[13]')
    pacchetto.conserva('classi.json', 10)

    const copie = pacchetto.copieDi('classi')
    assert.equal(copie.length, 10)
    // Se ne vanno le più vecchie (i primi tre giorni); l'ultima è quella appena
    // messa da parte.
    assert.equal(copie[0], `${STORICO}/classi.2020-01-04-08-00.json`)
    assert.equal(pacchetto.testo(copie[copie.length - 1]), '[13]')
  })

  it('conserva soltanto quel che c’è già', async () => {
    const pacchetto = await Pacchetto.apri(documento())
    pacchetto.conserva('classi.json', 10)

    assert.deepEqual(pacchetto.copieDi('classi'), [])
  })

  it('rifiuta un file che non è un archivio', async () => {
    const file = documento()
    writeFileSync(file.fsPath, '{"classi":[]}')

    await assert.rejects(() => Pacchetto.apri(file), /non è un documento del registro/)
  })

  it('rifiuta un documento scritto da una versione più recente', async () => {
    const file = documento()
    const pacchetto = await Pacchetto.apri(file)
    pacchetto.scrivi('classi.json', '[]\n')
    await pacchetto.salva()

    // Un manifesto con un formato futuro: un anno salvato dal registro nuovo e
    // aperto da quello vecchio.
    const { scriviZip } = await import('../../dist-tests/zip.mjs')
    const voci = leggiZip(readFileSync(file.fsPath)).map((voce) =>
      voce.nome === MANIFESTO
        ? {
            nome: MANIFESTO,
            dati: new TextEncoder().encode(
              JSON.stringify({ formato: 'registro-docenti/anno', versione: 99 }),
            ),
          }
        : voce,
    )
    writeFileSync(file.fsPath, scriviZip(voci))

    await assert.rejects(() => Pacchetto.apri(file), /versione più recente/)
  })

  it('riconosce i propri file dal nome', () => {
    assert.equal(èPacchetto(`2026-2027${ESTENSIONE}`), true)
    assert.equal(èPacchetto(`.2026-2027${ESTENSIONE}.serratura`), false)
    assert.equal(èPacchetto('classi.json'), false)
    assert.equal(nomeDelPacchetto(Uri.file(`/dati/2026-2027${ESTENSIONE}`)), '2026-2027')
  })

  it('la serratura dice chi lo tiene, e sparisce quando lo si lascia', async () => {
    const file = documento()
    const pacchetto = await Pacchetto.apri(file)
    await pacchetto.prendi()

    // Una serratura di questa stessa macchina è un registro chiuso male: non
    // ferma nessuno.
    assert.equal(await Pacchetto.chiLoTiene(file), null)
    assert.equal(pacchetto.bloccato, true)

    await pacchetto.lascia()
    assert.equal(pacchetto.bloccato, false)
  })

  it('la serratura di un’altra macchina si vede', async () => {
    const file = documento()
    const nome = percorso.basename(file.fsPath)
    writeFileSync(
      percorso.join(cartella, `.${nome}.serratura`),
      JSON.stringify({
        macchina: 'SALA-DOCENTI',
        utente: 'collega',
        processo: 1234,
        aperto: '2026-09-01T08:00:00.000Z',
      }),
    )

    const chi = await Pacchetto.chiLoTiene(file)
    assert.equal(chi?.macchina, 'SALA-DOCENTI')
    assert.equal(chi?.utente, 'collega')
  })
})
