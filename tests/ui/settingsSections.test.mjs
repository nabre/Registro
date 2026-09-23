// Come le impostazioni del programma si dividono nelle sezioni della pagina.
//
// La prova che conta è una sola, ed è quella che non si vede guardando lo
// schermo: **ogni impostazione del manifesto finisce in un posto, e in uno
// solo**. Un'impostazione che non finisce da nessuna parte esiste — si può
// cambiare da riga di comando, il registro la legge — ma nella pagina non c'è,
// e chi la cerca conclude che non si può regolare. Una che finisce in due
// posti si cambia in uno e sembra non salvata nell'altro.
//
// «Un posto» sono due specie di posti, e tutte e due contano: l'elenco di una
// sezione, o la scheda dedicata di quella sezione — `CHIAVI_IN_SCHEDA` — che
// se la disegna da sé accanto alla riga che ne racconta l'effetto. Una chiave
// promossa in una scheda sparisce dall'elenco apposta, e questa prova deve
// contarla lo stesso: altrimenti basterebbe promuoverla per farla sparire
// davvero senza che nessuna prova se ne accorga.
//
// Le chiavi **nascoste** non entrano in questo conto, ed è apposta: sono lo
// stato che il widget dell'agenda si scrive addosso — dove sta, quanto è larga
// — e le salta `vociImpostazioni()`, cioè l'unico posto da cui tutte e due le
// superfici prendono l'elenco. Si saltano anche qui, ma solo quelle che il
// manifesto dichiara tali: la garanzia resta intera, perché una chiave nuova
// può sparire dalla pagina solo dicendolo, in una riga che si legge.
//
// Le sezioni si possono riordinare e rinominare liberamente: qui non si prova
// come si chiamano, si prova che coprono tutto.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { IMPOSTAZIONI, sospesa } from '../../dist-tests/manifest.mjs'
import {
  CHIAVI_IN_SCHEDA,
  SEZIONI_PROGRAMMA,
  avanzateDiSezione,
  gruppiDiSezione,
  nomeVoce,
  sottoPrefisso,
  vociDiSezione,
  vociMostrateDaSezione,
} from '../../dist-tests/settingsSections.mjs'

/**
 * Le voci come arrivano dal pannello, cioè come le costruisce
 * `vociImpostazioni()`: le nascoste non ci sono, perché lì non ci arrivano.
 */
const VOCI = Object.keys(IMPOSTAZIONI)
  .filter((chiave) => !IMPOSTAZIONI[chiave].nascosta)
  .map((chiave) => ({
    chiave,
    tipo: IMPOSTAZIONI[chiave].tipo,
    descrizione: IMPOSTAZIONI[chiave].descrizione,
    formato: IMPOSTAZIONI[chiave].formato ?? null,
    scelte: IMPOSTAZIONI[chiave].scelte ?? null,
    minimo: IMPOSTAZIONI[chiave].minimo ?? null,
    massimo: IMPOSTAZIONI[chiave].massimo ?? null,
    predefinito: IMPOSTAZIONI[chiave].predefinito,
    valore: IMPOSTAZIONI[chiave].predefinito,
    scritta: false,
    dipendeDa: IMPOSTAZIONI[chiave].dipendeDa ?? null,
    sospesa: false,
    avanzata: Boolean(IMPOSTAZIONI[chiave].avanzata),
  }))

/** Le stesse voci, con qualche valore cambiato per chiave. */
const con = (valori) =>
  VOCI.map((voce) =>
    Object.hasOwn(valori, voce.chiave) ? { ...voce, valore: valori[voce.chiave] } : voce,
  )

