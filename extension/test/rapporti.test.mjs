// I modelli dei rapporti: che cosa il registro legge da `templates/`.
//
// La prova che conta è che un file scritto a mano non faccia cadere niente: i
// modelli li modifica chi non programma, e una riga storta deve rovinare quella
// riga e basta. L'altra è che le sezioni vuote spariscano — un modello elenca
// tutto quel che un rapporto può contenere, e in un'ora normale metà non c'è.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  componiCorpo,
  conBase,
  leggiBlocchi,
  leggiCampi,
  leggiFormato,
  leggiImmagine,
  leggiModello,
  leggiRichiestaCampi,
  leggiRichiestaGalleria,
  RESPIRO_CELLA,
  leggiRichiestaBlocco,
  leggiRichiestaTabella,
  leggiTesti,
  misureTabella,
  riempi,
  cellaFissa,
  rigaFissa,
  rinominaColonne,
  scegliColonne,
  stilePredefinito,
} from '../dist/dominio.mjs'

const BASE = `
titolo: Rapporto
margini: 20 18 18 18

[intestazione]
riga: {{classe}} | | {{anno}}

[piede]
riga: {{titolo}} | | pagina {{pagina}} di {{pagine}}
`

const VERBALE = `
# un commento, e una riga che non vuol dire niente
questa riga non ha i due punti

titolo: Verbale della lezione
estende: _base
orientamento: orizzontale
margini: 10 10 10 10

[corpo]
titolo: {{titolo}}
sezione: Presenze
tabella: presenze
sezione: Consuntivo
paragrafo: {{consuntivo}}
direttiva-inventata: qualcosa
`

describe('i modelli dei rapporti', () => {
  it('legge le impostazioni del foglio e salta quel che non capisce', () => {
    const modello = leggiModello('verbale', VERBALE)

    assert.equal(modello.titolo, 'Verbale della lezione')
    assert.equal(modello.estende, '_base')
    assert.equal(modello.orientamento, 'orizzontale')
    assert.deepEqual(modello.margini, { alto: 10, destra: 10, basso: 10, sinistra: 10 })
    // La riga senza due punti e la direttiva inventata non ci sono, e non
    // hanno impedito al resto di essere letto.
    assert.deepEqual(
      modello.corpo.map((b) => b.tipo),
      ['titolo', 'sezione', 'tabella', 'sezione', 'paragrafo'],
    )
  })

  it('una riga fissa si divide con la barra, e una barra sola vuol dire destra', () => {
    assert.deepEqual(rigaFissa('a | b | c'), { sinistra: 'a', centro: 'b', destra: 'c' })
    assert.deepEqual(rigaFissa('a | b'), { sinistra: 'a', centro: '', destra: 'b' })
    assert.deepEqual(rigaFissa('solo'), { sinistra: 'solo', centro: '', destra: '' })
  })

  it('una cella di banda fra due asterischi va in grassetto', () => {
    assert.deepEqual(cellaFissa('**{{titolo}}**'), { testo: '{{titolo}}', grassetto: true })
    assert.deepEqual(cellaFissa('  ** Rapporto **  '), { testo: 'Rapporto', grassetto: true })
    assert.deepEqual(cellaFissa('Rapporto'), { testo: 'Rapporto', grassetto: false })
    // Marcatura storta: resta il testo che è, invece di sparire o mangiarsi gli
    // asterischi a metà.
    assert.deepEqual(cellaFissa('**Rapporto'), { testo: '**Rapporto', grassetto: false })
    assert.deepEqual(cellaFissa('a ** b ** c'), { testo: 'a ** b ** c', grassetto: false })
  })

  it('prende intestazione e piede dal modello che estende', () => {
    const unito = conBase(leggiModello('verbale', VERBALE), leggiModello('_base', BASE))

    assert.equal(unito.intestazione.length, 1)
    assert.equal(unito.piede.length, 1)
    // I margini restano i suoi: è il foglio a essere diverso, non la testata.
    assert.deepEqual(unito.margini, { alto: 10, destra: 10, basso: 10, sinistra: 10 })
  })

  it('un modello con la sua intestazione tiene la sua', () => {
    const suo = leggiModello('suo', '[intestazione]\nriga: soltanto mia\n')
    const unito = conBase(suo, leggiModello('_base', BASE))

    assert.equal(unito.intestazione[0].sinistra, 'soltanto mia')
  })

  it('un segnaposto che nessuno riempie diventa vuoto, non le graffe', () => {
    assert.equal(riempi('{{a}} e {{b}}', { a: 'uno' }), 'uno e ')
    assert.equal(riempi('{{ spaziato }}', { spaziato: 'sì' }), 'sì')
  })

  it('le sezioni senza niente sotto spariscono', () => {
    const modello = leggiModello('verbale', VERBALE)
    const corpo = componiCorpo(modello, {
      valori: { titolo: 'Verbale', consuntivo: '' },
      elenchi: {},
      tabelle: { presenze: { intestazione: ['a'], righe: [['x']] } },
    })

    // «Consuntivo» aveva sotto un paragrafo vuoto: se ne va con lui, invece di
    // restare a far sembrare il documento tagliato.
    assert.deepEqual(
      corpo.map((b) => b.tipo),
      ['titolo', 'sezione', 'tabella'],
    )
    assert.equal(corpo[0].valore, 'Verbale')
  })

  it('una tabella senza righe non è una tabella', () => {
    const modello = leggiModello('v', '[corpo]\nsezione: Presenze\ntabella: presenze\n')
    const corpo = componiCorpo(modello, {
      valori: {},
      elenchi: {},
      tabelle: { presenze: { intestazione: ['a'], righe: [] } },
    })

    assert.deepEqual(corpo, [])
  })

  it('un grafico senza punti non è un grafico', () => {
    // Non è un grafico vuoto: è una prova che nessuno ha ancora fatto, e
    // disegnare un asse spoglio sotto la sua bella intestazione
    // sarebbe un modo elaborato di dire «non c'è niente».
    const modello = leggiModello('v', '[corpo]\nsezione: Distribuzione\ngrafico: voti\n')
    const ASSE = { unita: 'voti', da: 1, a: 6, tacche: [1, 2, 3, 4, 5, 6] }
    const conNiente = componiCorpo(modello, {
      valori: {},
      elenchi: {},
      tabelle: {},
      grafici: { voti: { ...ASSE, punti: [] } },
    })
    const conQualcosa = componiCorpo(modello, {
      valori: {},
      elenchi: {},
      tabelle: {},
      grafici: { voti: { ...ASSE, punti: [{ valore: 3.5, quanti: 2 }] } },
    })

    assert.deepEqual(conNiente, [])
    assert.deepEqual(conQualcosa.map((b) => b.tipo), ['sezione', 'grafico'])
  })

  it('un testo scritto a mano resta anche senza segnaposto', () => {
    // Una riga che non contiene graffe non è «vuota perché nessuno l'ha
    // riempita»: è quel che qualcuno ha scritto, e resta.
    const modello = leggiModello('v', '[corpo]\nsezione: Note\ntesto: sempre presente\n')
    const corpo = componiCorpo(modello, { valori: {}, elenchi: {}, tabelle: {} })

    assert.deepEqual(
      corpo.map((b) => b.valore),
      ['Note', 'sempre presente'],
    )
  })

  it('i campi si dividono su punto e virgola, e quelli vuoti non si stampano', () => {
    assert.deepEqual(leggiCampi('Aula=A12; Orario=08:00–09:30; Stato='), [
      { etichetta: 'Aula', valore: 'A12' },
      { etichetta: 'Orario', valore: '08:00–09:30' },
    ])
  })
})

