// Lo smistamento di un PDF unico di classe.
//
// Le prove che contano sono due, e sono quelle che decidono se il documento di
// un allievo finisce nel fascicolo di un altro: chi viene riconosciuto su una
// pagina, e come si tengono insieme le pagine di uno stesso documento. Tutto il
// resto — il taglio, la scrittura del file, la spunta — viene dopo e dipende da
// queste due.
//
// La regola di raggruppamento è quella dei documenti veri: il nome in testa
// apre il blocco, le pagine mute che seguono appartengono a quel blocco.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaAllievo,
  creaClasse,
  creaConsegna,
  indiceNomi,
  normalizzaPerRicerca,
  pagineDaSmistare,
  pianoSmistamento,
  riconosci,
  smistamentiInQuarantena,
  smistamentoEsaurito,
  giaConsegnati,
} from '../dist/dominio.mjs'

/** Una classe con dentro i nomi dati, tutti frequentanti. */
function classeCon (...nomi) {
  const classe = creaClasse('anno-1', 'DIC4a')
  classe.allievi = nomi.map(([cognome, nome]) => ({
    ...creaAllievo(cognome, nome),
  }))
  return classe
}

/** Una consegna che si spunta portando un foglio. */
function raccolta (allieviIds) {
  return {
    ...creaConsegna('cor-1', 'Pagella 3° anno', '2026-09-01'),
    tipo: 'consegna',
    documento: 'certificato',
    a: 'allievi',
    allieviIds,
  }
}

const pagina = (numero, testo, lettura = 'testo') => ({ numero, testo, lettura })

describe('riconoscere chi è nominato in una pagina', () => {
  it('gli accenti non contano, da nessuna delle due parti', () => {
    assert.equal(normalizzaPerRicerca('Müller  Renée!'), 'muller renee')
  })

  it('nome e cognome insieme valgono più del cognome da solo', () => {
    const classe = classeCon(['Rossi', 'Mario'], ['Bianchi', 'Luca'])
    const indice = indiceNomi(classe.allievi)

    const pieno = riconosci('Pagella di Rossi Mario, classe DIC4a', indice)
    assert.equal(pieno.allievoId, classe.allievi[0].id)
    assert.equal(pieno.fiducia, 1)
    assert.equal(pieno.ambiguo, false)
  })

  it('funziona anche col nome scritto prima del cognome', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    const esito = riconosci('Allievo: Mario Rossi', indiceNomi(classe.allievi))
    assert.equal(esito.allievoId, classe.allievi[0].id)
  })

  it('due fratelli in classe: il cognome da solo non decide niente', () => {
    const classe = classeCon(['Rossi', 'Mario'], ['Rossi', 'Anna'])
    const esito = riconosci('Documento di Rossi, DIC4a', indiceNomi(classe.allievi))

    // Nessuna delle due chiavi «rossi» è entrata nell'indice: sarebbe stata una
    // moneta lanciata fra due fratelli.
    assert.equal(esito.allievoId, null)
  })

  it('chi non frequenta più non viene riconosciuto', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    classe.allievi[0].attivo = false
    assert.equal(riconosci('Rossi Mario', indiceNomi(classe.allievi)).allievoId, null)
  })
})

