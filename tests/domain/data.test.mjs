// Validazione, normalizzazione, fabbriche e lettura degli elenchi. La
// normalizzazione regge un JSON monco, un campo del tipo sbagliato e un file di
// una versione precedente: i file stanno in una cartella sincronizzata e si
// aprono anche a mano.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  LIMITI_UD,
  creaAnno,
  creaAnnoCorrente,
  creaRicorrenza,
  creaLezione,
  creaSlot,
  duplicaLezione,
  duplicaPiano,
  slotSpostati,
  creaPiano,
  creaAttivita,
  leggiElencoAllievi,
  normalizzaRegistro,
  corsoDi,
  registroDelCorso,
  dateDellOrario,
  descriviRicorrenza,
  lezioniDaOrario,
  ricorrenzeIncatenate,
  sospeso,
  urlValido,
  validaRisorsa,
  riferimentiRotti,
  validaAllievo,
  validaAnno,
  validaClasse,
  validaLezione,
  validaRicorrenza,
  validaScala,
  validaSlot,
  creaValutazione,
  mediaAllievo,
  normalizzaImpostazioni,
  normalizzaValutazione,
  notaFineSemestre,
  validaValutazione,
  prossimaLezione,
} from '../../dist-tests/domain.mjs'

describe('quel che si legge da un file scritto a mano', () => {
  it('un voto che non è un numero resta vuoto, non diventa zero', () => {
    // «4,5» con la virgola italiana è 4.5, non NaN o 0.
    const registro = normalizzaRegistro({
      valutazioni: [
        {
          id: 'val-1',
          corsoId: 'cor-1',
          titolo: 'Verifica',
          data: '2026-10-05',
          voti: [
            { allievoId: 'a1', valore: '4,5' },
            { allievoId: 'a2', valore: 4.5 },
            { allievoId: 'a3', valore: '5' },
          ],
        },
      ],
    })

    assert.deepEqual(
      registro.valutazioni[0].voti.map((v) => v.valore),
      [null, 4.5, 5],
    )
  })

  it('due classi senza colore non escono dello stesso colore', () => {
    const registro = normalizzaRegistro({
      classi: [
        { id: 'c1', annoId: 'a1', nome: 'I MEC A' },
        { id: 'c2', annoId: 'a1', nome: 'II MEC A' },
      ],
    })

    assert.notEqual(registro.classi[0].colore, registro.classi[1].colore)
  })
})

describe('la prossima lezione', () => {
  it('a mezzogiorno non è più quella delle otto', () => {
    const mattino = creaLezione('cor-1', '2026-09-15', '08:00', 45)
    const pomeriggio = creaLezione('cor-1', '2026-09-15', '14:00', 45)
    const domani = creaLezione('cor-1', '2026-09-16', '08:00', 45)
    const lezioni = [mattino, pomeriggio, domani]

    assert.equal(prossimaLezione(lezioni, '2026-09-15').id, mattino.id)
    assert.equal(prossimaLezione(lezioni, '2026-09-15', '12:00').id, pomeriggio.id)
    assert.equal(prossimaLezione(lezioni, '2026-09-15', '18:00').id, domani.id)
  })

  it('salta le annullate', () => {
    const annullata = creaLezione('cor-1', '2026-09-15', '08:00', 45)
    annullata.stato = 'annullata'
    const buona = creaLezione('cor-1', '2026-09-16', '08:00', 45)

    assert.equal(prossimaLezione([annullata, buona], '2026-09-15', '07:00').id, buona.id)
  })
})