// --------------------------------------------------------------- lo stile

/**
 * Un misuratore finto: ogni carattere largo un punto per punto di corpo, il
 * grassetto un decimo di più.
 *
 * Un font vero qui non serve — quel che si prova è la spartizione, non la
 * larghezza della «m» — e uno finto rende i conti leggibili: «Rossi» a corpo
 * 10 sono 50 punti, e si vede a occhio se una colonna ha avuto quel che
 * chiedeva.
 */
const misuraFinta = (testo, corpo, grassetto) => testo.length * corpo * (grassetto ? 1.1 : 1)

describe('lo stile dei rapporti', () => {
  it('legge i formati per nome e per misure, e rifiuta quel che non è un foglio', () => {
    assert.deepEqual(leggiFormato('a4'), { larghezza: 210, altezza: 297 })
    assert.deepEqual(leggiFormato('  A3 '), { larghezza: 297, altezza: 420 })
    assert.deepEqual(leggiFormato('210x297'), { larghezza: 210, altezza: 297 })
    assert.deepEqual(leggiFormato('148 × 210 mm'), { larghezza: 148, altezza: 210 })
    // Un refuso non deve far uscire il rapporto su un francobollo: chi chiama
    // tiene quel che aveva.
    assert.equal(leggiFormato('a4444'), null)
    assert.equal(leggiFormato('2x3'), null)
  })

  it('legge le misure del foglio, e una riga storta non cambia niente', () => {
    const modello = leggiModello('s', [
      '[stile]',
      'formato: a3',
      'corpo: titolo=24; piccolo=7; inventato=99',
      'scala: 1.2',
      'interlinea: 2.2',
      'colonne: uguali',
      'corpo-minimo-tabella: 5',
      'scala: tantissimo',
    ].join('\n'))

    assert.deepEqual(modello.stile.formato, { larghezza: 297, altezza: 420 })
    assert.equal(modello.stile.corpi.titolo, 24)
    assert.equal(modello.stile.corpi.piccolo, 7)
    // Gli altri corpi restano quelli di serie: chi ne ritocca uno non deve
    // riscrivere anche gli altri per non perderli.
    assert.equal(modello.stile.corpi.testo, stilePredefinito().corpi.testo)
    assert.equal(modello.stile.scala, 1.2)
    assert.equal(modello.stile.interlinea, 2.2)
    assert.equal(modello.stile.colonne, 'uguali')
    assert.equal(modello.stile.corpoMinimoTabella, 5)
  })

  it('lo strato di sotto arriva in cima, e chi ha scritto vince', () => {
    // La catena vera: _stile sotto _base sotto il rapporto.
    const stile = leggiModello('_stile', '[stile]\nformato: a3\nscala: 1.4\nmargini: 5 5 5 5\n')
    const base = leggiModello('_base', 'estende: _stile\n[intestazione]\nriga: comune\n')
    const suo = leggiModello('v', 'estende: _base\nscala: 0.9\n[corpo]\ntitolo: {{titolo}}\n')

    const composto = conBase(suo, conBase(base, stile))

    // Dichiarato in fondo e mai più toccato: arriva su per due gradini.
    assert.deepEqual(composto.stile.formato, { larghezza: 297, altezza: 420 })
    assert.deepEqual(composto.margini, { alto: 5, destra: 5, basso: 5, sinistra: 5 })
    // Dichiarato in cima: vince sul valore di sotto.
    assert.equal(composto.stile.scala, 0.9)
    // E l'intestazione continua a scendere da chi ce l'ha.
    assert.deepEqual(composto.intestazione.map((r) => r.sinistra), ['comune'])
  })

  it('un modello che non dichiara niente non sovrascrive con i predefiniti', () => {
    // Il caso che prima si rompeva: «margini» e «orientamento» del figlio erano
    // i predefiniti che nessuno aveva scelto, e coprivano quelli della base.
    const base = leggiModello('_base', 'orientamento: orizzontale\nmargini: 4 4 4 4\n')
    const composto = conBase(leggiModello('v', '[corpo]\ntitolo: x\n'), base)

    assert.equal(composto.orientamento, 'orizzontale')
    assert.deepEqual(composto.margini, { alto: 4, destra: 4, basso: 4, sinistra: 4 })
  })
})

