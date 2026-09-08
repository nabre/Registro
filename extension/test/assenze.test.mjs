// Le assenze da far firmare: le tre fasi di un periodo.
//
// Quel che queste prove tengono fermo è l'ordine delle fasi e chi decide che
// una pratica è chiusa. Un foglio vergine apre la riga, la mail la fa avanzare,
// e «firmato» vale solo quando per ogni foglio partito ne è tornato uno: è la
// regola che distingue «gliel'ho mandato» da «ce l'ho firmato in mano», ed è
// tutta la differenza fra le due cose a fine trimestre.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  allievoDelFile,
  avanzamentoAssenze,
  creaAllievo,
  creaBloccoAssenze,
  creaClasse,
  creaFascicolo,
  daSpedire,
  destinatariAssenze,
  documentoFoglio,
  faseRiga,
  foglioDi,
  normalizzaRegistro,
  periodoDetto,
  raggiungibile,
  rapportiDetti,
  richiesteAperte,
  richiesteFirma,
  rigaDi,
  righeVive,
  testoAssenze,
  tipiDaFirmare,
  tipiDetti,
  validaBloccoAssenze,
  vergini,
} from '../dist/dominio.mjs'

/** Un foglio già archiviato: quel che l'host scrive dopo aver copiato il file. */
function foglio (tipo, firmato) {
  return {
    tipo,
    firmato,
    file: `assenze/cls-1/ass-1/${tipo}${firmato ? ' firmate' : ''}.pdf`,
    nome: `${tipo}.pdf`,
    aggiuntoIl: '2026-01-10T08:00:00.000Z',
  }
}

function riga (allievoId, fogli, invio = null) {
  return { allievoId, fogli, invio, note: '' }
}

function periodo (righe = []) {
  return { ...creaBloccoAssenze('1° semestre', '2025-09-01', '2026-01-31'), righe }
}

describe('le fasi di un periodo di assenze', () => {
  it('chi non ha fogli non è nel periodo', () => {
    const blocco = periodo([riga('a1', [])])

    assert.equal(faseRiga(rigaDi(blocco, 'a1')), 'fuori')
    assert.equal(faseRiga(rigaDi(blocco, 'mai-visto')), 'fuori')
    assert.deepEqual(righeVive(blocco), [])
  })

  it('un vergine apre la riga, e la riga resta da spedire', () => {
    const blocco = periodo([riga('a1', [foglio('assenze', false)])])

    assert.equal(faseRiga(rigaDi(blocco, 'a1')), 'da-spedire')
    assert.equal(vergini(rigaDi(blocco, 'a1')).length, 1)
    assert.deepEqual(daSpedire(blocco).map((r) => r.allievoId), ['a1'])
  })

  it('la mail partita porta in attesa, e toglie dalle pronte', () => {
    const invio = { destinatari: ['azienda@x.ch'], inviatoIl: '2026-02-01T10:00:00.000Z' }
    const blocco = periodo([riga('a1', [foglio('assenze', false)], invio)])

    assert.equal(faseRiga(rigaDi(blocco, 'a1')), 'in-attesa')
    assert.deepEqual(daSpedire(blocco), [])
  })

  it('una mail andata storta non conta come spedita: si rifà', () => {
    const invio = { destinatari: [], inviatoIl: '2026-02-01T10:00:00.000Z', errore: 'casella piena' }
    const blocco = periodo([riga('a1', [foglio('assenze', false)], invio)])

    assert.equal(faseRiga(rigaDi(blocco, 'a1')), 'da-spedire')
    assert.deepEqual(daSpedire(blocco).map((r) => r.allievoId), ['a1'])
    assert.equal(avanzamentoAssenze(blocco).falliti, 1)
  })

  it('firmato vuol dire che per ogni foglio partito ne è tornato uno', () => {
    const meta = periodo([
      riga('a1', [foglio('assenze', false), foglio('ritardi', false), foglio('assenze', true)]),
    ])
    const tutto = periodo([
      riga('a1', [
        foglio('assenze', false),
        foglio('ritardi', false),
        foglio('assenze', true),
        foglio('ritardi', true),
      ]),
    ])

    // Due chiesti, uno tornato: la pratica non è chiusa.
    assert.equal(faseRiga(rigaDi(meta, 'a1')), 'da-spedire')
    assert.equal(faseRiga(rigaDi(tutto, 'a1')), 'firmato')
  })

  it('conta il periodo per fasi, e non lo dice completo se è vuoto', () => {
    const vuoto = periodo()
    const misto = periodo([
      riga('a1', [foglio('assenze', false), foglio('assenze', true)]),
      riga('a2', [foglio('assenze', false)], {
        destinatari: ['x@y.ch'],
        inviatoIl: '2026-02-01T10:00:00.000Z',
      }),
      riga('a3', [foglio('ritardi', false)]),
      riga('a4', []),
    ])

    assert.equal(avanzamentoAssenze(vuoto).completo, false)
    const conto = avanzamentoAssenze(misto)
    assert.equal(conto.interessati, 3)
    assert.equal(conto.firmate, 1)
    assert.equal(conto.inviate, 1)
    assert.equal(conto.completo, false)
  })

  it('trova il foglio giusto fra i quattro possibili', () => {
    const suoi = riga('a1', [foglio('assenze', false), foglio('ritardi', true)])

    assert.ok(foglioDi(suoi, 'assenze', false))
    assert.equal(foglioDi(suoi, 'assenze', true), null)
    assert.ok(foglioDi(suoi, 'ritardi', true))
    assert.equal(foglioDi(suoi, 'ritardi', false), null)
  })
})

