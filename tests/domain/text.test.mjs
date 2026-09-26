// Le regolette sul testo usate dappertutto: decidono se «Conti» si riconosce
// dentro «acconti», se due materie uguali restano una, se un cognome finisce
// nel fascicolo giusto.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  cella,
  compilaModello,
  contieneParola,
  corrispondeAlla,
  emailValida,
  estensioneDi,
  formattaData,
  giornoDelMese,
  giornoDi,
  nomeDelFile,
  nomeSicuro,
  normalizzaTesto,
  percorsoRelativo,
  pezziDiRicerca,
  plurale,
  righe,
} from '../../dist-tests/domain.mjs'

describe('confronto dei nomi', () => {
  it('toglie accenti, punteggiatura e maiuscole', () => {
    assert.equal(normalizzaTesto('Müller'), 'muller')
    assert.equal(normalizzaTesto('Ed.  Fisica'), 'ed fisica')
    assert.equal(normalizzaTesto('  Rossi, Maria '), 'rossi maria')
  })

  it('cerca parole intere, non pezzi di altre parole', () => {
    // Tiene le assenze di uno fuori dall'azienda di un altro.
    assert.ok(contieneParola('saldo acconti 2026 conti mario', 'conti'))
    assert.ok(!contieneParola('saldo acconti 2026', 'conti'))
    assert.ok(!contieneParola('grossi luca', 'rossi'))
    assert.ok(contieneParola('rossi maria', 'rossi maria'))
    assert.ok(!contieneParola('rossi maria', ''))
  })
})

describe('parole e modelli', () => {
  it('accorda il plurale al numero', () => {
    assert.equal(plurale(1, 'lezione', 'lezioni'), '1 lezione')
    assert.equal(plurale(0, 'lezione', 'lezioni'), '0 lezioni')
    assert.equal(plurale(3, 'lezione', 'lezioni'), '3 lezioni')
  })

  it('riempie i segnaposto e lascia in vista quelli che non conosce', () => {
    // Un `{azienda}` rimasto nella lettera si vede subito; un buco no.
    assert.equal(
      compilaModello('Assenze di {allievo} ({classe}) — {periodo}', {
        allievo: 'Rossi Maria',
        classe: 'DIC4a',
      }),
      'Assenze di Rossi Maria (DIC4a) — {periodo}',
    )
  })

  it('riconosce un indirizzo solo quel tanto che basta a intercettare un refuso', () => {
    assert.ok(emailValida('a.rossi@scuola.ch'))
    assert.ok(!emailValida('a.rossi@scuola'))
    assert.ok(!emailValida('a.rossi scuola.ch'))
    assert.ok(!emailValida(undefined))
  })
})

describe('percorsi', () => {
  it('raddrizza le barre di Windows e non tocca i più', () => {
    assert.equal(percorsoRelativo('archivio\\DIC4a\\Pagella.pdf'), 'archivio/DIC4a/Pagella.pdf')
    // Un «+» nel nome di una cartella resta com'è.
    assert.equal(percorsoRelativo('archivio/Sconto 50+/x.pdf'), 'archivio/Sconto 50+/x.pdf')
    assert.equal(percorsoRelativo(undefined), '')
  })

  it('sa dire il nome del file in fondo', () => {
    assert.equal(nomeDelFile('archivio/DIC4a/Pagella.pdf'), 'Pagella.pdf')
    assert.equal(nomeDelFile(''), '')
  })

  it('rende scrivibile su disco un titolo qualunque', () => {
    assert.equal(nomeSicuro('Verifica 1/2: rapporti'), 'Verifica 1-2- rapporti')
    // Windows non tiene punti e spazi in coda ai nomi di cartella.
    assert.equal(nomeSicuro('Pagella 3° anno. '), 'Pagella 3° anno')
    // E non accetta i nomi dei suoi dispositivi.
    assert.equal(nomeSicuro('CON'), 'CON-')
    assert.equal(nomeSicuro('  '), 'senza nome')
  })

  it('legge l’estensione, o dice quella di ripiego', () => {
    assert.equal(estensioneDi('archivio/x/Pagella.PDF'), '.pdf')
    assert.equal(estensioneDi('senza-estensione'), '.pdf')
    assert.equal(estensioneDi('senza-estensione', ''), '')
  })
})

