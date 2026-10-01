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
  DATI,
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

/** Byte che non si comprimono, sempre gli stessi: un PDF o una foto. */
function casuali (quanti) {
  const byte = new Uint8Array(quanti)
  let stato = 0x9e3779b9
  for (let i = 0; i < quanti; i += 1) {
    stato ^= stato << 13
    stato ^= stato >>> 17
    stato ^= stato << 5
    byte[i] = stato & 0xff
  }
  return byte
}

/** La firma della testa locale di una voce ZIP. */
const TESTA_LOCALE = Buffer.from([0x50, 0x4b, 0x03, 0x04])

/**
 * I nomi di tutte le teste locali nel file, anche di quelle che l'indice non
 * nomina più: lo spazio morto lasciato accodando.
 */
function nomiNeiByte (byte) {
  const nomi = []
  for (let i = byte.indexOf(TESTA_LOCALE); i >= 0; i = byte.indexOf(TESTA_LOCALE, i + 4)) {
    const lungo = byte.readUInt16LE(i + 26)
    nomi.push(byte.subarray(i + 30, i + 30 + lungo).toString('utf8'))
  }
  return nomi.sort()
}

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
    assert.equal(letto.versione, 2)
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

  it('un contenitore 1, con le collezioni in radice, si apre con le collezioni sotto data/', async () => {
    const file = documento()
    const { scriviZip } = await import('../../dist-tests/zip.mjs')
    const testo = (t) => new TextEncoder().encode(t)
    writeFileSync(file.fsPath, scriviZip([
      { nome: MANIFESTO, dati: testo(JSON.stringify({ formato: 'registro-docenti/anno', versione: 1 })) },
      { nome: 'registro.json', dati: testo('{"versione":3}') },
      { nome: 'classi.json', dati: testo('[{"nome":"I MEC A"}]') },
      { nome: 'classi.rotto-2026-01-01.json', dati: testo('[{') },
      { nome: `${STORICO}/classi.2026-01-01-08-00.json`, dati: testo('[]') },
      { nome: 'archivio/note.json', dati: testo('{}') },
      // Grosso e incomprimibile: la modifica sotto è poca cosa, e accodare
      // converrebbe. Solo il contenitore vecchio impone di rifare.
      { nome: 'archivio/x.pdf', dati: casuali(400 * 1024) },
    ]))
    const originale = readFileSync(file.fsPath)

    const pacchetto = await Pacchetto.apri(file)
    assert.equal(pacchetto.contenitoreLetto, 1)
    assert.deepEqual(pacchetto.nomi(), [
      `${STORICO}/classi.2026-01-01-08-00.json`,
      'archivio/note.json',
      'archivio/x.pdf',
      `${DATI}/classi.json`,
      `${DATI}/classi.rotto-2026-01-01.json`,
      `${DATI}/registro.json`,
    ])
    assert.equal(pacchetto.testo(`${DATI}/classi.json`), '[{"nome":"I MEC A"}]')
    // Aprire non scrive: il documento si rifà alla prima modifica.
    assert.equal(pacchetto.sporco, false)
    assert.equal(await pacchetto.salva(), false)
    assert.deepEqual(readFileSync(file.fsPath), originale)

    // La copia di prima va nello storico di sempre, accanto a quelle vecchie.
    pacchetto.conserva(`${DATI}/classi.json`, 10)
    pacchetto.scrivi(`${DATI}/classi.json`, '[]')
    assert.equal(pacchetto.copieDi('classi').length, 2)
    await pacchetto.salva()

    // Riscritto intero: nessuna voce in radice oltre al manifesto, e nessuno
    // spazio morto lasciato dalle voci di prima.
    const byte = readFileSync(file.fsPath)
    const voci = leggiZip(byte)
    assert.deepEqual(voci.filter((v) => !v.nome.includes('/')).map((v) => v.nome), [MANIFESTO])
    assert.equal(pacchetto.sprecato, 0)
    // Nemmeno fra i byte morti: accodando, le voci in radice resterebbero lì.
    assert.deepEqual(nomiNeiByte(byte).filter((nome) => !nome.includes('/')), [MANIFESTO])
    assert.ok(byte.length < originale.length + 4096, `${byte.length} contro ${originale.length}`)
    const manifesto = voci.find((v) => v.nome === MANIFESTO)
    assert.equal(JSON.parse(new TextDecoder().decode(manifesto.dati)).versione, 2)

    const riaperto = await Pacchetto.apri(file)
    assert.equal(riaperto.testo(`${DATI}/classi.json`), '[]')
    assert.equal(riaperto.testo(`${DATI}/registro.json`), '{"versione":3}')
    assert.equal(riaperto.testo('archivio/note.json'), '{}')
  })

  it('senza manifesto vale come contenitore 1: le collezioni vanno sotto data/', async () => {
    const file = documento()
    const { scriviZip } = await import('../../dist-tests/zip.mjs')
    writeFileSync(file.fsPath, scriviZip([
      { nome: 'classi.json', dati: new TextEncoder().encode('[1]') },
    ]))

    const pacchetto = await Pacchetto.apri(file)
    assert.equal(pacchetto.contenitoreLetto, 1)
    assert.deepEqual(pacchetto.nomi(), [`${DATI}/classi.json`])
    assert.equal(pacchetto.testo(`${DATI}/classi.json`), '[1]')
  })

  it('un manifesto illeggibile vale come assente: le collezioni si leggono lo stesso, sotto data/', async () => {
    const file = documento()
    const { scriviZip } = await import('../../dist-tests/zip.mjs')
    const testo = (t) => new TextEncoder().encode(t)
    writeFileSync(file.fsPath, scriviZip([
      { nome: MANIFESTO, dati: testo('{"formato": rotto') },
      { nome: 'classi.json', dati: testo('[1]') },
    ]))

    const pacchetto = await Pacchetto.apri(file)
    assert.equal(pacchetto.contenitoreLetto, 1)
    assert.deepEqual(pacchetto.nomi(), [`${DATI}/classi.json`])
    assert.equal(pacchetto.testo(`${DATI}/classi.json`), '[1]')
  })

  it('una voce sia in radice sia in data/: vale quella in data/, l’altra si mette da parte', async () => {
    const file = documento()
    const { scriviZip } = await import('../../dist-tests/zip.mjs')
    const testo = (t) => new TextEncoder().encode(t)
    writeFileSync(file.fsPath, scriviZip([
      { nome: MANIFESTO, dati: testo(JSON.stringify({ formato: 'registro-docenti/anno', versione: 1 })) },
      { nome: 'classi.json', dati: testo('["radice"]') },
      { nome: `${DATI}/classi.json`, dati: testo('["data"]') },
    ]))

    const pacchetto = await Pacchetto.apri(file)
    assert.equal(pacchetto.testo(`${DATI}/classi.json`), '["data"]')
    const messe = pacchetto.nomi().filter((nome) => nome.startsWith(`${DATI}/classi.rotto-`))
    assert.equal(messe.length, 1, pacchetto.nomi().join(', '))
    assert.match(messe[0], /\.json$/)
    assert.equal(pacchetto.testo(messe[0]), '["radice"]')
    assert.deepEqual(pacchetto.nomi().filter((nome) => !nome.includes('/')), [])
  })

  it('una voce rovinata di un contenitore 1 si sposta sotto data/ senza aprirla', async () => {
    const file = documento()
    const { scriviZip } = await import('../../dist-tests/zip.mjs')
    const testo = (t) => new TextEncoder().encode(t)
    const byte = scriviZip([
      { nome: MANIFESTO, dati: testo(JSON.stringify({ formato: 'registro-docenti/anno', versione: 1 })) },
      { nome: 'classi.json', dati: testo('[{"nome":"I MEC A"}]') },
      { nome: 'registro.json', dati: testo('{"versione":3}') },
    ])
    // Il CRC di `classi.json` nell'indice, guasto come da un settore rovinato.
    const dove = byte.lastIndexOf(Buffer.from('classi.json')) - 46
    assert.equal(byte.readUInt32LE(dove), 0x02014b50)
    byte.writeUInt32LE((byte.readUInt32LE(dove + 16) ^ 0xffffffff) >>> 0, dove + 16)
    writeFileSync(file.fsPath, byte)

    const pacchetto = await Pacchetto.apri(file)
    assert.deepEqual(pacchetto.nomi(), [`${DATI}/classi.json`, `${DATI}/registro.json`])
    assert.throws(() => pacchetto.testo(`${DATI}/classi.json`), /controllo non torna/)

    // Riscritto intero, il blocco resta com'era: rotto, ma non perso.
    pacchetto.scrivi(`${DATI}/registro.json`, '{"versione":4}')
    await pacchetto.salva()
    const riaperto = await Pacchetto.apri(file)
    assert.equal(riaperto.contenitoreLetto, 2)
    assert.throws(() => riaperto.testo(`${DATI}/classi.json`), /controllo non torna/)
  })

  it('un contenitore 2 non sposta niente: quel che sta in radice resta lì', async () => {
    const file = documento()
    const primo = await Pacchetto.apri(file)
    primo.scrivi(`${DATI}/classi.json`, '[1]')
    primo.scrivi('altro.json', '[2]')
    await primo.salva()

    const secondo = await Pacchetto.apri(file)
    assert.deepEqual(secondo.nomi(), ['altro.json', `${DATI}/classi.json`])
    assert.equal(secondo.testo(`${DATI}/classi.json`), '[1]')
  })

  it('riconosce i propri file dal nome', () => {
    assert.equal(èPacchetto(`2026-2027${ESTENSIONE}`), true)
    assert.equal(èPacchetto(`.2026-2027${ESTENSIONE}.serratura`), false)
    assert.equal(èPacchetto('classi.json'), false)
    assert.equal(nomeDelPacchetto(Uri.file(`/dati/2026-2027${ESTENSIONE}`)), '2026-2027')
  })

  it('la serratura dice chi lo tiene se il processo è vivo, la ignora se è morto, e sparisce quando lo si lascia', async () => {
    const file = documento()
    const pacchetto = await Pacchetto.apri(file)
    await pacchetto.prendi()

    // Un processo vivo di questa stessa macchina si vede:
    const chiVivo = await Pacchetto.chiLoTiene(file)
    assert.ok(chiVivo)
    assert.equal(chiVivo.processo, process.pid)
    assert.equal(pacchetto.bloccato, true)

    // Una serratura di questa stessa macchina ma con un processo morto viene ignorata:
    const nome = percorso.basename(file.fsPath)
    writeFileSync(
      percorso.join(cartella, `.${nome}.serratura`),
      JSON.stringify({
        macchina: process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? 'computer',
        utente: process.env.USERNAME ?? process.env.USER ?? '',
        processo: 9999999,
        aperto: '2026-09-01T08:00:00.000Z',
      }),
    )
    assert.equal(await Pacchetto.chiLoTiene(file), null)

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