describe('le sezioni delle impostazioni del programma', () => {
  it('coprono ogni impostazione del manifesto, una volta sola', () => {
    const conteggio = new Map(VOCI.map((voce) => [voce.chiave, 0]))

    for (const sezione of SEZIONI_PROGRAMMA) {
      for (const voce of vociDiSezione(VOCI, sezione)) {
        conteggio.set(voce.chiave, (conteggio.get(voce.chiave) ?? 0) + 1)
      }
      // Quel che la scheda della sezione disegna da sé conta come coperto: è
      // nella pagina, solo più in alto.
      for (const chiave of CHIAVI_IN_SCHEDA[sezione.id] ?? []) {
        conteggio.set(chiave, (conteggio.get(chiave) ?? 0) + 1)
      }
    }

    const senzaCasa = [...conteggio].filter(([, quante]) => quante === 0).map(([chiave]) => chiave)
    const inDuePosti = [...conteggio].filter(([, quante]) => quante > 1).map(([chiave]) => chiave)

    assert.deepEqual(senzaCasa, [], 'impostazioni che non compaiono in nessuna sezione')
    assert.deepEqual(inDuePosti, [], 'impostazioni che compaiono in due sezioni')
  })

  it('quel che si salta è solo quel che il manifesto dichiara nascosto', () => {
    // La garanzia è questa, e vale quanto la precedente: una chiave può uscire
    // dalla pagina soltanto dicendolo. Senza questa prova, `VOCI` sarebbe un
    // filtro comodo in cui far sparire qualunque cosa desse fastidio, e la
    // copertura qui sopra proverebbe la copertura di quel che resta.
    const nascoste = Object.keys(IMPOSTAZIONI).filter((chiave) => IMPOSTAZIONI[chiave].nascosta)
    const viste = VOCI.map((voce) => voce.chiave)

    assert.deepEqual(
      Object.keys(IMPOSTAZIONI).filter((chiave) => !viste.includes(chiave)),
      nascoste,
      'una chiave sparisce dalla pagina senza essere dichiarata nascosta',
    )
    // E chi è nascosta lo è perché la scrive il programma: oggi sono le cinque
    // dell'agenda, e la loro descrizione lo dice già.
    assert.ok(nascoste.every((chiave) => chiave.startsWith('registroDocenti.agenda.')))
  })

  it('l’elenco e la scheda insieme: è quel che la sezione mostra davvero', () => {
    // La stessa unione che usa la copertura qui sopra, e che adesso usa anche
    // chi conta: «Ripristina (n)» contava solo l'elenco, e `posta.invioDiretto`
    // — che la scheda Posta disegna da sé — si vedeva segnata «modificata», non
    // era contata e non veniva ritirata.
    const posta = SEZIONI_PROGRAMMA.find((sezione) => sezione.id === 'posta')
    const promossa = CHIAVI_IN_SCHEDA.posta[0]

    assert.equal(
      vociDiSezione(VOCI, posta).some((voce) => voce.chiave === promossa),
      false,
      'l’elenco non la disegna: la disegna la scheda',
    )
    assert.equal(
      vociMostrateDaSezione(VOCI, posta).some((voce) => voce.chiave === promossa),
      true,
      'chi conta e chi ritira la deve vedere: è in pagina come le altre',
    )
  })

  it('quel che una scheda promuove esiste davvero, e sta nella sua sezione', () => {
    // Una chiave promossa sparisce dall'elenco: se fosse scritta male — un
    // refuso, o una chiave tolta dal manifesto — sparirebbe e basta, e nessuno
    // se ne accorgerebbe guardando la pagina.
    for (const [sezioneId, chiavi] of Object.entries(CHIAVI_IN_SCHEDA)) {
      const sezione = SEZIONI_PROGRAMMA.find((candidata) => candidata.id === sezioneId)
      assert.ok(sezione, `la scheda «${sezioneId}» promuove chiavi di una sezione che non c'è`)
      for (const chiave of chiavi) {
        assert.ok(chiave in IMPOSTAZIONI, `«${chiave}» non è nel manifesto`)
        assert.ok(
          sottoPrefisso(chiave, sezione.prefissi),
          `«${chiave}» è promossa dalla scheda «${sezioneId}» ma non appartiene a quella sezione`,
        )
      }
    }
  })

  it('l’ultima sezione raccoglie quel che nessuna ha nominato', () => {
    const raccoglie = SEZIONI_PROGRAMMA.filter((sezione) => sezione.raccoglie)
    assert.equal(raccoglie.length, 1, 'una sola sezione può raccogliere: altrimenti le orfane si duplicano')

    // Un'impostazione inventata, di un gruppo che nessuno ha previsto: deve
    // comparire lì, o una funzione aggiunta domani resterebbe invisibile.
    const nuova = {
      chiave: 'registroDocenti.qualcosaDiNuovo.attiva',
      tipo: 'boolean',
      descrizione: 'inventata dalla prova',
      formato: null,
      scelte: null,
      minimo: null,
      massimo: null,
      predefinito: false,
      valore: false,
      scritta: false,
      dipendeDa: null,
      sospesa: false,
      avanzata: false,
    }
    const dentro = vociDiSezione([...VOCI, nuova], raccoglie[0]).map((voce) => voce.chiave)
    assert.ok(dentro.includes(nuova.chiave))
  })

  it('chi parla di modelli manda alla pagina in cui si scaricano', () => {
    // Le tre sezioni che nominano un `.gguf` tengono un **nome di file**, e un
    // nome di file non si batte a mano: senza il rimando, chi non ha ancora
    // scaricato niente si trova una casella vuota e nessuna indicazione su
    // dove si prenda un modello.
    const conModelli = SEZIONI_PROGRAMMA.filter((sezione) =>
      ['modelli', 'lettura', 'assistente', 'dettatura'].includes(sezione.id),
    )
    assert.equal(conModelli.length, 4, 'le sezioni che nominano un .gguf devono esserci tutte')
    for (const sezione of conModelli) {
      assert.equal(sezione.pagina?.vista, 'modelliLinguistici', sezione.id)
    }
  })

  it('la cartella dei modelli sta nella sua sezione, non nel raccoglitore', () => {
    // Finiva nella sezione che raccoglie — dove finisce quel che nessuno ha nominato —
    // e là dentro una cartella da gigabyte non la cerca nessuno.
    const suoi = SEZIONI_PROGRAMMA.filter((sezione) =>
      sottoPrefisso('registroDocenti.modelli.cartella', sezione.prefissi),
    )
    assert.deepEqual(suoi.map((sezione) => sezione.id), ['modelli'])
  })

  it('un prefisso prende la chiave esatta e quelle puntate sotto, non quelle che le somigliano', () => {
    assert.equal(sottoPrefisso('registroDocenti.agenda', ['registroDocenti.agenda']), true)
    assert.equal(sottoPrefisso('registroDocenti.agenda.celle', ['registroDocenti.agenda']), true)
    // `agendaAltro` non è dentro `agenda`: senza il punto, un gruppo nuovo dal
    // nome simile finirebbe nella sezione sbagliata.
    assert.equal(sottoPrefisso('registroDocenti.agendaAltro', ['registroDocenti.agenda']), false)
  })

  it('dentro una sezione le voci restano divise per gruppo, con un titolo leggibile', () => {
    const aspetto = SEZIONI_PROGRAMMA.find((sezione) => sezione.id === 'aspetto')
    const gruppi = gruppiDiSezione(VOCI, aspetto)

    // Quattro gruppi, o le righe «attivo/attiva» della sezione sarebbero
    // indistinguibili l'una dall'altra.
    // L'ordine è quello del manifesto, non quello dei prefissi della sezione:
    // è l'ordine in cui le chiavi sono nate, ed è l'unico che non si deve
    // mantenere allineato a mano.
    assert.deepEqual(gruppi.map((gruppo) => gruppo.prefisso), [
      'registroDocenti.aperturaAutomatica',
      'registroDocenti.vassoio',
      'registroDocenti.avvio',
      'registroDocenti.aspetto',
    ])
    assert.equal(gruppi[1].titolo, 'Icona accanto all’orologio')
    assert.ok(gruppi[1].voci.every((voce) => voce.chiave.startsWith('registroDocenti.vassoio.')))

    // Una chiave senza gruppo fa gruppo da sé, e si chiama come sé stessa: chi
    // disegna userà quel titolo solo se aggiunge qualcosa.
    assert.equal(
      gruppi.find((gruppo) => gruppo.prefisso === 'registroDocenti.aperturaAutomatica').titolo,
      nomeVoce('registroDocenti.aperturaAutomatica'),
    )
  })

  it('il condotto ha una sezione sua, con l’avviso in testa', () => {
    // Finiva dove finisce quel che nessuno ha nominato, insieme all'apertura
    // automatica: tre interruttori che aprono i dati delle persone in
    // formazione a ogni programma dello stesso utente, sotto il titolo «quel
    // che non sta altrove».
    const condotto = SEZIONI_PROGRAMMA.find((sezione) =>
      sottoPrefisso('registroDocenti.api.condotto', sezione.prefissi),
    )
    assert.ok(condotto, 'il condotto non ha una sezione sua')
    assert.equal(condotto.raccoglie ?? false, false, 'il condotto non può stare negli avanzi')
    assert.ok(condotto.avvertenza, 'la sezione che concede un accesso deve dire che cosa concede')
  })

  it('percorsi e attese stanno in fondo, non in fila con il resto', () => {
    // Si toccano una volta ogni tre anni. In fila con il microfono facevano
    // sembrare tecnica e lunga una sezione che per il resto si legge in un
    // minuto — e la riga che conta, «accendi la dettatura», era la prima di
    // otto invece che la prima di tre.
    const dettatura = SEZIONI_PROGRAMMA.find((sezione) => sezione.id === 'dettatura')
    const avanzate = avanzateDiSezione(VOCI, dettatura).map((voce) => voce.chiave)
    const correnti = gruppiDiSezione(VOCI, dettatura).flatMap((gruppo) =>
      gruppo.voci.map((voce) => voce.chiave),
    )

    assert.ok(avanzate.includes('registroDocenti.dettatura.programma'))
    assert.ok(avanzate.includes('registroDocenti.dettatura.attesaMassimaSecondi'))
    assert.ok(correnti.includes('registroDocenti.dettatura.attivo'))
    // Nessuna di qua e di là: sarebbe la stessa riga due volte nella stessa
    // pagina, e cambiarla in una non sembrerebbe salvata nell'altra.
    assert.deepEqual(avanzate.filter((chiave) => correnti.includes(chiave)), [])
    // E insieme fanno la sezione intera.
    assert.equal(avanzate.length + correnti.length, vociDiSezione(VOCI, dettatura).length)
  })

  it('il nome di una voce si legge come una frase', () => {
    assert.equal(nomeVoce('registroDocenti.ocr.attesaMassimaSecondi'), 'Attesa massima secondi')
    assert.equal(nomeVoce('registroDocenti.aperturaAutomatica'), 'Apertura automatica')
  })
})

