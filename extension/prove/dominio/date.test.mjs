// Aritmetica di calendario. Le date del registro sono stringhe, e i casi che
// contano sono quelli in cui una `Date` sbaglierebbe: cambi d'ora, fine mese,
// settimane a cavallo di due anni.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  dataDaTesto,
  dataNelNome,
  differenzaGiorni,
  durataMinuti,
  etichettaAnno,
  formattaDurata,
  giornoSettimana,
  grigliaMese,
  inizioSettimana,
  isoValida,
  minutiDaOra,
  oraDaMinuti,
  oraValida,
  periodoNelNome,
  primoDelMese,
  semestreDi,
  settimanaDi,
  settimanaIso,
  sommaGiorni,
  sommaMesi,
  sommaMinuti,
  spostaData,
  ultimoDelMese,
} from '../../dist-prove/dominio.mjs'

describe('validazione delle date', () => {
  it('accetta solo giorni che esistono davvero', () => {
    assert.equal(isoValida('2025-09-15'), true)
    assert.equal(isoValida('2025-02-30'), false)
    assert.equal(isoValida('2025-13-01'), false)
    assert.equal(isoValida('15.09.2025'), false)
    assert.equal(isoValida(''), false)
  })

  it('riconosce le ore a 24 ore', () => {
    assert.equal(oraValida('07:30'), true)
    assert.equal(oraValida('23:59'), true)
    assert.equal(oraValida('24:00'), false)
    assert.equal(oraValida('7:30'), false)
  })
})

describe('spostamenti nel calendario', () => {
  it('somma giorni attraverso il cambio dell’ora legale', () => {
    // Ultima domenica di marzo 2025: con una Date locale qui si perde un giorno.
    assert.equal(sommaGiorni('2025-03-29', 1), '2025-03-30')
    assert.equal(sommaGiorni('2025-03-30', 1), '2025-03-31')
    assert.equal(sommaGiorni('2025-10-25', 2), '2025-10-27')
  })

  it('somma mesi tenendo l’ultimo giorno quando il giorno non esiste', () => {
    assert.equal(sommaMesi('2025-01-31', 1), '2025-02-28')
    assert.equal(sommaMesi('2024-01-31', 1), '2024-02-29')
    assert.equal(sommaMesi('2025-12-15', 1), '2026-01-15')
  })

  it('conta i giorni fra due date', () => {
    assert.equal(differenzaGiorni('2025-09-01', '2025-09-08'), 7)
    assert.equal(differenzaGiorni('2025-09-08', '2025-09-01'), -7)
    assert.equal(differenzaGiorni('2025-09-01', '2025-09-01'), 0)
  })
})

describe('settimane', () => {
  it('numera i giorni con lunedì = 1 e domenica = 7', () => {
    assert.equal(giornoSettimana('2025-09-01'), 1)
    assert.equal(giornoSettimana('2025-09-07'), 7)
  })

  it('parte sempre dal lunedì, domenica compresa', () => {
    assert.equal(inizioSettimana('2025-09-03'), '2025-09-01')
    assert.equal(inizioSettimana('2025-09-07'), '2025-09-01')
    assert.equal(inizioSettimana('2025-09-01'), '2025-09-01')
  })

  it('restituisce sette giorni consecutivi', () => {
    const giorni = settimanaDi('2025-09-03')
    assert.equal(giorni.length, 7)
    assert.equal(giorni[0], '2025-09-01')
    assert.equal(giorni[6], '2025-09-07')
  })

  it('numera le settimane secondo ISO 8601', () => {
    // Il 1° gennaio 2026 è un giovedì: sta nella settimana 1.
    assert.equal(settimanaIso('2026-01-01'), 1)
    // Il 1° gennaio 2027 è un venerdì: appartiene ancora alla 53ª del 2026.
    assert.equal(settimanaIso('2027-01-01'), 53)
    assert.equal(settimanaIso('2025-09-03'), 36)
  })
})

describe('mesi', () => {
  it('trova primo e ultimo giorno', () => {
    assert.equal(primoDelMese('2025-02-17'), '2025-02-01')
    assert.equal(ultimoDelMese('2025-02-17'), '2025-02-28')
    assert.equal(ultimoDelMese('2024-02-01'), '2024-02-29')
  })

  it('produce una griglia di settimane intere che comincia di lunedì', () => {
    const celle = grigliaMese('2025-09-15')
    assert.equal(celle.length % 7, 0)
    assert.equal(giornoSettimana(celle[0]), 1)
    assert.ok(celle.includes('2025-09-01'))
    assert.ok(celle.includes('2025-09-30'))
    // Settembre 2025 comincia di lunedì: nessuna coda davanti.
    assert.equal(celle[0], '2025-09-01')
  })

  it('mette in griglia anche le code degli altri mesi', () => {
    const celle = grigliaMese('2025-10-10')
    assert.equal(celle[0], '2025-09-29')
    assert.equal(celle.length % 7, 0)
  })
})

describe('ore e durate', () => {
  it('converte avanti e indietro', () => {
    assert.equal(minutiDaOra('08:45'), 525)
    assert.equal(oraDaMinuti(525), '08:45')
    assert.equal(oraDaMinuti(0), '00:00')
  })

  it('somma minuti restando dentro le 24 ore', () => {
    assert.equal(sommaMinuti('08:00', 45), '08:45')
    assert.equal(sommaMinuti('23:30', 45), '00:15')
  })

  it('non produce durate negative', () => {
    assert.equal(durataMinuti('08:00', '09:30'), 90)
    assert.equal(durataMinuti('09:30', '08:00'), 0)
  })

  it('scrive le durate come si direbbero', () => {
    assert.equal(formattaDurata(45), '45 min')
    assert.equal(formattaDurata(60), '1h')
    assert.equal(formattaDurata(90), '1h 30')
  })
})

