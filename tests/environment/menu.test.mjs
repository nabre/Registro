// Il menu e il modulo delle impostazioni, provati contro il manifesto.
//
// La prova non verifica che il menu contenga un certo elenco di comandi: quello
// sarebbe un secondo elenco da tenere allineato, cioè il difetto che
// `src/manifest.ts` esiste per evitare. Verifica invece la *regola*: che nel
// menu ci sia esattamente quel che il manifesto dice, e che il modulo mostri
// tutte le impostazioni meno quella esclusa a mano.
//
// Se domani si aggiunge un comando al manifesto e ci si dimentica di
// raggrupparlo, questa prova resta verde — il comando finisce sotto «Altro» — ma
// se lo si perde per strada diventa rossa.

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-menu-'))

// Un'impostazione scritta nel file, prima che il modulo legga: serve a
// distinguere quel che il docente ha messo da quel che viene dal manifesto.
const SCRITTA = 'registroDocenti.ocr.attivo'
writeFileSync(
  percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
  JSON.stringify({ [SCRITTA]: true }),
  'utf8',
)

const { modelloDelMenu, vociImpostazioni } = await import('../../dist-tests/menu.mjs')
const { COMANDI, IMPOSTAZIONI } = await import('../../dist-tests/manifest.mjs')

/** Il menu costruito con un'azione finta al posto dell'apertura di un anno. */
function menu () {
  return modelloDelMenu({ apriDocumento: async () => {} })
}

/** Tutte le voci di tutti i sottomenu, appiattite. */
function tutteLeVoci (modello) {
  return modello.flatMap((gruppo) => gruppo.submenu ?? [])
}

/** I comandi finiti nel menu, nell'ordine in cui ci si trovano. */
function comandiNelMenu () {
  return tutteLeVoci(menu())
    .map((voce) => voce.id)
    .filter((id) => typeof id === 'string' && id.startsWith('registroDocenti.'))
}

describe('il menu viene dal manifesto', () => {
  it('c’è ogni comando del manifesto, una volta sola', () => {
    const attesi = COMANDI.map((comando) => comando.id)
    const trovati = comandiNelMenu()

    assert.deepEqual([...trovati].sort(), [...attesi].sort())
    assert.equal(new Set(trovati).size, trovati.length, 'un comando compare due volte')
  })

  it('le etichette sono i titoli del manifesto, e ci arrivano intatte', () => {
    const voci = new Map(tutteLeVoci(menu()).map((voce) => [voce.id, voce.label]))

    for (const comando of COMANDI) assert.equal(voci.get(comando.id), comando.titolo)
    // Un paio nominate, perché una prova tutta a giro non direbbe se il
    // manifesto e il menu si sono svuotati insieme.
    assert.equal(voci.get('registroDocenti.apri'), 'Mostra il registro')
    assert.equal(voci.get('registroDocenti.nuovoCorso'), 'Nuovo corso (una materia a una classe)')
  })

  it('le scorciatoie arrivano al menu come sono scritte', () => {
    const voci = new Map(tutteLeVoci(menu()).map((voce) => [voce.id, voce.accelerator]))

    for (const comando of COMANDI) assert.equal(voci.get(comando.id), comando.scorciatoia)
    assert.equal(voci.get('registroDocenti.apri'), 'CommandOrControl+Alt+R')
    assert.equal(voci.get('registroDocenti.oggi'), 'CommandOrControl+Alt+T')
    assert.equal(voci.get('registroDocenti.nuovaLezione'), 'CommandOrControl+Alt+N')
  })

  it('le scorciatoie dicono CommandOrControl, o su macOS resterebbero mute', () => {
    for (const comando of COMANDI) {
      if (!comando.scorciatoia) continue
      assert.ok(
        !/\bctrl\b/i.test(comando.scorciatoia) && !/\bControl\+/.test(comando.scorciatoia),
        `${comando.id}: «${comando.scorciatoia}» non è nella grafia di Electron`,
      )
    }
  })

  it('c’è la voce per aprire un documento, che è del guscio e non del manifesto', () => {
    const registro = menu().find((gruppo) => gruppo.label === 'Registro')

    const etichette = registro.submenu.map((voce) => voce.label)
    assert.ok(etichette.includes('Apri…'))
    // La finestra nativa si chiamava «Impostazioni…», come la voce di «Vai a»
    // che apre la **pagina** del registro, e le due portavano la stessa
    // scorciatoia. Adesso dicono quale delle due impostazioni aprono.
    assert.ok(etichette.includes('Impostazioni del programma…'))
    assert.ok(!etichette.includes('Cambia cartella di lavoro…'))
  })

  it('una sola voce porta CommandOrControl+, e apre la pagina del registro', () => {
    const conScorciatoia = tutteLeVoci(menu()).filter(
      (voce) => voce.accelerator === 'CommandOrControl+,',
    )

    // Erano due: quella del manifesto in «Vai a» e quella del guscio in
    // «Registro». Quale delle due vincesse lo decideva Electron, e le due
    // andavano comunque nello stesso posto perché i due comandi si
    // registravano con lo stesso id.
    assert.equal(conScorciatoia.length, 1)
    assert.equal(conScorciatoia[0].id, 'registroDocenti.impostazioni')
  })
})

