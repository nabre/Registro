// Le pause della giornata: la griglia delle partenze, le lezioni nuove che le
// seguono, e la dogana che tiene fuori una giornata impossibile.
//
// La giornata di prova: ricreazione alle 9:30 per un quarto d'ora, poi due UD
// e una pausa di dieci minuti — 9:30–9:45, 11:15–11:25.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  contaUd,
  creaLezione,
  fineSullaGriglia,
  inizioLezione,
  invadeLePause,
  inizioSullaGriglia,
  lezioneNellaGiornata,
  lezioniDaOrario,
  lineeDellaGiornata,
  normalizzaImpostazioni,
  normalizzaPause,
  normalizzaRegistro,
  oraFuoriDallePause,
  pauseDellaGiornata,
  ricorrenzeIncatenate,
  scansioneDellaGiornata,
  slotFuoriDallePause,
  slotNellaGiornata,
  slotSullePause,
  slotStiratiAncoratiSullePause,
  slotStiratiSullePause,
  slotSuAltraUd,
  validaPause,
  validaSlot,
} from '../../dist-tests/domain.mjs'

const PAUSE = {
  prima: { inizio: '09:30', durataMin: 15 },
  seguenti: [{ dopoUd: 2, durataMin: 10 }],
}

/** La giornata di prova: UD da quarantacinque minuti, e quelle pause. */
const GIORNATA = { minutiUd: 45, pause: PAUSE }

/** La stessa giornata senza pause dichiarate. */
const SENZA_PAUSE = { minutiUd: 45 }

/** Le fasce ridotte a quel che conta: tipo e orario. */
const forma = (slot) => slot.map((s) => `${s.tipo} ${s.inizio}–${s.fine}`)

describe('pause della giornata: dove cadono', () => {
  it('la prima dall’orario, le altre a UD dalla precedente', () => {
    assert.deepEqual(pauseDellaGiornata(GIORNATA), [
      { inizio: '09:30', fine: '09:45' },
      { inizio: '11:15', fine: '11:25' },
    ])
    assert.deepEqual(pauseDellaGiornata(SENZA_PAUSE), [])
  })

  it('un’ora in pausa esce quando la pausa finisce', () => {
    assert.equal(oraFuoriDallePause('09:35', GIORNATA), '09:45')
    assert.equal(oraFuoriDallePause('09:30', GIORNATA), '09:45')
    assert.equal(oraFuoriDallePause('09:45', GIORNATA), '09:45')
    assert.equal(oraFuoriDallePause('09:35', SENZA_PAUSE), '09:35')
  })
})

describe('pause della giornata: la griglia delle partenze', () => {
  it('prima della prima pausa si conta all’indietro, dopo in avanti', () => {
    assert.equal(inizioSullaGriglia('08:05', GIORNATA), '08:00')
    assert.equal(inizioSullaGriglia('08:40', GIORNATA), '08:45')
    // In pausa, o appena dopo: la fine della pausa.
    assert.equal(inizioSullaGriglia('09:35', GIORNATA), '09:45')
    assert.equal(inizioSullaGriglia('10:00', GIORNATA), '09:45')
    // Dopo l'ultima, dalla sua fine.
    assert.equal(inizioSullaGriglia('11:30', GIORNATA), '11:25')
    assert.equal(inizioSullaGriglia('13:00', GIORNATA), '12:55')
  })

  it('vince il punto più vicino, e a pari distanza il più presto', () => {
    // 08:22 sta a 22 minuti da 08:00 e a 23 da 08:45.
    assert.equal(inizioSullaGriglia('08:22', GIORNATA), '08:00')
    assert.equal(inizioSullaGriglia('08:23', GIORNATA), '08:45')
    // 09:15 sta a mezz'ora da 08:45 e a mezz'ora da 09:45, dall'altra parte della pausa.
    assert.equal(inizioSullaGriglia('09:15', GIORNATA), '08:45')
  })

  it('senza pause l’ora resta com’è', () => {
    assert.equal(inizioSullaGriglia('08:05', SENZA_PAUSE), '08:05')
  })
})

