// I numeri di telefono dell'anagrafica.
//
// Il registro ha tenuto per anni due sole caselle — il numero della persona in
// formazione e quello del datore di lavoro — e i file scritti allora sono
// ancora quelli che si aprono ogni mattina. Le prove qui dentro guardano tre
// cose: che quei file continuino a dire quel che dicevano, che un numero
// aperto e lasciato vuoto non finisca su un foglio stampato come una parentesi
// senza niente davanti, e che ogni numero esca in forma internazionale senza
// che nessuno debba riscriverlo a mano.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  conPrefissoInternazionale,
  creaTelefono,
  normalizzaRegistro,
  numeroComponibile,
  primoTelefono,
  scriviTelefoni,
  telefoniDi,
} from '../../dist-tests/domain.mjs'

/** Un registro con un allievo solo, scritto come lo scriverebbe un file. */
function conAllievo (allievo) {
  const registro = normalizzaRegistro({
    classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A', allievi: [allievo] }],
  })
  return registro.classi[0].allievi[0]
}

describe('il prefisso internazionale', () => {
  it('lo zero nazionale diventa il prefisso del paese', () => {
    assert.equal(conPrefissoInternazionale('079 000 00 00'), '+41 79 000 00 00')
    assert.equal(conPrefissoInternazionale('091 000 00 00'), '+41 91 000 00 00')
  })

  it('la spaziatura resta quella di chi ha scritto', () => {
    // Un numero si rilegge a gruppi: riscriverlo a modo nostro non lo rende
    // più giusto, lo rende solo diverso da come sta su ogni altro foglio.
    assert.equal(conPrefissoInternazionale('079-000-00-00'), '+41 79-000-00-00')
    assert.equal(conPrefissoInternazionale('0790000000'), '+41 790000000')
  })

  it('lo zero doppio è il «più» scritto da un telefono fisso', () => {
    assert.equal(conPrefissoInternazionale('0041 79 000 00 00'), '+41 79 000 00 00')
    // Un numero italiano resta italiano: in Ticino sono la metà delle aziende,
    // e riscriverlo +41 vorrebbe dire il numero di qualcun altro.
    assert.equal(conPrefissoInternazionale('0039 02 000 0000'), '+39 02 000 0000')
  })

  it('un numero che il prefisso ce l’ha già non si tocca', () => {
    assert.equal(conPrefissoInternazionale('+41 79 000 00 00'), '+41 79 000 00 00')
    assert.equal(conPrefissoInternazionale('+39 02 000 0000'), '+39 02 000 0000')
  })

  it('nove cifre senza niente davanti sono un numero svizzero', () => {
    assert.equal(conPrefissoInternazionale('79 000 00 00'), '+41 79 000 00 00')
  })

  it('quel che non si è capito non si riscrive', () => {
    // Meglio un numero come l'ha scritto una persona che un numero riscritto
    // male da un programma.
    assert.equal(conPrefissoInternazionale('091 000 00 00 int. 12'), '091 000 00 00 int. 12')
    assert.equal(conPrefissoInternazionale('1414'), '1414')
    assert.equal(conPrefissoInternazionale(''), '')
    assert.equal(conPrefissoInternazionale('   '), '')
  })
})

