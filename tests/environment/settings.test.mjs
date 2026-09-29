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
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'

const USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-impostazioni-'))
process.env.REGISTRO_USERDATA = USERDATA
after(() => rmSync(USERDATA, { recursive: true, force: true }))

const {
  getConfiguration,
  numeroStorto,
  onDidChangeConfiguration,
  dialogoPercorso,
  ricaricaImpostazioni,
  ritiraChiaviDismesse,
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
    assert.equal(registro.get('promemoria.avviso'), '5')
  })

  it('funziona con una sezione puntata, come la usa mail.ts', () => {
    const posta = getConfiguration('registroDocenti.posta')

    assert.equal(posta.get('invioDiretto'), false)
    assert.equal(posta.get('mittente'), '')
    assert.equal(posta.get('utente'), '')
  })

  it('il ripiego passato dal chiamante non copre il predefinito', () => {
    // Comanda il manifesto, anche sul ripiego passato da chi legge.
    assert.equal(getConfiguration('registroDocenti').get('promemoria.avviso', '9'), '5')
  })

  it('quel che è scritto nel file vince sul predefinito', () => {
    scritte({ 'registroDocenti.promemoria.avviso': '15' })

    assert.equal(getConfiguration('registroDocenti').get('promemoria.avviso'), '15')
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
    await registro.update('promemoria.avviso', '15')
    await registro.update('promemoria.avviso', undefined)

    assert.equal(getConfiguration('registroDocenti').get('promemoria.avviso'), '5')
  })
})

// ---------------------------------------------------------------- la dogana
//
// Quel che entra nel file e quel che viene respinto: da qui passano la pagina,
// la finestra nativa e la riga di comando.