describe('dividere un PDF di classe', () => {
  it('una pagina per allievo: ognuna va a chi ci è nominato', () => {
    const classe = classeCon(['Rossi', 'Mario'], ['Bianchi', 'Luca'])
    const [rossi, bianchi] = classe.allievi
    const consegna = raccolta([rossi.id, bianchi.id])

    const piano = pianoSmistamento(
      [pagina(1, 'Pagella — Rossi Mario'), pagina(2, 'Pagella — Bianchi Luca')],
      consegna,
      classe,
      [rossi.id, bianchi.id],
    )

    assert.equal(piano.blocchi.length, 0)
    assert.deepEqual(
      piano.assegnazioni.map((a) => [a.allievoId, a.da, a.a]),
      [
        [rossi.id, 1, 1],
        [bianchi.id, 2, 2],
      ],
    )
  })

  it('le pagine senza nome continuano il documento di chi c’era prima', () => {
    const classe = classeCon(['Rossi', 'Mario'], ['Bianchi', 'Luca'])
    const [rossi, bianchi] = classe.allievi
    const consegna = raccolta([rossi.id, bianchi.id])

    const piano = pianoSmistamento(
      [
        pagina(1, 'Certificato di Rossi Mario'),
        pagina(2, 'segue: valutazioni del secondo semestre'),
        pagina(3, 'Certificato di Bianchi Luca'),
      ],
      consegna,
      classe,
      [rossi.id, bianchi.id],
    )

    assert.deepEqual(
      piano.assegnazioni.map((a) => [a.allievoId, a.da, a.a]),
      [
        [rossi.id, 1, 2],
        [bianchi.id, 3, 3],
      ],
    )
  })

  it('il nome ripetuto su ogni pagina non spezza il documento', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    const consegna = raccolta([classe.allievi[0].id])

    const piano = pianoSmistamento(
      [pagina(1, 'Rossi Mario — 1 di 2'), pagina(2, 'Rossi Mario — 2 di 2')],
      consegna,
      classe,
      [classe.allievi[0].id],
    )

    assert.equal(piano.assegnazioni.length, 1)
    assert.deepEqual(
      [piano.assegnazioni[0].da, piano.assegnazioni[0].a],
      [1, 2],
    )
  })

  it('la prima pagina senza nome resta in quarantena da sola', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    const consegna = raccolta([classe.allievi[0].id])

    const piano = pianoSmistamento(
      [pagina(1, 'Elenco della classe DIC4a'), pagina(2, 'Pagella di Rossi Mario')],
      consegna,
      classe,
      [classe.allievi[0].id],
    )

    assert.equal(piano.assegnazioni.length, 1)
    assert.equal(piano.blocchi.length, 1)
    assert.deepEqual(
      [piano.blocchi[0].da, piano.blocchi[0].a, piano.blocchi[0].motivo],
      [1, 1, 'senza-nome'],
    )
  })

  it('una scansione senza testo va in quarantena, e non si attacca a nessuno', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    const consegna = raccolta([classe.allievi[0].id])

    const piano = pianoSmistamento(
      [pagina(1, 'Pagella di Rossi Mario'), pagina(2, '', 'niente')],
      consegna,
      classe,
      [classe.allievi[0].id],
    )

    assert.deepEqual(
      [piano.assegnazioni[0].da, piano.assegnazioni[0].a],
      [1, 1],
    )
    assert.equal(piano.blocchi[0].motivo, 'senza-testo')
  })

  it('chi è riconosciuto ma non era fra i destinatari non viene archiviato', () => {
    const classe = classeCon(['Rossi', 'Mario'], ['Bianchi', 'Luca'])
    const [rossi, bianchi] = classe.allievi
    // La consegna è solo di Rossi: la pagina di Bianchi è di un'altra pratica.
    const consegna = raccolta([rossi.id])

    const piano = pianoSmistamento(
      [pagina(1, 'Rossi Mario'), pagina(2, 'Bianchi Luca')],
      consegna,
      classe,
      [rossi.id],
    )

    assert.equal(piano.assegnazioni.length, 1)
    assert.equal(piano.blocchi[0].motivo, 'fuori-elenco')
    assert.equal(piano.blocchi[0].allievoId, bianchi.id)
  })

  it('chi ha già consegnato non viene sovrascritto', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    const rossi = classe.allievi[0]
    // Il file sta fra i documenti della consegna, la spunta dice solo che è
    // successo: sono due fatti, e per lo smistamento conta il primo.
    const consegna = {
      ...raccolta([rossi.id]),
      documenti: [
        {
          allievoId: rossi.id,
          file: 'archivio/DIC4a/docente-di-classe/Pagella/x.pdf',
          nome: 'x.pdf',
          aggiuntoIl: '2026-09-02T10:00:00.000Z',
        },
      ],
      fatte: [{ chi: rossi.id, fattaIl: '2026-09-02T10:00:00.000Z', modo: 'mano' }],
    }

    const piano = pianoSmistamento(
      [pagina(1, 'Rossi Mario')],
      consegna,
      classe,
      [rossi.id],
      giaConsegnati(consegna),
    )

    assert.equal(piano.assegnazioni.length, 0)
    assert.equal(piano.blocchi[0].motivo, 'gia-consegnato')
  })

  it('lo stesso allievo due volte nello stesso PDF: la seconda si guarda a mano', () => {
    const classe = classeCon(['Rossi', 'Mario'], ['Bianchi', 'Luca'])
    const [rossi, bianchi] = classe.allievi
    const consegna = raccolta([rossi.id, bianchi.id])

    const piano = pianoSmistamento(
      [pagina(1, 'Rossi Mario'), pagina(2, 'Bianchi Luca'), pagina(3, 'Rossi Mario')],
      consegna,
      classe,
      [rossi.id, bianchi.id],
    )

    assert.equal(piano.assegnazioni.length, 2)
    assert.deepEqual([piano.blocchi[0].da, piano.blocchi[0].motivo], [3, 'gia-consegnato'])
  })

  it('senza consegna non si assegna niente: il PDF intero aspetta', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    const piano = pianoSmistamento([pagina(1, 'Rossi Mario')], null, classe, [])

    assert.equal(piano.assegnazioni.length, 0)
    assert.equal(piano.blocchi[0].motivo, 'senza-consegna')
  })
})

