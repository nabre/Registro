// Che cosa si scrive su disco e che cosa si rilegge. La scrittura toglie i
// campi vuoti (`"nota": ""`), ma solo se rileggendo tornano uguali: altrimenti
// è un dato perso. La prova prende un registro con i casi storti (ritirato,
// voto nullo, ritardo di zero minuti, ora senza appello), lo scrive, lo
// rilegge e pretende che sia lo stesso.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaAllievo,
  normalizzaRegistro,
  testoCollezione,
} from '../../dist-tests/domain.mjs'

/** Il giro che fa un dato vero: normalizzato, scritto, riletto, normalizzato. */
function giro (grezzo) {
  const prima = normalizzaRegistro(grezzo)
  const riletto = {}
  for (const chiave of Object.keys(prima)) {
    riletto[chiave] = JSON.parse(testoCollezione(prima[chiave]))
  }
  return { prima, dopo: normalizzaRegistro(riletto) }
}

describe('il testo di una collezione', () => {
  it('non scrive i campi lasciati vuoti', () => {
    const scritto = testoCollezione([{ id: 'x', nota: '', stati: [], titolo: 'Verifica' }])

    assert.ok(!scritto.includes('nota'))
    assert.ok(!scritto.includes('stati'))
    assert.ok(scritto.includes('"titolo": "Verifica"'))
  })

  it('scrive quel che vuoto non è, anche se ci somiglia', () => {
    // `false` non è «manca»: `attivo` nasce vero, e toglierlo rimetterebbe in
    // classe chi si è ritirato. Zero e nullo sono altrettanto detti.
    const scritto = testoCollezione([{ attivo: false, minuti: 0, valore: null }])

    assert.ok(scritto.includes('"attivo": false'))
    assert.ok(scritto.includes('"minuti": 0'))
    assert.ok(scritto.includes('"valore": null'))
  })

  it('dentro un elenco non tocca niente', () => {
    // Togliere un elemento da un array lo riempirebbe di `null`: gli array
    // restano interi.
    const scritto = testoCollezione([{ stati: ['presente', '', 'assente'] }])

    assert.ok(scritto.includes('"presente"'))
    assert.ok(scritto.includes('""'))
    assert.ok(!scritto.includes('null'))
  })

  it('resta leggibile a mano: indentato, e con l’a capo in fondo', () => {
    const scritto = testoCollezione([{ id: 'x' }])

    assert.ok(scritto.includes('\n  {\n'))
    assert.ok(scritto.endsWith(']\n'))
  })
})

describe('una collezione vuota', () => {
  it('resta un elenco vuoto, non diventa «undefined»', () => {
    // Un anno appena cominciato ha collezioni `[]`: vanno scritte come JSON
    // valido.
    assert.equal(testoCollezione([]), '[]\n')
    assert.deepEqual(JSON.parse(testoCollezione([])), [])
  })
})

