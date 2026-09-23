// Dove finisce ogni documento che il registro stampa, e con che nome.
//
// Il punto di queste prove è che il posto sia uno. Lo compone chi scrive il
// file e lo ricompone la pagina Documenti per sapere se quel file c'è già: se
// le due strade si scostassero di un trattino, la pagina direbbe «da fare» su
// fogli che stanno nella cartella da mesi — e nessuno lo vedrebbe, perché un
// documento che c'è e uno che manca si somigliano dal lato dello schermo.
//
// L'altra cosa che si guarda qui è il PDF e il CSV: sono lo stesso documento in
// due forme, e devono finire uno accanto all'altro con lo stesso nome.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  lessico,
  collocazioneDi,
  creaLezione,
  creaPiano,
  creaValutazione,
  percorsoDi,
  precedentiDi,
  radiceDi,
} from '../../dist-tests/domain.mjs'
import { ore, scuolaMinima } from '../helpers/register.mjs'

describe('il posto dei documenti del corso', () => {
  it('le presenze stanno sotto la materia, nella cartella della classe', () => {
    const { registro, corso } = scuolaMinima()
    const dove = collocazioneDi(registro, 'presenze', corso.id)

    assert.equal(
      percorsoDi(dove),
      `esportazioni/Matematica/I MEC A/classe/${dove.anno.replace('/', '-')}_I MEC A_Matematica_Presenze_anno intero.pdf`,
    )
  })

  it('il periodo scelto entra nel nome: due semestri sono due file', () => {
    const { registro, corso, anno } = scuolaMinima()
    const primo = anno.semestri[0]
    const secondo = anno.semestri[1]

    const uno = percorsoDi(collocazioneDi(registro, 'presenze', corso.id, { semestreId: primo.id }))
    const due = percorsoDi(
      collocazioneDi(registro, 'presenze', corso.id, { semestreId: secondo.id }),
    )

    assert.match(uno, new RegExp(`_Presenze_${primo.etichetta}\\.pdf$`))
    assert.notEqual(uno, due, 'il secondo semestre non copre il primo')
  })

  it('il CSV sta accanto al PDF, con lo stesso nome', () => {
    const { registro, corso } = scuolaMinima()
    const dove = collocazioneDi(registro, 'valutazioni', corso.id)

    assert.equal(percorsoDi(dove, 'csv'), percorsoDi(dove).replace(/\.pdf$/, '.csv'))
  })

  it('il verbale porta la data dell’ora, e il testo gli sta accanto', () => {
    const { registro, corso } = scuolaMinima()
    const [lezione] = ore(registro, corso, ['2026-09-07'])
    const dove = collocazioneDi(registro, 'lezione', lezione.id)

    assert.equal(
      percorsoDi(dove),
      `esportazioni/Matematica/I MEC A/classe/${dove.anno.replace('/', '-')}_I MEC A_Matematica_Verbali_260907 08.20.pdf`,
    )
    assert.equal(percorsoDi(dove, 'md'), percorsoDi(dove).replace(/\.pdf$/, '.md'))
  })

  it('una prova si distingue per titolo e data: due «Test 1» non si coprono', () => {
    const { registro, corso } = scuolaMinima()
    const settembre = creaValutazione(corso.id, 'Test 1', undefined, '2026-09-21')
    const gennaio = creaValutazione(corso.id, 'Test 1', undefined, '2027-01-18')
    registro.valutazioni.push(settembre, gennaio)

    const uno = percorsoDi(collocazioneDi(registro, 'momento', settembre.id))
    const due = percorsoDi(collocazioneDi(registro, 'momento', gennaio.id))

    assert.match(uno, /_Prove_Test 1_260921\.pdf$/)
    assert.notEqual(uno, due)
  })

  it('il piano prende il nome che non si riscrive: la data della prima ora', () => {
    const { registro, corso } = scuolaMinima()
    const piano = creaPiano(corso.id)
    registro.piani.push(piano)
    const lezione = creaLezione(corso.id, '2026-10-05', '08:20', 45)
    lezione.pianoId = piano.id
    registro.lezioni.push(lezione)

    assert.match(
      percorsoDi(collocazioneDi(registro, 'piano', piano.id)),
      /_Piani_Piano 261005 08\.20\.pdf$/,
    )
  })
})