describe('la larghezza delle colonne di una tabella', () => {
  const stile = () => {
    const predefinito = stilePredefinito()
    return { ...predefinito, corpi: { ...predefinito.corpi, piccolo: 10 }, scala: 1 }
  }

  it('dà a ognuna quel che le serve, e l’avanzo a chi pesa di più', () => {
    const tabella = {
      intestazione: ['Data', 'Allievo'],
      righe: [['1.1', 'Rossi']],
      pesi: [1, 3],
    }
    const { misure, corpo, stretta } = misureTabella(tabella, 400, stile(), misuraFinta)

    assert.equal(corpo, 10)
    assert.equal(stretta, false)
    assert.equal(Math.round(misure.reduce((s, m) => s + m, 0)), 400)
    // «Allievo» pesa tre volte «Data»: preso quel che serve a tutte e due,
    // l'avanzo va quasi tutto a lei.
    assert.ok(misure[1] > misure[0] * 2, `${misure[0]} contro ${misure[1]}`)
  })

  it('scrive più piccolo prima di troncare', () => {
    // Dodici colonne di nomi lunghi in una larghezza da otto: al corpo chiesto
    // non ci stanno, e fra «Ros...» e mezzo punto in meno si sceglie il punto.
    const intestazione = Array.from({ length: 12 }, (_, i) => `Prova ${i + 1}`)
    const tabella = { intestazione, righe: [intestazione.map(() => 'Carvalho')] }
    const { corpo } = misureTabella(tabella, 600, stile(), misuraFinta)

    assert.ok(corpo < 10, `il corpo è rimasto ${corpo}`)
    assert.ok(corpo >= stilePredefinito().corpoMinimoTabella)
  })

  it('non scende sotto il corpo minimo, e allora dice che è stretta', () => {
    const intestazione = Array.from({ length: 30 }, (_, i) => `Colonna ${i}`)
    const tabella = { intestazione, righe: [intestazione.map(() => 'Carvalho Cardoso')] }
    const { corpo, misure, stretta } = misureTabella(tabella, 500, stile(), misuraFinta)

    assert.equal(corpo, stilePredefinito().corpoMinimoTabella)
    assert.equal(stretta, true)
    assert.equal(Math.round(misure.reduce((s, m) => s + m, 0)), 500)
  })

  it('stringendo toglie a chi è largo e lascia intere le colonne corte', () => {
    const tabella = {
      intestazione: ['N', 'Descrizione'],
      righe: [['1', 'una frase molto lunga che non ci sta in nessun modo dentro il foglio']],
    }
    // Niente rimpicciolimento: si vuole provare la sola spartizione.
    const senzaRimpicciolire = { ...stile(), corpoMinimoTabella: 0 }
    const { misure } = misureTabella(tabella, 200, senzaRimpicciolire, misuraFinta)

    // La colonna «N» chiede poco e se lo tiene tutto; il taglio va sull'altra.
    const chiestoDaN = misuraFinta('N', 10, true) + RESPIRO_CELLA
    assert.ok(Math.abs(misure[0] - chiestoDaN) < 0.01, `${misure[0]} invece di ${chiestoDaN}`)
    assert.equal(Math.round(misure[0] + misure[1]), 200)
  })

  it('con «uguali» torna la spartizione di prima, che il contenuto non guarda', () => {
    const tabella = {
      intestazione: ['Data', 'Allievo'],
      righe: [['1.1', 'Carvalho Cardoso Tiago']],
      pesi: [1, 1],
    }
    const { misure } = misureTabella(tabella, 400, { ...stile(), colonne: 'uguali' }, misuraFinta)

    assert.deepEqual(misure, [200, 200])
  })
})