describe('anno scolastico', () => {
  it('ricava l’etichetta dalla data d’inizio', () => {
    assert.equal(etichettaAnno('2025-09-01'), '2025/2026')
    assert.equal(etichettaAnno('2025-08-15'), '2025/2026')
    assert.equal(etichettaAnno('2026-01-10'), '2025/2026')
  })

  it('trova il semestre che contiene una data', () => {
    const anno = {
      id: 'a',
      etichetta: '2025/2026',
      inizio: '2025-09-01',
      fine: '2026-06-30',
      semestri: [
        { id: 's1', numero: 1, etichetta: '1°', inizio: '2025-09-01', fine: '2026-01-31' },
        { id: 's2', numero: 2, etichetta: '2°', inizio: '2026-02-01', fine: '2026-06-30' },
      ],
    }
    assert.equal(semestreDi(anno, '2025-11-10').id, 's1')
    assert.equal(semestreDi(anno, '2026-01-31').id, 's1')
    assert.equal(semestreDi(anno, '2026-02-01').id, 's2')
    assert.equal(semestreDi(anno, '2026-08-01'), null)
  })
})

describe('una data scritta a mano', () => {
  // Il riferimento è la data che il campo aveva prima: completa quel che non
  // si è scritto, che è il motivo per cui scrivere «12» funziona.
  const era = '2026-09-07'

  it('accetta i separatori che si usano davvero', () => {
    for (const scritta of ['7.9.2026', '7/9/2026', '7-9-2026', '7 9 2026', '07.09.2026']) {
      assert.equal(dataDaTesto(scritta, era), '2026-09-07', scritta)
    }
  })

  it('due cifre d’anno sono gli anni Duemila', () => {
    assert.equal(dataDaTesto('7.9.26', era), '2026-09-07')
    assert.equal(dataDaTesto('7.9.99', era), '2099-09-07')
  })

  it('senza anno prende quello del campo, senza mese anche il mese', () => {
    assert.equal(dataDaTesto('7.10', era), '2026-10-07')
    assert.equal(dataDaTesto('12', era), '2026-09-12', 'lo stesso mese di prima')
  })

  it('legge anche le cifre battute di fila, come su un modulo', () => {
    assert.equal(dataDaTesto('07092026', era), '2026-09-07')
    assert.equal(dataDaTesto('070926', era), '2026-09-07')
    assert.equal(dataDaTesto('0710', era), '2026-10-07')
  })

  it('la forma del registro passa così com’è', () => {
    assert.equal(dataDaTesto('2026-09-07'), '2026-09-07')
  })

  it('un giorno che non esiste si rifiuta invece di scivolare al mese dopo', () => {
    // Il 31 aprile diventerebbe il 1° maggio: chi l'ha scritto voleva un altro
    // giorno, e farlo scivolare in silenzio è peggio che dire di no.
    assert.equal(dataDaTesto('31.4.2026', era), null)
    assert.equal(dataDaTesto('30.2.2026', era), null)
    assert.equal(dataDaTesto('7.13.2026', era), null)
    assert.equal(dataDaTesto('0.9.2026', era), null)
  })

  it('quel che non è una data non lo diventa', () => {
    for (const scritta of ['', '   ', 'domani', '7 settembre', '1.2.3.4', 'abc']) {
      assert.equal(dataDaTesto(scritta, era), null, scritta)
    }
  })

  it('gli anni bisestili si rispettano', () => {
    assert.equal(dataDaTesto('29.2.2028', era), '2028-02-29')
    assert.equal(dataDaTesto('29.2.2027', era), null)
  })

  it('le frecce spostano di un giorno o di un mese', () => {
    assert.equal(spostaData('2026-09-07', 1), '2026-09-08')
    assert.equal(spostaData('2026-09-07', -1), '2026-09-06')
    assert.equal(spostaData('2026-09-07', 0, 1), '2026-10-07')
    assert.equal(spostaData('2026-09-07', 0, -1), '2026-08-07')
  })
})

describe('una data dentro un nome di file', () => {
  it('anno, mese e giorno attaccati, così i file si ordinano per data', () => {
    assert.equal(dataNelNome('2026-09-04'), '260904')
    assert.equal(dataNelNome('2025-12-31'), '251231')
  })

  it('quel che data non è resta fuori dal nome', () => {
    assert.equal(dataNelNome('mai'), '')
    assert.equal(dataNelNome(''), '')
  })
})

describe('il periodo dentro un nome di file', () => {
  it('scrive i due estremi, per distinguere un giro dal successivo', () => {
    assert.equal(periodoNelNome('2026-08-24', '2026-09-04'), '260824-260904')
  })

  it('un giorno solo si scrive una volta sola', () => {
    assert.equal(periodoNelNome('2026-09-03', '2026-09-03'), '260903')
    assert.equal(periodoNelNome('2026-09-03'), '260903')
  })

  it('quel che data non è resta fuori dal nome', () => {
    assert.equal(periodoNelNome('2026-09-03', 'domani'), '260903')
    assert.equal(periodoNelNome('mai', 'nemmeno'), '')
  })
})