describe('pause della giornata: le linee della settimana', () => {
  const ore = (minuti) => minuti.map((m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)

  it('le righe sono i confini delle UD fra le pause, inizio e fine di ogni pausa compresi', () => {
    assert.deepEqual(ore(lineeDellaGiornata(GIORNATA, 7 * 60, 13 * 60)), [
      '07:15', '08:00', '08:45', '09:30', '09:45', '10:30', '11:15', '11:25', '12:10', '12:55',
    ])
  })

  it('solo dentro la fascia mostrata', () => {
    assert.deepEqual(ore(lineeDellaGiornata(GIORNATA, 9 * 60 + 40, 11 * 60 + 20)), [
      '09:45', '10:30', '11:15',
    ])
  })
})

describe('pause della giornata: una lezione nuova le segue', () => {
  it('da un inizio sulla griglia, le UD si fermano alla pausa e riprendono dopo', () => {
    assert.deepEqual(forma(slotNellaGiornata('08:00', 4 * 45, GIORNATA)), [
      'lezione 08:00–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–11:15',
    ])
  })

  it('attraversa tutte le pause che incontra', () => {
    assert.deepEqual(forma(slotNellaGiornata('08:00', 6 * 45, GIORNATA)), [
      'lezione 08:00–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–11:15',
      'pausa 11:15–11:25',
      'lezione 11:25–12:55',
    ])
  })

  it('non finisce con una pausa: se le UD finiscono lì, finisce lì', () => {
    assert.deepEqual(forma(slotNellaGiornata('08:00', 2 * 45, GIORNATA)), ['lezione 08:00–09:30'])
  })

  it('non comincia con una pausa: in pausa, o senza posto per un’UD, comincia dopo', () => {
    assert.deepEqual(forma(slotNellaGiornata('09:35', 45, GIORNATA)), ['lezione 09:45–10:30'])
    assert.deepEqual(forma(slotNellaGiornata('09:00', 45, GIORNATA)), ['lezione 09:45–10:30'])
  })

  it('da un inizio fuori griglia nessuna UD si spezza: i minuti in più sono pausa', () => {
    const slot = slotNellaGiornata('08:20', 3 * 45, GIORNATA)
    assert.deepEqual(forma(slot), [
      'lezione 08:20–09:05',
      'pausa 09:05–09:45',
      'lezione 09:45–11:15',
    ])
    assert.equal(validaSlot(slot, 45).valido, true)
  })

  it('le UD restano quelle chieste, pause o no', () => {
    const lezione = lezioneNellaGiornata('cor1', '2025-09-01', '08:00', 6 * 45, GIORNATA)
    assert.equal(contaUd(lezione, 45), 6)
    assert.equal(validaSlot(lezione.slot, 45).valido, true)
  })

  it('senza pause è la lezione di sempre: uno slot solo', () => {
    const lezione = lezioneNellaGiornata('cor1', '2025-09-01', '08:05', 4 * 45, SENZA_PAUSE)
    const sempre = creaLezione('cor1', '2025-09-01', '08:05', 4 * 45)
    assert.deepEqual(forma(lezione.slot), forma(sempre.slot))
  })
})

describe('pause della giornata: un’ora che c’è già, quando si muove', () => {
  const blocco = () => creaLezione('cor1', '2025-09-01', '14:00', 4 * 45).slot

  it('spostata, si ridispone sulle pause con le stesse UD', () => {
    assert.deepEqual(forma(slotSullePause(blocco(), GIORNATA, '08:00')), [
      'lezione 08:00–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–11:15',
    ])
  })

  it('le pause fatte a mano lasciano il posto a quelle della giornata', () => {
    const aMano = slotNellaGiornata('08:00', 4 * 45, {
      minutiUd: 45,
      pause: { prima: { inizio: '09:00', durataMin: 5 }, seguenti: [] },
    })
    assert.deepEqual(forma(slotSullePause(aMano, GIORNATA)), [
      'lezione 08:00–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–11:15',
    ])
  })

  it('senza pause si sposta com’è; con fasce del calendario ICS anche', () => {
    assert.deepEqual(forma(slotSullePause(blocco(), SENZA_PAUSE, '08:00')), ['lezione 08:00–11:00'])
    const ics = blocco().map((s) => ({ ...s, ics: true }))
    assert.deepEqual(forma(slotSullePause(ics, GIORNATA, '08:00')), ['lezione 08:00–11:00'])
  })

  it('stirata dal fondo, l’UD in più scavalca la pausa', () => {
    const due = slotNellaGiornata('08:00', 2 * 45, GIORNATA)
    assert.deepEqual(forma(slotStiratiSullePause(due, 'fine', 1, GIORNATA)), [
      'lezione 08:00–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–10:30',
    ])
  })

  it('stirata dalla cima, comincia prima scavalcando la pausa all’indietro', () => {
    const dopo = slotNellaGiornata('09:45', 2 * 45, GIORNATA)
    assert.deepEqual(forma(slotStiratiSullePause(dopo, 'inizio', 1, GIORNATA)), [
      'lezione 08:45–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–11:15',
    ])
  })

  it('accorciata dalla cima, comincia dove cominciava l’UD che resta prima', () => {
    const quattro = slotNellaGiornata('08:00', 4 * 45, GIORNATA)
    assert.deepEqual(forma(slotStiratiSullePause(quattro, 'inizio', -2, GIORNATA)), [
      'lezione 09:45–11:15',
    ])
  })

  it('un gesto senza senso torna null: sotto un’UD, o oltre mezzanotte', () => {
    const una = slotNellaGiornata('08:00', 45, GIORNATA)
    assert.equal(slotStiratiSullePause(una, 'fine', -1, GIORNATA), null)
    const tardi = slotNellaGiornata('23:00', 45, GIORNATA)
    assert.equal(slotStiratiSullePause(tardi, 'fine', 1, GIORNATA), null)
  })
})

describe('pause della giornata: un’ora che ci cade sopra', () => {
  it('si accorge di un’UD sopra la pausa, non di un’ora che la tocca e basta', () => {
    assert.equal(invadeLePause(creaLezione('c', '2025-09-01', '08:45', 90).slot, GIORNATA), true)
    assert.equal(invadeLePause(creaLezione('c', '2025-09-01', '08:00', 90).slot, GIORNATA), false)
    assert.equal(invadeLePause(creaLezione('c', '2025-09-01', '09:45', 90).slot, GIORNATA), false)
  })

  it('la spezza e la sposta tenendo inizio e UD; se non la invade, la lascia com’è', () => {
    const sopra = creaLezione('c', '2025-09-01', '08:45', 3 * 45).slot
    assert.deepEqual(forma(slotFuoriDallePause(sopra, GIORNATA)), [
      'lezione 08:45–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–11:15',
    ])
    const fuori = creaLezione('c', '2025-09-01', '13:00', 90).slot
    assert.equal(slotFuoriDallePause(fuori, GIORNATA), fuori)
    const ics = sopra.map((s) => ({ ...s, ics: true }))
    assert.equal(slotFuoriDallePause(ics, GIORNATA), ics)
  })
})

describe('pause della giornata: un’ora ancorata al calendario ICS', () => {
  /** L'evento della scuola: due UD dalle 8:00, fino alla ricreazione. */
  const evento = () => [{ id: 'e1', inizio: '08:00', fine: '09:30', tipo: 'lezione', ics: true }]

  it('allungata in fondo, l’UD libera scavalca la pausa e la pausa diventa una fascia', () => {
    assert.deepEqual(forma(slotStiratiAncoratiSullePause(evento(), 'fine', 1, GIORNATA)), [
      'lezione 08:00–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–10:30',
    ])
  })

  it('l’evento non si muove, e allungata in cima si comincia prima', () => {
    const stirata = slotStiratiAncoratiSullePause(evento(), 'inizio', 1, GIORNATA)
    assert.deepEqual(forma(stirata), ['lezione 07:15–08:00', 'lezione 08:00–09:30'])
    assert.equal(stirata.find((s) => s.ics)?.id, 'e1')
  })

  it('un evento che comincia dopo la ricreazione, allungato in cima, la scavalca all’indietro', () => {
    const dopo = [{ id: 'e2', inizio: '09:45', fine: '11:15', tipo: 'lezione', ics: true }]
    assert.deepEqual(forma(slotStiratiAncoratiSullePause(dopo, 'inizio', 1, GIORNATA)), [
      'lezione 08:45–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–11:15',
    ])
  })

  it('sotto l’evento non si accorcia', () => {
    assert.equal(slotStiratiAncoratiSullePause(evento(), 'fine', -1, GIORNATA), null)
  })

  it('una fascia libera sopra la pausa si ridispone, l’evento resta', () => {
    const conLibera = [
      ...evento(),
      { id: 'l1', inizio: '09:30', fine: '10:15', tipo: 'lezione' },
    ]
    assert.deepEqual(forma(slotFuoriDallePause(conLibera, GIORNATA)), [
      'lezione 08:00–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–10:30',
    ])
  })
})

describe('pause della giornata: l’orario del corso', () => {
  it('la fascia dopo comincia dove finisce la lezione della precedente, pausa saltata', () => {
    const attaccate = ricorrenzeIncatenate([
      { id: 'r1', giorno: 1, inizio: '08:00', durataMin: 90, aula: '' },
      { id: 'r2', giorno: 1, inizio: '07:00', durataMin: 90, aula: '' },
      { id: 'r3', giorno: 1, inizio: '07:00', durataMin: 45, aula: '' },
    ], GIORNATA)
    assert.deepEqual(attaccate.map((r) => r.inizio), ['08:00', '09:45', '11:25'])
  })

  it('le lezioni generate seguono le pause, e rilanciando non si duplicano', () => {
    const registro = normalizzaRegistro({
      anni: [{ id: 'a1', inizio: '2025-09-01', fine: '2025-09-07', semestri: [], sospensioni: [] }],
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A' }],
      corsi: [{
        id: 'cor1',
        classeId: 'c1',
        materiaId: 'm1',
        titolo: 'Mate',
        // Lunedì: comincia in pausa, e la lezione comincia dopo.
        orario: [{ id: 'r1', giorno: 1, inizio: '09:35', durataMin: 180 }],
      }],
      impostazioni: { pause: PAUSE },
    })
    const { nuove } = lezioniDaOrario(registro, registro.corsi[0], '2025-09-01', '2025-09-01')
    assert.equal(nuove.length, 1)
    assert.deepEqual(forma(nuove[0].slot), [
      'lezione 09:45–11:15',
      'pausa 11:15–11:25',
      'lezione 11:25–12:55',
    ])
    registro.lezioni.push(...nuove)
    const ancora = lezioniDaOrario(registro, registro.corsi[0], '2025-09-01', '2025-09-01')
    assert.equal(ancora.nuove.length, 0)
    assert.equal(ancora.saltate, 1)
    assert.equal(inizioLezione(nuove[0]), '09:45')
  })
})

describe('pause della giornata: normalizzazione e dogana', () => {
  it('una giornata che sta in piedi passa com’è', () => {
    assert.deepEqual(normalizzaPause(PAUSE, 45), PAUSE)
    assert.equal(validaPause(PAUSE, 45).valido, true)
  })

  it('senza una prima pausa con l’orario non ce n’è nessuna', () => {
    assert.equal(normalizzaPause(undefined, 45), undefined)
    assert.equal(normalizzaPause({ seguenti: [{ dopoUd: 2, durataMin: 10 }] }, 45), undefined)
    assert.equal(normalizzaPause({ prima: { inizio: '9 e mezza', durataMin: 15 } }, 45), undefined)
  })

  it('durate e distanze fuori misura tornano dentro; le pause di troppo cadono', () => {
    const pause = normalizzaPause({
      prima: { inizio: '08:00', durataMin: 500 },
      seguenti: Array.from({ length: 12 }, () => ({ dopoUd: 0.4, durataMin: 0 })),
    }, 45)
    assert.equal(pause.prima.durataMin, 120)
    assert.equal(pause.seguenti.length, 7)
    assert.deepEqual(pause.seguenti[0], { dopoUd: 1, durataMin: 1 })
  })

  it('quel che finirebbe dopo mezzanotte cade, con le pause che vengono dopo', () => {
    assert.equal(normalizzaPause({ prima: { inizio: '23:30', durataMin: 30 } }, 45), undefined)
    const pause = normalizzaPause({
      prima: { inizio: '22:00', durataMin: 15 },
      seguenti: [{ dopoUd: 1, durataMin: 10 }, { dopoUd: 2, durataMin: 10 }],
    }, 45)
    assert.deepEqual(pause.seguenti, [{ dopoUd: 1, durataMin: 10 }])
  })

  it('la dogana dice di no con il motivo, invece di raddrizzare', () => {
    const esito = validaPause({
      prima: { inizio: '09:30', durataMin: 15 },
      seguenti: [{ dopoUd: 1.5, durataMin: 10 }, { dopoUd: 2, durataMin: 0 }],
    }, 45)
    assert.equal(esito.valido, false)
    assert.match(esito.errori.join(' '), /seconda pausa cade fra 1 e 12 unità didattiche intere/)
    assert.match(esito.errori.join(' '), /terza pausa dura fra 1 e 120 minuti/)
    assert.match(
      validaPause({ prima: { inizio: '23:50', durataMin: 15 }, seguenti: [] }, 45).errori[0],
      /mezzanotte/,
    )
  })

  it('le impostazioni senza pause restano senza', () => {
    assert.equal('pause' in normalizzaImpostazioni({}), false)
    assert.deepEqual(normalizzaImpostazioni({ pause: PAUSE }).pause, PAUSE)
  })
})

describe('pause della giornata: l’UD lunga quanto la dice il documento', () => {
  /** Le stesse pause, con UD da cinquanta minuti. */
  const DA_CINQUANTA = { minutiUd: 50, pause: PAUSE }

  it('le pause seguenti si contano in UD di quella durata', () => {
    assert.deepEqual(pauseDellaGiornata(DA_CINQUANTA), [
      { inizio: '09:30', fine: '09:45' },
      { inizio: '11:25', fine: '11:35' },
    ])
  })

  it('la griglia ha il passo dell’UD', () => {
    assert.equal(inizioSullaGriglia('08:05', DA_CINQUANTA), '07:50')
    assert.equal(inizioSullaGriglia('08:30', DA_CINQUANTA), '08:40')
    assert.deepEqual(forma(slotNellaGiornata('08:40', 3 * 50, DA_CINQUANTA)), [
      'lezione 08:40–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–11:25',
    ])
  })

  it('la dogana misura la mezzanotte con le UD di quella durata', () => {
    const tarda = { prima: { inizio: '21:00', durataMin: 15 }, seguenti: [{ dopoUd: 3, durataMin: 10 }] }
    assert.equal(validaPause(tarda, 45).valido, true)
    assert.equal(validaPause(tarda, 60).valido, false)
  })
})

describe('la fine della giornata sulla griglia', () => {
  it('va dove un’UD finisce: la fine di una UD o l’inizio di una pausa', () => {
    assert.equal(fineSullaGriglia('13:00', GIORNATA), '12:55')
    assert.equal(fineSullaGriglia('09:25', GIORNATA), '09:30')
    assert.equal(fineSullaGriglia('11:10', GIORNATA), '11:15')
    assert.equal(fineSullaGriglia('13:00', SENZA_PAUSE), '13:00')
  })
})

describe('la giornata disegnata, dall’inizio alla fine', () => {
  const pezzi = (tratti) => tratti.map((t) => `${t.tipo} ${t.inizio}–${t.fine}`)

  it('UD in fila, le pause dove cadono', () => {
    assert.deepEqual(pezzi(scansioneDellaGiornata(GIORNATA, '08:00', '11:25')), [
      'ud 08:00–08:45',
      'ud 08:45–09:30',
      'pausa 09:30–09:45',
      'ud 09:45–10:30',
      'ud 10:30–11:15',
      'pausa 11:15–11:25',
    ])
  })

  it('i minuti che non fanno un’UD si vedono, invece di sparire', () => {
    // Dalle 7:30: dieci minuti prima della pausa e dieci in fondo non bastano.
    assert.deepEqual(pezzi(scansioneDellaGiornata(GIORNATA, '07:30', '10:40')), [
      'ud 07:30–08:15',
      'ud 08:15–09:00',
      'avanzo 09:00–09:30',
      'pausa 09:30–09:45',
      'ud 09:45–10:30',
      'avanzo 10:30–10:40',
    ])
  })

  it('senza pause è una fila di UD', () => {
    assert.deepEqual(pezzi(scansioneDellaGiornata(SENZA_PAUSE, '08:00', '09:30')), [
      'ud 08:00–08:45',
      'ud 08:45–09:30',
    ])
  })
})

describe('un’ora riscritta su un’UD di un’altra lunghezza', () => {
  it('tiene le sue UD e comincia dove cominciava', () => {
    const ora = creaLezione('c', '2025-09-01', '08:00', 2 * 45)
    assert.deepEqual(forma(slotSuAltraUd(ora.slot, 45, { minutiUd: 50 })), ['lezione 08:00–09:40'])
  })

  it('le pause fatte a mano tengono i loro minuti, e il resto si riattacca', () => {
    const slot = [
      { id: 'a', inizio: '08:00', fine: '08:45', tipo: 'lezione' },
      { id: 'b', inizio: '08:45', fine: '08:50', tipo: 'pausa' },
      { id: 'c', inizio: '08:50', fine: '09:35', tipo: 'lezione' },
    ]
    assert.deepEqual(forma(slotSuAltraUd(slot, 45, { minutiUd: 60 })), [
      'lezione 08:00–09:00',
      'pausa 09:00–09:05',
      'lezione 09:05–10:05',
    ])
  })

  it('con le pause della giornata si ridispone dove le invade', () => {
    const ora = creaLezione('c', '2025-09-01', '08:00', 2 * 45)
    // Due UD da cinquanta dalle 8 finirebbero alle 9:40, sopra la ricreazione
    // delle 9:30: la seconda riprende quando la pausa finisce.
    assert.deepEqual(forma(slotSuAltraUd(ora.slot, 45, { minutiUd: 50, pause: PAUSE })), [
      'lezione 08:00–08:50',
      'pausa 08:50–09:45',
      'lezione 09:45–10:35',
    ])
  })

  it('un’ora che uscirebbe dal giorno resta com’era', () => {
    const tarda = creaLezione('c', '2025-09-01', '22:30', 2 * 45)
    assert.equal(slotSuAltraUd(tarda.slot, 45, { minutiUd: 120 }), null)
  })
})