describe('materie e corsi', () => {
  it('trasforma la materia scritta sulla classe in una materia vera e in un corso', () => {
    const registro = normalizzaRegistro({
      anni: [],
      classi: [
        { id: 'c1', annoId: 'a1', nome: 'I MEC A', materia: 'Matematica' },
        { id: 'c2', annoId: 'a1', nome: 'II MEC A', materia: 'matematica' },
      ],
    })
    // Due grafie, una materia sola: la materia non è testo libero.
    assert.equal(registro.materie.length, 1)
    assert.equal(registro.materie[0].nome, 'Matematica')
    // La classe non porta la materia: la porta il corso, uno per classe.
    assert.equal(registro.classi[0].materiaId, undefined)
    assert.equal(registro.corsi.length, 2)
    assert.equal(corsoDi(registro, 'c1', registro.materie[0].id).classeId, 'c1')
    assert.equal(corsoDi(registro, 'c2', registro.materie[0].id).classeId, 'c2')
  })

  it('esiste un corso solo per coppia classe e materia', () => {
    const registro = normalizzaRegistro({
      anni: [],
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A', materiaId: 'm1' }],
      corsi: [
        { id: 'cor1', classeId: 'c1', materiaId: 'm1', titolo: 'uno' },
        { id: 'cor2', classeId: 'c1', materiaId: 'm1', titolo: 'doppione' },
      ],
    })
    assert.equal(registro.corsi.length, 1)
    assert.equal(registro.corsi[0].id, 'cor1')
  })

  it('migra il vecchio programma in un corso e ci riaggancia i piani', () => {
    const registro = normalizzaRegistro({
      anni: [],
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A' }],
      programmi: [{ id: 'prg1', annoId: 'a1', classeId: 'c1', materiaId: 'm1', titolo: 'Mate I' }],
      piani: [{ id: 'p1', annoId: 'a1', classeId: 'c1', programmaId: 'prg1', titolo: 'Frazioni' }],
      lezioni: [{ id: 'l1', annoId: 'a1', classeId: 'c1', data: '2025-09-15', slot: [] }],
    })
    assert.equal(registro.corsi.length, 1)
    assert.equal(registro.corsi[0].materiaId, 'm1')
    // Il piano perde anno e classe e si aggancia al corso nato dal programma.
    assert.equal(registro.piani[0].corsoId, registro.corsi[0].id)
    assert.equal(registro.piani[0].annoId, undefined)
    // La lezione si aggancia al corso nato dal programma.
    assert.equal(registro.lezioni[0].corsoId, registro.corsi[0].id)
  })

  it('una lezione che non si sa dove mettere finisce in un corso di ripiego', () => {
    const registro = normalizzaRegistro({
      anni: [],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A' }],
      lezioni: [{ id: 'l1', annoId: 'a1', classeId: 'c1', data: '2025-09-15', slot: [] }],
    })
    // Niente materia da nessuna parte: se ne inventa una sola, e si vede.
    assert.equal(registro.materie.length, 1)
    assert.equal(registro.materie[0].nome, 'Da assegnare')
    assert.equal(registro.lezioni[0].corsoId, registro.corsi[0].id)
  })

  it('il semestre della valutazione non si salva: lo dice la data', () => {
    const registro = normalizzaRegistro({
      anni: [],
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A', materiaId: 'm1' }],
      valutazioni: [
        {
          id: 'v1',
          annoId: 'a1',
          classeId: 'c1',
          semestreId: 'sbagliato',
          titolo: 'Verifica',
          data: '2025-10-01',
        },
      ],
    })
    assert.equal(registro.valutazioni[0].semestreId, undefined)
    assert.equal(registro.valutazioni[0].corsoId, registro.corsi[0].id)
  })
})

describe('il registro di un corso', () => {
  /** Un registro con un corso e le ore che gli si vogliono dare. */
  function conOre (ore) {
    const registro = normalizzaRegistro({
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A', materia: 'Matematica' }],
    })
    const corso = registro.corsi[0]
    for (const [data, inizio, ritocchi] of ore) {
      registro.lezioni.push(Object.assign(creaLezione(corso.id, data, inizio, 45), ritocchi ?? {}))
    }
    return { registro, corso }
  }

  it('sfoglia le ore in ordine di giorno e, a parità di giorno, di orario', () => {
    const { registro, corso } = conOre([
      ['2027-02-10', '10:00'],
      ['2027-02-03', '08:20'],
      ['2027-02-10', '08:20'],
    ])

    const ordine = registroDelCorso(registro, corso.id).map((l) => `${l.data} ${l.slot[0].inizio}`)
    assert.deepEqual(ordine, ['2027-02-03 08:20', '2027-02-10 08:20', '2027-02-10 10:00'])
  })

  it('tiene le ore annullate: nel registro restano, segnate', () => {
    const { registro, corso } = conOre([
      ['2027-02-03', '08:20'],
      ['2027-02-10', '08:20', { stato: 'annullata' }],
    ])

    assert.equal(registroDelCorso(registro, corso.id).length, 2)
  })

  it('un corso senza ore, o nessun corso, è un registro vuoto', () => {
    const { registro } = conOre([])
    assert.deepEqual(registroDelCorso(registro, registro.corsi[0].id), [])
    assert.deepEqual(registroDelCorso(registro, null), [])
  })
})

describe('anni scolastici', () => {
  it('crea due semestri contigui che coprono tutto l’anno', () => {
    const anno = creaAnno('2025-09-01', '2026-06-30')
    assert.equal(anno.semestri.length, 2)
    assert.equal(anno.semestri[0].inizio, '2025-09-01')
    assert.equal(anno.semestri[1].fine, '2026-06-30')
    // Nessun buco e nessuna sovrapposizione fra i due.
    assert.ok(anno.semestri[0].fine < anno.semestri[1].inizio)
    assert.equal(validaAnno(anno).valido, true)
  })

  it('taglia il primo semestre a fine gennaio', () => {
    const anno = creaAnno('2025-09-01', '2026-06-30')
    assert.equal(anno.semestri[0].fine, '2026-01-31')
    assert.equal(anno.semestri[1].inizio, '2026-02-01')
  })

  it('rispetta il confine scelto fra i due semestri', () => {
    const anno = creaAnno('2025-09-01', '2026-06-30', '2025/2026', '2026-02-14')
    assert.equal(anno.semestri[0].fine, '2026-02-14')
    assert.equal(anno.semestri[1].inizio, '2026-02-15')
    assert.equal(validaAnno(anno).valido, true)
  })

  it('ignora un confine fuori dall’anno e torna a fine gennaio', () => {
    const anno = creaAnno('2025-09-01', '2026-06-30', '2025/2026', '2027-03-01')
    assert.equal(anno.semestri[0].fine, '2026-01-31')
  })

  it('l’anno corrente comprende oggi', () => {
    const anno = creaAnnoCorrente()
    const oggi = new Date().toISOString().slice(0, 10)
    assert.ok(anno.inizio <= oggi && oggi <= anno.fine)
  })

  it('rifiuta un anno che finisce prima di cominciare', () => {
    const esito = validaAnno({ etichetta: 'x', inizio: '2026-06-30', fine: '2025-09-01', semestri: [] })
    assert.equal(esito.valido, false)
  })
})