describe('i file di prima', () => {
  it('il numero che stava in «telefono» diventa il suo cellulare', () => {
    const allievo = conAllievo({ id: 'a1', cognome: 'Rossi', nome: 'Maria', telefono: '079 000 00 00' })

    assert.deepEqual(
      allievo.telefoni.map((t) => [t.contatto, t.etichetta, t.numero]),
      [['pif', 'cellulare', '+41 79 000 00 00']],
    )
  })

  it('quello del datore diventa il centralino dell’azienda', () => {
    const allievo = conAllievo({
      id: 'a1',
      cognome: 'Rossi',
      nome: 'Maria',
      telefonoDatore: '091 000 00 00',
    })

    assert.deepEqual(
      allievo.telefoni.map((t) => [t.contatto, t.etichetta]),
      [['datore', 'centralino']],
    )
    assert.equal(primoTelefono(allievo, 'datore'), '+41 91 000 00 00')
  })

  it('i due campi vecchi non sopravvivono alla lettura', () => {
    const allievo = conAllievo({ id: 'a1', cognome: 'Rossi', nome: 'Maria', telefono: '079 000 00 00' })

    assert.equal(allievo.telefono, undefined)
    assert.equal(allievo.telefonoDatore, undefined)
  })

  it('un file toccato da due versioni non raddoppia né perde un numero', () => {
    // L'elenco nuovo c'è già e il campo vecchio pure: quel numero c'è una
    // volta sola — lo si riconosce anche se uno dei due ha lo zero davanti —
    // e l'altro, che nell'elenco non c'era, non si perde.
    const allievo = conAllievo({
      id: 'a1',
      cognome: 'Rossi',
      nome: 'Maria',
      telefono: '079 000 00 00',
      telefonoDatore: '091 000 00 00',
      telefoni: [
        { id: 'tel-1', contatto: 'pif', etichetta: 'cellulare', numero: '+41 79 000 00 00' },
      ],
    })

    assert.deepEqual(
      allievo.telefoni.map((t) => t.numero),
      ['+41 79 000 00 00', '+41 91 000 00 00'],
    )
  })
})

describe('quel che si legge da un elenco scritto a mano', () => {
  it('un contatto o un’etichetta inventati non buttano via il numero', () => {
    // L'etichetta inventata si butta e si rilegge dal numero: un 091 non è
    // un cellulare, e chiamarlo così sarebbe scrivere una cosa falsa al
    // posto di una scritta male.
    const allievo = conAllievo({
      id: 'a1',
      cognome: 'Rossi',
      nome: 'Maria',
      telefoni: [{ id: 'tel-1', contatto: 'nonna', etichetta: 'fax', numero: '091 000 00 00' }],
    })

    assert.deepEqual(
      allievo.telefoni.map((t) => [t.contatto, t.etichetta, t.numero]),
      [['pif', 'casa', '+41 91 000 00 00']],
    )
  })

  it('una riga senza numero non entra', () => {
    const allievo = conAllievo({
      id: 'a1',
      cognome: 'Rossi',
      nome: 'Maria',
      telefoni: [
        { id: 'tel-1', contatto: 'pif', etichetta: 'cellulare', numero: '' },
        { id: 'tel-2', contatto: 'pif', etichetta: 'casa', numero: '091 000 00 00' },
      ],
    })

    assert.deepEqual(allievo.telefoni.map((t) => t.numero), ['+41 91 000 00 00'])
  })

  it('un numero senza id ne riceve uno: due righe non diventano la stessa', () => {
    const allievo = conAllievo({
      id: 'a1',
      cognome: 'Rossi',
      nome: 'Maria',
      telefoni: [
        { contatto: 'pif', etichetta: 'cellulare', numero: '079 000 00 00' },
        { contatto: 'pif', etichetta: 'casa', numero: '091 000 00 00' },
      ],
    })

    const [uno, due] = allievo.telefoni
    assert.ok(uno.id)
    assert.notEqual(uno.id, due.id)
  })
})

describe('leggere i numeri di un contatto', () => {
  const allievo = {
    id: 'a1',
    cognome: 'Rossi',
    nome: 'Maria',
    attivo: true,
    telefoni: [
      creaTelefono('pif', '+41 79 000 00 00', 'cellulare'),
      creaTelefono('pif', '+41 91 000 00 00', 'casa'),
      creaTelefono('datore', '+41 91 111 11 11', 'centralino'),
    ],
  }

  it('sono solo i suoi, e nell’ordine in cui stanno scritti', () => {
    assert.deepEqual(
      telefoniDi(allievo, 'pif').map((t) => t.numero),
      ['+41 79 000 00 00', '+41 91 000 00 00'],
    )
  })

  it('il primo è quello che si prova per primo', () => {
    assert.equal(primoTelefono(allievo, 'pif'), '+41 79 000 00 00')
    assert.equal(primoTelefono(allievo, 'datore'), '+41 91 111 11 11')
  })

  it('chi non ha numeri non dice niente, e non dice «undefined»', () => {
    assert.equal(primoTelefono(allievo, 'rappresentante'), '')
    assert.equal(scriviTelefoni(allievo, 'rappresentante'), '')
  })

  it('sul foglio stampato ci stanno tutti, con il nome fra parentesi', () => {
    assert.equal(
      scriviTelefoni(allievo, 'pif'),
      '+41 79 000 00 00 (cellulare) · +41 91 000 00 00 (casa)',
    )
  })
})