describe('il modulo delle impostazioni viene dal manifesto', () => {
  it('c’è ogni impostazione del manifesto, meno quelle dichiarate nascoste', () => {
    // Le escluse sono esattamente quelle che il manifesto dichiara `nascosta`:
    // lo stato che il widget dell'agenda si scrive addosso, che offerto come
    // scelta sarebbe un campo che si compila e non ha effetto. Nessun'altra
    // esclusione è possibile senza dirlo in una riga che si legge — ed è il
    // punto di questa prova, che prima diceva «nessun'altra» e adesso dice
    // «solo quelle».
    const attese = Object.keys(IMPOSTAZIONI).filter((chiave) => !IMPOSTAZIONI[chiave].nascosta)
    assert.deepEqual(vociImpostazioni().map((voce) => voce.chiave), attese)
    assert.ok(attese.length < Object.keys(IMPOSTAZIONI).length, 'nessuna chiave dichiarata nascosta')
  })

  it('ogni voce porta con sé tipo, descrizione e predefinito', () => {
    for (const voce of vociImpostazioni()) {
      const dichiarata = IMPOSTAZIONI[voce.chiave]
      assert.equal(voce.tipo, dichiarata.tipo)
      assert.equal(voce.descrizione, dichiarata.descrizione)
      assert.equal(voce.predefinito, dichiarata.predefinito)
    }
  })

  it('quel che è scritto nel file si distingue dal predefinito', () => {
    const voci = new Map(vociImpostazioni().map((voce) => [voce.chiave, voce]))

    // Scritta: il modulo la mostra com'è e offre di ritirarla.
    assert.equal(voci.get(SCRITTA).valore, true)
    assert.equal(voci.get(SCRITTA).predefinito, false)
    assert.equal(voci.get(SCRITTA).scritta, true)

    // Non scritta: il valore è il predefinito, e non c'è niente da ritirare.
    const altra = voci.get('registroDocenti.ocr.modello')
    assert.equal(altra.valore, altra.predefinito)
    assert.equal(altra.scritta, false)
  })

  it('le scelte arrivano con il loro aiuto, uno per scelta', () => {
    const tema = vociImpostazioni().find((voce) => voce.chiave === 'registroDocenti.aspetto.tema')

    assert.deepEqual(tema.scelte.map((scelta) => scelta.valore), ['sistema', 'chiaro', 'scuro'])
    assert.ok(tema.scelte[0].aiuto.startsWith('Sistema:'))
  })

  it('il formato arriva alla pagina: il mittente è un indirizzo', () => {
    const mittente = vociImpostazioni().find(
      (voce) => voce.chiave === 'registroDocenti.posta.mittente',
    )

    assert.equal(mittente.formato, 'email')
  })

  it('la posta chiede tre cose e non una di più', () => {
    // Il resto — server, porta, modo di entrare, tenant, ID applicazione — il
    // codice d'invio lo sa da sé: sono costanti, o si ricavano dall'indirizzo.
    // Una casella da riempire per una cosa che il programma sa già è una
    // casella che si sbaglia, e questa prova è quel che impedisce di
    // rimettercele.
    const dellaPosta = Object.keys(IMPOSTAZIONI)
      .filter((chiave) => chiave.startsWith('registroDocenti.posta.'))
      .sort()

    assert.deepEqual(dellaPosta, [
      'registroDocenti.posta.invioDiretto',
      'registroDocenti.posta.mittente',
      'registroDocenti.posta.utente',
    ])
  })
})
