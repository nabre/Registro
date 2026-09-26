// Il menu dell'icona accanto all'orologio: che cosa è a posto, che cosa è
// rimasto aperto, che cosa succede adesso e che cosa viene. Le prove guardano
// le stringhe (il segno in prima colonna e il motivo in coda), che qui sono
// l'interfaccia.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  alberoVassoio,
  creaCorso,
  creaLezione,
  creaMateria,
  SEGNO_FASE,
} from '../../dist-tests/domain.mjs'
import { conPiano, scuolaMinima } from '../helpers/register.mjs'

const OGGI = '2026-10-20'

/** L'appello preso su tutte le UD: da lì in poi l'ora non ha più buchi. */
function conAppello (lezione, allievi) {
  const ud = lezione.slot.filter((s) => s.tipo !== 'pausa').length || 1
  lezione.presenze = allievi.map((allievo) => ({
    allievoId: allievo.id,
    stati: Array.from({ length: ud }, () => 'presente'),
  }))
}

/** Un'ora chiusa come si deve: segnata svolta e con l'appello fatto. */
function oraSvolta (registro, corso, data, allievi) {
  const lezione = creaLezione(corso.id, data, '08:20', 45)
  lezione.stato = 'svolta'
  conAppello(lezione, allievi)
  registro.lezioni.push(lezione)
  return lezione
}

function ora (registro, corso, data, inizio = '08:20') {
  const lezione = creaLezione(corso.id, data, inizio, 45)
  registro.lezioni.push(lezione)
  return lezione
}

/** Il corso del menu, cercato per id: l'ordine è un'altra prova. */
function corsoDi (albero, corsoId) {
  const trovato = albero.corsi.find((c) => c.corsoId === corsoId)
  assert.ok(trovato, 'il corso doveva essere nel menu')
  return trovato
}

function mucchio (corso, chiave) {
  return corso.mucchi.find((m) => m.chiave === chiave)
}

