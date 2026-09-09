// I modelli di `templates/` e i dati che il registro gli mette dentro.
//
// La prova che conta è che i due si conoscano: un `{{nome}}` che nessuno
// riempie diventa vuoto e sparisce in silenzio — è la regola giusta per i
// campi facoltativi, ed è anche il modo in cui un refuso in un modello passa
// inosservato fino al giorno in cui qualcuno guarda il PDF e chiede dov'è
// finita la materia. Lo stesso vale per una `tabella:` chiamata con un nome
// che il registro non produce: la sezione se ne va, e il foglio esce a metà
// senza dire niente.
//
// Qui si controllano i nomi, non l'aspetto: ogni segnaposto, ogni elenco e
// ogni tabella dei modelli di serie deve trovare qualcosa dall'altra parte.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  IMPOSTAZIONI_PREDEFINITE,
  componiCorpo,
  conBase,
  leggiBlocchi,
  leggiRichiestaBlocco,
  leggiRichiestaGalleria,
  leggiRichiestaTabella,
  leggiTesti,
  creaAllievo,
  creaAnno,
  creaAttivita,
  creaFascicolo,
  creaLezione,
  creaPiano,
  creaValutazione,
  datiAllievo,
  datiFascicolo,
  datiFotoClasse,
  datiLezione,
  datiMomento,
  datiPiano,
  datiPresenze,
  datiValutazioni,
  leggiModello,
  normalizzaRegistro,
} from '../../dist-prove/dominio.mjs'

import { leggiModelli } from '../../strumenti/modelli.mjs'

/** In intestazione e piede li mette l'impaginatore, non i dati del rapporto. */
const DELLA_PAGINA = new Set(['pagina', 'pagine'])

/**
 * Un registro con dentro un po' di tutto: serve a far uscire ogni tabella che
 * i modelli sanno chiedere, non a essere realistico.
 */
function registroCompleto () {
  const anno = creaAnno('2026-09-01', '2027-06-30', '2026/27', '2027-01-31')
  anno.id = 'a1'
  anno.semestri[0].id = 's1'

  const anna = { ...creaAllievo('Rossi', 'Anna'), id: 'al-1' }
  const luca = { ...creaAllievo('Bianchi', 'Luca'), id: 'al-2' }

  const piano = { ...creaPiano('cor-1'), id: 'pia-1' }
  piano.obiettivi = ['Saper leggere una fattura']
  piano.attivita = [creaAttivita('Esercizi', 2)]
  piano.prerequisiti = 'Le quattro operazioni'
  piano.note = 'Portare la calcolatrice'

  const lezione = creaLezione('cor-1', '2026-10-06', '08:00', 90)
  lezione.id = 'lez-1'
  lezione.stato = 'svolta'
  lezione.pianoId = piano.id
  lezione.presenze = [{ allievoId: 'al-1', stati: ['presente', 'assente'] }]
  lezione.argomenti = 'Le percentuali'
  lezione.consuntivo = 'Fatto quasi tutto'
  lezione.materiali = 'Fotocopie'

  const valutazione = creaValutazione('cor-1', 'Prova di ottobre', undefined, '2026-10-20')
  valutazione.id = 'val-1'
  valutazione.voti = [{ allievoId: 'al-1', valore: 5, assente: false, nota: '' }]

  const fascicolo = creaFascicolo('cl-1')
  fascicolo.id = 'fas-1'

  return normalizzaRegistro({
    anni: [anno],
    annoCorrenteId: 'a1',
    materie: [{ id: 'mat-1', nome: 'Calcolo professionale' }],
    classi: [{ id: 'cl-1', annoId: 'a1', nome: 'DIC2', allievi: [anna, luca] }],
    corsi: [{ id: 'cor-1', classeId: 'cl-1', materiaId: 'mat-1', titolo: 'CP — DIC2' }],
    lezioni: [lezione],
    piani: [piano],
    valutazioni: [valutazione],
    fascicoli: [fascicolo],
    impostazioni: IMPOSTAZIONI_PREDEFINITE,
  })
}

/** Che cosa ogni modello riceve: la stessa coppia che `azioni/rapporti.ts` fa. */
function datiPerModello (registro) {
  const classe = registro.classi[0]
  const corso = registro.corsi[0]
  const semestre = registro.anni[0].semestri[0]
  const allievo = classe.allievi[0]

  return {
    'verbale-lezione': datiLezione(registro, registro.lezioni[0], []),
    'momento-valutazione': datiMomento(registro, registro.valutazioni[0]),
    'piano-lezione': datiPiano(registro, registro.piani[0]),
    'valutazioni-classe': datiValutazioni(registro, corso, semestre),
    'presenze-classe': datiPresenze(registro, corso, semestre),
    'fascicolo-classe': datiFascicolo(registro, classe),
    'scheda-allievo': datiAllievo(registro, classe, allievo, semestre, corso),
    'foto-classe': datiFotoClasse(registro, classe),
  }
}