describe('validazione', () => {
  it('una lezione vuole un corso, una data e almeno uno slot', () => {
    assert.equal(validaLezione({ data: '2025-09-15', corsoId: '', slot: [] }, 45).valido, false)
    const buona = creaLezione('cor1', '2025-09-15', '08:00', 45)
    assert.equal(validaLezione(buona, 45).valido, true)
  })

  it('rifiuta slot sovrapposti e slot al contrario', () => {
    assert.equal(validaSlot([creaSlot('08:00', 60), creaSlot('08:30', 45)], 45).valido, false)
    assert.equal(validaSlot([{ id: 's', inizio: '09:00', fine: '08:00', tipo: 'lezione' }], 45).valido, false)
  })

  it('non accetta una lezione fatta di sole pause', () => {
    assert.equal(validaSlot([creaSlot('08:00', 15, 'pausa')], 45).valido, false)
  })

  it('non ammette due classi con lo stesso nome nello stesso anno', () => {
    const esistenti = [{ id: 'c1', annoId: 'a1', nome: 'I MEC A' }]
    assert.equal(validaClasse({ id: 'c2', annoId: 'a1', nome: 'i mec a' }, esistenti).valido, false)
    assert.equal(validaClasse({ id: 'c2', annoId: 'a2', nome: 'I MEC A' }, esistenti).valido, true)
  })

  it('controlla l’indirizzo di posta di un allievo', () => {
    assert.equal(validaAllievo({ cognome: 'Rossi', nome: 'Mario' }).valido, true)
    assert.equal(validaAllievo({ cognome: 'Rossi', nome: 'Mario', email: 'niente' }).valido, false)
  })

  it('la sufficienza deve stare dentro la scala', () => {
    assert.equal(validaScala({ min: 1, max: 6, sufficienza: 4, passo: 0.25 }).valido, true)
    assert.equal(validaScala({ min: 1, max: 6, sufficienza: 8, passo: 0.25 }).valido, false)
    assert.equal(validaScala({ min: 6, max: 1, sufficienza: 4, passo: 0.25 }).valido, false)
  })

  it('rifiuta un voto fuori scala', () => {
    const momento = {
      titolo: 'Verifica',
      data: '2025-10-01',
      corsoId: 'cor1',
      peso: 1,
      scala: { min: 1, max: 6, sufficienza: 4, passo: 0.25 },
      voti: [{ allievoId: 'x', valore: 9, assente: false }],
    }
    assert.equal(validaValutazione(momento).valido, false)
  })
})

describe('duplicazioni', () => {
  it('la copia di una lezione tiene l’impianto e lascia indietro quel che è successo', () => {
    const origine = creaLezione('cor1', '2025-09-15', '08:00', 45)
    origine.stato = 'svolta'
    origine.aula = 'A12'
    origine.presenze = [{ allievoId: 'x', stati: ['assente'] }]
    origine.consuntivo = 'andata bene'

    const copia = duplicaLezione(origine, '2025-09-22')
    assert.notEqual(copia.id, origine.id)
    assert.equal(copia.data, '2025-09-22')
    assert.equal(copia.aula, 'A12', 'l’aula è dell’impianto: si ripete')
    assert.equal(copia.stato, 'pianificata')
    assert.deepEqual(copia.presenze, [])
    assert.equal(copia.consuntivo, '')
    // Anche gli slot sono nuovi: modificarne uno non deve toccare l'originale.
    assert.notEqual(copia.slot[0].id, origine.slot[0].id)
  })

  it('il piano è solidale con la lezione: la segue nella copia, le spunte no', () => {
    const origine = creaLezione('cor1', '2025-09-15', '08:00', 45)
    origine.pianoId = 'pia-1'
    origine.avanzamento = [{ attivitaId: 'att-1', titolo: 'saluto', stato: 'svolta' }]

    const copia = duplicaLezione(origine, '2025-09-22')
    assert.equal(copia.pianoId, 'pia-1', 'la copia insegna la stessa cosa: il piano viene con lei')
    assert.deepEqual(copia.avanzamento, [], 'quel che si è spuntato appartiene all’ora svolta')
  })

  it('spostare una lezione non le stacca il piano', () => {
    const origine = creaLezione('cor1', '2025-09-15', '08:00', 45)
    origine.pianoId = 'pia-1'
    const spostata = { ...origine, data: '2025-09-22', slot: slotSpostati(origine.slot, '10:30') }
    assert.equal(spostata.pianoId, 'pia-1')
  })

  it('la copia di un piano ha attività indipendenti', () => {
    const piano = creaPiano()
    piano.attivita = [creaAttivita('Uno', 10)]
    const copia = duplicaPiano(piano)
    assert.notEqual(copia.id, piano.id)
    assert.notEqual(copia.attivita[0].id, piano.attivita[0].id)
    // La copia non si porta dietro un nome: se lo prende dalla lezione a cui
    // verrà assegnata, come l'originale.
    assert.equal(copia.attivita[0].titolo, 'Uno')
  })
})