describe('la quarantena', () => {
  const smistamento = (id, blocchi, arrivatoIl) => ({
    id,
    consegnaId: 'cns-1',
    classeId: 'cls-1',
    file: `quarantena/${id}.pdf`,
    nome: `${id}.pdf`,
    pagine: 10,
    assegnate: [],
    blocchi,
    arrivatoIl,
  })

  it('elenca solo quel che ha ancora qualcosa da decidere, dal più vecchio', () => {
    const finito = smistamento('smi-1', [], '2026-09-01T08:00:00.000Z')
    const nuovo = smistamento('smi-2', [{ id: 'blc-1', da: 1, a: 2 }], '2026-09-03T08:00:00.000Z')
    const vecchio = smistamento('smi-3', [{ id: 'blc-2', da: 1, a: 1 }], '2026-09-02T08:00:00.000Z')

    assert.deepEqual(
      smistamentiInQuarantena([finito, nuovo, vecchio]).map((s) => s.id),
      ['smi-3', 'smi-2'],
    )
  })

  it('conta le pagine che aspettano, non i mucchi', () => {
    const uno = smistamento('smi-1', [{ id: 'blc-1', da: 1, a: 3 }], '2026-09-01T08:00:00.000Z')
    const due = smistamento('smi-2', [{ id: 'blc-2', da: 5, a: 5 }], '2026-09-02T08:00:00.000Z')

    assert.equal(pagineDaSmistare([uno, due]), 4)
  })

  it('un PDF che non si è saputo aprire resta in vista, anche senza blocchi', () => {
    // Senza blocchi sembrava finito, e spariva dal pannello portandosi dietro
    // il file: un documento perso in silenzio è il solo esito peggiore di uno
    // da sistemare a mano.
    const rotto = smistamento('smi-4', [], '2026-09-01T08:00:00.000Z')
    rotto.errore = 'non è un PDF leggibile.'

    assert.ok(!smistamentoEsaurito(rotto))
    assert.deepEqual(smistamentiInQuarantena([rotto]).map((s) => s.id), ['smi-4'])
  })
})

describe('il riconoscimento non prende pezzi di altre parole', () => {
  it('un cognome dentro un’altra parola non nomina nessuno', () => {
    const classe = classeCon(['Conti', 'Marco'])
    const indice = indiceNomi(classe.allievi)

    assert.equal(riconosci('Saldo acconti al 31.12.2026', indice).allievoId, null)
    assert.equal(riconosci('Conti Marco — pagella', indice).allievoId, classe.allievi[0].id)
  })

  it('non scambia Rossi per Grossi', () => {
    const classe = classeCon(['Rossi', 'Maria'])
    const indice = indiceNomi(classe.allievi)

    assert.equal(riconosci('Grossi Luca, II MEC', indice).allievoId, null)
  })

  it('un foglio di un’altra classe non finisce addosso a nessuno', () => {
    const classe = classeCon(['Lia', 'Anna'])
    const indice = indiceNomi(classe.allievi)

    // «lia» sta dentro «famiglia» e dentro «Italia»: da sola non è un nome.
    assert.equal(riconosci('Rapporto per la famiglia, Italia', indice).allievoId, null)
  })
})
