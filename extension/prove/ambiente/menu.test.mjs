// Il menu e il modulo delle impostazioni, provati contro il manifesto.
//
// La prova non verifica che il menu contenga un certo elenco di comandi: quello
// sarebbe un secondo elenco da tenere allineato, cioè il difetto che
// `src/manifesto.ts` esiste per evitare. Verifica invece la *regola*: che nel
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

const { modelloDelMenu, vociImpostazioni } = await import('../../dist-prove/menu.mjs')
const { COMANDI, IMPOSTAZIONI } = await import('../../dist-prove/manifesto.mjs')

/** Il menu costruito con un'azione finta al posto del cambio di cartella. */
function menu () {
  return modelloDelMenu({ cambiaCartella: async () => {} })
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
    assert.equal(voci.get('registroDocenti.apri'), 'Apri')
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

  it('c’è la voce per cambiare cartella, che è del guscio e non del manifesto', () => {
    const cartelle = menu().find((gruppo) => gruppo.label === 'Cartelle')

    const etichette = cartelle.submenu.map((voce) => voce.label)
    assert.ok(etichette.includes('Cambia cartella di lavoro…'))
    assert.ok(etichette.includes('Impostazioni…'))
  })
})

describe('il modulo delle impostazioni viene dal manifesto', () => {
  const ESCLUSE = ['registroDocenti.posta.autenticazione']

  it('c’è ogni impostazione del manifesto meno quella esclusa', () => {
    const attese = Object.keys(IMPOSTAZIONI).filter((chiave) => !ESCLUSE.includes(chiave))

    assert.deepEqual(vociImpostazioni().map((voce) => voce.chiave), attese)
  })

  it('l’esclusa non c’è: la scrive il comando che collega la casella', () => {
    const chiavi = vociImpostazioni().map((voce) => voce.chiave)

    for (const esclusa of ESCLUSE) assert.ok(!chiavi.includes(esclusa))
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
    const porta = vociImpostazioni().find((voce) => voce.chiave === 'registroDocenti.posta.porta')

    assert.deepEqual(porta.scelte.map((scelta) => scelta.valore), [587, 465, 25])
    assert.ok(porta.scelte[0].aiuto.startsWith('587:'))
  })

  it('il formato arriva alla pagina: il mittente è un indirizzo', () => {
    const mittente = vociImpostazioni().find(
      (voce) => voce.chiave === 'registroDocenti.posta.mittente',
    )

    assert.equal(mittente.formato, 'email')
  })

  it('l’account dell’editor non è più un modo di entrare', () => {
    const scelte = IMPOSTAZIONI['registroDocenti.posta.autenticazione'].scelte

    assert.deepEqual(scelte.map((scelta) => scelta.valore), ['oauth', 'password'])
  })
})