describe('a chi va la richiesta di firma', () => {
  const conDatore = () => ({
    ...creaAllievo('Rossi', 'Maria'),
    email: 'maria@allievi.ch',
    emailTutore: 'mamma@casa.ch',
    azienda: 'Officina Bianchi SA',
    emailDatore: 'hr@bianchi.ch',
  })

  it('il datore è il destinatario, gli altri solo se il periodo lo dice', () => {
    const blocco = periodo()
    const solo = destinatariAssenze(blocco, conDatore(), creaFascicolo('cls-1'))

    assert.deepEqual(solo.indirizzi, ['hr@bianchi.ch'])
    assert.deepEqual(solo.senzaIndirizzo, [])

    const anche = destinatariAssenze(
      { ...blocco, aAllievo: true, aTutore: true },
      conDatore(),
      creaFascicolo('cls-1'),
    )
    assert.deepEqual(anche.indirizzi, ['hr@bianchi.ch', 'maria@allievi.ch', 'mamma@casa.ch'])
  })

  it('senza la casella dell’azienda non si spedisce, e si dice di chi', () => {
    const senza = { ...conDatore(), emailDatore: '' }
    const esito = destinatariAssenze(periodo(), senza, creaFascicolo('cls-1'))

    assert.deepEqual(esito.indirizzi, [])
    assert.deepEqual(esito.senzaIndirizzo, ['Officina Bianchi SA'])
    assert.equal(raggiungibile(senza), false)
    assert.equal(raggiungibile(conDatore()), true)
  })

  it('i recapiti fissi scelti entrano in copia', () => {
    const fascicolo = {
      ...creaFascicolo('cls-1'),
      recapiti: [{ id: 'rec-1', etichetta: 'Segreteria', email: 'segreteria@scuola.ch', predefinito: true }],
    }
    const esito = destinatariAssenze(
      { ...periodo(), recapitiIds: ['rec-1'] },
      conDatore(),
      fascicolo,
    )

    assert.deepEqual(esito.indirizzi, ['hr@bianchi.ch', 'segreteria@scuola.ch'])
  })
})

