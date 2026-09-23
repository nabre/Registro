// Che cosa si scrive su disco, e che cosa si rilegge.
//
// La scrittura toglie i campi lasciati vuoti, perché `"nota": ""` ripetuto per
// ogni persona di ogni ora è un fatto che nessuno ha mai scritto. È un
// risparmio che vale solo finché è gratis: un campo tolto che rileggendo torna
// diverso non è un file più piccolo, è un dato perso, e lo si scoprirebbe mesi
// dopo da un allievo ritirato che ricompare negli appelli.
//
// Per questo la prova che conta non guarda un esempio scelto bene: prende un
// registro con dentro tutti i casi storti che ci si ricorda — il ritirato, il
// voto nullo, il ritardo di zero minuti, l'ora senza appello — lo scrive come
// lo scriverebbe il documento, lo rilegge, e pretende che sia lo stesso.

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
    // `false` non è «manca»: `attivo` nasce vero quando manca, e toglierlo da
    // chi si è ritirato lo rimetterebbe in classe. Lo zero e il nullo sono
    // altrettanto detti: un ritardo di zero minuti, un voto che non c'è.
    const scritto = testoCollezione([{ attivo: false, minuti: 0, valore: null }])

    assert.ok(scritto.includes('"attivo": false'))
    assert.ok(scritto.includes('"minuti": 0'))
    assert.ok(scritto.includes('"valore": null'))
  })

  it('dentro un elenco non tocca niente', () => {
    // Scartare un elemento di un array non lo accorcia: lo riempie di `null`,
    // e una fila di stati d'appello si bucherebbe.
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
    // In un anno appena cominciato valutazioni e smistamenti sono `[]`: senza
    // questa riga il documento si ritrovava dentro un file illeggibile.
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
            // Un appello pieno, uno muto, un ritardo di zero minuti: i tre modi
            // in cui una riga di presenza può essere fatta.
            { allievoId: conRecapiti.id, stati: ['presente', 'presente'], nota: '' },
            { allievoId: ritirato.id, stati: [] },
            { allievoId: spoglio.id, stati: ['ritardo', 'presente'], minuti: 0, nota: 'in bus' },
          ],
          osservazioni: [],
          avanzamento: [],
          // La matrice del comportamento: una casella con il segno, una con la
          // sola annotazione, e una che non dice niente — quella non si
          // riscrive, come non la scrive il registro quando la si svuota.
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
            // Un voto che non c'è e un'assenza alla prova: due fatti diversi,
            // e nessuno dei due è «vuoto».
            { allievoId: ritirato.id, valore: null },
            { allievoId: spoglio.id, valore: null, assente: true },
          ],
        },
      ],
      piani: [],
      fascicoli: [],
      consegne: [],
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
    // È il caso per cui `false` non si toglie: senza questa riga il registro
    // rimetterebbe negli appelli chi ha lasciato la scuola.
    const { dopo } = giro(registroDifficile())
    const allievi = dopo.classi[0].allievi

    assert.deepEqual(
      allievi.map((a) => a.attivo),
      [true, false, true],
    )
  })

  it('le caselle segnate sulla matrice sopravvivono alla riapertura', () => {
    // È il caso per cui questo giro esiste: la matrice non passava dalla
    // rilettura, e quel che si era segnato durante l'ora spariva riaprendo
    // l'anno — senza un errore, senza un avviso, senza che nessuno potesse
    // accorgersene se non rileggendo un verbale vecchio.
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
    // Quella senza segno e senza nota non torna: è una riga che non dice
    // niente, e il registro la toglie anche quando la si svuota a schermo.
    assert.equal(matrice.length, 2)
  })

  it('un voto che non c’è non diventa uno zero', () => {
    const { dopo } = giro(registroDifficile())
    const voti = dopo.valutazioni[0].voti

    assert.deepEqual(voti.map((v) => v.valore), [4.5, null, null])
    assert.equal(voti[2].assente, true)
  })

  it('e il file scritto è più corto di quello di prima', () => {
    // La ragione per cui si fa: la misura, non l'impressione.
    const { prima } = giro(registroDifficile())
    const pieno = `${JSON.stringify(prima.lezioni, null, 2)}\n`
    const potato = testoCollezione(prima.lezioni)

    assert.ok(potato.length < pieno.length)
  })
})