describe('normalizzazione di quel che si trova su disco', () => {
  it('da un file vuoto tira fuori un registro utilizzabile', () => {
    const registro = normalizzaRegistro({})
    assert.deepEqual(registro.anni, [])
    assert.equal(registro.annoCorrenteId, null)
    assert.equal(registro.impostazioni.scala.sufficienza, 4)
  })

  it('regge campi di tipo sbagliato senza lanciare', () => {
    const registro = normalizzaRegistro({
      anni: 'non un elenco',
      classi: [{ nome: 42, allievi: 'niente' }],
      lezioni: [{ data: 'ieri', slot: [{ inizio: '99:99' }] }],
      impostazioni: { giorniVisibili: [0, 9, 3] },
    })
    assert.equal(registro.classi.length, 1)
    assert.deepEqual(registro.classi[0].allievi, [])
    assert.equal(registro.lezioni.length, 1)
    // Una data illeggibile diventa oggi, non «Invalid Date».
    assert.match(registro.lezioni[0].data, /^\d{4}-\d{2}-\d{2}$/)
    assert.deepEqual(registro.impostazioni.giorniVisibili, [3])
  })

  it('dà un identificatore a chi non ce l’ha', () => {
    const registro = normalizzaRegistro({ classi: [{ nome: 'I MEC A' }] })
    assert.ok(registro.classi[0].id.length > 0)
  })

  it('non lascia l’anno corrente puntato su un anno che non c’è', () => {
    const registro = normalizzaRegistro({
      anni: [{ id: 'a1', inizio: '2025-09-01', fine: '2026-06-30', semestri: [] }],
      annoCorrenteId: 'inesistente',
    })
    assert.equal(registro.annoCorrenteId, 'a1')
  })

  it('elenca i riferimenti rimasti appesi', () => {
    const registro = normalizzaRegistro({
      anni: [{ id: 'a1', inizio: '2025-09-01', fine: '2026-06-30', semestri: [] }],
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A' }],
      corsi: [{ id: 'cor1', classeId: 'c1', materiaId: 'm1', titolo: 'Mate' }],
      lezioni: [{ id: 'l1', corsoId: 'sparito', data: '2025-09-15', slot: [] }],
    })
    const problemi = riferimentiRotti(registro)
    assert.equal(problemi.length, 1)
    assert.match(problemi[0], /senza corso/)
  })

  it('segnala un piano di un altro corso assegnato a una lezione', () => {
    const registro = normalizzaRegistro({
      anni: [{ id: 'a1', inizio: '2025-09-01', fine: '2026-06-30', semestri: [] }],
      materie: [{ id: 'm1', nome: 'Matematica' }, { id: 'm2', nome: 'Italiano' }],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A' }],
      corsi: [
        { id: 'cor1', classeId: 'c1', materiaId: 'm1', titolo: 'Mate' },
        { id: 'cor2', classeId: 'c1', materiaId: 'm2', titolo: 'Italiano' },
      ],
      piani: [{ id: 'p1', corsoId: 'cor2', titolo: 'Il Manzoni' }],
      lezioni: [
        { id: 'l1', corsoId: 'cor1', data: '2025-09-15', slot: [], pianoId: 'p1' },
      ],
    })
    const problemi = riferimentiRotti(registro)
    assert.equal(problemi.length, 1)
    assert.match(problemi[0], /un altro corso/)
  })

  it('segnala i voti di chi non è in classe', () => {
    const registro = normalizzaRegistro({
      anni: [
        {
          id: 'a1',
          inizio: '2025-09-01',
          fine: '2026-06-30',
          semestri: [
            { id: 's1', inizio: '2025-09-01', fine: '2026-01-31' },
            { id: 's2', inizio: '2026-02-01', fine: '2026-06-30' },
          ],
        },
      ],
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [
        { id: 'c1', annoId: 'a1', nome: 'I MEC A', allievi: [{ id: 'alv1', cognome: 'Rossi', nome: 'Maria' }] },
      ],
      corsi: [{ id: 'cor1', classeId: 'c1', materiaId: 'm1', titolo: 'Mate' }],
      valutazioni: [
        {
          id: 'v1',
          corsoId: 'cor1',
          titolo: 'Verifica',
          data: '2025-10-01',
          voti: [
            { allievoId: 'alv1', valore: 5, assente: false },
            { allievoId: 'fantasma', valore: 4, assente: false },
          ],
        },
      ],
    })
    const problemi = riferimentiRotti(registro)
    assert.equal(problemi.length, 1)
    assert.match(problemi[0], /non iscritte/)
  })
})