// ------------------------------------------------------- se, altrimenti, ripeti

/** Un corpo dai suoi tipi e valori, per leggere le prove a colpo d'occhio. */
const letto = (blocchi) => blocchi.map((b) => `${b.tipo}:${b.valore}`)

const dati = (extra = {}) => ({ valori: {}, elenchi: {}, tabelle: {}, grafici: {}, ...extra })

describe('i comandi del corpo di un modello', () => {
  it('«se» tiene quel che sta dentro solo quando c’è qualcosa da dire', () => {
    const modello = leggiModello('v', [
      '[corpo]',
      'se: {{buchi}}',
      'testo: mancano {{buchi}} caselle',
      'fine:',
      'testo: sempre',
    ].join('\n'))

    assert.deepEqual(
      letto(componiCorpo(modello, dati({ valori: { buchi: '3' } }))),
      ['testo:mancano 3 caselle', 'testo:sempre'],
    )
    assert.deepEqual(
      letto(componiCorpo(modello, dati({ valori: { buchi: '' } }))),
      ['testo:sempre'],
    )
  })

  it('«se» guarda anche dentro tabelle, elenchi e gruppi', () => {
    // Un modello chiede «c’è?» di una tabella come lo chiede di un valore, e
    // guardando solo i valori la risposta sarebbe sempre no.
    const modello = leggiModello('v', '[corpo]\nse: {{recuperi}}\ntesto: ce ne sono\nfine:\n')

    const piena = { intestazione: ['A'], righe: [['x']] }
    assert.deepEqual(
      letto(componiCorpo(modello, dati({ tabelle: { recuperi: piena } }))),
      ['testo:ce ne sono'],
    )
    assert.deepEqual(
      letto(componiCorpo(modello, dati({ tabelle: { recuperi: { intestazione: ['A'], righe: [] } } }))),
      [],
    )
  })

  it('«altrimenti» dice l’altra cosa, e i «se» si annidano', () => {
    const modello = leggiModello('v', [
      '[corpo]',
      'se: {{voto}}',
      'se: {{recupero}}',
      'testo: ripetuta',
      'fine:',
      'testo: valutata',
      'altrimenti:',
      'testo: da fare',
      'fine:',
    ].join('\n'))

    assert.deepEqual(
      letto(componiCorpo(modello, dati({ valori: { voto: '5', recupero: 'sì' } }))),
      ['testo:ripetuta', 'testo:valutata'],
    )
    assert.deepEqual(
      letto(componiCorpo(modello, dati({ valori: { voto: '5', recupero: '' } }))),
      ['testo:valutata'],
    )
    assert.deepEqual(
      letto(componiCorpo(modello, dati({ valori: { voto: '', recupero: 'sì' } }))),
      ['testo:da fare'],
    )
  })

  it('«ripeti» rifà quel che sta dentro per ogni voce, con i dati di quella voce', () => {
    const modello = leggiModello('v', [
      '[corpo]',
      'ripeti: allievi',
      'titolo: {{allievo}}',
      'tabella: prove',
      'fine:',
    ].join('\n'))

    const gruppi = {
      allievi: [
        { valori: { allievo: 'Rossi' }, tabelle: { prove: { intestazione: ['Voto'], righe: [['5']] } } },
        { valori: { allievo: 'Bianchi' }, tabelle: { prove: { intestazione: ['Voto'], righe: [['6']] } } },
      ],
    }
    const corpo = componiCorpo(modello, dati({ gruppi }))

    assert.deepEqual(letto(corpo), ['titolo:Rossi', 'tabella:prove', 'titolo:Bianchi', 'tabella:prove'])
    // La tabella se la porta dietro il blocco: cercarla per nome, a giro finito,
    // troverebbe sempre la stessa.
    assert.deepEqual(corpo[1].tabella.righe, [['5']])
    assert.deepEqual(corpo[3].tabella.righe, [['6']])
  })

  it('una sezione vuota sparisce anche dentro un «ripeti»', () => {
    // Il caso che si rompeva: la potatura guardava avanti fino alla prossima
    // sezione, e trovava il titolo dell’allievo dopo — così «Annotazioni»
    // restava stampato sopra il nulla.
    const modello = leggiModello('v', [
      '[corpo]',
      'ripeti: allievi',
      'titolo: {{allievo}}',
      'sezione: Annotazioni',
      'elenco: note',
      'fine:',
    ].join('\n'))

    const gruppi = {
      allievi: [
        { valori: { allievo: 'Rossi' }, elenchi: {} },
        { valori: { allievo: 'Bianchi' }, elenchi: { note: ['in ritardo'] } },
      ],
    }

    assert.deepEqual(letto(componiCorpo(modello, dati({ gruppi }))), [
      'titolo:Rossi',
      'titolo:Bianchi',
      'sezione:Annotazioni',
      'elenco:note',
    ])
  })

  it('un «se» lasciato aperto arriva in fondo invece di far cadere il rapporto', () => {
    const modello = leggiModello('v', '[corpo]\nse: {{c}}\ntesto: dentro\n')
    assert.deepEqual(letto(componiCorpo(modello, dati({ valori: { c: 'x' } }))), ['testo:dentro'])
    assert.deepEqual(letto(componiCorpo(modello, dati({ valori: { c: '' } }))), [])
  })

  it('un «fine» spaiato si salta, come ogni riga che non si capisce', () => {
    const modello = leggiModello('v', '[corpo]\nfine:\ntesto: uno\naltrimenti:\ntesto: due\n')
    assert.deepEqual(letto(componiCorpo(modello, dati())), ['testo:uno', 'testo:due'])
  })

  it('il salto pagina resta in coda, gli spazi no', () => {
    // Una pagina bianca in fondo la si è chiesta apposta: è così che un
    // rapporto per allievo finisce con l’ultimo foglio staccabile.
    const modello = leggiModello('v', '[corpo]\ntesto: uno\npagina-nuova:\nspazio: 8\n')
    assert.deepEqual(letto(componiCorpo(modello, dati())), ['testo:uno', 'pagina-nuova:'])
  })
})