describe('il CSV che Excel apre senza domande', () => {
  it('scrive i numeri con la virgola', () => {
    assert.equal(cella(4.5), '4,5')
    assert.equal(cella(0.5), '0,5')
    assert.equal(cella(null), '')
  })

  it('mette fra virgolette quel che le richiede', () => {
    assert.equal(cella('Rossi; Maria'), '"Rossi; Maria"')
    assert.equal(cella('disse "ok"'), '"disse ""ok"""')
  })

  it('non lascia che un titolo diventi una formula', () => {
    // «=SOMMA(...)» in una cella è un comando: si protegge.
    assert.equal(cella('=SOMMA(A1:A9)'), "'=SOMMA(A1:A9)")
    assert.equal(cella('-3 assenze'), "'-3 assenze")
  })

  it('apre il file con il segno che dice a Excel come leggerlo', () => {
    const testo = righe([['Allievo', 'Media'], ['Rossi Maria', 4.5]])
    assert.ok(testo.startsWith('\ufeff'))
    assert.equal(testo, '\ufeffAllievo;Media\r\nRossi Maria;4,5\r\n')
  })
})

describe('date scritte', () => {
  it('ha uno stile corto per quando l’anno è già scritto altrove', () => {
    assert.equal(formattaData('2026-09-15'), '15.09.2026')
    assert.equal(formattaData('2026-09-15', 'corto'), '15.09')
    assert.equal(giornoDelMese('2026-09-15'), 15)
  })

  it('dice un trattino invece di NaN quando la data non è una data', () => {
    assert.equal(formattaData(''), '—')
    assert.equal(formattaData('mai'), '—')
  })

  it('estrae il giorno da un istante, e niente da quel che non lo è', () => {
    assert.equal(giornoDi('2026-09-15T10:20:30.000Z'), '2026-09-15')
    assert.equal(giornoDi(undefined), null)
    assert.equal(giornoDi(''), null)
  })
})

// La ricerca si adatta a chi scrive: maiuscole, accenti e apostrofi non
// nascondono una persona.
describe('la ricerca di un nome', () => {
  const trova = (paglia, cercato) => corrispondeAlla(paglia, pezziDiRicerca(cercato))

  it('non guarda le maiuscole', () => {
    assert.equal(trova('Rossi Maria', 'rossi'), true)
    assert.equal(trova('Rossi Maria', 'ROSSI'), true)
    assert.equal(trova('rossi maria', 'Rossi'), true)
  })

  it('non guarda gli accenti, nei due versi', () => {
    // «Muller» trova «Müller»: la segreteria incolla senza accento.
    assert.equal(trova('Müller Jürg', 'muller'), true)
    assert.equal(trova('Müller Jürg', 'jurg'), true)
    assert.equal(trova('Muller Jurg', 'Müller'), true)
    assert.equal(trova('Renée', 'renee'), true)
    assert.equal(trova('Renee', 'Renée'), true)
  })

  it('non guarda l’apostrofo, scritto o dimenticato', () => {
    assert.equal(trova("Dell'Acqua Renata", 'dellacqua'), true)
    assert.equal(trova("Dell'Acqua Renata", "dell'acqua"), true)
    assert.equal(trova("Dell'Acqua Renata", 'dell acqua'), true)
    assert.equal(trova('Dell Acqua Renata', "dell'acqua"), true)
    // Anche l'apostrofo curvo, che le tastiere mettono da sé.
    assert.equal(trova('Dell’Acqua Renata', 'dellacqua'), true)
  })

  it('ogni pezzo deve trovarsi: una parola in più restringe', () => {
    assert.equal(trova('Rossi Maria I MEC A', 'rossi mec'), true)
    assert.equal(trova('Rossi Maria I MEC A', 'rossi storia'), false)
  })

  it('una ricerca vuota non è una ricerca senza risultati', () => {
    assert.deepEqual(pezziDiRicerca('   '), [])
    assert.equal(trova('Rossi Maria', ''), true)
  })
})