describe('appello di un file di prima', () => {
  /** Una lezione con `n` UD di lezione, nella forma dei documenti vecchi. */
  const conAppello = (slot, presenze) =>
    normalizzaRegistro({ lezioni: [{ corsoId: 'c1', data: '2025-09-15', slot, presenze }] })
      .lezioni[0]

  it('lo stato unico dell’ora vale per tutte le sue UD', () => {
    const lezione = conAppello(
      [{ inizio: '08:00', fine: '09:30', tipo: 'lezione' }],
      [{ allievoId: 'x', stato: 'assente' }],
    )
    // Due UD, e l'assenza vale per l'ora intera: è quel che diceva.
    assert.deepEqual(lezione.presenze[0].stati, ['assente', 'assente'])
  })

  it('i due stati che non ci sono più continuano a voler dire qualcosa', () => {
    const lezione = conAppello(
      [{ inizio: '08:00', fine: '08:45', tipo: 'lezione' }],
      [
        { allievoId: 'g', stato: 'giustificato' },
        { allievoId: 'u', stato: 'uscita-anticipata' },
        { allievoId: 'z', stato: 'inventato' },
      ],
    )
    assert.deepEqual(lezione.presenze[0].stati, ['assente'])
    assert.deepEqual(lezione.presenze[1].stati, ['ritardo'])
    // Uno stato che non è mai esistito non fa cadere il file, e non diventa
    // una presenza: di quella casella non si sa niente.
    assert.deepEqual(lezione.presenze[2].stati, ['non-impostato'])
  })

  it('un’ora allungata trova le caselle nuove da fare, non presenti', () => {
    const lezione = conAppello(
      [{ inizio: '08:00', fine: '09:30', tipo: 'lezione' }],
      [{ allievoId: 'x', stati: ['assente'] }],
    )
    assert.deepEqual(lezione.presenze[0].stati, ['assente', 'non-impostato'])
  })

  it('un’ora accorciata lascia cadere quel che avanza', () => {
    const lezione = conAppello(
      [{ inizio: '08:00', fine: '08:45', tipo: 'lezione' }],
      [{ allievoId: 'x', stati: ['presente', 'assente', 'assente'] }],
    )
    assert.deepEqual(lezione.presenze[0].stati, ['presente'])
  })

  it('le pause non sono UD: non prendono una casella d’appello', () => {
    const lezione = conAppello(
      [
        { inizio: '08:00', fine: '08:45', tipo: 'lezione' },
        { inizio: '08:45', fine: '09:00', tipo: 'pausa' },
        { inizio: '09:00', fine: '09:45', tipo: 'lezione' },
      ],
      [{ allievoId: 'x', stato: 'presente' }],
    )
    assert.equal(lezione.presenze[0].stati.length, 2)
  })
})

describe('id di classe scambiato per id di corso', () => {
  // Chi crea un momento passa la classe dove ci vuole il corso: in lettura si
  // riaggancia, altrimenti nessuna vista lo mostrerebbe.
  const registro = () =>
    normalizzaRegistro({
      anni: [
        {
          id: 'a1',
          inizio: '2025-09-01',
          fine: '2026-06-30',
          semestri: [
            { id: 's1', inizio: '2025-09-01', fine: '2026-01-31' },
            { id: 's2', inizio: '2026-02-01', fine: '2026-06-30' },
          ],
        },
      ],
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A' }],
      corsi: [{ id: 'cor1', classeId: 'c1', materiaId: 'm1', titolo: 'Mate' }],
      lezioni: [{ id: 'l1', corsoId: 'c1', data: '2025-09-15', slot: [] }],
      valutazioni: [{ id: 'v1', corsoId: 'c1', titolo: 'Verifica', data: '2025-10-01' }],
    })

  it('riaggancia la valutazione al corso della classe', () => {
    const r = registro()
    assert.equal(r.valutazioni[0].corsoId, 'cor1')
    assert.equal(riferimentiRotti(r).length, 0)
  })

  it('riaggancia anche la lezione', () => {
    const r = registro()
    assert.equal(r.lezioni[0].corsoId, 'cor1')
  })

  it('un id che non è né corso né classe resta appeso, e si vede', () => {
    const r = normalizzaRegistro({
      anni: [{ id: 'a1', inizio: '2025-09-01', fine: '2026-06-30', semestri: [] }],
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A' }],
      corsi: [{ id: 'cor1', classeId: 'c1', materiaId: 'm1', titolo: 'Mate' }],
      valutazioni: [{ id: 'v1', corsoId: 'boh', titolo: 'Verifica', data: '2025-10-01' }],
    })
    // Non si indovina: si lascia com'è e lo si segnala.
    assert.equal(r.valutazioni[0].corsoId, 'boh')
    assert.match(riferimentiRotti(r)[0], /senza corso/)
  })
})