// ------------------------------------------------------------------ le frasi

describe('le frasi comuni', () => {
  it('«{{frase.nome}}» pesca da _testi.tpl e ci mette dentro i numeri', () => {
    const testi = leggiTesti([
      '[frasi]',
      'appello-incompleto: Appello incompleto: {{buchi}} caselle non impostate.',
    ].join('\n'))

    assert.equal(
      riempi('{{frase.appello-incompleto}}', { buchi: '4' }, testi.frasi),
      'Appello incompleto: 4 caselle non impostate.',
    )
  })

  it('una frase che non c’è diventa vuota, e la riga con lei', () => {
    const modello = leggiModello('v', '[corpo]\ntesto: {{frase.mai-scritta}}\ntesto: resta\n')
    assert.deepEqual(letto(componiCorpo(modello, dati({ frasi: {} }))), ['testo:resta'])
  })

  it('una frase che ne cita un’altra non gira in tondo', () => {
    // Un giro solo: due frasi che si rimandano a vicenda girerebbero per
    // sempre, e non c’è niente che una frase di rapporto debba dire e non
    // possa dire in un livello.
    const frasi = { a: 'A vede {{frase.b}}', b: 'B vede {{frase.a}}' }
    assert.equal(riempi('{{frase.a}}', {}, frasi), 'A vede ')
  })

  it('legge le due sezioni e tiene le maiuscole delle colonne', () => {
    const testi = leggiTesti([
      '# un commento',
      '[frasi]',
      'saluto: buongiorno',
      '[colonne]',
      'UD seguite: Ore seguite',
      'riga senza due punti',
    ].join('\n'))

    assert.deepEqual(testi.frasi, { saluto: 'buongiorno' })
    assert.deepEqual(testi.colonne, { 'UD seguite': 'Ore seguite' })
  })
})

// --------------------------------------------------------- le colonne scelte