describe('due numeri in una casella sola', () => {
  it('la virgola separa: era il modo di scriverne due quando la casella era una', () => {
    const allievo = conAllievo({
      id: 'a1',
      cognome: 'Rossi',
      nome: 'Maria',
      telefono: '079 000 00 00, 091 000 00 00',
    })

    assert.deepEqual(
      allievo.telefoni.map((t) => [t.etichetta, t.numero]),
      [
        ['cellulare', '+41 79 000 00 00'],
        ['casa', '+41 91 000 00 00'],
      ],
    )
  })

  it('anche tre, e restano nell’ordine in cui erano scritti', () => {
    const allievo = conAllievo({
      id: 'a1',
      cognome: 'Rossi',
      nome: 'Maria',
      telefonoDatore: '091 000 00 00, 091 111 11 11, 079 222 22 22',
    })

    assert.deepEqual(
      allievo.telefoni.map((t) => [t.etichetta, t.numero]),
      [
        ['centralino', '+41 91 000 00 00'],
        ['centralino', '+41 91 111 11 11'],
        ['cellulare', '+41 79 222 22 22'],
      ],
    )
  })

  it('l’interno dietro lo slash non è un secondo numero', () => {
    const allievo = conAllievo({
      id: 'a1',
      cognome: 'Rossi',
      nome: 'Maria',
      telefonoDatore: '091 000 00 00/01',
    })

    assert.deepEqual(allievo.telefoni.map((t) => t.numero), ['+41 91 000 00 00/01'])
  })

  it('separando non si raddoppia quel che era già scritto due volte', () => {
    const allievo = conAllievo({
      id: 'a1',
      cognome: 'Rossi',
      nome: 'Maria',
      telefono: '079 000 00 00, 079 000 00 00',
    })

    assert.deepEqual(allievo.telefoni.map((t) => t.numero), ['+41 79 000 00 00'])
  })

  it('l’etichetta scritta a mano resta al primo, non si copia sugli altri', () => {
    const allievo = conAllievo({
      id: 'a1',
      cognome: 'Rossi',
      nome: 'Maria',
      telefoni: [
        {
          id: 'tel-1',
          contatto: 'rappresentante',
          etichetta: 'lavoro',
          numero: '091 000 00 00, 079 000 00 00',
        },
      ],
    })

    assert.deepEqual(
      allievo.telefoni.map((t) => [t.id, t.etichetta]),
      [
        ['tel-1', 'lavoro'],
        [allievo.telefoni[1].id, 'cellulare'],
      ],
    )
    assert.notEqual(allievo.telefoni[1].id, 'tel-1')
  })
})

// Quel che si consegna al programma che telefona, e a quello che spedisce. Chi
// chiama non compone gli spazi e le barre con cui un numero si legge, e quel
// che non è un numero da comporre non deve diventare un pulsante: premerlo
// vorrebbe dire credere di aver chiamato.
describe('il numero da comporre', () => {
  it('resta il numero, senza i segni con cui si legge', () => {
    assert.equal(numeroComponibile('+41 91 000 00 00'), '+41910000000')
    assert.equal(numeroComponibile('091/000.00.00'), '+41910000000')
  })

  it('lo zero nazionale passa dal prefisso del paese, come quel che si salva', () => {
    assert.equal(numeroComponibile('079 000 00 00'), '+41790000000')
    assert.equal(numeroComponibile('0039 02 000 000'), '+3902000000')
  })

  it('quel che non è un numero da comporre non lo diventa', () => {
    // L'interno non si compone insieme al resto: comporlo darebbe un numero
    // che non è di nessuno.
    assert.equal(numeroComponibile('091 000 00 00 int. 12'), null)
    assert.equal(numeroComponibile('da chiedere in segreteria'), null)
    assert.equal(numeroComponibile('112'), null)
    assert.equal(numeroComponibile(''), null)
  })
})