describe('orario e generazione delle lezioni', () => {
  // Un anno corto, due settimane, con una sospensione in mezzo.
  const registroConOrario = () =>
    normalizzaRegistro({
      anni: [
        {
          id: 'a1',
          inizio: '2025-09-01',
          fine: '2025-09-14',
          semestri: [],
          sospensioni: [{ id: 's1', etichetta: 'Ponte', dal: '2025-09-08', al: '2025-09-09' }],
        },
      ],
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A' }],
      corsi: [
        {
          id: 'cor1',
          classeId: 'c1',
          materiaId: 'm1',
          titolo: 'Mate',
          // Lunedì e mercoledì.
          orario: [
            { id: 'r1', giorno: 1, inizio: '08:20', durataMin: 90, aula: 'A12' },
            { id: 'r2', giorno: 3, inizio: '10:00', durataMin: 45 },
          ],
        },
      ],
    })

  it('salta i giorni sospesi', () => {
    const registro = registroConOrario()
    const anno = registro.anni[0]
    assert.equal(sospeso(anno, '2025-09-08'), true)
    assert.equal(sospeso(anno, '2025-09-10'), false)

    const date = dateDellOrario(anno, registro.corsi[0], '2025-09-01', '2025-09-14')
    const giorni = date.map((d) => d.data)
    // lun 1, mer 3, [lun 8 sospeso], mer 10.
    assert.deepEqual(giorni, ['2025-09-01', '2025-09-03', '2025-09-10'])
  })

  it('non esce dall’anno anche se il periodo è più largo', () => {
    const registro = registroConOrario()
    const date = dateDellOrario(registro.anni[0], registro.corsi[0], '2025-01-01', '2026-12-31')
    assert.ok(date.every((d) => d.data >= '2025-09-01' && d.data <= '2025-09-14'))
  })

  it('genera solo le lezioni che mancano, e non tocca quelle che ci sono', () => {
    const registro = registroConOrario()
    // Una lezione già messa a mano, nello stesso giorno e alla stessa ora.
    registro.lezioni.push({
      id: 'l1',
      corsoId: 'cor1',
      data: '2025-09-01',
      slot: [{ id: 'sl1', inizio: '08:20', fine: '09:50', tipo: 'lezione' }],
      stato: 'svolta',
      pianoId: null,
      avanzamento: [],
      presenze: [],
      osservazioni: [],
      creataIl: '',
      aggiornataIl: '',
    })

    const { nuove, saltate } = lezioniDaOrario(registro, registro.corsi[0], '2025-09-01', '2025-09-14')
    assert.equal(saltate, 1)
    assert.deepEqual(nuove.map((l) => l.data), ['2025-09-03', '2025-09-10'])
    // La durata della fascia diventa lo slot della lezione.
    assert.equal(nuove[0].slot[0].inizio, '10:00')
    assert.equal(nuove[0].slot[0].fine, '10:45')
    // Questa fascia non ha aula: la lezione nasce senza, non con «undefined».
    assert.equal(nuove[0].aula, '')

    // Su un registro pulito il lunedì si genera, e si porta dietro l'aula.
    const pulito = registroConOrario()
    const primo = lezioniDaOrario(pulito, pulito.corsi[0], '2025-09-01', '2025-09-01').nuove[0]
    assert.equal(primo.aula, 'A12')
    assert.equal(primo.slot[0].fine, '09:50')

    const seconda = lezioniDaOrario(registro, registro.corsi[0], '2025-09-01', '2025-09-02')
    assert.equal(seconda.nuove.length, 0)
  })

  it('una fascia con un periodo suo vale solo lì dentro', () => {
    const registro = registroConOrario()
    registro.corsi[0].orario = [
      { id: 'r1', giorno: 1, inizio: '08:20', durataMin: 90, dal: '2025-09-08' },
    ]
    const date = dateDellOrario(registro.anni[0], registro.corsi[0], '2025-09-01', '2025-09-14')
    // Il lunedì 1 è prima che la fascia cominci; l'8 è sospeso.
    assert.equal(date.length, 0)
  })

  it('attacca ogni fascia alla precedente dello stesso giorno', () => {
    const attaccate = ricorrenzeIncatenate([
      { id: 'r1', giorno: 1, inizio: '08:20', durataMin: 90 },
      { id: 'r2', giorno: 1, inizio: '14:00', durataMin: 45 },
      { id: 'r3', giorno: 3, inizio: '10:00', durataMin: 90 },
    ], { minutiUd: 45 })
    assert.deepEqual(
      attaccate.map((r) => [r.giorno, r.inizio]),
      [
        [1, '08:20'],
        [1, '09:50'],
        [3, '10:00'],
      ],
    )
  })

  it('la prima fascia di ogni giorno tiene l’ora che le si è data', () => {
    const attaccate = ricorrenzeIncatenate([
      { id: 'r1', giorno: 2, inizio: '07:30', durataMin: 45 },
      { id: 'r2', giorno: 5, inizio: '13:15', durataMin: 45 },
    ], { minutiUd: 45 })
    assert.deepEqual(attaccate.map((r) => r.inizio), ['07:30', '13:15'])
  })

  it('non tocca le fasce di partenza', () => {
    const orario = [
      { id: 'r1', giorno: 1, inizio: '08:20', durataMin: 90 },
      { id: 'r2', giorno: 1, inizio: '14:00', durataMin: 45 },
    ]
    ricorrenzeIncatenate(orario, { minutiUd: 45 })
    assert.equal(orario[1].inizio, '14:00')
  })

  it('descrive una fascia come la si legge sul foglio della sede', () => {
    assert.equal(
      descriviRicorrenza({ id: 'r', giorno: 2, inizio: '08:20', durataMin: 90, aula: 'A12' }, { minutiUd: 45 }),
      'mar 08:20–09:50 · 2 UD · A12',
    )
  })

  it('una fascia nasce lunga quanto le si dice: le UD le giudica la convalida', () => {
    // Il costruttore non sa quanto dura un'UD nel documento e non arrotonda.
    assert.equal(creaRicorrenza(2, '08:20', 100).durataMin, 100)
    assert.equal(validaRicorrenza(creaRicorrenza(2, '08:20', 100), 50).valido, true)
    assert.equal(validaRicorrenza(creaRicorrenza(2, '08:20', 100), 45).valido, false)
  })

  it('rilegge l’orario in UD della durata scritta nel documento', () => {
    const conFascia = (minutiUd) => normalizzaRegistro({
      impostazioni: minutiUd === undefined ? {} : { minutiUd },
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [{ id: 'k1', nome: 'I MEC A' }],
      corsi: [{
        id: 'c1',
        classeId: 'k1',
        materiaId: 'm1',
        orario: [{ id: 'r', giorno: 1, inizio: '08:00', durataMin: 100 }],
      }],
    })
    // Senza durata dichiarata vale quella di sempre: cento minuti sono due UD da 45.
    assert.equal(LIMITI_UD.predefinita, 45)
    assert.equal(conFascia(undefined).impostazioni.minutiUd, 45)
    assert.equal(conFascia(undefined).corsi[0].orario[0].durataMin, 90)
    assert.equal(conFascia(50).corsi[0].orario[0].durataMin, 100)
    // Un refuso torna dentro gli estremi invece di buttare la griglia.
    assert.equal(conFascia(500).impostazioni.minutiUd, LIMITI_UD.massimo)
  })

  it('rifiuta una fascia che non è un multiplo dell’unità didattica', () => {
    const buona = validaRicorrenza({ id: 'r', giorno: 2, inizio: '08:20', durataMin: 90 }, 45)
    assert.equal(buona.valido, true)
    const storta = validaRicorrenza({ id: 'r', giorno: 2, inizio: '08:20', durataMin: 50 }, 45)
    assert.equal(storta.valido, false)
  })
})