describe('le colonne di una tabella scelte dal modello', () => {
  const tavola = {
    intestazione: ['Allievo', 'Prova 1', 'Prova 2', 'Media'],
    righe: [['Rossi', '5', '6', '5.5']],
    pesi: [4, 1, 1, 2],
  }

  it('ne tiene alcune, nell’ordine chiesto, con i loro pesi', () => {
    const scelta = scegliColonne(tavola, ['Media', 'Allievo'])
    assert.deepEqual(scelta.intestazione, ['Media', 'Allievo'])
    assert.deepEqual(scelta.righe, [['5.5', 'Rossi']])
    assert.deepEqual(scelta.pesi, [2, 4])
  })

  it('«*» sta per tutte le altre, nell’ordine loro', () => {
    // È come si tiene una colonna per prova senza sapere quante prove ci
    // saranno.
    const scelta = scegliColonne(tavola, ['Allievo', 'Media', '*'])
    assert.deepEqual(scelta.intestazione, ['Allievo', 'Media', 'Prova 1', 'Prova 2'])
  })

  it('un nome che non c’è si salta, e se non ne resta nessuno la tabella non si tocca', () => {
    assert.deepEqual(scegliColonne(tavola, ['Media', 'Inventata']).intestazione, ['Media'])
    assert.deepEqual(scegliColonne(tavola, ['Inventata']).intestazione, tavola.intestazione)
  })

  it('si ribattezzano dopo la scelta, non prima', () => {
    // La scelta nomina le colonne com’erano di serie: cambiare come si
    // chiamano non deve rompere i modelli che le scelgono.
    const modello = leggiModello('v', '[corpo]\ntabella: voti | Allievo, Media\n')
    const corpo = componiCorpo(modello, dati({
      tabelle: { voti: tavola },
      colonne: { Allievo: 'Nome e cognome' },
    }))

    assert.deepEqual(corpo[0].tabella.intestazione, ['Nome e cognome', 'Media'])
  })

  it('legge il nome della tabella e le colonne dalla riga del modello', () => {
    assert.deepEqual(leggiRichiestaTabella('presenze'), { nome: 'presenze', scelta: [] })
    assert.deepEqual(leggiRichiestaTabella(' presenze | Allievo , Media '), {
      nome: 'presenze',
      scelta: ['Allievo', 'Media'],
    })
  })
})

// ---------------------------------------------------------------- le immagini