describe('il posto delle schede personali', () => {
  it('vanno nella cartella della persona, e portano il suo nome', () => {
    const { registro, rossi } = scuolaMinima()
    const dove = collocazioneDi(registro, 'allievo', rossi.id)

    assert.equal(
      percorsoDi(dove),
      `esportazioni/Matematica/I MEC A/allievi/Rossi Maria/${dove.anno.replace('/', '-')}_I MEC A_Matematica_${lessico.DOCUMENTO_SCHEDE}_Rossi Maria_anno intero.pdf`,
    )
  })

  it('con un corso solo la scheda è di quel corso, anche senza dirlo', () => {
    const { registro, corso, rossi } = scuolaMinima()
    const detto = collocazioneDi(registro, 'allievo', rossi.id, { corsoId: corso.id })
    const taciuto = collocazioneDi(registro, 'allievo', rossi.id)

    assert.equal(percorsoDi(taciuto), percorsoDi(detto))
  })
})

describe('i documenti datati', () => {
  it('il fascicolo porta il giorno in cui è stato fatto', () => {
    const { registro, classe } = scuolaMinima()
    const dove = collocazioneDi(registro, 'fascicolo', classe.id, { giorno: '2026-09-12' })

    assert.equal(dove.datato, true)
    assert.equal(
      percorsoDi(dove),
      `esportazioni/docente-di-classe/I MEC A/classe/${dove.anno.replace('/', '-')}_I MEC A_docente-di-classe_Fascicolo_260912.pdf`,
    )
  })

  // Il prefisso è quel che permette di riconoscere la copia di ieri: cercando
  // il nome esatto, un fascicolo stampato una settimana fa risulterebbe da
  // fare, e chi guarda la pagina lo rifarebbe senza motivo.
  it('la radice è il nome senza il giorno, e regge le copie di ieri', () => {
    const { registro, classe } = scuolaMinima()
    const ieri = collocazioneDi(registro, 'fascicolo', classe.id, { giorno: '2026-09-11' })
    const oggi = collocazioneDi(registro, 'fascicolo', classe.id, { giorno: '2026-09-12' })

    assert.equal(radiceDi(oggi), `esportazioni/docente-di-classe/I MEC A/classe/${oggi.anno.replace('/', '-')}_I MEC A_docente-di-classe_Fascicolo`)
    assert.ok(percorsoDi(ieri).startsWith(radiceDi(oggi)))
    assert.ok(percorsoDi(oggi).startsWith(radiceDi(oggi)))
  })
})

describe('quel che non c’è', () => {
  it('non ha un posto: niente nome inventato per un id che non esiste', () => {
    const { registro } = scuolaMinima()

    assert.equal(collocazioneDi(registro, 'presenze', 'co-mai-visto'), null)
    assert.equal(collocazioneDi(registro, 'allievo', 'al-mai-visto'), null)
    assert.equal(collocazioneDi(registro, 'lezione', 'le-mai-vista'), null)
  })
})

describe('nome univoco delle schede PiF', () => {
  it('riconosce i vecchi nomi solo nello stesso contesto', () => {
    const { registro, corso, classe } = scuolaMinima()
    const posto = collocazioneDi(registro, 'allievo', classe.allievi[0].id, { corsoId: corso.id })
    assert.equal(posto.documento, 'Scheda PiF')
    const prima = precedentiDi(posto)
    assert.equal(prima.length, 3)
    assert.ok(prima.every((p) => p.startsWith(percorsoDi(posto).slice(0, percorsoDi(posto).lastIndexOf('/') + 1))))
    assert.ok(prima.every((p) => p.endsWith('_anno intero.pdf')))
    assert.ok(!prima.includes(percorsoDi(posto)))
    assert.deepEqual(precedentiDi(collocazioneDi(registro, 'presenze', corso.id)), [])
  })
})