describe('il menu del vassoio', () => {
  it('divide le ore di un corso nei suoi mucchi, con il numero vero nel titolo', () => {
    const { registro, corso, rossi, bianchi, verdi } = scuolaMinima()
    oraSvolta(registro, corso, '2026-10-05', [rossi, bianchi, verdi])
    oraSvolta(registro, corso, '2026-10-06', [rossi, bianchi, verdi])
    ora(registro, corso, '2026-10-12')
    ora(registro, corso, '2026-10-26')

    const albero = alberoVassoio(registro, OGGI, '12:00')
    const suo = corsoDi(albero, corso.id)

    assert.equal(mucchio(suo, 'svolte').titolo, 'Svolte (2)')
    assert.equal(mucchio(suo, 'da-chiudere').titolo, 'Da chiudere (1)')
    assert.equal(mucchio(suo, 'prossime').titolo, 'Prossime (1)')
    assert.equal(mucchio(suo, 'in-corso'), undefined, 'un mucchio vuoto non occupa una riga')
    assert.equal(suo.riepilogo, '1 da chiudere · 1 in programma · 2 svolte')
  })

  it('dice perché un’ora è da chiudere, e non solo che lo è', () => {
    const { registro, corso, rossi, bianchi, verdi } = scuolaMinima()
    const senzaAppello = ora(registro, corso, '2026-10-12')
    const senzaSpunta = ora(registro, corso, '2026-10-13')
    conAppello(senzaSpunta, [rossi, bianchi, verdi])

    const albero = alberoVassoio(registro, OGGI, '12:00')
    const righe = mucchio(corsoDi(albero, corso.id), 'da-chiudere').ore

    assert.deepEqual(
      righe.map((riga) => riga.lezioneId),
      [senzaAppello.id, senzaSpunta.id],
      'in ordine di calendario: il buco più vecchio è quello che si sta dimenticando',
    )
    assert.match(righe[0].etichetta, /senza appello, non segnata svolta/)
    assert.match(
      righe[1].etichetta,
      /non segnata svolta/,
      'l’appello c’è: quel che manca è solo la spunta, e va detto',
    )
    assert.doesNotMatch(righe[1].etichetta, /senza appello/)
  })

  it('distingue le future preparate da quelle ancora da preparare', () => {
    const { registro, corso } = scuolaMinima()
    const preparata = ora(registro, corso, '2026-10-26')
    conPiano(registro, preparata, 1)
    ora(registro, corso, '2026-10-27')

    const righe = mucchio(corsoDi(alberoVassoio(registro, OGGI), corso.id), 'prossime').ore

    assert.equal(righe[0].fase, 'futura')
    assert.ok(righe[0].etichetta.startsWith(SEGNO_FASE.futura))
    assert.equal(righe[1].fase, 'da-preparare')
    assert.ok(righe[1].etichetta.startsWith(SEGNO_FASE['da-preparare']))
    assert.match(righe[1].etichetta, /senza piano/)
  })

  it('una scaletta che non copre l’ora è da preparare, e lo dice', () => {
    const { registro, corso } = scuolaMinima()
    const corta = ora(registro, corso, '2026-10-26')
    conPiano(registro, corta, 0.5)

    const righe = mucchio(corsoDi(alberoVassoio(registro, OGGI), corso.id), 'prossime').ore

    assert.equal(righe[0].fase, 'da-preparare')
    // «Senza piano» sarebbe falso, e manderebbe a cercare quel che c'è già.
    assert.match(righe[0].etichetta, /scaletta corta/)
  })

  it('l’ora in corso comanda: sul corso, in testa al menu e nel suggerimento', () => {
    const { registro, corso } = scuolaMinima()
    ora(registro, corso, '2026-10-12')
    const adesso = ora(registro, corso, OGGI)

    const albero = alberoVassoio(registro, OGGI, '08:30')

    assert.equal(albero.inCorso.lezioneId, adesso.id)
    assert.equal(corsoDi(albero, corso.id).fase, 'in-corso')
    assert.ok(
      corsoDi(albero, corso.id).etichetta.startsWith(SEGNO_FASE['in-corso']),
      'fra un buco e un’ora che sta succedendo, dal primo livello si vede quella che succede',
    )
    assert.match(albero.inCorso.etichetta, /oggi · 08:20–09:05 · fino alle 09:05/)
    assert.match(albero.suggerimento, /fino alle 09:05/)
  })

  it('senza niente in corso il segno del corso è quello del buco più urgente', () => {
    const { registro, corso, rossi, bianchi, verdi } = scuolaMinima()
    oraSvolta(registro, corso, '2026-10-05', [rossi, bianchi, verdi])
    ora(registro, corso, '2026-10-12')
    ora(registro, corso, '2026-10-26')

    assert.equal(corsoDi(alberoVassoio(registro, OGGI), corso.id).fase, 'da-chiudere')
  })

  it('conta in testa le ore da chiudere di tutti i corsi', () => {
    const { registro, classe, corso } = scuolaMinima()
    const altra = creaMateria('Italiano')
    const secondo = creaCorso(classe.id, altra.id, 'I MEC A — Italiano')
    registro.materie.push(altra)
    registro.corsi.push(secondo)
    ora(registro, corso, '2026-10-12')
    ora(registro, secondo, '2026-10-13')
    ora(registro, secondo, '2026-10-14')

    const albero = alberoVassoio(registro, OGGI, '12:00')

    assert.equal(albero.daChiudere, 3)
    assert.equal(albero.intestazione, 'Regiclass — 3 ore da chiudere')
  })

  it('niente da chiudere si dice, invece di lasciare la riga muta', () => {
    const { registro, corso, rossi, bianchi, verdi } = scuolaMinima()
    oraSvolta(registro, corso, '2026-10-05', [rossi, bianchi, verdi])

    const albero = alberoVassoio(registro, OGGI)

    assert.equal(albero.daChiudere, 0)
    assert.equal(albero.intestazione, 'Regiclass — niente da chiudere')
  })

  it('porta all’ora su cui andare: il buco vecchio prima della prossima', () => {
    const { registro, corso } = scuolaMinima()
    const buco = ora(registro, corso, '2026-10-12')
    ora(registro, corso, '2026-10-26')

    const albero = alberoVassoio(registro, OGGI, '12:00')

    assert.equal(albero.daFare.lezioneId, buco.id)
    assert.equal(albero.daFare.manca, true)
    assert.match(albero.daFare.etichetta, /^⚠ Da compilare: I MEC A — Matematica · lun 12/)
  })

  it('senza buchi la riga in testa è un appuntamento, non un rimprovero', () => {
    const { registro, corso, rossi, bianchi, verdi } = scuolaMinima()
    oraSvolta(registro, corso, '2026-10-05', [rossi, bianchi, verdi])
    const prossima = ora(registro, corso, '2026-10-21')

    const albero = alberoVassoio(registro, OGGI)

    assert.equal(albero.daFare.lezioneId, prossima.id)
    assert.equal(albero.daFare.manca, false)
    assert.match(albero.daFare.etichetta, /Prossima: I MEC A — Matematica · domani/)
  })

  it('taglia i mucchi lunghi e dice quante ore restano fuori', () => {
    const { registro, corso, rossi, bianchi, verdi } = scuolaMinima()
    for (let giorno = 1; giorno <= 8; giorno += 1) {
      oraSvolta(registro, corso, `2026-10-0${giorno}`, [rossi, bianchi, verdi])
    }

    const svolte = mucchio(corsoDi(alberoVassoio(registro, OGGI), corso.id), 'svolte')

    assert.equal(svolte.titolo, 'Svolte (8)', 'il titolo dice quante sono, non quante se ne vedono')
    assert.equal(svolte.ore.length, 5)
    assert.equal(svolte.altre, 3)
    assert.match(
      svolte.ore[0].etichetta,
      /gio 8/,
      'le svolte si guardano all’indietro: la più recente in cima',
    )
  })

  it('un corso senza ore non occupa una riga', () => {
    const { registro, classe, corso } = scuolaMinima()
    const altra = creaMateria('Italiano')
    const vuoto = creaCorso(classe.id, altra.id, 'I MEC A — Italiano')
    registro.materie.push(altra)
    registro.corsi.push(vuoto)
    ora(registro, corso, '2026-10-26')

    const albero = alberoVassoio(registro, OGGI)

    assert.deepEqual(
      albero.corsi.map((c) => c.corsoId),
      [corso.id],
    )
  })

  it('chiama i corsi «classe — materia», qualunque titolo abbiano nei dati', () => {
    const { registro, corso } = scuolaMinima()
    // Un titolo rinominato a mano: succede, e nel menu non deve contare.
    corso.titolo = 'Mat 3A vecchio nome'
    ora(registro, corso, '2026-10-12')

    const albero = alberoVassoio(registro, OGGI, '12:00')

    assert.equal(
      corsoDi(albero, corso.id).etichetta,
      `${SEGNO_FASE['da-chiudere']} I MEC A — Matematica`,
    )
    assert.match(albero.daFare.etichetta, /I MEC A — Matematica/)
  })

  it('i corsi restano in ordine di nome, non di urgenza', () => {
    const { registro, classe, corso } = scuolaMinima()
    const altra = creaMateria('Chimica')
    const chimica = creaCorso(classe.id, altra.id, 'I MEC A — Chimica')
    registro.materie.push(altra)
    registro.corsi.push(chimica)
    // La matematica ha il buco, la chimica no: il menu non si riordina per
    // urgenza, o domani le voci sarebbero altrove.
    ora(registro, corso, '2026-10-12')
    ora(registro, chimica, '2026-10-26')

    const albero = alberoVassoio(registro, OGGI, '12:00')

    assert.deepEqual(
      albero.corsi.map((c) => c.etichetta),
      [`${SEGNO_FASE['da-preparare']} I MEC A — Chimica`, `${SEGNO_FASE['da-chiudere']} I MEC A — Matematica`],
    )
  })

  it('un’ora annullata non è né un buco né un’ora fatta', () => {
    const { registro, corso } = scuolaMinima()
    const persa = ora(registro, corso, '2026-10-12')
    persa.stato = 'annullata'

    const albero = alberoVassoio(registro, OGGI, '12:00')
    const suo = corsoDi(albero, corso.id)

    assert.equal(albero.daChiudere, 0)
    assert.equal(mucchio(suo, 'da-chiudere'), undefined)
    assert.deepEqual(
      mucchio(suo, 'annullate').ore.map((riga) => riga.lezioneId),
      [persa.id],
    )
  })

  it('un registro senza corsi non inventa niente', () => {
    const { registro } = scuolaMinima()

    const albero = alberoVassoio(registro, OGGI)

    assert.deepEqual(albero.corsi, [])
    assert.equal(albero.daFare, null)
    assert.equal(albero.inCorso, null)
    assert.equal(albero.suggerimento, 'Regiclass')
  })
})
