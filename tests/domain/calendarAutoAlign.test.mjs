// Le lezioni collegate che il calendario ICS allinea da sole. Una lezione
// collegata **per certo** a un evento ne prende inizio, fine e aula
// (`allineamentiAutomatici`, criterio in testa a `domain/calendar.ts`); il
// resto resta una proposta. Si fissano il collegamento per indizio, la lezione
// già fatta, l'orario non valido, e il passo già tentato che si ritenta quando
// la lezione torna al suo posto.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  allineamentiAutomatici,
  allineamentoDaSoloAmmesso,
  collegaEventi,
  collegataPerCerto,
  confrontaLezione,
  creaLezione,
  creaRicorrenza,
  slotDaFasce,
} from '../../dist-tests/domain.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

/** Un giorno prima di tutte le lezioni delle prove: nessuna è passata. */
const PRIMA = '2026-09-01'

const evento = (data, inizio, fine, altro = {}) => ({
  chiave: `${data}T${inizio}`, data, inizio, fine, titolo: 'MAT', luogo: '', annullato: false, ...altro,
})

/** La scuola minima con una regola che porta gli eventi «MAT» al corso. */
function scuolaConRegola () {
  const scuola = scuolaMinima()
  const regole = [{ id: 'r1', testo: 'MAT', corsoId: scuola.corso.id }]
  return { ...scuola, regole }
}

const scelta = (registro, eventi, regole, oggi = PRIMA) =>
  allineamentiAutomatici(registro, collegaEventi(registro, eventi, regole), oggi)

/** Le lezioni che si allineerebbero da sole, per id. */
const allineate = (...args) => scelta(...args).allinea.map((a) => a.voce.lezioneId)