describe('risorse dei piani lezione', () => {
  it('accetta solo indirizzi che si possono aprire davvero', () => {
    assert.equal(urlValido('https://edu.ti.ch'), true)
    assert.equal(urlValido('http://localhost:8080/x?y=1'), true)
    // Un piano è un documento: da un documento si aprono pagine, non altro.
    assert.equal(urlValido('javascript:alert(1)'), false)
    assert.equal(urlValido('file:///C:/segreti.txt'), false)
    assert.equal(urlValido('edu.ti.ch'), false)
    assert.equal(urlValido(''), false)
  })

  it('un collegamento senza indirizzo valido non passa la validazione', () => {
    assert.equal(
      validaRisorsa({ tipo: 'collegamento', titolo: 'Geogebra', url: 'https://geogebra.org' }).valido,
      true,
    )
    assert.equal(validaRisorsa({ tipo: 'collegamento', titolo: 'Rotto', url: 'boh' }).valido, false)
    assert.equal(validaRisorsa({ tipo: 'file', titolo: '' }).valido, false)
  })

  it('normalizzando, un indirizzo storto si butta e la riga resta', () => {
    const registro = normalizzaRegistro({
      anni: [],
      piani: [
        {
          id: 'p1',
          titolo: 'Frazioni',
          risorse: [
            { id: 'r1', tipo: 'collegamento', titolo: 'Buono', url: 'https://edu.ti.ch' },
            { id: 'r2', tipo: 'collegamento', titolo: 'Storto', url: 'javascript:alert(1)' },
          ],
          attivita: [
            {
              id: 'a1',
              titolo: 'Esercizi',
              risorse: [{ id: 'r3', tipo: 'immagine', file: 'risorse\\p1\\schema.png' }],
            },
          ],
        },
      ],
    })
    const [buono, storto] = registro.piani[0].risorse
    assert.equal(buono.url, 'https://edu.ti.ch')
    assert.equal(storto.url, undefined)
    assert.equal(storto.titolo, 'Storto')

    // I separatori di Windows diventano '/', e il titolo si ricava dal file.
    const immagine = registro.piani[0].attivita[0].risorse[0]
    assert.equal(immagine.file, 'risorse/p1/schema.png')
    assert.equal(immagine.titolo, 'schema.png')
  })

  it('segnala le risorse che non portano da nessuna parte', () => {
    const registro = normalizzaRegistro({
      anni: [],
      piani: [
        {
          id: 'p1',
          titolo: 'Frazioni',
          risorse: [{ id: 'r1', tipo: 'file', titolo: 'Scheda' }],
        },
      ],
    })
    const problemi = riferimentiRotti(registro)
    assert.equal(problemi.length, 1)
    assert.match(problemi[0], /senza indirizzo né file/)
  })

  it('la copia di un piano porta le risorse con id nuovi', () => {
    const registro = normalizzaRegistro({
      anni: [],
      piani: [
        {
          id: 'p1',
          titolo: 'Frazioni',
          risorse: [{ id: 'r1', tipo: 'collegamento', titolo: 'Geogebra', url: 'https://geogebra.org' }],
          attivita: [
            { id: 'a1', titolo: 'Esercizi', risorse: [{ id: 'r2', tipo: 'file', file: 'risorse/p1/x.pdf' }] },
          ],
        },
      ],
    })
    const copia = duplicaPiano(registro.piani[0])
    assert.equal(copia.risorse.length, 1)
    assert.equal(copia.risorse[0].url, 'https://geogebra.org')
    assert.notEqual(copia.risorse[0].id, 'r1')
    assert.equal(copia.attivita[0].risorse.length, 1)
    assert.notEqual(copia.attivita[0].risorse[0].id, 'r2')
  })
})