describe('scrivere e rileggere non cambia niente', () => {
  /** Un registro con dentro i casi che si sbagliano: non un esempio comodo. */
  function registroDifficile () {
    const ritirato = { ...creaAllievo('Bianchi', 'Luca'), attivo: false }
    const conRecapiti = {
      ...creaAllievo('Rossi', 'Maria'),
      indirizzo: { via: 'Via Campagna 2', cap: '6512', localita: 'Giubiasco' },
      telefoni: [
        { id: 'tel-1', contatto: 'pif', etichetta: 'cellulare', numero: '+41 79 000 00 00' },
      ],
    }
    const spoglio = creaAllievo('Verdi', 'Anna')

    return {
      versione: 1,
      anni: [
        {
          id: 'ann-1',
          etichetta: '2026/27',
          inizio: '2026-09-01',
          fine: '2027-06-30',
          semestri: [
            { id: 'sem-1', etichetta: '1° semestre', inizio: '2026-09-01', fine: '2027-01-31' },
          ],
        },
      ],
      annoCorrenteId: 'ann-1',
      materie: [{ id: 'mat-1', nome: 'Matematica' }],
      classi: [
        {
          id: 'cls-1',
          annoId: 'ann-1',
          nome: 'I MEC A',
          allievi: [conRecapiti, ritirato, spoglio],
        },
      ],
      corsi: [{ id: 'cor-1', classeId: 'cls-1', materiaId: 'mat-1', titolo: 'I MEC A — Matematica' }],
      lezioni: [
        {
          id: 'lez-1',
          corsoId: 'cor-1',
          data: '2026-09-15',
          stato: 'svolta',
          slot: [{ id: 'slt-1', inizio: '08:00', fine: '09:30', tipo: 'lezione' }],
          presenze: [
            // Un appello pieno, uno muto, un ritardo di zero minuti.
            { allievoId: conRecapiti.id, stati: ['presente', 'presente'], nota: '' },
            { allievoId: ritirato.id, stati: [] },
            { allievoId: spoglio.id, stati: ['ritardo', 'presente'], minuti: 0, nota: 'in bus' },
          ],
          osservazioni: [],
          avanzamento: [],
          // La matrice del comportamento: una casella col segno, una con la sola
          // annotazione, una che non dice niente e non si riscrive.
          matrice: [
            { allievoId: conRecapiti.id, aspetto: 'partecipazione', segno: 'positivo' },
            { allievoId: spoglio.id, aspetto: 'autonomia', segno: null, nota: 'ha chiesto aiuto' },
            { allievoId: ritirato.id, aspetto: 'impegno', segno: null },
          ],
        },
      ],
      valutazioni: [
        {
          id: 'val-1',
          corsoId: 'cor-1',
          titolo: 'Verifica',
          data: '2026-10-05',
          voti: [
            { allievoId: conRecapiti.id, valore: 4.5 },
            // Un voto che non c'è e un'assenza alla prova: due fatti, nessuno «vuoto».
            { allievoId: ritirato.id, valore: null },
            { allievoId: spoglio.id, valore: null, assente: true },
          ],
        },
      ],
      piani: [],
      fascicoli: [],
      consegne: [],
      // Il check: una spunta data in un'ora e una col giorno scelto a mano. Il
      // rimando nullo («non viene da un'ora») torna nullo.
      check: [
        {
          id: 'chk-1',
          corsoId: 'cor-1',
          colonne: [
            { id: 'clc-1', titolo: 'Regolamento firmato' },
            { id: 'clc-2', titolo: 'Quaderno' },
          ],
          spunte: [
            {
              allievoId: conRecapiti.id,
              colonnaId: 'clc-1',
              lezioneId: 'lez-1',
              data: '2026-09-15',
              fattaIl: '2026-09-15T08:10:00.000Z',
            },
            {
              allievoId: ritirato.id,
              colonnaId: 'clc-2',
              lezioneId: null,
              data: '2026-09-20',
              fattaIl: '2026-09-21T18:00:00.000Z',
            },
          ],
          creatoIl: '2026-09-10T12:00:00.000Z',
          aggiornatoIl: '2026-09-21T18:00:00.000Z',
        },
      ],
      smistamenti: [],
      coordinate: [
        {
          chiave: 'via campagna 2, 6512 giubiasco',
          indirizzo: 'Via Campagna 2, 6512 Giubiasco',
          lat: 46.1712,
          lon: 9.0112,
          etichetta: '',
        },
      ],
    }
  }

  it('il registro riletto è identico a quello scritto', () => {
    const { prima, dopo } = giro(registroDifficile())

    assert.deepEqual(dopo, prima)
  })

  it('chi si è ritirato resta ritirato', () => {
    // `false` resta: senza, il ritirato tornerebbe negli appelli.
    const { dopo } = giro(registroDifficile())
    const allievi = dopo.classi[0].allievi

    assert.deepEqual(
      allievi.map((a) => a.attivo),
      [true, false, true],
    )
  })

  it('le caselle segnate sulla matrice sopravvivono alla riapertura', () => {
    // La matrice passa dalla rilettura: quel che si è segnato durante l'ora c'è
    // ancora riaprendo l'anno.
    const { dopo } = giro(registroDifficile())
    const matrice = dopo.lezioni[0].matrice

    assert.deepEqual(matrice, [
      { allievoId: matrice[0].allievoId, aspetto: 'partecipazione', segno: 'positivo' },
      {
        allievoId: matrice[1].allievoId,
        aspetto: 'autonomia',
        segno: null,
        nota: 'ha chiesto aiuto',
      },
    ])
    // La casella senza segno né nota non torna, come quando la si svuota a
    // schermo.
    assert.equal(matrice.length, 2)
  })

  it('le spunte del check tornano con il loro quando', () => {
    const { dopo } = giro(registroDifficile())
    const spunte = dopo.check[0].spunte

    assert.deepEqual(
      spunte.map((s) => [s.colonnaId, s.lezioneId, s.data]),
      [['clc-1', 'lez-1', '2026-09-15'], ['clc-2', null, '2026-09-20']],
    )
  })

  it('un voto che non c’è non diventa uno zero', () => {
    const { dopo } = giro(registroDifficile())
    const voti = dopo.valutazioni[0].voti

    assert.deepEqual(voti.map((v) => v.valore), [4.5, null, null])
    assert.equal(voti[2].assente, true)
  })

  it('e il file scritto è più corto di quello di prima', () => {
    // La misura del risparmio.
    const { prima } = giro(registroDifficile())
    const pieno = `${JSON.stringify(prima.lezioni, null, 2)}\n`
    const potato = testoCollezione(prima.lezioni)

    assert.ok(potato.length < pieno.length)
  })
})