describe('allineamentiAutomatici: solo i collegamenti certi', () => {
  it('un evento preso per nome della classe resta una proposta, anche se cade sulla lezione', () => {
    // «Consiglio di classe» del 3B alle 14:30 cade sulla lezione delle 14:00: il
    // collegamento è un indizio, la lezione non si tocca.
    const { registro, corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-15', '14:00', 45)
    registro.lezioni.push(lezione)
    const consiglio = evento('2026-09-15', '14:30', '15:30', {
      titolo: 'Consiglio di classe I MEC A', luogo: 'Aula Magna',
    })
    const collegamenti = collegaEventi(registro, [consiglio], [])
    assert.equal(collegamenti.viaPerEvento.get(consiglio.chiave), 'nome')
    assert.equal(collegamenti.lezionePerEvento.get(consiglio.chiave), lezione.id)
    assert.deepEqual(allineamentiAutomatici(registro, collegamenti, PRIMA).allinea, [])
    // Il confronto continua a proporla.
    assert.equal(confrontaLezione(lezione, [consiglio], 45).esito, 'allineare')
  })

  it('con una regola la lezione prende inizio, fine e aula dell’evento', () => {
    const { registro, corso, regole } = scuolaConRegola()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:20', 45)
    registro.lezioni.push(lezione)
    const { allinea } = scelta(registro, [evento('2026-09-15', '08:35', '09:20', { luogo: 'A12' })], regole)
    assert.equal(allinea.length, 1)
    assert.equal(allinea[0].voce.lezioneId, lezione.id)
    assert.equal(allinea[0].voce.aula, 'A12')
    assert.deepEqual(allinea[0].voce.fasce.map((f) => [f.inizio, f.fine]), [['08:35', '09:20']])
  })

  it('per orario solo se l’evento coincide con la fascia ricorrente, inizio e durata', () => {
    const { registro, corso } = scuolaMinima()
    corso.orario.push(creaRicorrenza(2, '08:20', 45))
    const lezione = { ...creaLezione(corso.id, '2026-09-15', '08:20', 45), aula: 'B3' }
    registro.lezioni.push(lezione)
    const coincide = evento('2026-09-15', '08:20', '09:05', { luogo: 'A12' })
    const piuLungo = evento('2026-09-15', '08:20', '10:05', { luogo: 'A12' })
    assert.deepEqual(scelta(registro, [coincide], []).allinea.map((a) => a.voce.aula), ['A12'])
    assert.deepEqual(scelta(registro, [piuLungo], []).allinea, [])
  })
})

describe('allineamentiAutomatici: le lezioni già fatte non si toccano', () => {
  it('una lezione svolta o con l’appello scritto resta com’è', () => {
    const { registro, corso, regole, rossi } = scuolaConRegola()
    const svolta = { ...creaLezione(corso.id, '2026-09-15', '08:00', 90), stato: 'svolta' }
    const conAppello = creaLezione(corso.id, '2026-09-16', '08:00', 90)
    conAppello.presenze = [{ allievoId: rossi.id, stati: ['assente', 'presente'] }]
    registro.lezioni.push(svolta, conAppello)
    const eventi = [evento('2026-09-15', '08:00', '08:50'), evento('2026-09-16', '08:00', '08:50')]
    assert.deepEqual(scelta(registro, eventi, regole).allinea, [])
  })

  it('le righe mute dell’appello non contano come appello scritto', () => {
    const { registro, corso, regole, rossi } = scuolaConRegola()
    const lezione = creaLezione(corso.id, '2026-09-16', '08:00', 45)
    lezione.presenze = [{ allievoId: rossi.id, stati: ['non-impostato'] }]
    registro.lezioni.push(lezione)
    assert.equal(scelta(registro, [evento('2026-09-16', '08:10', '08:55')], regole).allinea.length, 1)
  })

  it('una lezione passata non cambia numero di unità didattiche, ma può spostarsi', () => {
    const { registro, corso, regole } = scuolaConRegola()
    const dueUd = creaLezione(corso.id, '2026-09-15', '08:00', 90)
    const unaUd = creaLezione(corso.id, '2026-09-16', '08:00', 45)
    registro.lezioni.push(dueUd, unaUd)
    const eventi = [evento('2026-09-15', '08:00', '08:50'), evento('2026-09-16', '08:10', '08:55')]
    const dopo = '2026-09-20'
    assert.deepEqual(allineate(registro, eventi, regole, dopo), [unaUd.id])
    // La stessa lezione di due UD, non ancora passata, si accorcia.
    assert.deepEqual(allineate(registro, eventi, regole, PRIMA), [dueUd.id, unaUd.id])
  })
})

describe('allineamentiAutomatici: un orario non valido non ferma gli altri', () => {
  it('la fascia 23:30–23:59 resta fuori, l’altra lezione si allinea', () => {
    const { registro, corso, regole } = scuolaConRegola()
    const mattina = creaLezione(corso.id, '2026-09-15', '08:20', 45)
    const sera = creaLezione(corso.id, '2026-09-16', '23:00', 45)
    registro.lezioni.push(mattina, sera)
    // La fascia ricorrente alle 23:30 rende il collegamento certo: lo ferma solo
    // l'orario che non fa una lezione valida.
    corso.orario.push(creaRicorrenza(3, '23:30', 45))
    const eventi = [evento('2026-09-15', '08:35', '09:20'), evento('2026-09-16', '23:30', '23:59')]
    assert.equal(confrontaLezione(sera, [eventi[1]], 45).esito, 'allineare', 'il confronto la propone')
    assert.deepEqual(allineate(registro, eventi, regole), [mattina.id])
  })
})

describe('allineamentiAutomatici: i passi tentati', () => {
  it('la chiave dice da dove e verso dove: 08:00 → 08:15, di nuovo 08:00, di nuovo 08:15', () => {
    const { registro, corso, regole } = scuolaConRegola()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:00', 45)
    registro.lezioni.push(lezione)
    const alle = (ora, fine) => [evento('2026-09-15', ora, fine)]

    // Come chi spedisce: scorda i passi delle lezioni che combaciano, salta quelli
    // già tentati, applica gli altri.
    const tentati = new Map()
    const giro = (eventi) => {
      const { allinea, combaciano } = scelta(registro, eventi, regole)
      for (const id of combaciano) tentati.delete(id)
      const nuovi = allinea.filter((a) => !tentati.get(a.voce.lezioneId)?.has(a.chiave))
      for (const { voce, chiave } of nuovi) {
        tentati.set(voce.lezioneId, new Set([...(tentati.get(voce.lezioneId) ?? []), chiave]))
        lezione.slot = slotDaFasce(voce.fasce, lezione.slot)
      }
      return nuovi.length
    }

    assert.equal(giro(alle('08:15', '09:00')), 1)
    assert.equal(lezione.slot[0].inizio, '08:15')
    assert.equal(giro(alle('08:15', '09:00')), 0, 'combacia: niente da fare')
    assert.equal(giro(alle('08:00', '08:45')), 1)
    assert.equal(lezione.slot[0].inizio, '08:00')
    assert.equal(giro(alle('08:00', '08:45')), 0)
    // Di nuovo alle 08:15: lo stesso passo del primo, e si rifà.
    assert.equal(giro(alle('08:15', '09:00')), 1)
    assert.equal(lezione.slot[0].inizio, '08:15')
  })

  it('un passo rifiutato non si ritenta finché la lezione resta dov’è', () => {
    const { registro, corso, regole } = scuolaConRegola()
    registro.lezioni.push(creaLezione(corso.id, '2026-09-15', '08:00', 45))
    const eventi = [evento('2026-09-15', '08:15', '09:00')]
    const primo = scelta(registro, eventi, regole).allinea[0].chiave
    assert.equal(scelta(registro, eventi, regole).allinea[0].chiave, primo)
  })

  it('stessa meta da due partenze diverse: due chiavi', () => {
    const { registro, corso, regole } = scuolaConRegola()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:00', 45)
    registro.lezioni.push(lezione)
    const eventi = [evento('2026-09-15', '08:20', '09:05')]
    const daOtto = scelta(registro, eventi, regole).allinea[0].chiave
    lezione.slot = slotDaFasce([{ inizio: '08:15', fine: '09:00', tipo: 'lezione' }], lezione.slot)
    const daOttoEUnQuarto = scelta(registro, eventi, regole).allinea[0].chiave
    assert.notEqual(daOtto, daOttoEUnQuarto)
  })
})

describe('confrontaLezione: l’aula', () => {
  const ev = (luogo) => evento('2026-09-15', '08:20', '09:05', { luogo })

  it('la stessa aula scritta diversa combacia', () => {
    const lezione = { ...creaLezione('c1', '2026-09-15', '08:20', 45), aula: 'Aula 12' }
    const voce = confrontaLezione(lezione, [ev(' aula  12. ')], 45)
    assert.equal(voce.esito, 'combacia')
    assert.equal(voce.aula, 'Aula 12')
  })

  it('un’aula davvero diversa prende il luogo del calendario', () => {
    const lezione = { ...creaLezione('c1', '2026-09-15', '08:20', 45), aula: '12' }
    const voce = confrontaLezione(lezione, [ev('Aula 12, Edificio B')], 45)
    assert.equal(voce.esito, 'allineare')
    assert.equal(voce.aula, 'Aula 12, Edificio B')
  })
})

describe('collegataPerCerto: la lezione che il registro non lascia toccare', () => {
  it('per indizio resta modificabile, per regola no', () => {
    // Un collegamento per nome non blocca la lezione, così resta correggibile; con
    // una regola è certo, e la blocca.
    const { registro, corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-15', '14:00', 45)
    registro.lezioni.push(lezione)
    const consiglio = evento('2026-09-15', '14:30', '15:30', { titolo: 'Consiglio di classe I MEC A' })
    const perNome = collegaEventi(registro, [consiglio], [])
    assert.equal(collegataPerCerto(registro, lezione, [consiglio], perNome.viaPerEvento), false)

    const mat = evento('2026-09-15', '14:00', '14:45')
    const regole = [{ id: 'r1', testo: 'MAT', corsoId: corso.id }]
    const perRegola = collegaEventi(registro, [mat], regole)
    assert.equal(collegataPerCerto(registro, lezione, [mat], perRegola.viaPerEvento), true)
  })
})

describe('allineamentiAutomatici: la regola vuole anche l’ora giusta', () => {
  /** La regola sul codice della classe, come consiglia l'aiuto. */
  const perClasse = (corso) => [{ id: 'r1', testo: 'I MEC A', corsoId: corso.id }]
  const consiglio = () => evento('2026-09-15', '14:30', '16:00', {
    chiave: 'consiglio', titolo: 'Consiglio di classe I MEC A', luogo: 'Aula Magna',
  })

  it('«Consiglio di classe» preso dalla regola sulla classe non sposta la lezione delle 14:00', () => {
    const { registro, corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-15', '14:00', 45)
    registro.lezioni.push(lezione)
    const collegamenti = collegaEventi(registro, [consiglio()], perClasse(corso))
    assert.equal(collegamenti.viaPerEvento.get('consiglio'), 'regola')
    assert.equal(collegamenti.lezionePerEvento.get('consiglio'), lezione.id)
    assert.deepEqual(allineamentiAutomatici(registro, collegamenti, PRIMA).allinea, [])
    // E non la blocca: resta correggibile a mano.
    const vie = collegamenti.viaPerEvento
    assert.equal(collegataPerCerto(registro, lezione, [consiglio()], vie), false)
  })

  it('con la sua ora di Matematica accanto: nessun automatico, la lezione resta ancorata', () => {
    const { registro, corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-15', '14:00', 45)
    registro.lezioni.push(lezione)
    const mat = evento('2026-09-15', '14:00', '14:45', { titolo: 'Matematica I MEC A' })
    const collegamenti = collegaEventi(registro, [mat, consiglio()], perClasse(corso))
    assert.deepEqual(allineamentiAutomatici(registro, collegamenti, PRIMA).allinea, [])
    const vie = collegamenti.viaPerEvento
    assert.equal(collegataPerCerto(registro, lezione, [mat, consiglio()], vie), true)
  })

  it('le due metà di un blocco di due ore restano certe: il blocco comincia con la lezione', () => {
    const { registro, corso, regole } = scuolaConRegola()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:00', 90)
    registro.lezioni.push(lezione)
    const eventi = [
      evento('2026-09-15', '08:00', '08:45', { luogo: 'A12' }),
      evento('2026-09-15', '08:55', '09:40', { luogo: 'A12' }),
    ]
    assert.deepEqual(allineate(registro, eventi, regole), [lezione.id])
  })
})

describe('allineamentiAutomatici: eventi che si contraddicono', () => {
  it('uno annullato e uno vivo sulla stessa lezione: resta da confermare', () => {
    const { registro, corso, regole } = scuolaConRegola()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:00', 45)
    registro.lezioni.push(lezione)
    const eventi = [
      evento('2026-09-15', '08:00', '08:45', { chiave: 'annullato', annullato: true }),
      evento('2026-09-15', '08:10', '08:55', { chiave: 'vivo' }),
    ]
    assert.deepEqual(allineate(registro, eventi, regole), [])
  })

  it('due eventi vivi che si sovrappongono senza essere la stessa ora: niente da solo', () => {
    // Due calendari, o la copia vecchia e quella nuova: in fila farebbero due UD.
    const { registro, corso, regole } = scuolaConRegola()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:00', 45)
    registro.lezioni.push(lezione)
    const eventi = [
      evento('2026-09-15', '08:00', '08:45', { chiave: 'vecchio' }),
      evento('2026-09-15', '08:15', '09:30', { chiave: 'nuovo' }),
    ]
    assert.deepEqual(allineate(registro, eventi, regole), [])
  })
})

describe('allineamentiAutomatici: le altre lezioni del corso quel giorno', () => {
  it('un evento che copre due lezioni non ne allunga una sopra l’altra', () => {
    const { registro, corso, regole } = scuolaConRegola()
    const prima = creaLezione(corso.id, '2026-09-15', '08:00', 45)
    const seconda = creaLezione(corso.id, '2026-09-15', '08:45', 45)
    registro.lezioni.push(prima, seconda)
    const eventi = [evento('2026-09-15', '08:00', '09:30')]
    assert.deepEqual(allineate(registro, eventi, regole), [])
    // Con la seconda annullata la prima può prendersi le due ore.
    seconda.stato = 'annullata'
    assert.deepEqual(allineate(registro, eventi, regole), [prima.id])
  })

  it('l’host fa le stesse domande sul registro di adesso', () => {
    const { registro, corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:00', 45)
    const altra = creaLezione(corso.id, '2026-09-15', '09:00', 45)
    registro.lezioni.push(lezione, altra)
    const voce = (inizio, fine) => ({ lezioneId: lezione.id, fasce: [{ inizio, fine, tipo: 'lezione' }] })
    assert.equal(allineamentoDaSoloAmmesso(registro, lezione, voce('08:10', '08:55'), PRIMA), true)
    assert.equal(allineamentoDaSoloAmmesso(registro, lezione, voce('08:30', '09:15'), PRIMA), false)
    const svolta = { ...lezione, stato: 'svolta' }
    assert.equal(allineamentoDaSoloAmmesso(registro, svolta, voce('08:10', '08:55'), PRIMA), false)
  })
})

describe('allineamentiAutomatici: quel che è scritto sulla lezione', () => {
  it('argomenti o consuntivo: la lezione passata è già toccata', () => {
    const { registro, corso, regole } = scuolaConRegola()
    const conArgomenti = { ...creaLezione(corso.id, '2026-09-15', '08:00', 45), argomenti: 'Frazioni' }
    const conConsuntivo = { ...creaLezione(corso.id, '2026-09-16', '08:00', 45), consuntivo: 'Bene' }
    const pulita = creaLezione(corso.id, '2026-09-17', '08:00', 45)
    registro.lezioni.push(conArgomenti, conConsuntivo, pulita)
    const eventi = ['2026-09-15', '2026-09-16', '2026-09-17'].map((d) => evento(d, '08:10', '08:55'))
    assert.deepEqual(allineate(registro, eventi, regole, '2026-09-20'), [pulita.id])
  })
})
