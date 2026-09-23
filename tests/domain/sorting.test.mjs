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
  dicePagine,
  creaClasse,
  creaConsegna,
  indiceNomi,
  intervalliDi,
  riquadroDelNome,
  normalizzaPerRicerca,
  divisioneDi,
  pagineDaSmistare,
  bozzaSmistamento,
  riconosci,
  smistamentiInQuarantena,
  smistamentoEsaurito,
  daSmistarePerClasse,
  giaConsegnati,
} from '../../dist-tests/domain.mjs'

/**
 * Le due metà della decisione, separate, da quel che la funzione pubblica dà.
 *
 * `bozzaSmistamento` è la via d'ingresso vera — quella che il pannello chiama —
 * e mette tutto in un elenco solo, dove quel che sarebbe stato assegnato porta
 * il motivo «da confermare». Le prove qui sotto guardano le due metà a parte,
 * perché sono due decisioni diverse: questa le rimette in due elenchi senza
 * chiedere niente di più di quel che la funzione pubblica già dice.
 */
function pianoSmistamento (...argomenti) {
  const blocchi = bozzaSmistamento(...argomenti)
  return {
    assegnazioni: blocchi.filter((b) => b.motivo === 'da-confermare'),
    blocchi: blocchi.filter((b) => b.motivo !== 'da-confermare'),
  }
}

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

describe('tutto quel che aspetta, classe per classe', () => {
  const quando = '2026-09-01T08:00:00.000Z'
  /** Un PDF in attesa: `dove` dice a che classe e a che consegna si è agganciato. */
  const pdf = (id, dove, pagine = 2) => ({
    id,
    consegnaId: dove.consegnaId ?? null,
    classeId: dove.classeId ?? null,
    file: `quarantena/${id}.pdf`,
    nome: `${id}.pdf`,
    pagine,
    assegnate: [],
    blocchi: [{ id: `blc-${id}`, da: 1, a: pagine }],
    arrivatoIl: dove.arrivatoIl ?? quando,
  })

  const primaClasse = { ...creaClasse('anno-1', 'I MEC A'), id: 'cls-1' }
  const secondaClasse = { ...creaClasse('anno-1', 'III ELE B'), id: 'cls-2' }
  const docenze = [
    { classe: primaClasse, consegneIds: ['cns-1'] },
    { classe: secondaClasse, consegneIds: ['cns-2'] },
  ]

  it('mette ogni PDF sotto la sua classe, per classe o per consegna', () => {
    const suo = pdf('a', { classeId: 'cls-1' })
    const perConsegna = pdf('b', { consegnaId: 'cns-2' })

    const mucchi = daSmistarePerClasse([suo, perConsegna], docenze)

    assert.deepEqual(
      mucchi.map((m) => [m.classe?.nome, m.smistamenti.map((s) => s.id)]),
      [['I MEC A', ['a']], ['III ELE B', ['b']]],
    )
  })

  it('i PDF di nessuna classe finiscono in coda, e non si perdono', () => {
    // È il caso per cui questa funzione esiste: entrato dalla cartella
    // osservata, nessuna consegna indovinata, `classeId` nullo. Prima non
    // compariva in nessuna vista del registro.
    const orfano = pdf('c', {})

    const mucchi = daSmistarePerClasse([pdf('a', { classeId: 'cls-1' }), orfano], docenze)

    const ultimo = mucchi[mucchi.length - 1]
    assert.equal(ultimo.classe, null)
    assert.deepEqual(ultimo.smistamenti.map((s) => s.id), ['c'])
  })

  it('un PDF sta in un mucchio solo, anche quando due classi se lo contendono', () => {
    // La classe scritta sul PDF è la prima, la consegna a cui si è agganciato è
    // della seconda: contarlo in tutt'e due farebbe un totale che non torna con
    // quel che si ha sotto gli occhi.
    const conteso = pdf('a', { classeId: 'cls-1', consegnaId: 'cns-2' })

    const mucchi = daSmistarePerClasse([conteso], docenze)

    assert.equal(mucchi.length, 1)
    assert.equal(mucchi[0].classe.nome, 'I MEC A')
  })

  it('conta le pagine che restano, mucchio per mucchio', () => {
    const mucchi = daSmistarePerClasse(
      [pdf('a', { classeId: 'cls-1' }, 3), pdf('b', { classeId: 'cls-1' }, 4)],
      docenze,
    )

    assert.equal(mucchi[0].pagine, 7)
  })

  it('le classi senza niente da smistare non lasciano un titolo vuoto', () => {
    const mucchi = daSmistarePerClasse([pdf('a', { classeId: 'cls-1' })], docenze)

    assert.deepEqual(mucchi.map((m) => m.classe?.nome), ['I MEC A'])
  })

  it('un PDF già esaurito non compare: non c’è più niente da decidere', () => {
    const finito = pdf('a', { classeId: 'cls-1' })
    finito.blocchi = []

    assert.deepEqual(daSmistarePerClasse([finito], docenze), [])
  })
})