it('due lezioni nello stesso giorno non si sovrascrivono', () => {
  const { registro, corso } = scuolaMinima()
  const a = creaLezione(corso.id, '2026-09-14', '08:00', 45)
  const b = creaLezione(corso.id, '2026-09-14', '10:00', 45)
  registro.lezioni.push(a, b)
  const uno = percorsoDi(collocazioneDi(registro, 'lezione', a.id))
  const due = percorsoDi(collocazioneDi(registro, 'lezione', b.id))
  assert.notEqual(uno.split('/').pop(), due.split('/').pop())
  assert.match(uno, /2026.*2027_I MEC A_Matematica_/)
  // A distinguerle è l'ora, che è anche quel che chi cerca il foglio ha in
  // mente: prima era l'identificatore della lezione, che non lo sapeva nessuno.
  assert.match(uno, /_Verbali_260914 08\.00\.pdf$/)
  assert.match(due, /_Verbali_260914 10\.00\.pdf$/)
})

// Il nome di un file si legge: lo si cerca nella cartella, lo si allega a una
// mail, lo si detta al telefono. Gli identificatori interni — `lez-m3k9x2-a7f1`
// — ci stavano dentro per tenere distinti due documenti, e distinguevano
// davvero, ma chi guardava non poteva farci niente.
describe('nessuna sigla interna nei nomi', () => {
  it('il nome non porta l’identificatore di lezione, corso o semestre', () => {
    const { registro, corso, anno } = scuolaMinima()
    const [lezione] = ore(registro, corso, ['2026-09-07'])

    for (const percorso of [
      percorsoDi(collocazioneDi(registro, 'lezione', lezione.id)),
      percorsoDi(collocazioneDi(registro, 'presenze', corso.id, { semestreId: anno.semestri[0].id })),
    ]) {
      for (const sigla of [lezione.id, corso.id, anno.semestri[0].id]) {
        assert.ok(!percorso.includes(sigla), `${percorso} contiene ${sigla}`)
      }
      assert.ok(!/[a-z]{3}-[0-9a-z]{5,}-[0-9a-z]{4}/.test(percorso), percorso)
    }
  })
})

describe('quel che si chiamerebbe uguale prende un numero', () => {
  it('due prove con lo stesso titolo nello stesso giorno restano due file', () => {
    const { registro, corso } = scuolaMinima()
    const scritto = creaValutazione(corso.id, 'Test 1', undefined, '2026-09-21')
    const orale = creaValutazione(corso.id, 'Test 1', undefined, '2026-09-21')
    registro.valutazioni.push(scritto, orale)

    assert.match(percorsoDi(collocazioneDi(registro, 'momento', scritto.id)), /_Prove_Test 1_260921\.pdf$/)
    assert.match(percorsoDi(collocazioneDi(registro, 'momento', orale.id)), /_Prove_Test 1 \(2\)_260921\.pdf$/)
  })

  it('due bozze di piano nate lo stesso giorno non finiscono nella stessa cartella', () => {
    const { registro, corso } = scuolaMinima()
    const prima = creaPiano(corso.id)
    const seconda = creaPiano(corso.id)
    registro.piani.push(prima, seconda)

    const uno = percorsoDi(collocazioneDi(registro, 'piano', prima.id))
    const due = percorsoDi(collocazioneDi(registro, 'piano', seconda.id))
    assert.match(uno, /_Piani_Piano bozza \d{6}\.pdf$/)
    assert.match(due, /_Piani_Piano bozza \d{6} \(2\)\.pdf$/)
  })
})