/**
 * I nomi che un modello chiede: segnaposto, elenchi, tabelle, grafici.
 *
 * Un `{{frase.nome}}` non è un segnaposto del rapporto: è una frase di
 * `_testi.tpl`, e quel che va cercato nei dati sono i segnaposto scritti dentro
 * di lei. Si va a prenderla e si guarda là, o una frase che nomina un valore
 * che non esiste uscirebbe monca senza che nessuna prova se ne accorga.
 */
function chiesti (modello, frasi = {}, pezzi = {}) {
  const segnaposto = new Set()
  const elenchi = new Set()
  const tabelle = new Set()
  const grafici = new Set()
  const gallerie = new Set()
  const condizioni = new Set()
  const fraseMancante = []

  // `locali` sono i nomi che il blocco riceve come parametri: li riempie chi lo
  // chiama, non i dati del rapporto, e cercarli fra i valori darebbe un falso
  // allarme su ogni blocco riusabile.
  const daTesto = (testo, dentroUnaFrase = false, locali = new Set()) => {
    for (const trovato of testo.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)) {
      const nome = trovato[1]
      if (!nome.startsWith('frase.')) {
        if (!locali.has(nome)) segnaposto.add(nome)
        continue
      }
      // Una frase dentro una frase non si risolve: `riempi` fa un giro solo.
      if (dentroUnaFrase) continue
      const frase = frasi[nome.slice('frase.'.length)]
      if (frase === undefined) fraseMancante.push(nome)
      else daTesto(frase, true)
    }
  }

  for (const riga of [...modello.intestazione, ...modello.piede]) {
    daTesto(`${riga.sinistra} ${riga.centro} ${riga.destra}`)
  }

  // I blocchi si aprono: quel che sta dentro un `usa:` è contenuto del rapporto
  // come il resto, e non guardarci vorrebbe dire smettere di controllare
  // proprio i pezzi che più rapporti si dividono.
  const bloccoMancante = []
  const percorri = (blocchi, dentro = new Set(), locali = new Set()) => {
    for (const blocco of blocchi) {
      if (blocco.tipo === 'usa') {
        const { nome, parametri } = leggiRichiestaBlocco(blocco.valore)
        // I parametri li scrive chi chiama, con i segnaposto del suo rapporto:
        // quelli si controllano, e dentro al blocco valgono per dati.
        for (const valore of Object.values(parametri)) daTesto(valore, false, locali)
        if (!(nome in pezzi)) bloccoMancante.push(nome)
        else if (!dentro.has(nome)) {
          percorri(pezzi[nome], new Set([...dentro, nome]), new Set(Object.keys(parametri)))
        }
        continue
      }
      // Un `se:` può nominare una tabella o un elenco e non un valore: «c'è
      // qualcosa da mostrare?» si chiede anche di quelli, ed è quel che fa
      // sparire una sezione insieme a quel che non c'è.
      if (blocco.tipo === 'se' || blocco.tipo === 'altrimenti') {
        const solo = blocco.valore.trim().match(/^\{\{\s*([\w.-]+)\s*\}\}$/)
        if (solo) condizioni.add(solo[1])
        else daTesto(blocco.valore, false, locali)
        continue
      }
      if (blocco.tipo === 'elenco') elenchi.add(blocco.valore)
      else if (blocco.tipo === 'tabella') tabelle.add(leggiRichiestaTabella(blocco.valore).nome)
      else if (blocco.tipo === 'grafico') grafici.add(blocco.valore)
      else if (blocco.tipo === 'galleria') gallerie.add(leggiRichiestaGalleria(blocco.valore).nome)
      else daTesto(blocco.valore, false, locali)
    }
  }
  percorri(modello.corpo)

  return { segnaposto, elenchi, tabelle, grafici, gallerie, condizioni, fraseMancante, bloccoMancante }
}

