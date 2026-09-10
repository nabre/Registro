// Il documento campione che sta nel repo.
//
// `prove/campioni/2026-2027.registro` è un anno finto scritto una volta e
// lasciato lì. Questa prova lo riapre a ogni giro, ed è l'unica che guarda
// indietro: tutte le altre scrivono un documento e lo rileggono subito, quindi
// resterebbero verdi anche se il formato cambiasse in blocco — scritto e letto
// dallo stesso codice, un formato torna sempre.
//
// Quel che si difende qui è il documento di ieri. Un anno impacchettato a
// settembre dev'essere ancora apribile a giugno, e da un registro nel frattempo
// aggiornato: se una modifica al formato lo rompe, si scopre adesso e non da un
// docente che non riapre più il proprio anno.
//
// Se questa prova diventa rossa, la domanda non è «rigenero il campione?» ma
// «che cosa succede ai documenti già scritti?». Il campione si rigenera —
// `npm run campione` — solo dopo aver risposto.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { Uri } from '../../dist-prove/ambiente.mjs'
import { FORMATO, MANIFESTO, Pacchetto, STORICO } from '../../dist-prove/pacchetto.mjs'
import { leggiZip } from '../../dist-prove/zip.mjs'

const CAMPIONE = percorso.join(
  percorso.dirname(fileURLToPath(import.meta.url)),
  '..',
  'campioni',
  '2026-2027.registro',
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
    // Gli accenti passano interi dal disco: è la ragione per cui i nomi delle
    // voci e i contenuti si scrivono in UTF-8 dichiarato.
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
    // La copia è la versione *precedente*: quella senza l'argomento aggiunto
    // dalla seconda modifica.
    const prima = JSON.parse(pacchetto.testo(copie[0]))
    assert.equal(prima[1].argomenti, '')
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
    // Non passa da `Pacchetto`: legge l'archivio come farebbe un programma che
    // del registro non sa niente. È la promessa su cui poggia la scelta del
    // formato, e va verificata senza la nostra classe in mezzo.
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