describe('dove cadono le forbici, quando lo dice chi carica', () => {
  /** Quattro pagine mute: è il PDF che nessun riconoscimento saprebbe tagliare. */
  const mute = [1, 2, 3, 4].map((n) => pagina(n, '', 'niente'))

  it('a passo fisso taglia ogni tot pagine, e se ne infischia dei nomi', () => {
    const classe = classeCon(['Rossi', 'Mario'], ['Bianchi', 'Luca'])
    const [rossi, bianchi] = classe.allievi
    const consegna = raccolta([rossi.id, bianchi.id])

    const piano = pianoSmistamento(mute, consegna, classe, [rossi.id, bianchi.id], new Set(), {
      modo: 'passo',
      pagine: 2,
    })

    assert.equal(piano.assegnazioni.length, 0, 'non deve assegnare niente da sé')
    assert.deepEqual(
      piano.blocchi.map((b) => [b.da, b.a, b.motivo]),
      [
        [1, 2, 'a-mano'],
        [3, 4, 'a-mano'],
      ],
    )
  })

  it('dentro un blocco il nome resta una proposta, non una condizione', () => {
    // Il taglio lo decide il passo; se poi in quelle due pagine c'è un nome
    // leggibile, la riga arriva già compilata — ed è quel che fa risparmiare i
    // venticinque clic anche su un PDF a passo fisso.
    const classe = classeCon(['Rossi', 'Mario'], ['Bianchi', 'Luca'])
    const [rossi, bianchi] = classe.allievi
    const consegna = raccolta([rossi.id, bianchi.id])

    const piano = pianoSmistamento(
      [
        pagina(1, 'copertina'),
        pagina(2, 'Pagella — Rossi Mario'),
        pagina(3, 'copertina'),
        pagina(4, 'Pagella — Bianchi Luca'),
      ],
      consegna,
      classe,
      [rossi.id, bianchi.id],
      new Set(),
      { modo: 'passo', pagine: 2 },
    )

    assert.deepEqual(
      piano.assegnazioni.map((a) => [a.allievoId, a.da, a.a]),
      [
        [rossi.id, 1, 2],
        [bianchi.id, 3, 4],
      ],
    )
  })

  it('l’ultimo blocco è quel che avanza, anche se è più corto del passo', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    const consegna = raccolta([classe.allievi[0].id])

    const piano = pianoSmistamento(
      [1, 2, 3].map((n) => pagina(n, '', 'niente')),
      consegna,
      classe,
      [classe.allievi[0].id],
      new Set(),
      { modo: 'passo', pagine: 2 },
    )

    assert.deepEqual(piano.blocchi.map((b) => [b.da, b.a]), [[1, 2], [3, 3]])
  })

  it('i buchi delle pagine già assegnate non si scavalcano', () => {
    // La 3 e la 7 non sono lo stesso documento solo perché si trovano una
    // accanto all'altra in un elenco accorciato: è la stessa regola del taglio
    // dai nomi, e vale anche qui.
    const classe = classeCon(['Rossi', 'Mario'])
    const consegna = raccolta([classe.allievi[0].id])

    const piano = pianoSmistamento(
      [pagina(1, '', 'niente'), pagina(2, '', 'niente'), pagina(7, '', 'niente')],
      consegna,
      classe,
      [classe.allievi[0].id],
      new Set(),
      { modo: 'passo', pagine: 2 },
    )

    assert.deepEqual(piano.blocchi.map((b) => [b.da, b.a]), [[1, 2], [7, 7]])
  })

  it('a mano non taglia niente: un pezzo solo per ogni tratto continuo', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    const consegna = raccolta([classe.allievi[0].id])

    const piano = pianoSmistamento(
      [pagina(1, 'Rossi Mario'), pagina(2, 'x'), pagina(5, 'y')],
      consegna,
      classe,
      [classe.allievi[0].id],
      new Set(),
      { modo: 'mano' },
    )

    // Il primo tratto nomina qualcuno e arriva come proposta; il secondo no, e
    // resta un blocco da ritagliare a mano.
    assert.deepEqual(piano.assegnazioni.map((a) => [a.allievoId, a.da, a.a]), [
      [classe.allievi[0].id, 1, 2],
    ])
    assert.deepEqual(piano.blocchi.map((b) => [b.da, b.a, b.motivo]), [[5, 5, 'a-mano']])
  })

  it('senza modo dichiarato si taglia come si è sempre fatto', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    assert.deepEqual(divisioneDi({}), { modo: 'nomi' })
    // Un passo scritto storto non deve diventare un taglio impossibile: a zero
    // pagine per documento il taglio non finirebbe mai.
    assert.deepEqual(divisioneDi({ divisione: { modo: 'passo', pagine: 0 } }), {
      modo: 'passo',
      pagine: 1,
    })
    void classe
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

describe('le pagine scelte con il mouse', () => {
  // Chi prende delle pagine dallo sfoglio non prende quasi mai un intervallo:
  // ne tocca tre qua e una là. Il registro però si è sempre segnato quel che ha
  // archiviato a intervalli, e queste due funzioni sono il ponte fra le due
  // cose — quel che si è preso, e come lo si racconta.
  it('raggruppa in intervalli quel che si tocca', () => {
    assert.deepEqual(intervalliDi([2, 3, 7]), [{ da: 2, a: 3 }, { da: 7, a: 7 }])
  })

  it('ordina e non conta due volte la stessa pagina', () => {
    assert.deepEqual(intervalliDi([5, 4, 4, 3]), [{ da: 3, a: 5 }])
  })

  it('senza pagine non c’è nessun intervallo', () => {
    assert.deepEqual(intervalliDi([]), [])
  })

  it('le dice come si dicono a voce', () => {
    assert.equal(dicePagine([4]), 'pagina 4')
    assert.equal(dicePagine([2, 3]), 'pagine 2–3')
    assert.equal(dicePagine([2, 3, 7]), 'pagine 2–3 e 7')
    assert.equal(dicePagine([1, 4, 9]), 'pagine 1, 4 e 9')
  })
})

describe('dove, sulla pagina, il nome è stato letto', () => {
  // Un nome proposto senza il punto in cui compare è una parola da ricercare a
  // mano sul foglio: su un elenco di trenta righe vuol dire rifare il lavoro
  // che il registro dice di aver fatto.
  const pezzi = [
    { testo: 'Pagella', x: 0.1, y: 0.05, larghezza: 0.2, altezza: 0.03 },
    { testo: 'Allievo:', x: 0.1, y: 0.12, larghezza: 0.12, altezza: 0.02 },
    { testo: 'Rossi', x: 0.24, y: 0.12, larghezza: 0.09, altezza: 0.02 },
    { testo: 'Mario', x: 0.34, y: 0.12, larghezza: 0.09, altezza: 0.02 },
    { testo: 'Bianchi', x: 0.1, y: 0.8, larghezza: 0.1, altezza: 0.02 },
  ]

  it('mette il riquadro attorno al nome, non attorno alla pagina', () => {
    const riquadro = riquadroDelNome(pezzi, 'Rossi Mario')
    assert.ok(riquadro, 'nessun riquadro')
    assert.ok(riquadro.x > 0.2 && riquadro.x < 0.25, `comincia a ${riquadro.x}`)
    assert.ok(riquadro.y > 0.1 && riquadro.y < 0.13, `in alto a ${riquadro.y}`)
    // Le due parole stanno sulla stessa riga: il riquadro le prende tutte e due.
    assert.ok(riquadro.larghezza > 0.18, `troppo stretto: ${riquadro.larghezza}`)
    assert.ok(riquadro.altezza < 0.06, `troppo alto: ${riquadro.altezza}`)
  })

  it('non si porta dietro lo stesso cognome scritto in fondo alla pagina', () => {
    const riquadro = riquadroDelNome(pezzi, 'Bianchi')
    assert.ok(riquadro.y > 0.7, `ha preso la riga sbagliata: ${riquadro.y}`)
  })

  it('senza il nome fra i pezzi non inventa un riquadro', () => {
    assert.equal(riquadroDelNome(pezzi, 'Verdi'), undefined)
    assert.equal(riquadroDelNome([], 'Rossi'), undefined)
  })
})
