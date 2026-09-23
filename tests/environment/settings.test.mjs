// Le impostazioni dello shim.
//
// Due cose da tenere ferme: che i predefiniti vengano dal manifesto e non da un
// secondo elenco scritto a mano, e che `affectsConfiguration` confronti per
// prefisso puntato, perché è così che `startup.ts` e `panels/panel.ts` sanno
// se il cambiamento riguarda loro.
//
// E poi le due funzioni da cui passa tutto il resto: `valoreAccettabile`, che
// decide che cosa entra nel file, e `vociImpostazioni()`, che decide che cosa
// le due superfici mostrano. Sono l'unico posto in cui quelle due domande si
// rispondono, ed è il motivo per cui si provano qui e non davanti a uno
// schermo: un `formato` non fatto rispettare e una chiave che compare in una
// superficie e non nell'altra non si vedono guardando una finestra sola.
//
// Il modulo si importa diretto e non dall'apparato: è lo stesso codice, ma due
// bundle vorrebbero dire due depositi in memoria sullo stesso file, e una
// `ricaricaImpostazioni()` che ne riallinea uno solo.

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { beforeEach, describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-impostazioni-'))

const {
  getConfiguration,
  onDidChangeConfiguration,
  ricaricaImpostazioni,
  valoreAccettabile,
  vociImpostazioni,
} = await import('../../dist-tests/settings.mjs')
const { IMPOSTAZIONI } = await import('../../dist-tests/manifest.mjs')

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

    assert.equal(registro.get('aperturaAutomatica'), true)
    assert.equal(registro.get('ocr.attesaMassimaSecondi'), 180)
  })

  it('funziona con una sezione puntata, come la usa mail.ts', () => {
    const posta = getConfiguration('registroDocenti.posta')

    assert.equal(posta.get('invioDiretto'), false)
    assert.equal(posta.get('mittente'), '')
    assert.equal(posta.get('utente'), '')
  })

  it('il ripiego passato dal chiamante non copre il predefinito', () => {
    // Chi legge passa spesso un ripiego che coincide con il predefinito: è
    // giusto che sia il manifesto a comandare, o i due elenchi divergerebbero
    // in silenzio il giorno in cui uno dei due cambia.
    assert.equal(getConfiguration('registroDocenti').get('ocr.attesaMassimaSecondi', 9), 180)
  })

  it('quel che è scritto nel file vince sul predefinito', () => {
    scritte({ 'registroDocenti.ocr.attesaMassimaSecondi': 240 })

    assert.equal(getConfiguration('registroDocenti').get('ocr.attesaMassimaSecondi'), 240)
  })

  it('una chiave ricordata e non dichiarata si legge, senza predefinito', () => {
    // `ultimoDocumento` e `cartellaLavoro` stanno nel file ma non nel
    // manifesto: le scrive il programma quando si apre un documento, e non sono
    // scelte da offrire. Chi le legge porta il proprio ripiego, perché qui non
    // ce n'è.
    assert.equal(getConfiguration('registroDocenti').get('ultimoDocumento'), undefined)
    assert.equal(getConfiguration('registroDocenti').get('ultimoDocumento', ''), '')

    scritte({ 'registroDocenti.ultimoDocumento': 'D:/Registro/2026-2027.registro' })
    assert.equal(
      getConfiguration('registroDocenti').get('ultimoDocumento', ''),
      'D:/Registro/2026-2027.registro',
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
    await getConfiguration('registroDocenti').update('ultimoDocumento', 'D:/altrove/2027-2028.registro')
    ricaricaImpostazioni()

    assert.equal(
      getConfiguration('registroDocenti').get('ultimoDocumento'),
      'D:/altrove/2027-2028.registro',
    )
  })

  it('undefined toglie la chiave e riporta il predefinito', async () => {
    const registro = getConfiguration('registroDocenti')
    await registro.update('ocr.attesaMassimaSecondi', 240)
    await registro.update('ocr.attesaMassimaSecondi', undefined)

    assert.equal(getConfiguration('registroDocenti').get('ocr.attesaMassimaSecondi'), 180)
  })
})

// ---------------------------------------------------------------- la dogana
//
// Quel che entra nel file, e quel che viene respinto. Non è pignoleria: da qui
// passano la pagina del pannello, la finestra nativa e la riga di comando, e
// quel che passa di qui il registro poi lo legge come vero.

