// Il ponte: che mettere il contratto davanti non abbia cambiato niente dietro.
//
// Una procedura che dichiara `azione: 'presenze.riga'` prende il posto di quel
// gestore dentro il centralino. Per il pannello non deve cambiare niente — manda
// la stessa `Azione`, riceve la stessa `Risposta` — e questo file è il
// contratto di non-regressione con l'interfaccia che esiste già: si sostituisce
// il motore mentre la macchina cammina, e il volante non se ne deve accorgere.
//
// Tre cose si guardano, e sono le tre in cui una migrazione a pezzi si rompe in
// silenzio. Che il centralino conosca ancora tutte le azioni prese in carico —
// una chiave scritta storta le farebbe sparire dalla mappa senza errori. Che un
// rifiuto torni nella forma `{ ok: false, errori }` che il pannello sa già
// mostrare, e non nella busta nuova, che il pannello non capirebbe. E che
// nessuna procedura si sia agganciata a un'azione che il protocollo non
// dichiara: sarebbe un gestore che non verrà chiamato mai, e nessun tipo lo
// direbbe, perché `azione` è una stringa.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-ponte-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

let api
let archivio
let lezione
let rossi

/**
 * I tipi di azione che il protocollo dichiara, letti dal suo sorgente.
 *
 * `Azione` è un'unione di tipi e basta: quando il programma gira non ne resta
 * niente, e `azioneValida` non serve a confrontarcisi — risponde vero anche per
 * le chiavi che le procedure hanno appena aggiunto alla mappa, che è proprio
 * quel che qui si vuole mettere in dubbio. Il sorgente è l'unica copia che il
 * compilatore controlla davvero.
 */
function tipiDelProtocollo () {
  const file = fileURLToPath(new URL('../../src/protocol.ts', import.meta.url))
  const sorgente = readFileSync(file, 'utf8')
  const trovati = [...sorgente.matchAll(/^\s*\|?\s*(?:\{\s*)?tipo:\s*'([^']+)'/gm)].map((m) => m[1])
  assert.ok(trovati.length > 100, `il protocollo si legge male: ${trovati.length} tipi trovati`)
  return new Set(trovati)
}

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  api = await import('../../dist-tests/api.mjs')
  const {
    Archivio, Uri, creaAllievo, creaAnno, creaClasse, creaCorso, creaLezione, creaMateria,
  } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )
  const annoId = archivio.registro.anni[0].id

  const classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  classe.allievi.push(rossi)
  const materia = creaMateria('Matematica')
  const corso = creaCorso(classe.id, materia.id, 'Matematica — I MEC A')
  lezione = creaLezione(corso.id, '2026-09-01', '08:20', 90)

  archivio.modifica((r) => {
    // I PDF automatici restano fermi: qui si prova il centralino, non la
    // cartella dei documenti, e rifare dei fogli in sottofondo terrebbe in
    // piedi il processo delle prove per niente.
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
    r.lezioni.push(lezione)
  }, ['classi', 'corsi', 'lezioni', 'registro'])
})

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

describe('il centralino dopo il ponte', () => {
  it('conosce ancora tutte le azioni passate sotto contratto', () => {
    const sotto = api.azioniSottoContratto()
    assert.ok(sotto.length > 0, 'nessuna azione è passata sotto contratto')
    for (const azione of sotto) {
      assert.ok(api.azioneValida(azione), `il centralino non conosce più «${azione}»`)
    }
  })

  it('nessuna procedura si aggancia a un’azione che il protocollo non dichiara', () => {
    const tipi = tipiDelProtocollo()
    const orfane = api.procedure()
      .filter((p) => p.azione)
      .filter((p) => !tipi.has(p.azione))
      .map((p) => `${p.nome} → ${p.azione}`)
    assert.deepEqual(orfane, [], 'procedure agganciate a un’azione inesistente')
  })

  it('ogni azione è presa in carico da una procedura sola', () => {
    // Due procedure sulla stessa azione vorrebbero dire che una delle due non
    // viene chiamata mai: nella mappa vince l'ultima, in ordine di nome.
    const prese = api.procedure().map((p) => p.azione).filter(Boolean)
    assert.deepEqual([...new Set(prese)].sort(), [...prese].sort())
  })
})