describe('il testo della richiesta', () => {
  it('riempie i segnaposto con i dati di quell’allievo', () => {
    const classe = { ...creaClasse('ann-1', 'I MEC A'), id: 'cls-1' }
    const allievo = { ...creaAllievo('Rossi', 'Maria'), azienda: 'Bianchi SA' }
    const blocco = periodo()

    const testo = testoAssenze(
      'A {azienda}: assenze di {allievo} ({classe}), {periodo}.',
      blocco,
      allievo,
      classe,
    )

    assert.equal(
      testo,
      'A Bianchi SA: assenze di Rossi Maria (I MEC A), 1° semestre (01.09.2025 – 31.01.2026).',
    )
  })

  it('un segnaposto che non conosce resta scritto: un buco non si vedrebbe', () => {
    const classe = creaClasse('ann-1', 'I MEC A')
    const allievo = creaAllievo('Rossi', 'Maria')

    assert.equal(
      testoAssenze('{allievo} — {inventato}', periodo(), allievo, classe),
      'Rossi Maria — {inventato}',
    )
  })

  it('il periodo si legge con etichetta ed estremi', () => {
    assert.equal(periodoDetto(periodo()), '1° semestre (01.09.2025 – 31.01.2026)')
  })

  it('nomina i rapporti che sono davvero in allegato', () => {
    // La lettera parte per allievo: a uno vanno tutti e due i fogli, a un
    // altro i soli ritardi. Una frase fissa che parla di assenze a chi non ne
    // ha fatte è la lettera che l'azienda rimanda indietro con una domanda.
    assert.equal(rapportiDetti([foglio('assenze', false)]), 'il rapporto delle assenze')
    assert.equal(rapportiDetti([foglio('ritardi', false)]), 'il rapporto dei ritardi')
    assert.equal(
      rapportiDetti([foglio('assenze', false), foglio('ritardi', false)]),
      'i rapporti delle assenze e dei ritardi',
    )
    // L'ordine è quello dei tipi e non quello in cui i file sono stati
    // caricati: la stessa lettera dev'essere uguale per venticinque allievi.
    assert.equal(
      rapportiDetti([foglio('ritardi', false), foglio('assenze', false)]),
      'i rapporti delle assenze e dei ritardi',
    )
  })

  it('l’oggetto dice che cosa c’è dentro la busta', () => {
    assert.equal(tipiDetti([foglio('ritardi', false)]), 'Ritardi')
    assert.equal(tipiDetti([foglio('assenze', false)]), 'Assenze')
    assert.equal(tipiDetti([foglio('assenze', false), foglio('ritardi', false)]), 'Assenze e ritardi')
  })

  it('scrive nel testo i rapporti di quell’allievo, non quelli del periodo', () => {
    const classe = creaClasse('ann-1', 'I MEC A')
    const allievo = creaAllievo('Rossi', 'Maria')
    const solo = [foglio('ritardi', false)]

    assert.equal(
      testoAssenze('in allegato {rapporti} di {allievo}.', periodo(), allievo, classe, solo),
      'in allegato il rapporto dei ritardi di Rossi Maria.',
    )
    assert.equal(
      testoAssenze('{tipi} — {allievo}', periodo(), allievo, classe, solo),
      'Ritardi — Rossi Maria',
    )
  })

  it('la lettera scritta prima si aggiorna da sé quando il file si legge', () => {
    // Un periodo aperto a settembre porta ancora la lettera di serie di prima,
    // che nominava assenze e ritardi sempre. Aspettare che qualcuno la
    // riscriva a mano vuol dire mandarla sbagliata per un altro trimestre.
    const registro = normalizzaRegistro({
      fascicoli: [
        {
          id: 'fas-1',
          classeId: 'cls-1',
          assenze: [
            {
              id: 'ass-1',
              etichetta: '1° sem',
              dal: '2026-09-01',
              al: '2027-01-31',
              oggetto: 'Assenze e ritardi — {allievo} — 1° sem',
              corpo:
                'in allegato trovate il rapporto delle assenze e dei ritardi di {allievo} ' +
                '({classe}).\n\nVi chiediamo cortesemente di controfirmare i documenti e di ' +
                'rispedirceli per e-mail.',
            },
          ],
        },
      ],
    })

    const blocco = registro.fascicoli[0].assenze[0]
    assert.equal(blocco.oggetto, '{tipi} — {allievo} — 1° sem')
    assert.match(blocco.corpo, /in allegato trovate \{rapporti\} di \{allievo\}/)
    assert.match(blocco.corpo, /controfirmare quanto allegato e di rispedircelo/)
  })

  it('una lettera riscritta a mano resta come l’ha voluta il docente', () => {
    const registro = normalizzaRegistro({
      fascicoli: [
        {
          id: 'fas-1',
          classeId: 'cls-1',
          assenze: [
            {
              id: 'ass-1',
              etichetta: '1° sem',
              dal: '2026-09-01',
              al: '2027-01-31',
              oggetto: 'Fogli da firmare per {allievo}',
              corpo: 'Buongiorno, in allegato i fogli di {allievo}. Grazie.',
            },
          ],
        },
      ],
    })

    const blocco = registro.fascicoli[0].assenze[0]
    assert.equal(blocco.oggetto, 'Fogli da firmare per {allievo}')
    assert.equal(blocco.corpo, 'Buongiorno, in allegato i fogli di {allievo}. Grazie.')
  })

  it('senza fogli resta la formula completa, che è quel che c’era prima', () => {
    const classe = creaClasse('ann-1', 'I MEC A')
    const allievo = creaAllievo('Rossi', 'Maria')

    assert.equal(
      testoAssenze('{rapporti} · {tipi}', periodo(), allievo, classe),
      'i rapporti delle assenze e dei ritardi · Assenze e ritardi',
    )
  })
})