describe('le immagini di un modello', () => {
  it('legge nome, altezza e allineamento, e mette i predefiniti sul resto', () => {
    assert.deepEqual(leggiImmagine('logo.png'), {
      file: 'logo.png',
      altezza: 12,
      allineamento: 'sinistra',
    })
    assert.deepEqual(leggiImmagine('firma.JPG | altezza 18,5 | destra'), {
      file: 'firma.JPG',
      altezza: 18.5,
      allineamento: 'destra',
    })
  })

  it('rifiuta le risalite e i formati che non sono immagini', () => {
    // Il valore viene da un file di testo che si modifica a mano e da un JSON
    // che si può correggere a mano: dalle due cartelle non si deve uscire.
    assert.equal(leggiImmagine('../../segreti.png'), null)
    assert.equal(leggiImmagine('foto/../../segreti.png'), null)
    assert.equal(leggiImmagine('logo.svg'), null)
    assert.equal(leggiImmagine(''), null)
  })

  it('un’immagine può tenersi il fianco invece della sua fascia', () => {
    const accanto = leggiImmagine('foto.jpg | altezza 34 | destra | accanto')
    assert.equal(accanto?.accanto, true)
    assert.equal(accanto?.allineamento, 'destra')
    // Chi non lo chiede resta com'era: il testo dopo va sotto, non di fianco.
    assert.equal(leggiImmagine('logo.png | altezza 14 | destra')?.accanto, undefined)
  })

  it('i campi si chiedono su una colonna o su due', () => {
    const due = leggiRichiestaCampi('Indirizzo={{via}}; E-mail={{posta}}')
    assert.equal(due.colonne, 2)
    assert.deepEqual(due.voci.map((v) => v.etichetta), ['Indirizzo', 'E-mail'])

    const una = leggiRichiestaCampi('Indirizzo={{via}}; E-mail={{posta}} | colonne 1')
    assert.equal(una.colonne, 1)
    assert.deepEqual(una.voci.map((v) => v.etichetta), ['Indirizzo', 'E-mail'])

    // Una barra dentro un valore resta dentro il valore: non tutto quel che sta
    // dopo l'ultima barra è un'opzione.
    const conBarra = leggiRichiestaCampi('Orario=lun 8|10')
    assert.equal(conBarra.colonne, 2)
    assert.deepEqual(conBarra.voci, [{ etichetta: 'Orario', valore: 'lun 8|10' }])
  })

  it('una parete di ritratti si chiede a colonne e a millimetri', () => {
    assert.deepEqual(leggiRichiestaGalleria('allievi | colonne 3 | altezza 40'), {
      nome: 'allievi',
      colonne: 3,
      altezza: 40,
    })
    // Senza dirlo si prendono i valori di serie: quattro caselle per riga su un
    // A4 fanno un ritratto che si riconosce a braccio teso.
    assert.deepEqual(leggiRichiestaGalleria('allievi'), {
      nome: 'allievi',
      colonne: 4,
      altezza: 30,
    })
    // Fuori dai limiti si torna al valore di serie: venti colonne su un A4
    // sono venti francobolli, e zero colonne non è una griglia.
    assert.equal(leggiRichiestaGalleria('allievi | colonne 40').colonne, 4)
    assert.equal(leggiRichiestaGalleria('allievi | altezza 500').altezza, 30)
  })

  it('una parete senza nessuno non si disegna', () => {
    const modello = leggiModello('foto', `[corpo]
sezione: Classe
galleria: allievi
`)
    const vuota = { valori: {}, elenchi: {}, tabelle: {}, grafici: {}, gallerie: { allievi: { celle: [] } } }
    const piena = {
      ...vuota,
      gallerie: { allievi: { celle: [{ immagine: '', titolo: 'Rossi Anna' }] } },
    }

    // Con la parete se ne va anche la sezione che la annunciava: un titolo
    // seguito dal nulla è peggio di nessun titolo.
    assert.deepEqual(componiCorpo(modello, vuota), [])
    assert.deepEqual(
      componiCorpo(modello, piena).map((b) => b.tipo),
      ['sezione', 'galleria'],
    )
  })

  it('una foto di allievo è un percorso dentro l’anno, e passa', () => {
    // Il nome secco è un'immagine di «templates/», il percorso è un file
    // dell'anno: è così che il ritratto di un allievo arriva su un foglio.
    assert.equal(leggiImmagine('logo.png')?.file, 'logo.png')
    assert.equal(
      leggiImmagine('documentazione/DIC4a/foto/Rossi Mario.jpg | altezza 30 | destra')?.file,
      'documentazione/DIC4a/foto/Rossi Mario.jpg',
    )
  })

  it('la testata si eredita tutta insieme, righe e immagini', () => {
    const base = leggiModello('_base', '[intestazione]\nimmagine: logo.png\nriga: comune\n')

    // Chi non dichiara niente prende tutto.
    const eredita = conBase(leggiModello('v', '[corpo]\ntitolo: x\n'), base)
    assert.deepEqual(eredita.intestazioneImmagini.map((i) => i.file), ['logo.png'])
    assert.deepEqual(eredita.intestazione.map((r) => r.sinistra), ['comune'])

    // Chi dichiara una testata sua la vuole sua per intero: prendersi il logo
    // della base sotto una riga diversa sarebbe un accostamento che nessuno ha
    // scelto.
    const sua = conBase(leggiModello('v', '[intestazione]\nriga: mia\n'), base)
    assert.deepEqual(sua.intestazioneImmagini, [])
    assert.deepEqual(sua.intestazione.map((r) => r.sinistra), ['mia'])
  })
})

// --------------------------------------------------------- i pezzi riusabili