describe('lettura di un elenco incollato', () => {
  it('legge «Cognome Nome»', () => {
    const voci = leggiElencoAllievi('Bernasconi Luca\nRossi Maria')
    assert.deepEqual(voci, [
      { cognome: 'Bernasconi', nome: 'Luca' },
      { cognome: 'Rossi', nome: 'Maria' },
    ])
  })

  it('legge le righe separate e ne raccoglie l’e-mail', () => {
    const voci = leggiElencoAllievi('Rossi; Maria; maria.rossi@edu.ti.ch')
    assert.deepEqual(voci, [{ cognome: 'Rossi', nome: 'Maria', email: 'maria.rossi@edu.ti.ch' }])
  })

  it('tiene insieme i cognomi composti', () => {
    const voci = leggiElencoAllievi('De Marchi Anna')
    assert.deepEqual(voci, [{ cognome: 'De Marchi', nome: 'Anna' }])
  })

  it('salta le righe vuote e regge una parola sola', () => {
    const voci = leggiElencoAllievi('\n  \nRossi\n')
    assert.deepEqual(voci, [{ cognome: 'Rossi', nome: '' }])
  })
})

describe('la ponderazione di un momento di valutazione', () => {
  // Il peso è decimale e va da zero a dieci. Zero vuol dire «non fa media».

  it('vale uno quando non si capisce che numero fosse', () => {
    assert.equal(normalizzaValutazione({}).peso, 1)
    assert.equal(normalizzaValutazione({ peso: 'niente' }).peso, 1)
  })

  it('tiene i decimali', () => {
    assert.equal(normalizzaValutazione({ peso: 1.25 }).peso, 1.25)
    assert.equal(normalizzaValutazione({ peso: 0.75 }).peso, 0.75)
    // Scritto a mano, in italiano: la virgola vale come il punto.
    assert.equal(normalizzaValutazione({ peso: '1,5' }).peso, 1.5)
  })

  it('sta fra zero e dieci', () => {
    assert.equal(normalizzaValutazione({ peso: 0 }).peso, 0)
    assert.equal(normalizzaValutazione({ peso: -3 }).peso, 0)
    assert.equal(normalizzaValutazione({ peso: 100 }).peso, 10)
  })

  it('il modulo rifiuta un peso fuori scala, e accetta lo zero', () => {
    const buono = (peso) =>
      validaValutazione({
        titolo: 'Verifica',
        data: '2026-09-15',
        corsoId: 'cor-1',
        peso,
        voti: [],
      }).valido

    assert.equal(buono(0), true, 'zero vuol dire «non fa media»')
    assert.equal(buono(1.25), true)
    assert.equal(buono(10), true)
    assert.equal(buono(11), false)
    assert.equal(buono(-1), false)
  })

  it('un peso di zero non entra nella media', () => {
    // Lo zero resta zero: una prova senza peso non conta come le altre.
    const momento = (peso, valore) => ({
      ...creaValutazione('cor-1', 'Prova'),
      peso,
      voti: [{ allievoId: 'al-1', valore, assente: false }],
    })

    const conZero = mediaAllievo([momento(1, 6), momento(0, 2)], 'al-1')
    assert.equal(conZero.media, 6)
    assert.equal(conZero.conteggio, 1, 'il voto che non pesa non si conta nemmeno')

    const pesata = mediaAllievo([momento(1, 6), momento(3, 2)], 'al-1')
    assert.equal(pesata.media, 3)
  })
})

describe('la nota di fine semestre', () => {
  // Non è l'arrotondamento dei voti (la grana di una prova): è la regola che fa
  // di una media la nota della pagella, spesso diversa (quarti durante l'anno,
  // mezzi a fine semestre).
  const scala = { min: 1, max: 6, sufficienza: 4, passo: 0.25 }

  it('porta la media sul suo passo', () => {
    assert.equal(notaFineSemestre(4.37, scala, 0.5), 4.5)
    assert.equal(notaFineSemestre(4.24, scala, 0.5), 4)
    assert.equal(notaFineSemestre(4.37, scala, 0.25), 4.25)
    assert.equal(notaFineSemestre(4.37, scala, 1), 4)
  })

  it('passo zero vuol dire non arrotondare', () => {
    assert.equal(notaFineSemestre(4.37, scala, 0), 4.37)
  })

  it('senza voti non c’è nota, e non è uno zero', () => {
    assert.equal(notaFineSemestre(null, scala, 0.5), null)
  })

  it('resta dentro la scala', () => {
    assert.equal(notaFineSemestre(9, scala, 0.5), 6)
    assert.equal(notaFineSemestre(0.2, scala, 0.5), 1)
  })

  it('di serie è mezzo punto, e si tiene fra zero e dieci', () => {
    assert.equal(normalizzaImpostazioni({}).passoFineSemestre, 0.5)
    assert.equal(normalizzaImpostazioni({ passoFineSemestre: -1 }).passoFineSemestre, 0)
    assert.equal(normalizzaImpostazioni({ passoFineSemestre: 99 }).passoFineSemestre, 10)
    // Scritto a mano, in italiano.
    assert.equal(normalizzaImpostazioni({ passoFineSemestre: '0,5' }).passoFineSemestre, 0.5)
  })
})