describe('la dogana guarda tutto quel che il manifesto dichiara', () => {
  const MITTENTE = 'registroDocenti.posta.mittente'
  const UTENTE = 'registroDocenti.posta.utente'
  const AVVISO = 'registroDocenti.promemoria.avviso'

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
    // Nessuna chiave del manifesto è oggi un numero: la regola si prova su una voce finta.
    const voce = { tipo: 'number', minimo: 0, massimo: 120 }
    assert.match(numeroStorto(voce, -30), /0/)
    assert.equal(numeroStorto(voce, 0), null)
    assert.equal(numeroStorto(voce, 5), null)
    assert.match(numeroStorto(voce, 500), /120/)
  })

  it('un numero è intero, se il manifesto non dichiara un altro passo', () => {
    // Prima un `passo: 'any'` lasciava entrare 2.5 minuti.
    assert.ok(numeroStorto({ tipo: 'number' }, 2.5))
    assert.equal(numeroStorto({ tipo: 'number' }, 3), null)
    // Il passo si conta dal minimo: 5, 15, 25 sì; 10 no.
    const aDieci = { tipo: 'number', minimo: 5, passo: 10 }
    assert.equal(numeroStorto(aDieci, 25), null)
    assert.match(numeroStorto(aDieci, 10), /10/)
    // Un passo decimale non inciampa negli arrotondamenti: 0.1 + 0.2 è 0.3.
    assert.equal(numeroStorto({ tipo: 'number', passo: 0.1 }, 0.1 + 0.2), null)
  })

  it('il promemoria è una scelta sola: nessun avviso, o quanti minuti prima', () => {
    for (const scelta of ['nessuno', '0', '2', '5', '10', '15']) {
      assert.equal(accettato(AVVISO, scelta), scelta)
    }
    assert.equal(accettato(AVVISO, 5), undefined)
    assert.equal(accettato(AVVISO, '7'), undefined)
  })

  it('il condotto è una scelta sola, e «solo scrittura» non c’è', () => {
    const ACCESSO = 'registroDocenti.api.accesso'
    for (const scelta of ['spento', 'lettura', 'letturaScrittura']) {
      assert.equal(accettato(ACCESSO, scelta), scelta)
    }
    assert.equal(accettato(ACCESSO, 'scrittura'), undefined)
    assert.equal(accettato(ACCESSO, true), undefined)
    assert.equal(IMPOSTAZIONI[ACCESSO].predefinito, 'spento')
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

  it('le vecchie chiavi della posta si tolgono da sole all’avvio', () => {
    // Del server a mano, prima dell'accesso Microsoft: solo «Azzera» le toglieva.
    const VECCHIE = ['server', 'porta', 'autenticazione', 'clientId', 'tenant']
      .map((nome) => `registroDocenti.posta.${nome}`)
    scritte({
      ...Object.fromEntries(VECCHIE.map((chiave) => [chiave, 'x'])),
      [MITTENTE]: 'nome.cognome@edu.ti.ch',
    })
    ritiraChiaviDismesse()

    const rimaste = JSON.parse(readFileSync(FILE, 'utf8'))
    assert.deepEqual(Object.keys(rimaste), [MITTENTE])
  })

  it('di voicebox si sceglie solo la porta, intera fra 1 e 65535', () => {
    // L'host è fisso (`127.0.0.1`, `core/dati/dictation.ts`): la voce non esce di qui.
    const CHIAVE = 'registroDocenti.dettatura.porta'
    for (const buona of [1, 17493, 65535]) assert.equal(accettato(CHIAVE, buona), buona)
    for (const storta of [0, 65536, 17493.5, '17493', 'http://127.0.0.1:17493']) {
      const esito = valoreConMotivo(CHIAVE, storta)
      assert.equal(esito.valore, undefined, String(storta))
      assert.ok(esito.motivo, String(storta))
    }
    assert.equal(IMPOSTAZIONI[CHIAVE].predefinito, 17493)
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

    // «Programma di lettura»: le due scelte con un nome, o il percorso di un .exe.
    const LETTORE = 'registroDocenti.ocr.lettore'
    const programma = process.platform === 'win32' ? 'C:\\llama\\llama-mtmd-cli.exe' : '/llama/llama-mtmd-cli.exe'
    assert.equal(accettato(LETTORE, ''), '')
    assert.equal(accettato(LETTORE, 'nessuno'), 'nessuno')
    assert.equal(accettato(LETTORE, programma), programma)
    assert.equal(accettato(LETTORE, programma.replace('.exe', '.bat')), undefined)
    assert.equal(accettato(LETTORE, 'llama-mtmd-cli.exe'), undefined)
    assert.equal(accettato(LETTORE, 'registro'), undefined)
  })

  it('un modello è il nome nudo di un .gguf, come lo scrive «Assistente e modelli»', () => {
    // La stessa regola di `modelloNellaCartella`: un percorso intero passava la
    // dogana e poi il registro lo ignorava, il nome giusto era respinto.
    for (const chiave of [
      'registroDocenti.ocr.modello',
      'registroDocenti.ocr.proiettore',
      'registroDocenti.assistente.modello',
    ]) {
      assert.equal(accettato(chiave, ''), '', chiave)
      assert.equal(accettato(chiave, 'qwen2.5-3b-instruct-q4_k_m.gguf'), 'qwen2.5-3b-instruct-q4_k_m.gguf')
      assert.equal(accettato(chiave, 'Vista.GGUF'), 'Vista.GGUF')
      for (const storto of [
        'C:\\Modelli\\qwen.gguf',
        '/modelli/qwen.gguf',
        '..\\qwen.gguf',
        '../qwen.gguf',
        'C:qwen.gguf',
        'qwen.gguf.ipull',
        'qwen.bin',
      ]) {
        const esito = valoreConMotivo(chiave, storto)
        assert.equal(esito.valore, undefined, `${chiave}: ${storto}`)
        assert.match(esito.motivo, /\.gguf/, storto)
      }
    }
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
    assert.equal(accettato(AVVISO, 5), undefined)
    assert.equal(accettato('registroDocenti.aspetto.tema', 'fucsia'), undefined)
    assert.equal(accettato('registroDocenti.aspetto.tema', 'scuro'), 'scuro')
  })
})

// ------------------------------------------------- quel che le superfici vedono
//
// `vociImpostazioni()` è l'unico posto da cui pagina del pannello e finestra
// nativa prendono l'elenco.