describe('i blocchi riusabili', () => {
  const pezzi = leggiBlocchi([
    '# un commento',
    '[blocco: apertura]',
    'titolo: {{titolo}}',
    'sottotitolo: {{sottotitolo}}',
    'spazio: 6',
    '[blocco: chiusura]',
    'filo:',
    'testo: fine di {{allievo}}',
    '[frasi]',
    'questa-riga-non-e-di-nessun-blocco: x',
  ].join('\n'))

  it('legge le sezioni «[blocco: nome]» e non quel che sta fuori', () => {
    assert.deepEqual(Object.keys(pezzi), ['apertura', 'chiusura'])
    assert.deepEqual(letto(pezzi.apertura), ['titolo:{{titolo}}', 'sottotitolo:{{sottotitolo}}', 'spazio:6'])
    // Una parentesi che non è un blocco chiude quello aperto, invece di
    // continuarlo: `[frasi]` finito lì per sbaglio non diventa contenuto.
    assert.deepEqual(letto(pezzi.chiusura), ['filo:', 'testo:fine di {{allievo}}'])
  })

  it('«usa» mette il blocco al posto della riga', () => {
    const modello = leggiModello('v', '[corpo]\nusa: chiusura\n')
    assert.deepEqual(
      letto(componiCorpo(modello, dati({ valori: { allievo: 'Rossi' }, blocchi: pezzi }))),
      ['filo:', 'testo:fine di Rossi'],
    )
  })

  it('i parametri valgono solo dentro il blocco, già riempiti', () => {
    const modello = leggiModello('v', [
      '[corpo]',
      'usa: apertura | titolo={{materia}} — {{classe}}; sottotitolo={{periodo}}',
      'testo: e qui {{titolo}} è di nuovo quello del rapporto',
    ].join('\n'))

    const corpo = componiCorpo(modello, dati({
      valori: { titolo: 'Presenze', materia: 'Calcolo', classe: 'DIC4a', periodo: '1° semestre' },
      blocchi: pezzi,
    }))

    assert.deepEqual(letto(corpo), [
      'titolo:Calcolo — DIC4a',
      'sottotitolo:1° semestre',
      'spazio:6',
      'testo:e qui Presenze è di nuovo quello del rapporto',
    ])
  })

  it('un parametro non passato lascia sparire la sua riga', () => {
    const modello = leggiModello('v', '[corpo]\nusa: apertura | titolo=Solo il titolo\n')
    assert.deepEqual(
      letto(componiCorpo(modello, dati({ blocchi: pezzi }))),
      // Lo `spazio: 6` in coda al blocco se ne va con la potatura di sempre: uno
      // stacco alla fine del foglio non separa più niente.
      ['titolo:Solo il titolo'],
    )
  })

  it('un blocco che non c’è salta quella riga, e il resto esce', () => {
    const modello = leggiModello('v', '[corpo]\nusa: mai-scritto\ntesto: resta\n')
    assert.deepEqual(letto(componiCorpo(modello, dati({ blocchi: pezzi }))), ['testo:resta'])
  })

  it('un blocco che richiama sé stesso si ferma invece di girare per sempre', () => {
    const ciclici = leggiBlocchi([
      '[blocco: a]',
      'testo: dentro a',
      'usa: b',
      '[blocco: b]',
      'testo: dentro b',
      'usa: a',
    ].join('\n'))

    const modello = leggiModello('v', '[corpo]\nusa: a\n')
    assert.deepEqual(
      letto(componiCorpo(modello, dati({ blocchi: ciclici }))),
      ['testo:dentro a', 'testo:dentro b'],
    )
  })

  it('«usa» funziona anche dentro un «ripeti», con i dati del giro', () => {
    // Il caso che si rompeva: i dati del giro si costruivano dimenticando i
    // blocchi, e lì dentro ogni «usa» spariva in silenzio.
    const modello = leggiModello('v', [
      '[corpo]',
      'ripeti: allievi',
      'usa: apertura | titolo={{allievo}}; sottotitolo=media {{media}}',
      'fine:',
    ].join('\n'))

    const gruppi = {
      allievi: [
        { valori: { allievo: 'Rossi', media: '5.00' } },
        { valori: { allievo: 'Bianchi', media: '5.25' } },
      ],
    }

    assert.deepEqual(letto(componiCorpo(modello, dati({ gruppi, blocchi: pezzi }))), [
      'titolo:Rossi', 'sottotitolo:media 5.00', 'spazio:6',
      // L'ultimo stacco è in coda al foglio, e la potatura di sempre lo toglie.
      'titolo:Bianchi', 'sottotitolo:media 5.25',
    ])
  })

  it('legge il nome del blocco e i suoi parametri dalla riga', () => {
    assert.deepEqual(leggiRichiestaBlocco('apertura'), { nome: 'apertura', parametri: {} })
    assert.deepEqual(leggiRichiestaBlocco(' apertura | titolo=Presenze; sottotitolo=1° sem '), {
      nome: 'apertura',
      parametri: { titolo: 'Presenze', sottotitolo: '1° sem' },
    })
  })
})

describe('i nomi delle colonne per singola tabella', () => {
  const tavola = { intestazione: ['Allievo', 'Nota'], righe: [['Rossi', 'ok']] }

  it('il nome con la tabella davanti vince su quello generale', () => {
    const generale = rinominaColonne(tavola, { Allievo: 'Nome e cognome' }, 'presenze')
    assert.deepEqual(generale.intestazione, ['Nome e cognome', 'Nota'])

    const suo = rinominaColonne(
      tavola,
      { Allievo: 'Nome e cognome', 'presenze.Allievo': 'Chi' },
      'presenze',
    )
    assert.deepEqual(suo.intestazione, ['Chi', 'Nota'])

    // E vale solo per quella tabella.
    const altra = rinominaColonne(
      tavola,
      { Allievo: 'Nome e cognome', 'presenze.Allievo': 'Chi' },
      'voti',
    )
    assert.deepEqual(altra.intestazione, ['Nome e cognome', 'Nota'])
  })
})
