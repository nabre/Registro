// Il documento campione del repo, `tests/samples/2026-2027.regi`, scritto una
// volta e lasciato lì: è l'unica prova che guarda indietro, perché le altre
// scrivono e rileggono con lo stesso codice. Un anno impacchettato a settembre
// si apre ancora a giugno col registro aggiornato.
//
// Se diventa rossa, prima si risponde a «che cosa succede ai documenti già
// scritti?», poi si rigenera con `npm run sample`.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { Uri } from '../../dist-tests/environment.mjs'
import { FORMATO, MANIFESTO, Pacchetto, STORICO } from '../../dist-tests/package.mjs'
import { leggiZip } from '../../dist-tests/zip.mjs'

const CAMPIONE = percorso.join(
  percorso.dirname(fileURLToPath(import.meta.url)),
  '..',
  'samples',
  '2026-2027.regi',
)

describe('il documento campione', () => {
  it('si apre, e porta il nome del suo anno', async () => {
    const pacchetto = await Pacchetto.apri(Uri.file(CAMPIONE))

    assert.equal(pacchetto.nome, '2026-2027')
    // Aperto e non toccato: non deve risultare da salvare.
    assert.equal(pacchetto.sporco, false)
    assert.equal(pacchetto.bloccato, false)
  })

  it('contiene le collezioni con dentro quel che ci si è messo', async () => {
    const pacchetto = await Pacchetto.apri(Uri.file(CAMPIONE))

    const classi = JSON.parse(pacchetto.testo('classi.json'))
    assert.equal(classi.length, 1)
    assert.equal(classi[0].nome, 'I MEC A')
    assert.deepEqual(
      classi[0].allievi.map((a) => a.cognome),
      ['Rossi', 'Bianchi', 'Verdi'],
    )

    const lezioni = JSON.parse(pacchetto.testo('lezioni.json'))
    assert.equal(lezioni.length, 3)
    assert.equal(lezioni[0].data, '2026-09-07')
    assert.equal(lezioni[0].argomenti, 'Unità di misura e conversioni')
    // Gli accenti passano interi: nomi e contenuti sono in UTF-8 dichiarato.
    assert.match(lezioni[0].consuntivo, /esercizi 1–8/)

    const registro = JSON.parse(pacchetto.testo('registro.json'))
    assert.equal(registro.anno.inizio, '2026-09-01')
    assert.deepEqual(registro.materie.map((m) => m.nome), ['Calcolo professionale'])
  })

  it('porta con sé le copie di com’era', async () => {
    const pacchetto = await Pacchetto.apri(Uri.file(CAMPIONE))
    const copie = pacchetto.copieDi('lezioni')

    assert.equal(copie.length, 1)
    assert.ok(copie[0].startsWith(`${STORICO}/lezioni.`), copie[0])
    // La copia è la versione *precedente*, senza l'argomento aggiunto: il campo
    // manca (i campi vuoti non si scrivono) e la lettura lo rimette.
    const prima = JSON.parse(pacchetto.testo(copie[0]))
    assert.equal(prima[1].argomenti ?? '', '')
  })

  it('dichiara nel manifesto di che cosa è fatto', () => {
    const voci = leggiZip(readFileSync(CAMPIONE))
    const manifesto = voci.find((v) => v.nome === MANIFESTO)

    assert.ok(manifesto, `manifesto assente: ${voci.map((v) => v.nome).join(', ')}`)
    const letto = JSON.parse(new TextDecoder().decode(manifesto.dati))
    assert.equal(letto.formato, FORMATO)
    assert.equal(letto.versione, 1)
  })

  it('resta uno ZIP che aprirebbe chiunque', () => {
    // Senza `Pacchetto`: si legge l'archivio come un programma che del registro
    // non sa niente.
    const voci = leggiZip(readFileSync(CAMPIONE))
    const nomi = voci.map((v) => v.nome)

    for (const atteso of ['registro.json', 'classi.json', 'corsi.json', 'lezioni.json']) {
      assert.ok(nomi.includes(atteso), `manca ${atteso}: ${nomi.join(', ')}`)
    }
    // E ogni voce è JSON leggibile: il contenuto non è nostro soltanto di nome.
    for (const voce of voci) {
      assert.doesNotThrow(
        () => JSON.parse(new TextDecoder().decode(voce.dati)),
        `${voce.nome} non è JSON`,
      )
    }
  })
})