describe('la dogana guarda tutto quel che il manifesto dichiara', () => {
  const MITTENTE = 'registroDocenti.posta.mittente'
  const UTENTE = 'registroDocenti.posta.utente'
  const ANTICIPO = 'registroDocenti.promemoria.anticipoMinuti'

  it('un indirizzo che non è un indirizzo non entra', () => {
    // Si salvava senza una parola da ogni parte tranne che dalla finestra
    // nativa, che lo fermava per conto suo: la regola valeva dove capitava.
    // Riemergeva mesi dopo come un rifiuto del server di posta.
    assert.equal(valoreAccettabile(MITTENTE, 'pippo'), undefined)
    assert.equal(valoreAccettabile(MITTENTE, 'nome.cognome@edu.ti.ch'), 'nome.cognome@edu.ti.ch')
  })

  it('il vuoto resta lecito: è il predefinito, e vuol dire «lo stesso dell’altro»', () => {
    assert.equal(valoreAccettabile(MITTENTE, ''), '')
    assert.equal(valoreAccettabile(UTENTE, '   '), '   ')
  })

  it('anche il nome di accesso è un indirizzo, e lo dichiara', () => {
    // Non lo dichiarava: una sigla senza dominio entrava, e il server la
    // rifiutava all’invio e non un minuto prima.
    assert.equal(IMPOSTAZIONI[UTENTE].formato, 'email')
    assert.equal(valoreAccettabile(UTENTE, 'xxx000'), undefined)
    assert.equal(valoreAccettabile(UTENTE, 'xxx000@edu.ti.ch'), 'xxx000@edu.ti.ch')
  })

  it('un numero fuori dagli estremi non entra', () => {
    // −30 si salvava, restava scritto nel campo, e a valle un `Math.max` lo
    // stringeva a zero in silenzio: il campo continuava a mostrare un numero
    // che non aveva nessun effetto.
    assert.equal(valoreAccettabile(ANTICIPO, -30), undefined)
    assert.equal(valoreAccettabile(ANTICIPO, 0), 0)
    assert.equal(valoreAccettabile(ANTICIPO, 5), 5)
    assert.equal(valoreAccettabile(ANTICIPO, 500), undefined)
  })

  it('gli estremi che la descrizione dichiarava da sempre adesso li fa rispettare', () => {
    // «Sotto i dieci secondi il registro non va, comunque sia scritto qui»: era
    // scritto nella descrizione e non lo controllava nessuno.
    assert.equal(valoreAccettabile('registroDocenti.ocr.attesaMassimaSecondi', 3), undefined)
    assert.equal(valoreAccettabile('registroDocenti.dettatura.durataMassimaSecondi', 1), undefined)
    assert.equal(valoreAccettabile('registroDocenti.dettatura.durataMassimaSecondi', 600), undefined)
    assert.equal(valoreAccettabile('registroDocenti.dettatura.durataMassimaSecondi', 60), 60)
  })

  it('una chiave inventata, un tipo sbagliato e una scelta fuori elenco restano fuori', () => {
    assert.equal(valoreAccettabile('registroDocenti.inventata', true), undefined)
    assert.equal(valoreAccettabile(ANTICIPO, '5'), undefined)
    assert.equal(valoreAccettabile('registroDocenti.aspetto.tema', 'fucsia'), undefined)
    assert.equal(valoreAccettabile('registroDocenti.aspetto.tema', 'scuro'), 'scuro')
  })
})

// ------------------------------------------------- quel che le superfici vedono
//
// `vociImpostazioni()` è l'unico posto da cui la pagina del pannello e la
// finestra nativa prendono l'elenco. Quel che decide qui vale per tutte e due,
// e una differenza fra le due non potrebbe più nascere da un'altra parte.

describe('le voci che le due superfici mostrano', () => {
  const CONDOTTO = 'registroDocenti.api.condotto'
  const LETTURA = 'registroDocenti.api.lettura'

  const voce = (chiave) => vociImpostazioni().find((candidata) => candidata.chiave === chiave)

  it('lo stato del widget non si mostra, ma si può scrivere', () => {
    // Dove sta l'agenda e quanto è larga le scrive il trascinamento: offrirle
    // come scelte vorrebbe dire un campo che si compila e non ha effetto. Ma il
    // widget deve poterle scrivere, e per lui la dogana resta aperta.
    const nascoste = Object.keys(IMPOSTAZIONI).filter((chiave) => IMPOSTAZIONI[chiave].nascosta)
    assert.ok(nascoste.length > 0, 'nessuna chiave dichiarata nascosta')

    const mostrate = vociImpostazioni().map((candidata) => candidata.chiave)
    for (const chiave of nascoste) {
      assert.equal(mostrate.includes(chiave), false, `«${chiave}» non doveva comparire`)
      assert.notEqual(
        valoreAccettabile(chiave, IMPOSTAZIONI[chiave].predefinito),
        undefined,
        `«${chiave}» deve restare scrivibile: la scrive il widget`,
      )
    }

    // E tutto il resto c'è: nascondere non è un modo per far sparire.
    const attese = Object.keys(IMPOSTAZIONI).filter((chiave) => !IMPOSTAZIONI[chiave].nascosta)
    assert.deepEqual(mostrate, attese)
  })

  it('il padre spento sospende le figlie, e lo dice a chi disegna', async () => {
    // La regola la applicava solo il pannello: la finestra nativa mostrava
    // `api.lettura` spuntata e modificabile con il condotto spento — una pagina
    // che governa un accesso dichiarava concessa una cosa che il condotto non
    // concede. Adesso il conto si fa dove l'elenco nasce, una volta per tutte
    // e due.
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
