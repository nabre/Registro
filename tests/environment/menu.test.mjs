// Il menu e il modulo delle impostazioni contro il manifesto: nessun elenco
// ricopiato, si prova la *regola*. Nel menu c'è esattamente quel che il
// manifesto dice (un comando non raggruppato finisce sotto «Altro»), e il
// modulo mostra tutte le impostazioni.

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-menu-'))

// Un'impostazione scritta nel file prima che il modulo legga: distingue il
// valore del docente dal predefinito. È un interruttore senza `richiede`,
// perché `ocr.attivo` senza modello si leggerebbe spento.
const SCRITTA = 'registroDocenti.dettatura.attivo'
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
    // Un paio nominate: la prova a giro non direbbe se manifesto e menu si sono
    // svuotati insieme.
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
    // Le due voci dicono quale impostazione aprono: quella del programma (finestra
    // nativa) e la pagina del registro.
    assert.ok(etichette.includes('Impostazioni del programma…'))
    assert.ok(!etichette.includes('Cambia cartella di lavoro…'))
  })

  it('«Disinstalla…» sta nel menu Registro, e chiama chi la offre', async () => {
    let chiesta = 0
    const modello = modelloDelMenu({
      apriDocumento: async () => {},
      disinstalla: async () => { chiesta += 1 },
    })
    const voce = modello.find((gruppo) => gruppo.label === 'Registro')
      .submenu.find((v) => v.label === 'Disinstalla…')
    assert.ok(voce, 'manca la voce «Disinstalla…»')
    voce.click()
    assert.equal(chiesta, 1)
    // Senza l'azione, niente voce: meglio che una voce che non fa niente.
    const senza = menu().find((gruppo) => gruppo.label === 'Registro').submenu
    assert.ok(!senza.some((v) => v.label === 'Disinstalla…'))
  })

  it('una sola voce porta CommandOrControl+, e apre la pagina del registro', () => {
    const conScorciatoia = tutteLeVoci(menu()).filter(
      (voce) => voce.accelerator === 'CommandOrControl+,',
    )

    // Una scorciatoia sola: due voci con la stessa lascerebbero decidere a
    // Electron.
    assert.equal(conScorciatoia.length, 1)
    assert.equal(conScorciatoia[0].id, 'registroDocenti.impostazioni')
  })
})

describe('il modulo delle impostazioni viene dal manifesto', () => {
  it('c’è ogni impostazione del manifesto, nessuna esclusa', () => {
    // Nessuna esclusione: una chiave non mostrata si cambierebbe solo da riga di
    // comando.
    assert.deepEqual(vociImpostazioni().map((voce) => voce.chiave), Object.keys(IMPOSTAZIONI))
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
    // Server, porta, modo di entrare, tenant, ID applicazione: il codice d'invio li
    // sa da sé o li ricava dall'indirizzo, e non sono caselle da riempire.
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