describe('i file dei fogli', () => {
  it('il nome su disco dice di chi è e che foglio è', () => {
    const allievo = creaAllievo('Rossi', 'Maria')

    // Che documento è, e di che periodo: il nome dell'allievo lo mette chi
    // compone il nome del file, una volta sola. Prima stava anche qui, e il
    // file finiva per chiamarsi «DIC4a_1° sem_Rossi Maria_Rossi Maria — assenze».
    assert.equal(documentoFoglio('assenze', false, '1° sem'), 'Assenze 1° sem')
    assert.equal(documentoFoglio('ritardi', true, '2° sem'), 'Ritardi firmati 2° sem')
  })

  it('riconosce l’allievo dal nome del file, in tutti e due gli ordini', () => {
    const allievi = [creaAllievo('Rossi', 'Maria'), creaAllievo('Bernasconi', 'Luca')]

    assert.equal(allievoDelFile('rossi_maria_assenze.pdf', allievi)?.cognome, 'Rossi')
    assert.equal(allievoDelFile('Maria Rossi - ritardi.pdf', allievi)?.cognome, 'Rossi')
    assert.equal(allievoDelFile('BERNASCONI.pdf', allievi)?.nome, 'Luca')
  })

  it('non tira a indovinare fra due fratelli, e non inventa', () => {
    const allievi = [
      creaAllievo('Rossi', 'Maria'),
      creaAllievo('Rossi', 'Luca'),
      creaAllievo('Bernasconi', 'Ada'),
    ]

    // Il cognome da solo li trova tutti e due: meglio lasciarlo fuori.
    assert.equal(allievoDelFile('rossi assenze.pdf', allievi), null)
    // Con il nome accanto non c'è più dubbio.
    assert.equal(allievoDelFile('rossi luca.pdf', allievi)?.nome, 'Luca')
    assert.equal(allievoDelFile('nessuno qui.pdf', allievi), null)
  })

  it('gli accenti non contano: la segreteria stampa Muller e il registro scrive Müller', () => {
    const allievi = [creaAllievo('Müller', 'Sofia')]

    assert.equal(allievoDelFile('muller_sofia.pdf', allievi)?.cognome, 'Müller')
  })
})

describe('un periodo che sta in piedi', () => {
  it('vuole un nome, due date e una lettera da spedire', () => {
    const buono = periodo()
    assert.equal(validaBloccoAssenze(buono).valido, true)

    assert.deepEqual(validaBloccoAssenze({ ...buono, etichetta: ' ' }).errori, [
      'Il periodo deve avere un nome.',
    ])
    assert.deepEqual(validaBloccoAssenze({ ...buono, corpo: '' }).errori, ['La mail è vuota.'])
    assert.deepEqual(
      validaBloccoAssenze({ ...buono, dal: '2026-01-31', al: '2025-09-01' }).errori,
      ['Il periodo finisce prima di cominciare.'],
    )
  })

  it('alla lettura un periodo al contrario si raddrizza invece di sparire', () => {
    const letto = normalizzaRegistro({
      fascicoli: [
        {
          classeId: 'cls-1',
          assenze: [
            {
              id: 'ass-1',
              etichetta: '1° semestre',
              dal: '2026-01-31',
              al: '2025-09-01',
              righe: [{ allievoId: 'a1', fogli: [foglio('assenze', false), { tipo: 'assenze' }] }],
            },
          ],
        },
      ],
    })

    const blocco = letto.fascicoli[0].assenze[0]
    assert.equal(blocco.dal, '2025-09-01')
    assert.equal(blocco.al, '2026-01-31')
    // Il foglio senza file era una riga scritta a mano e mai finita: non c'è.
    assert.equal(blocco.righe[0].fogli.length, 1)
    assert.equal(blocco.righe[0].invio, null)
  })

  it('un fascicolo scritto prima delle assenze si legge lo stesso', () => {
    const letto = normalizzaRegistro({
      fascicoli: [{ classeId: 'cls-1', recapiti: [], documenti: [], comunicazioni: [] }],
    })

    assert.deepEqual(letto.fascicoli[0].assenze, [])
  })
})