describe('i modelli di serie e i dati dei rapporti', () => {
  const modelli = new Map(leggiModelli().map(({ nome, testo }) => [nome, testo]))
  // Gli strati comuni si compongono come li compone il registro: `_stile` sta
  // sotto `_base`, e `_base` sotto ogni rapporto. Provare i modelli contro il
  // solo `_base` vorrebbe dire non accorgersi mai se lo strato di sotto smette
  // di arrivare in cima.
  const base = conBase(
    leggiModello('_base', modelli.get('_base')),
    leggiModello('_stile', modelli.get('_stile')),
  )
  const registro = registroCompleto()
  const dati = datiPerModello(registro)
  const parole = leggiTesti(modelli.get('_testi') ?? '')
  const pezzi = leggiBlocchi(modelli.get('_blocchi') ?? '')

  it('sono uno per rapporto, e nessuno di più', () => {
    // Un modello in cartella che nessuna azione sa riempire uscirebbe vuoto, e
    // uno chiamato da un'azione ma non in cartella non uscirebbe affatto. Il
    // trattino basso in testa segna gli strati comuni — `_base`, `_stile` — che
    // rapporti non sono e da soli non si stampano.
    assert.deepEqual(
      [...modelli.keys()].filter((nome) => !nome.startsWith('_')).sort(),
      Object.keys(dati).sort(),
    )
  })

  for (const nome of Object.keys(dati).sort()) {
    it(`«${nome}» chiede solo quel che il registro produce`, () => {
      const modello = conBase(leggiModello(nome, modelli.get(nome)), base)
      const chiesto = chiesti(modello, parole.frasi, pezzi)
      const {
        segnaposto, elenchi, tabelle, grafici, gallerie, condizioni, fraseMancante, bloccoMancante,
      } = chiesto
      const suoi = dati[nome]

      assert.deepEqual(fraseMancante, [], `frasi che _testi.tpl non ha: ${fraseMancante.join(', ')}`)
      assert.deepEqual(bloccoMancante, [], `blocchi che _blocchi.tpl non ha: ${bloccoMancante.join(', ')}`)

      const mancanti = [...segnaposto]
        .filter((chiave) => !DELLA_PAGINA.has(chiave))
        .filter((chiave) => !(chiave in suoi.valori))
      assert.deepEqual(mancanti, [], `segnaposto senza valore: ${mancanti.join(', ')}`)

      const senzaElenco = [...elenchi].filter((chiave) => !(chiave in suoi.elenchi))
      assert.deepEqual(senzaElenco, [], `elenchi senza dati: ${senzaElenco.join(', ')}`)

      const senzaTabella = [...tabelle].filter((chiave) => !(chiave in suoi.tabelle))
      assert.deepEqual(senzaTabella, [], `tabelle senza dati: ${senzaTabella.join(', ')}`)

      const senzaGrafico = [...grafici].filter((chiave) => !(chiave in suoi.grafici))
      assert.deepEqual(senzaGrafico, [], `grafici senza dati: ${senzaGrafico.join(', ')}`)

      const senzaGalleria = [...gallerie].filter((chiave) => !(chiave in (suoi.gallerie ?? {})))
      assert.deepEqual(senzaGalleria, [], `gallerie senza dati: ${senzaGalleria.join(', ')}`)

      // Un `se:` deve nominare qualcosa che esiste, di qualunque genere: se non
      // esiste è sempre falso, e il pezzo che protegge non si stampa mai —
      // errore che nessuno vede finché non manca il foglio.
      const senzaNiente = [...condizioni].filter(
        (chiave) =>
          !DELLA_PAGINA.has(chiave) &&
          !(chiave in suoi.valori) &&
          !(chiave in suoi.elenchi) &&
          !(chiave in suoi.tabelle) &&
          !(chiave in suoi.grafici) &&
          !(chiave in (suoi.gallerie ?? {})),
      )
      assert.deepEqual(senzaNiente, [], `«se:» su nomi che non esistono: ${senzaNiente.join(', ')}`)
    })
  }

  it('la testata comune esce riempita su tutti', () => {
    // È il pezzo che rende i rapporti riconoscibili come una famiglia: se un
    // rapporto non sa dire che anno sia, la testata è la stessa di un foglio
    // qualunque.
    for (const [nome, suoi] of Object.entries(dati)) {
      for (const chiave of ['titolo', 'anno', 'periodo', 'generato', 'classe', 'materia', 'corso']) {
        assert.ok(chiave in suoi.valori, `«${nome}» non dice ${chiave}`)
      }
      assert.notEqual(suoi.valori.titolo, '', `«${nome}» senza titolo in testata`)
      assert.notEqual(suoi.valori.periodo, '', `«${nome}» senza periodo in testata`)
    }
  })

  it('quel che è lungo va in un paragrafo, non in un testo', () => {
    // `testo:` stampa una riga sola e tronca il resto: va bene per una riga di
    // riepilogo, non per una nota che spiega come si contano le percentuali —
    // e la nota delle presenze usciva tagliata a metà frase sul PDF. Il limite
    // è largo: serve a distinguere una riga da un discorso.
    for (const nome of Object.keys(dati)) {
      const modello = conBase(leggiModello(nome, modelli.get(nome)), base)
      for (const blocco of componiCorpo(modello, dati[nome])) {
        if (blocco.tipo !== 'testo') continue
        assert.ok(
          blocco.valore.length <= 120,
          `«${nome}» stampa con «testo:» una riga di ${blocco.valore.length} caratteri: ` +
            'sul PDF viene troncata, va scritta con «paragrafo:»',
        )
      }
    }
  })

  it('ogni modello compone un corpo, e non lascia graffe dentro', () => {
    // `componiCorpo` toglie quel che è rimasto vuoto: se dopo di lui c'è
    // ancora un `{{`, vuol dire che il segnaposto è stato scritto male — due
    // graffe da una parte e una dall'altra — e sul PDF si vedrebbe.
    for (const nome of Object.keys(dati)) {
      const modello = conBase(leggiModello(nome, modelli.get(nome)), base)
      const corpo = componiCorpo(modello, dati[nome])

      assert.ok(corpo.length > 0, `«${nome}» non stampa niente`)
      for (const blocco of corpo) {
        assert.ok(
          blocco.tipo === 'tabella' ||
            blocco.tipo === 'elenco' ||
            blocco.tipo === 'grafico' ||
            !blocco.valore.includes('{{'),
          `«${nome}» lascia un segnaposto in «${blocco.valore}»`,
        )
      }
    }
  })
})
