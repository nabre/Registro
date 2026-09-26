// Le impostazioni dello shim: i predefiniti vengono dal manifesto, e
// `affectsConfiguration` confronta per prefisso puntato (così `startup.ts` e
// `panels/panel.ts` sanno se il cambiamento li riguarda).
//
// Poi `valoreConMotivo`, che decide che cosa entra nel file, e
// `vociImpostazioni()`, che decide che cosa mostrano le due superfici.
//
// Il modulo si importa diretto: con due bundle ci sarebbero due depositi in
// memoria sullo stesso file.

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { beforeEach, describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-impostazioni-'))

const {
  getConfiguration,
  onDidChangeConfiguration,
  dialogoPercorso,
  ricaricaImpostazioni,
  valoreConMotivo,
  vociImpostazioni,
} = await import('../../dist-tests/settings.mjs')
const { IMPOSTAZIONI } = await import('../../dist-tests/manifest.mjs')

/** Il valore che la dogana lascia entrare, o `undefined`. */
const accettato = (chiave, valore) => valoreConMotivo(chiave, valore).valore

const FILE = percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json')

/** Scrive il file delle impostazioni come lo troverebbe l'app all'avvio. */
function scritte (valori) {
  writeFileSync(FILE, JSON.stringify(valori), 'utf8')
  ricaricaImpostazioni()
}

beforeEach(() => scritte({}))

describe('i predefiniti vengono da package.json', () => {
  it('li dà anche quando il file non dice niente', () => {
    const registro = getConfiguration('registroDocenti')

    assert.equal(registro.get('vassoio.attivo'), true)
    assert.equal(registro.get('promemoria.anticipoMinuti'), 5)
  })

  it('funziona con una sezione puntata, come la usa mail.ts', () => {
    const posta = getConfiguration('registroDocenti.posta')

    assert.equal(posta.get('invioDiretto'), false)
    assert.equal(posta.get('mittente'), '')
    assert.equal(posta.get('utente'), '')
  })

  it('il ripiego passato dal chiamante non copre il predefinito', () => {
    // Comanda il manifesto, anche sul ripiego passato da chi legge.
    assert.equal(getConfiguration('registroDocenti').get('promemoria.anticipoMinuti', 9), 5)
  })

  it('quel che è scritto nel file vince sul predefinito', () => {
    scritte({ 'registroDocenti.promemoria.anticipoMinuti': 15 })

    assert.equal(getConfiguration('registroDocenti').get('promemoria.anticipoMinuti'), 15)
  })

  it('una chiave ricordata e non dichiarata si legge, senza predefinito', () => {
    // `ultimoDocumento` e `cartellaLavoro` stanno nel file ma non nel manifesto:
    // le scrive il programma, e chi le legge porta il suo ripiego.
    assert.equal(getConfiguration('registroDocenti').get('ultimoDocumento'), undefined)
    assert.equal(getConfiguration('registroDocenti').get('ultimoDocumento', ''), '')

    scritte({ 'registroDocenti.ultimoDocumento': 'D:/Registro/2026-2027.regi' })
    assert.equal(
      getConfiguration('registroDocenti').get('ultimoDocumento', ''),
      'D:/Registro/2026-2027.regi',
    )
  })
})

describe('update scrive e avvisa chi guarda quel prefisso', () => {
  it('affectsConfiguration confronta per prefisso puntato', async () => {
    const visti = []
    const iscrizione = onDidChangeConfiguration((evento) => visti.push(evento))

    await getConfiguration('registroDocenti.posta').update('mittente', 'nome.cognome@edu.ti.ch')

    assert.equal(visti.length, 1)
    const [evento] = visti
    assert.ok(evento.affectsConfiguration('registroDocenti'))
    assert.ok(evento.affectsConfiguration('registroDocenti.posta'))
    assert.ok(evento.affectsConfiguration('registroDocenti.posta.mittente'))
    // Il pannello guarda `registroDocenti.ocr`: non si deve svegliare per la posta.
    assert.equal(evento.affectsConfiguration('registroDocenti.ocr'), false)
    // E un prefisso che è solo un pezzo di parola non conta.
    assert.equal(evento.affectsConfiguration('registroDocenti.post'), false)

    iscrizione.dispose()
  })

  it('il valore scritto si rilegge, anche dopo una ricarica', async () => {
    await getConfiguration('registroDocenti').update('ultimoDocumento', 'D:/altrove/2027-2028.regi')
    ricaricaImpostazioni()

    assert.equal(
      getConfiguration('registroDocenti').get('ultimoDocumento'),
      'D:/altrove/2027-2028.regi',
    )
  })

  it('undefined toglie la chiave e riporta il predefinito', async () => {
    const registro = getConfiguration('registroDocenti')
    await registro.update('promemoria.anticipoMinuti', 15)
    await registro.update('promemoria.anticipoMinuti', undefined)

    assert.equal(getConfiguration('registroDocenti').get('promemoria.anticipoMinuti'), 5)
  })
})

// ---------------------------------------------------------------- la dogana
//
// Quel che entra nel file e quel che viene respinto: da qui passano la pagina,
// la finestra nativa e la riga di comando.

describe('la dogana guarda tutto quel che il manifesto dichiara', () => {
  const MITTENTE = 'registroDocenti.posta.mittente'
  const UTENTE = 'registroDocenti.posta.utente'
  const ANTICIPO = 'registroDocenti.promemoria.anticipoMinuti'

  it('un indirizzo che non è un indirizzo non entra', () => {
    // Il formato si fa rispettare qui, per tutte le superfici.
    assert.equal(accettato(MITTENTE, 'pippo'), undefined)
    assert.equal(accettato(MITTENTE, 'nome.cognome@edu.ti.ch'), 'nome.cognome@edu.ti.ch')
  })

  it('il vuoto resta lecito: è il predefinito, e vuol dire «lo stesso dell’altro»', () => {
    assert.equal(accettato(MITTENTE, ''), '')
    assert.equal(accettato(UTENTE, '   '), '   ')
  })

  it('anche il nome di accesso è un indirizzo, e lo dichiara', () => {
    assert.equal(IMPOSTAZIONI[UTENTE].formato, 'email')
    assert.equal(accettato(UTENTE, 'xxx000'), undefined)
    assert.equal(accettato(UTENTE, 'xxx000@edu.ti.ch'), 'xxx000@edu.ti.ch')
  })

  it('un numero fuori dagli estremi non entra', () => {
    // Fuori dai limiti si rifiuta, invece di salvare un numero senza effetto.
    assert.equal(accettato(ANTICIPO, -30), undefined)
    assert.equal(accettato(ANTICIPO, 0), 0)
    assert.equal(accettato(ANTICIPO, 5), 5)
    assert.equal(accettato(ANTICIPO, 500), undefined)
  })

  it('le chiavi tolte non passano più la dogana', () => {
    // Chiavi che non sono impostazioni: nessuna pagina le mostra.
    assert.equal(accettato('registroDocenti.ocr.attesaMassimaSecondi', 180), undefined)
    assert.equal(accettato('registroDocenti.aperturaAutomatica', true), undefined)
    assert.equal(accettato('registroDocenti.recapiti.outlook', ''), undefined)
    // Il modello e il programma di whisper.cpp non sono più impostazioni.
    assert.equal(accettato('registroDocenti.dettatura.modello', 'C:/voce/ggml-small.bin'), undefined)
    assert.equal(accettato('registroDocenti.dettatura.programma', 'C:/voce/whisper-cli.exe'), undefined)
  })

  it('l’indirizzo di voicebox è di questo computer, o non entra', () => {
    const CHIAVE = 'registroDocenti.dettatura.indirizzo'
    for (const buono of [
      'http://127.0.0.1:17493', 'http://localhost:8000', 'http://[::1]:17493', '  http://127.0.0.1:9000/ ',
    ]) {
      assert.equal(accettato(CHIAVE, buono), buono.trim(), buono)
    }
    // Ogni rifiuto dice perché: la voce di chi detta è quel che si difende.
    for (const storto of [
      'http://192.168.1.10:17493',
      'http://voicebox.scuola.ch',
      'http://127.0.0.1.altrove.ch:17493',
      'https://127.0.0.1:17493',
      'http://utente:parola@127.0.0.1:17493',
      'http://127.0.0.1:17493/transcribe',
      '127.0.0.1:17493',
      '',
    ]) {
      const esito = valoreConMotivo(CHIAVE, storto)
      assert.equal(esito.valore, undefined, storto)
      assert.ok(esito.motivo, storto)
    }
    assert.match(valoreConMotivo(CHIAVE, 'http://10.0.0.1:17493').motivo, /questo computer/)
  })

  it('la taglia del modello della voce è una delle cinque di voicebox', () => {
    for (const taglia of ['base', 'small', 'medium', 'large', 'turbo']) {
      assert.equal(accettato('registroDocenti.dettatura.taglia', taglia), taglia)
    }
    assert.equal(accettato('registroDocenti.dettatura.taglia', 'large-v3'), undefined)
    assert.equal(IMPOSTAZIONI['registroDocenti.dettatura.taglia'].predefinito, 'turbo')
  })

  it('un percorso si accetta intero, e un programma solo se è un .exe', () => {
    const cartella = process.platform === 'win32' ? 'C:\\Modelli' : '/modelli'
    assert.equal(accettato('registroDocenti.modelli.cartella', ''), '')
    assert.equal(accettato('registroDocenti.modelli.cartella', cartella), cartella)
    assert.equal(accettato('registroDocenti.modelli.cartella', 'modelli'), undefined)

    const programma = process.platform === 'win32' ? 'C:\\llama\\llama-mtmd-cli.exe' : '/llama/llama-mtmd-cli.exe'
    assert.equal(accettato('registroDocenti.ocr.programma', programma), programma)
    assert.equal(accettato('registroDocenti.ocr.programma', programma.replace('.exe', '.bat')), undefined)
    assert.equal(accettato('registroDocenti.ocr.programma', 'llama-mtmd-cli.exe'), undefined)
  })

  it('ogni voce che si mostra ha un nome scritto, e i percorsi hanno il loro dialogo', () => {
    for (const voce of vociImpostazioni()) {
      assert.ok(IMPOSTAZIONI[voce.chiave].etichetta, `${voce.chiave} non ha un’etichetta`)
      const tienePercorso = ['cartella', 'eseguibile', 'file'].includes(voce.formato)
      assert.equal(dialogoPercorso(voce.chiave) !== null, tienePercorso, voce.chiave)
    }
  })

  it('una chiave inventata, un tipo sbagliato e una scelta fuori elenco restano fuori', () => {
    assert.equal(accettato('registroDocenti.inventata', true), undefined)
    assert.equal(accettato(ANTICIPO, '5'), undefined)
    assert.equal(accettato('registroDocenti.aspetto.tema', 'fucsia'), undefined)
    assert.equal(accettato('registroDocenti.aspetto.tema', 'scuro'), 'scuro')
  })
})

// ------------------------------------------------- quel che le superfici vedono
//
// `vociImpostazioni()` è l'unico posto da cui pagina del pannello e finestra
// nativa prendono l'elenco.

describe('le voci che le due superfici mostrano', () => {
  const CONDOTTO = 'registroDocenti.api.condotto'
  const LETTURA = 'registroDocenti.api.lettura'

  const voce = (chiave) => vociImpostazioni().find((candidata) => candidata.chiave === chiave)

  it('ogni chiave del manifesto si mostra, e nell’ordine del manifesto', () => {
    // Nessuna chiave sparisce dalle due superfici.
    const mostrate = vociImpostazioni().map((candidata) => candidata.chiave)
    assert.deepEqual(mostrate, Object.keys(IMPOSTAZIONI))
  })

  it('il padre spento sospende le figlie, e lo dice a chi disegna', async () => {
    // Una voce che dipende da un'altra spenta è sospesa, per tutte e due le
    // superfici: il conto si fa dove l'elenco nasce.
    scritte({ [CONDOTTO]: false, [LETTURA]: true })
    assert.equal(voce(LETTURA).sospesa, true)
    assert.equal(voce(CONDOTTO).sospesa, false)

    await getConfiguration().update(CONDOTTO, true)
    assert.equal(voce(LETTURA).sospesa, false)
    // Il valore scritto non si tocca: riacceso il padre, la figlia torna com'era.
    assert.equal(voce(LETTURA).valore, true)
  })

  it('gli estremi di un numero arrivano a chi disegna il campo', () => {
    const anticipo = voce('registroDocenti.promemoria.anticipoMinuti')
    assert.equal(anticipo.minimo, 0)
    assert.equal(anticipo.massimo, 120)
    // Chi non ne ha dice `null`, non `undefined`: il protocollo è esplicito.
    assert.equal(voce('registroDocenti.aspetto.tema').minimo, null)
  })
})

describe('un interruttore che richiede un modello', () => {
  const ATTIVO = 'registroDocenti.assistente.attivo'
  const MODELLO = 'registroDocenti.assistente.modello'
  const OCR = 'registroDocenti.ocr.attivo'
  const OCR_MODELLO = 'registroDocenti.ocr.modello'
  const OCR_PROIETTORE = 'registroDocenti.ocr.proiettore'

  const voce = (chiave) => vociImpostazioni().find((candidata) => candidata.chiave === chiave)

  it('la dogana non lo accende senza modello, e dice perché', () => {
    assert.equal(accettato(ATTIVO, true), undefined)
    const { valore, motivo } = valoreConMotivo(ATTIVO, true)
    assert.equal(valore, undefined)
    assert.match(motivo, /Modelli linguistici/)
    // Spegnere si può sempre.
    assert.equal(accettato(ATTIVO, false), false)
    // Un modello di soli spazi non è un modello.
    scritte({ [MODELLO]: '   ' })
    assert.equal(accettato(ATTIVO, true), undefined)
  })

  it('con il modello si accende', () => {
    scritte({ [MODELLO]: 'qwen.gguf' })
    assert.equal(accettato(ATTIVO, true), true)
  })

  it('la lettura delle scansioni vuole anche il proiettore', () => {
    scritte({ [OCR_MODELLO]: 'vista.gguf' })
    assert.equal(accettato(OCR, true), undefined)
    scritte({ [OCR_MODELLO]: 'vista.gguf', [OCR_PROIETTORE]: 'mmproj.gguf' })
    assert.equal(accettato(OCR, true), true)
  })

  it('acceso nel file ma senza modello si legge spento, da tutti', () => {
    // Un file scritto a mano, o un modello tolto dopo: il registro non ci crede.
    scritte({ [ATTIVO]: true })
    assert.equal(getConfiguration().get(ATTIVO), false)
    assert.equal(getConfiguration('registroDocenti').get('assistente.attivo', true), false)

    const mostrata = voce(ATTIVO)
    assert.equal(mostrata.valore, false)
    assert.match(mostrata.bloccata, /Modelli linguistici/)
    // Il valore scritto resta: è ancora «modificata».
    assert.equal(mostrata.scritta, true)
  })

  it('scelto il modello torna com’era, e la voce non è più bloccata', async () => {
    scritte({ [ATTIVO]: true })
    await getConfiguration().update(MODELLO, 'qwen.gguf')
    assert.equal(getConfiguration().get(ATTIVO), true)
    assert.equal(voce(ATTIVO).valore, true)
    assert.equal(voce(ATTIVO).bloccata, null)
  })

  it('il modello e l’interruttore non si sospendono a vicenda', () => {
    // Con `dipendeDa` sul modello campo e interruttore si bloccherebbero a vicenda.
    assert.equal(voce(MODELLO).sospesa, false)
    assert.equal(voce(OCR_MODELLO).sospesa, false)
    assert.equal(voce(OCR_PROIETTORE).sospesa, false)
  })

  it('togliere il modello avvisa chi ascolta l’interruttore', async () => {
    scritte({ [ATTIVO]: true, [MODELLO]: 'qwen.gguf' })
    const visti = []
    const iscrizione = onDidChangeConfiguration((evento) => visti.push(evento))
    await getConfiguration().update(MODELLO, '')
    iscrizione.dispose()

    assert.equal(visti.length, 1)
    assert.ok(visti[0].affectsConfiguration(ATTIVO))
    assert.ok(visti[0].affectsConfiguration(MODELLO))
    assert.equal(visti[0].affectsConfiguration(OCR), false)
    assert.equal(getConfiguration().get(ATTIVO), false)
  })

  it('chi non richiede niente non è mai bloccato', () => {
    for (const voceMostrata of vociImpostazioni()) {
      if (IMPOSTAZIONI[voceMostrata.chiave].richiede) continue
      assert.equal(voceMostrata.bloccata, null, voceMostrata.chiave)
    }
  })

  it('richiede sta solo sugli interruttori, e nomina chiavi che esistono', () => {
    for (const [chiave, dichiarata] of Object.entries(IMPOSTAZIONI)) {
      if (!dichiarata.richiede) continue
      assert.equal(dichiarata.tipo, 'boolean', chiave)
      assert.equal(dichiarata.predefinito, false, `${chiave}: acceso per predefinito sarebbe bloccato da subito`)
      for (const richiesta of dichiarata.richiede.chiavi) {
        assert.ok(IMPOSTAZIONI[richiesta], `${chiave} richiede «${richiesta}», che non c'è`)
      }
    }
  })
})
