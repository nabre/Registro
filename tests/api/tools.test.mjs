// Il catalogo per il modello, e il file su disco che lo porta fuori.
//
// `resources/tools.json` è una copia del contratto, e ogni copia di un
// contratto ha un solo modo di essere pericolosa: restare indietro senza che si
// veda. Un attrezzo che nel file c'è ancora e nel registro non esiste più fa
// rispondere «non esiste» a un modello che l'aveva letto da lì; un ingresso che
// nel file ha un campo in più fa comporre al modello una chiamata che il nucleo
// rifiuta. Nessuna delle due rompe qualcosa di visibile — si vedono come una
// risposta storta, che è il modo peggiore.
//
// Quindi lo si ricostruisce qui e lo si confronta byte per byte con quello su
// disco. Se questa prova fallisce, non c'è niente da aggiustare nel file: si dà
// `npm run tools` e si rilegge la differenza, che è esattamente quel che si
// voleva vedere.
//
// Il resto sono le due cose che il formato deve garantire a chi lo legge da
// fuori: che i nomi senza punto si possano ritradurre in nomi con il punto — è
// l'unico ponte fra quel che il modello dice e quel che il nucleo conosce — e
// che il genere dichiarato nel file sia lo stesso che il nucleo fa rispettare,
// perché è il campo su cui chi guida la riga di comando decide che cosa lasciar
// chiamare a un modello.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  catalogo,
  catalogoJson,
  daNomeFunzione,
  nomeFunzione,
  procedure,
  registraTutte,
} from '../../dist-tests/api.mjs'

registraTutte()

const PERCORSO = fileURLToPath(new URL('../../resources/tools.json', import.meta.url))

describe('il catalogo degli attrezzi', () => {
  it('è lo stesso che sta in resources/tools.json', () => {
    // Byte per byte, e per questo il file è dichiarato `eol=lf` in
    // `.gitattributes`: con `core.autocrlf` acceso — il predefinito su Windows
    // — git lo riscriverebbe in CRLF al primo checkout, e questa prova
    // fallirebbe su un clone appena fatto senza che nessuno abbia toccato
    // niente. Confrontare i byte è il punto: un confronto che normalizzasse i
    // ritorni a capo sarebbe un confronto che normalizza, e domani qualcuno
    // gli farebbe normalizzare anche l'ordine delle chiavi.
    const suDisco = readFileSync(PERCORSO, 'utf8')
    assert.equal(
      catalogoJson(),
      suDisco,
      'resources/tools.json non è più quello che il codice genera: dare «npm run tools».',
    )
  })

  it('non cambia da sé: generato due volte è lo stesso file', () => {
    // Una data di generazione, un contatore, un ordine che dipende
    // dall'inserimento: basta uno di questi e la prova di sopra diventa un
    // fastidio da mettere a tacere invece di una rete.
    assert.equal(catalogoJson(), catalogoJson())
  })

  it('racconta tutte le procedure e nient’altro', () => {
    const nel = catalogo().attrezzi.map((a) => a.nome).sort()
    const vere = procedure().map((p) => p.nome).sort()
    assert.deepEqual(nel, vere)
  })

  it('dichiara per ognuna lo stesso genere che il nucleo fa rispettare', () => {
    // È il campo su cui si decide che cosa un modello può chiamare. Se qui
    // dicesse «lettura» di una scrittura, il controllo a valle reggerebbe lo
    // stesso — `usaAttrezzo` riguarda il genere vero — ma chi si fida del file
    // costruirebbe un elenco di attrezzi che comprende delle scritture.
    const vere = new Map(procedure().map((p) => [p.nome, p]))
    const storte = catalogo().attrezzi
      .filter((a) => a.genere !== vere.get(a.nome).genere)
      .map((a) => a.nome)
    assert.deepEqual(storte, [])
  })

  it('i nomi senza punto tornano indietro tutti', () => {
    const perse = procedure()
      .map((p) => p.nome)
      .filter((nome) => daNomeFunzione(nomeFunzione(nome)) !== nome)
    assert.deepEqual(perse, [], `nomi che non si ritraducono: ${perse.join(', ')}`)
  })

  it('due procedure non finiscono sullo stesso nome di funzione', () => {
    // `a.b` e `a_b` diventerebbero lo stesso attrezzo, e `daNomeFunzione` ne
    // troverebbe una a caso — cioè la prima in ordine alfabetico, che non è
    // quella che il modello intendeva.
    const funzioni = catalogo().attrezzi.map((a) => a.funzione)
    assert.equal(new Set(funzioni).size, funzioni.length)
  })

  it('ogni attrezzo porta uno schema d’ingresso che si sa leggere', () => {
    const storte = []
    for (const a of catalogo().attrezzi) {
      if (typeof a.parametri !== 'object' || a.parametri === null) {
        storte.push(`${a.nome}: senza parametri`)
        continue
      }
      // Il formato del tool calling vuole un oggetto in cima: un modello non sa
      // chiamare una funzione i cui argomenti siano un numero.
      if (a.parametri.type !== 'object') storte.push(`${a.nome}: parametri di tipo «${a.parametri.type}»`)
      if (!a.titolo || a.titolo.length < 8) storte.push(`${a.nome}: senza una descrizione leggibile`)
      if (!a.riga.startsWith(`${catalogo().comando} chiama ${a.nome}`)) {
        storte.push(`${a.nome}: la riga di esempio non chiama questa procedura`)
      }
    }
    assert.deepEqual(storte, [], storte.join('\n'))
  })

  it('le istruzioni dicono al modello che non può scrivere', () => {
    // È l'unica riga del prompt che una modifica distratta potrebbe togliere
    // senza che niente smetta di funzionare — e senza la quale un modello
    // prova a segnare un'assenza invece di dire quale comando la segnerebbe.
    const istruzioni = catalogo().istruzioni
    assert.match(istruzioni, /sola lettura/)
    assert.match(istruzioni, /Non inventare mai/)
  })
})
