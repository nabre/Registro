// Il documento dell'anno: `2026-2027.registro`.
//
// Qui il disco c'è davvero — una cartella temporanea per prova — perché quel
// che si vuole sapere è proprio come si comporta il file: che cosa c'è dentro
// dopo un salvataggio, che cosa succede riaprendolo, e che cosa succede quando
// non c'è, quando è di un'altra versione, o quando è di un altro programma.
//
// Le tre risposte che contano:
//
//   un file che non c'è     è un documento vuoto, e ci si scrive dentro
//   un file di un'altra cosa   si rifiuta, invece di ripartire da vuoto
//   un file più recente     si rifiuta, per non coprire quel che non si sa leggere
//
// Le ultime due sono la stessa promessa detta due volte: un anno di lavoro non
// si perde perché il registro ha creduto di avere in mano un documento vuoto.

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, describe, it } from 'node:test'

import { Uri } from '../../dist-prove/ambiente.mjs'
import {
  ESTENSIONE,
  MANIFESTO,
  Pacchetto,
  STORICO,
  nomeDelPacchetto,
  èPacchetto,
} from '../../dist-prove/pacchetto.mjs'
import { leggiZip } from '../../dist-prove/zip.mjs'
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

    // Riscrivere la stessa voce con lo stesso testo non è una modifica: su una
    // cartella sincronizzata ogni scrittura è una sincronizzazione.
    pacchetto.scrivi('classi.json', '[]\n')
    assert.equal(pacchetto.sporco, false)
    assert.equal(await pacchetto.salva(), false)
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
    // E il manifesto non deve comparire fra le voci del documento: è la carta
    // d'identità dell'archivio, non una collezione del registro.
    assert.deepEqual(pacchetto.nomi(), ['classi.json'])
  })

  it('tiene le ultime copie e butta le altre', async () => {
    const pacchetto = await Pacchetto.apri(documento())
    // Le copie portano la marca al minuto: per averne tante e con giorni
    // diversi si scrive direttamente nello storico, che è quel che `conserva`
    // produce quando i giorni passano davvero. Sono datate 2020 perché la
    // copia nuova porta la data di oggi, e deve risultare l'ultima.
    for (let n = 1; n <= 12; n += 1) {
      pacchetto.scrivi(`${STORICO}/classi.2020-01-${String(n).padStart(2, '0')}-08-00.json`, `[${n}]`)
    }
    pacchetto.scrivi('classi.json', '[13]')
    pacchetto.conserva('classi.json', 10)

    const copie = pacchetto.copieDi('classi')
    assert.equal(copie.length, 10)
    // Le più vecchie sono quelle che se ne vanno — restano fuori i primi tre
    // giorni — e l'ultima copia è quella appena messa da parte.
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

    // Si riscrive l'archivio con un manifesto che dichiara un formato futuro:
    // è quel che troverebbe un docente che apre con il registro vecchio un
    // anno salvato da quello nuovo.
    const { scriviZip } = await import('../../dist-prove/zip.mjs')
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

    // Una serratura di questa stessa macchina non ferma nessuno: è quel che
    // resta di un registro chiuso male, e trattarla come un altro utente
    // vorrebbe dire non riaprire mai più il proprio anno dopo un blocco.
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