describe('le voci che le due superfici mostrano', () => {
  it('dicono quali valgono solo dal prossimo avvio', () => {
    const alRiavvio = vociImpostazioni().filter((voce) => voce.alProssimoAvvio).map((voce) => voce.chiave)
    assert.deepEqual(alRiavvio.sort(), [
      'registroDocenti.avvio.integrazioneSistema',
      'registroDocenti.vassoio.attivo',
    ])
  })

  const ICONA = 'registroDocenti.vassoio.attivo'
  const NELL_ICONA = 'registroDocenti.vassoio.chiusuraNelVassoio'

  const voce = (chiave) => vociImpostazioni().find((candidata) => candidata.chiave === chiave)

  it('ogni chiave del manifesto si mostra, e nell’ordine del manifesto', () => {
    // Nessuna chiave sparisce dalle due superfici.
    const mostrate = vociImpostazioni().map((candidata) => candidata.chiave)
    assert.deepEqual(mostrate, Object.keys(IMPOSTAZIONI))
  })

  it('partire nascosti vuole l’icona, e la dettatura vuole l’assistente', () => {
    // Il programma lo fa già (`desktop/avvio.ts`, `ui/pannello/assistant.ts`):
    // le due superfici devono dirlo, non mostrare accesa una voce senza effetto.
    scritte({ 'registroDocenti.vassoio.attivo': false, 'registroDocenti.avvio.soloVassoio': true })
    assert.equal(voce('registroDocenti.avvio.soloVassoio').dipendeDa, 'registroDocenti.vassoio.attivo')
    assert.equal(voce('registroDocenti.avvio.soloVassoio').sospesa, true)

    scritte({ 'registroDocenti.dettatura.attivo': true })
    assert.equal(voce('registroDocenti.dettatura.attivo').dipendeDa, 'registroDocenti.assistente.attivo')
    assert.equal(voce('registroDocenti.dettatura.attivo').sospesa, true)
  })

  it('le chiavi che scrive il collegamento della casella lo dicono', () => {
    // La finestra nativa le mostra in sola lettura, senza «Ritira».
    const del = vociImpostazioni().filter((candidata) => candidata.delCollegamento)
    assert.deepEqual(
      del.map((candidata) => candidata.chiave).sort(),
      ['registroDocenti.posta.mittente', 'registroDocenti.posta.utente'],
    )
  })

  it('il padre spento sospende le figlie, e lo dice a chi disegna', async () => {
    // Una voce che dipende da un'altra spenta è sospesa, per tutte e due le
    // superfici: il conto si fa dove l'elenco nasce.
    scritte({ [ICONA]: false, [NELL_ICONA]: true })
    assert.equal(voce(NELL_ICONA).sospesa, true)
    assert.equal(voce(ICONA).sospesa, false)

    await getConfiguration().update(ICONA, true)
    assert.equal(voce(NELL_ICONA).sospesa, false)
    // Il valore scritto non si tocca: riacceso il padre, la figlia torna com'era.
    assert.equal(voce(NELL_ICONA).valore, true)
  })

  it('come si disegna una voce arriva a chi la disegna', () => {
    // Un disegno solo per pannello e finestra nativa (ADR-52): il controllo, il
    // passo, l'unità e l'elenco che cambia si decidono qui, non in chi disegna.
    assert.equal(voce('registroDocenti.dettatura.taglia').controllo, 'segmenti')
    assert.equal(voce('registroDocenti.promemoria.avviso').controllo, 'tendina')
    assert.equal(voce('registroDocenti.api.accesso').controllo, 'tendina')
    const mittente = voce('registroDocenti.posta.mittente')
    assert.equal(mittente.scelteDinamiche, 'indirizziPosta')
    assert.equal(mittente.sceltaLibera, false)
    // Chi non ne ha dice `null`, non `undefined`: il protocollo è esplicito.
    const tema = voce('registroDocenti.aspetto.tema')
    for (const campo of ['minimo', 'massimo', 'passo', 'unita', 'controllo', 'scelteDinamiche']) {
      assert.equal(tema[campo], null, campo)
    }
    assert.equal(tema.sceltaLibera, false)
  })

  it('un numero porta il suo passo, intero se non ne dichiara un altro', () => {
    // Nessun `passo: 'any'`: senza passo scritto, il campo vuole un intero.
    for (const mostrata of vociImpostazioni()) {
      if (mostrata.tipo !== 'number') continue
      assert.equal(mostrata.passo, IMPOSTAZIONI[mostrata.chiave].passo ?? 1, mostrata.chiave)
    }
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
    assert.match(motivo, /Assistente e modelli/)
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
    assert.match(mostrata.bloccata, /Assistente e modelli/)
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

// ---------------------------------------------------- le chiavi accorpate
//
// Tre interruttori del condotto e i due del promemoria sono diventati una scelta
// ciascuno. Un `impostazioni.json` di prima si legge come se fosse di adesso, e
// all'avvio `ritiraChiaviDismesse` scrive la chiave nuova e toglie le vecchie.

describe('le chiavi vecchie diventano la scelta nuova', () => {
  const ACCESSO = 'registroDocenti.api.accesso'
  const AVVISO = 'registroDocenti.promemoria.avviso'
  const CONDOTTO = 'registroDocenti.api.condotto'
  const LETTURA = 'registroDocenti.api.lettura'
  const SCRITTURA = 'registroDocenti.api.scrittura'
  const ATTIVO = 'registroDocenti.promemoria.attivo'
  const ANTICIPO = 'registroDocenti.promemoria.anticipoMinuti'

  const accesso = () => getConfiguration().get(ACCESSO)
  const avviso = () => getConfiguration().get(AVVISO)
  const suDisco = () => JSON.parse(readFileSync(FILE, 'utf8'))

  it('il condotto: le concessioni di prima, nessuna in più', () => {
    const casi = [
      [{}, 'spento'],
      [{ [CONDOTTO]: false, [LETTURA]: true, [SCRITTURA]: true }, 'spento'],
      // La lettura era accesa di serie.
      [{ [CONDOTTO]: true }, 'lettura'],
      [{ [CONDOTTO]: true, [LETTURA]: true, [SCRITTURA]: false }, 'lettura'],
      [{ [CONDOTTO]: true, [SCRITTURA]: true }, 'letturaScrittura'],
      [{ [CONDOTTO]: true, [LETTURA]: false, [SCRITTURA]: false }, 'spento'],
      // «Solo scrittura» non c'è più: la scelta prudente non concede la lettura
      // che era negata, e la scrittura si riprende a mano.
      [{ [CONDOTTO]: true, [LETTURA]: false, [SCRITTURA]: true }, 'spento'],
    ]
    for (const [vecchie, attesa] of casi) {
      scritte(vecchie)
      assert.equal(accesso(), attesa, JSON.stringify(vecchie))
    }
  })

  it('il promemoria: spento resta spento, l’anticipo va alla scelta più vicina', () => {
    const casi = [
      [{}, '5'],
      [{ [ATTIVO]: false, [ANTICIPO]: 10 }, 'nessuno'],
      [{ [ATTIVO]: true, [ANTICIPO]: 0 }, '0'],
      [{ [ANTICIPO]: 10 }, '10'],
      [{ [ANTICIPO]: 3 }, '2'],
      // A pari distanza, prima: un avviso in anticipo non fa danni.
      [{ [ANTICIPO]: 12.5 }, '15'],
      [{ [ANTICIPO]: 90 }, '15'],
      // Un file scritto a mano: il predefinito.
      [{ [ANTICIPO]: 'dieci' }, '5'],
    ]
    for (const [vecchie, attesa] of casi) {
      scritte(vecchie)
      assert.equal(avviso(), attesa, JSON.stringify(vecchie))
    }
  })

  it('la chiave nuova già scritta vince sulle vecchie', () => {
    scritte({ [ACCESSO]: 'lettura', [CONDOTTO]: true, [SCRITTURA]: true, [AVVISO]: 'nessuno', [ATTIVO]: true })
    assert.equal(accesso(), 'lettura')
    assert.equal(avviso(), 'nessuno')
  })

  it('all’avvio la scelta si scrive e le vecchie se ne vanno', () => {
    scritte({ [CONDOTTO]: true, [SCRITTURA]: true, [ATTIVO]: false, [ANTICIPO]: 10, altra: 1 })
    ritiraChiaviDismesse()
    assert.deepEqual(suDisco(), { altra: 1, [ACCESSO]: 'letturaScrittura', [AVVISO]: 'nessuno' })

    ricaricaImpostazioni()
    assert.equal(accesso(), 'letturaScrittura')
    assert.equal(avviso(), 'nessuno')
  })

  it('una scelta uguale al predefinito non si scrive: non è stata decisa a mano', () => {
    scritte({ [CONDOTTO]: false, [ATTIVO]: true, [ANTICIPO]: 5 })
    ritiraChiaviDismesse()
    assert.deepEqual(suDisco(), {})
    assert.equal(voceMostrata(ACCESSO).scritta, false)
    assert.equal(voceMostrata(AVVISO).scritta, false)
  })

  it('le chiavi vecchie non passano più la dogana', () => {
    for (const chiave of [CONDOTTO, LETTURA, SCRITTURA, ATTIVO, SCARICO]) {
      assert.equal(accettato(chiave, true), undefined, chiave)
    }
    assert.equal(accettato(ANTICIPO, 5), undefined)
    assert.equal(accettato(PROGRAMMA, 'C:\\llama\\llama-mtmd-cli.exe'), undefined)
    assert.equal(accettato(INDIRIZZO, 'http://127.0.0.1:17493'), undefined)
  })

  const LETTORE = 'registroDocenti.ocr.lettore'
  const SCARICO = 'registroDocenti.modelli.scaricoAutomatico'
  const PROGRAMMA = 'registroDocenti.ocr.programma'
  const PORTA = 'registroDocenti.dettatura.porta'
  const INDIRIZZO = 'registroDocenti.dettatura.indirizzo'
  const lettore = () => getConfiguration().get(LETTORE)
  const porta = () => getConfiguration().get(PORTA)

  it('il programma di lettura: un .exe scritto a mano vince, lo scarico spento non scarica', () => {
    const exe = 'C:\\llama\\llama-mtmd-cli.exe'
    const casi = [
      [{}, ''],
      [{ [SCARICO]: true }, ''],
      [{ [SCARICO]: false }, 'nessuno'],
      // Il percorso vinceva sullo scaricato anche con lo scarico acceso.
      [{ [PROGRAMMA]: exe }, exe],
      [{ [SCARICO]: false, [PROGRAMMA]: `  ${exe}  ` }, exe],
      [{ [SCARICO]: false, [PROGRAMMA]: '   ' }, 'nessuno'],
    ]
    for (const [vecchie, attesa] of casi) {
      scritte(vecchie)
      assert.equal(lettore(), attesa, JSON.stringify(vecchie))
    }
  })

  it('voicebox: dell’indirizzo di prima resta la porta, se era di questo computer', () => {
    const casi = [
      [{}, 17493],
      [{ [INDIRIZZO]: 'http://127.0.0.1:17493' }, 17493],
      [{ [INDIRIZZO]: 'http://localhost:8000' }, 8000],
      [{ [INDIRIZZO]: 'http://[::1]:9000/' }, 9000],
      [{ [INDIRIZZO]: '  http://127.0.0.1:9001  ' }, 9001],
      // Un altro host il registro lo rifiutava: niente porta da portarsi dietro.
      [{ [INDIRIZZO]: 'http://192.168.1.10:8000' }, 17493],
      [{ [INDIRIZZO]: 'non è un indirizzo' }, 17493],
      [{ [INDIRIZZO]: 42 }, 17493],
    ]
    for (const [vecchie, attesa] of casi) {
      scritte(vecchie)
      assert.equal(porta(), attesa, JSON.stringify(vecchie))
    }
  })

  it('all’avvio lettore e porta si scrivono, e le chiavi di prima se ne vanno', () => {
    scritte({ [SCARICO]: false, [INDIRIZZO]: 'http://127.0.0.1:9000', altra: 1 })
    ritiraChiaviDismesse()
    assert.deepEqual(suDisco(), { altra: 1, [LETTORE]: 'nessuno', [PORTA]: 9000 })
    ricaricaImpostazioni()
    assert.equal(lettore(), 'nessuno')
    assert.equal(porta(), 9000)
  })

  it('lettore e porta già scritti vincono sulle chiavi di prima', () => {
    scritte({ [LETTORE]: '', [SCARICO]: false, [PORTA]: 1234, [INDIRIZZO]: 'http://127.0.0.1:9000' })
    assert.equal(lettore(), '')
    assert.equal(porta(), 1234)
  })
})

/** La voce come la vedono le superfici. */
function voceMostrata (chiave) {
  return vociImpostazioni().find((candidata) => candidata.chiave === chiave)
}