// Le concessioni del condotto sono tre voci e una gerarchia: l'interruttore
// generale e, sotto, che cosa si lascia fare. Una prova che guardi lo schermo
// non serve — la casella si vede spenta anche quando è sbagliata. Quel che si
// prova qui è la regola sotto: chi è sospeso, e quando.
describe('le voci che dipendono da un’altra', () => {
  const CONDOTTO = 'registroDocenti.api.condotto'
  const LETTURA = 'registroDocenti.api.lettura'
  const SCRITTURA = 'registroDocenti.api.scrittura'

  it('lettura e scrittura dichiarano il condotto come padre', () => {
    assert.equal(IMPOSTAZIONI[LETTURA].dipendeDa, CONDOTTO)
    assert.equal(IMPOSTAZIONI[SCRITTURA].dipendeDa, CONDOTTO)
    // L'interruttore generale non dipende da nessuno: se dipendesse, non ci
    // sarebbe più niente da cui riaccendere la catena.
    assert.equal(IMPOSTAZIONI[CONDOTTO].dipendeDa ?? null, null)
  })

  it('col condotto spento sono sospese, qualunque cosa dica il file', () => {
    // Il caso che conta: la lettura è *scritta a vero* e il condotto è spento.
    // Sospesa lo stesso — altrimenti la pagina mostrerebbe una concessione
    // accesa che il condotto non onora.
    const voci = con({ [CONDOTTO]: false, [LETTURA]: true, [SCRITTURA]: true })
    const voce = (chiave) => voci.find((v) => v.chiave === chiave)
    assert.equal(sospesa(voce(LETTURA), voci), true)
    assert.equal(sospesa(voce(SCRITTURA), voci), true)
    assert.equal(sospesa(voce(CONDOTTO), voci), false)
  })

  it('col condotto acceso tornano libere', () => {
    const voci = con({ [CONDOTTO]: true, [LETTURA]: false, [SCRITTURA]: false })
    const voce = (chiave) => voci.find((v) => v.chiave === chiave)
    assert.equal(sospesa(voce(LETTURA), voci), false)
    assert.equal(sospesa(voce(SCRITTURA), voci), false)
  })

  it('una voce senza padre non è mai sospesa', () => {
    const senza = VOCI.filter((voce) => voce.dipendeDa === null)
    assert.ok(senza.length > 0)
    assert.equal(senza.every((voce) => !sospesa(voce, VOCI)), true)
  })

  it('un padre che non esiste lascia libera la figlia', () => {
    // Un refuso nel manifesto deve costare una voce che si può toccare quando
    // non dovrebbe, non una pagina in cui non si tocca più niente.
    const orfana = { ...VOCI[0], chiave: 'registroDocenti.inventata', dipendeDa: 'non.esiste' }
    assert.equal(sospesa(orfana, VOCI), false)
  })
})