describe('un’azione che già funzionava', () => {
  it('si comporta come prima: ok, e l’appello scritto', async () => {
    const esito = await api.esegui(archivio, {
      tipo: 'presenze.riga',
      lezioneId: lezione.id,
      allievoId: rossi.id,
      stato: 'presente',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))

    const riga = archivio.registro.lezioni
      .find((l) => l.id === lezione.id)
      .presenze.find((p) => p.allievoId === rossi.id)
    assert.deepEqual(riga.stati, ['presente', 'presente'])
  })

  it('con un ingresso cattivo torna { ok:false, errori }, non una busta nuova', async () => {
    // È la forma che il pannello sa già mostrare. Se di qui uscisse il
    // `Risultato` nudo — con `api`, `procedura`, `messaggi` — il pannello
    // leggerebbe `errori` come `undefined` e mostrerebbe un rifiuto senza
    // motivo: sono `messaggi` che diventano `errori`, ed è il lavoro di
    // `aEsitoAzione`.
    const esito = await api.esegui(archivio, {
      tipo: 'presenze.riga',
      lezioneId: lezione.id,
      allievoId: rossi.id,
      stato: 'boh',
    })
    assert.equal(esito.ok, false)
    assert.ok(Array.isArray(esito.errori))
    assert.ok(esito.errori.length > 0)
    // Questi due restano fuori: sono i campi della busta, e chi li legge sta
    // guardando la cosa sbagliata.
    assert.equal(esito.api, undefined)
    assert.equal(esito.messaggi, undefined)
  })

  it('il codice del rifiuto arriva fino al pannello, e con lui il tracciato', () => {
    // Qui la prova diceva il contrario — `codice` e `tracciato` a `undefined` —
    // e fotografava la lacuna invece di un requisito: `aEsitoAzione` li
    // buttava via, e le 141 scritture chiamate dal pannello ricevevano le sole
    // frasi, cioè esattamente quel che ricevevano prima che il contratto
    // esistesse. Il codice serve a decidere se ritentare; il tracciato è quel
    // che si cita per ritrovare la chiamata nel giornale.
    return (async () => {
      const cattivo = await api.esegui(archivio, {
        tipo: 'presenze.riga',
        lezioneId: lezione.id,
        allievoId: rossi.id,
        stato: 'boh',
      })
      assert.equal(cattivo.codice, 'ingresso-non-valido')
      assert.equal(typeof cattivo.tracciato, 'string')

      const sparita = await api.esegui(archivio, {
        tipo: 'presenze.riga',
        lezioneId: 'lez-non-esiste-qui',
        allievoId: rossi.id,
        stato: 'presente',
      })
      // Il codice distingue: «non c'è più» si ritenta dopo aver riletto,
      // «non si può» no. Prima erano la stessa cosa.
      assert.equal(sparita.codice, 'non-trovato')
    })()
  })

  it('un rifiuto del contratto non lascia niente scritto', async () => {
    const revisione = archivio.revisione
    await api.esegui(archivio, {
      tipo: 'presenze.riga',
      lezioneId: lezione.id,
      allievoId: rossi.id,
      stato: 'boh',
    })
    assert.equal(archivio.revisione, revisione)
  })

  it('«non c’è più» resta una frase leggibile, non un codice a schermo', async () => {
    // Il codice serve a chi programma e sta nella busta; a chi ha premuto resta
    // la frase italiana di sempre, che passando di qui non è stata riscritta.
    const esito = await api.esegui(archivio, {
      tipo: 'presenze.riga',
      lezioneId: 'lez-sparita-0001',
      allievoId: rossi.id,
      stato: 'presente',
    })
    assert.equal(esito.ok, false)
    assert.match(esito.errori[0], /Lezione/)
  })
})
