// Le regolette sul testo che il registro applica dappertutto.
//
// Sono poche righe ciascuna e non le guarda nessuno, ma decidono cose grosse:
// se «Conti» si riconosce dentro «acconti», due materie uguali diventano due,
// e un cognome finisce nel fascicolo di un altro. Erano scritte in tre punti
// con tre sfumature diverse; qui si prova la versione unica.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  cella,
  compilaModello,
  contieneParola,
  emailValida,
  estensioneDi,
  formattaData,
  giornoDelMese,
  giornoDi,
  nomeDelFile,
  nomeSicuro,
  normalizzaTesto,
  percorsoRelativo,
  plurale,
  righe,
} from '../dist-prove/dominio.mjs'

describe('confronto dei nomi', () => {
  it('toglie accenti, punteggiatura e maiuscole', () => {
    assert.equal(normalizzaTesto('Müller'), 'muller')
    assert.equal(normalizzaTesto('Ed.  Fisica'), 'ed fisica')
    assert.equal(normalizzaTesto('  Rossi, Maria '), 'rossi maria')
  })

  it('cerca parole intere, non pezzi di altre parole', () => {
    // È la regola che tiene le assenze di uno fuori dall'azienda di un altro.
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
    // Un `{azienda}` rimasto in mezzo alla lettera si vede subito; un buco si
    // scopre solo dopo averla spedita a venticinque aziende.
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
    // Una regex sbagliata qui trasformava «Riduzione 50+» in un percorso.
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
    // «=SOMMA(...)» in una cella è un comando, non un titolo: chi apre il file
    // se lo ritrova eseguito.
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