describe('le richieste di firma nel todo', () => {
  const classeCon = (righe) => ({
    ...creaClasse('ann-1', 'I MEC A'),
    id: 'cls-1',
    allievi: [{ ...creaAllievo('Rossi', 'Maria'), id: 'a1' }],
  })

  const conRighe = (righe) => ({
    fascicoli: [{ ...creaFascicolo('cls-1'), assenze: [periodo(righe)] }],
  })

  it('un foglio caricato apre da sé una richiesta da spedire', () => {
    // Nasce dal caricamento e non da un gesto in più: appena i rapporti
    // entrano nel registro, quella pratica è un lavoro aperto.
    const gruppi = richiesteFirma(conRighe([riga('a1', [foglio('assenze', false)])]), [classeCon()])

    assert.equal(gruppi.daSpedire.length, 1)
    assert.equal(gruppi.daSpedire[0].fase, 'da-spedire')
    assert.deepEqual(gruppi.daSpedire[0].tipi, ['assenze'])
    assert.equal(richiesteAperte(gruppi), 1)
  })

  it('la mail partita la sposta in attesa, e dice quali firme mancano', () => {
    const invio = { destinatari: ['hr@x.ch'], inviatoIl: '2026-02-01T10:00:00.000Z' }
    const righe = [riga('a1', [foglio('assenze', false), foglio('ritardi', false)], invio)]
    const gruppi = richiesteFirma(conRighe(righe), [classeCon()])

    assert.equal(gruppi.daSpedire.length, 0)
    assert.equal(gruppi.inAttesa.length, 1)
    assert.deepEqual(gruppi.inAttesa[0].daFirmare, ['assenze', 'ritardi'])
  })

  it('il foglio firmato che torna chiude solo il suo rapporto', () => {
    // L'azienda può rimandarne indietro uno solo: la pratica resta aperta per
    // l'altro, e chi guarda deve sapere quale.
    const invio = { destinatari: ['hr@x.ch'], inviatoIl: '2026-02-01T10:00:00.000Z' }
    const righe = [
      riga('a1', [foglio('assenze', false), foglio('ritardi', false), foglio('assenze', true)], invio),
    ]
    const gruppi = richiesteFirma(conRighe(righe), [classeCon()])

    assert.equal(gruppi.inAttesa.length, 1)
    assert.deepEqual(gruppi.inAttesa[0].daFirmare, ['ritardi'])
    assert.deepEqual(tipiDaFirmare(righe[0]), ['ritardi'])
  })

  it('tornata tutta firmata sparisce dagli aperti e resta fra le chiuse', () => {
    const invio = { destinatari: ['hr@x.ch'], inviatoIl: '2026-02-01T10:00:00.000Z' }
    const righe = [riga('a1', [foglio('assenze', false), foglio('assenze', true)], invio)]
    const gruppi = richiesteFirma(conRighe(righe), [classeCon()])

    assert.equal(richiesteAperte(gruppi), 0)
    assert.equal(gruppi.firmate.length, 1)
    assert.deepEqual(gruppi.firmate[0].daFirmare, [])
  })

  it('una mail andata storta torna da spedire, con il motivo scritto', () => {
    const invio = { destinatari: [], inviatoIl: '2026-02-01T10:00:00.000Z', errore: 'casella piena' }
    const gruppi = richiesteFirma(
      conRighe([riga('a1', [foglio('assenze', false)], invio)]),
      [classeCon()],
    )

    assert.equal(gruppi.daSpedire.length, 1)
    assert.equal(gruppi.daSpedire[0].errore, 'casella piena')
  })

  it('chi in quel periodo non ha mancato niente non compare', () => {
    const gruppi = richiesteFirma(conRighe([riga('a1', [])]), [classeCon()])

    assert.equal(richiesteAperte(gruppi), 0)
    assert.equal(gruppi.firmate.length, 0)
  })
})
