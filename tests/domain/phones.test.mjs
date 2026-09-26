// I numeri di telefono dell'anagrafica. I documenti vecchi con le due caselle
// (persona e datore di lavoro) dicono ancora quel che dicevano, un numero
// aperto e vuoto non finisce stampato come una parentesi vuota, e ogni numero
// esce in forma internazionale.

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
  separaNumeri,
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
    // Il numero si lascia a gruppi com'è scritto, col solo prefisso davanti.
    assert.equal(conPrefissoInternazionale('079-000-00-00'), '+41 79-000-00-00')
    assert.equal(conPrefissoInternazionale('0790000000'), '+41 790000000')
  })

  it('lo zero doppio è il «più» scritto da un telefono fisso', () => {
    assert.equal(conPrefissoInternazionale('0041 79 000 00 00'), '+41 79 000 00 00')
    // Un numero italiano resta italiano (+39).
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
    // Quel che non si riconosce resta com'è scritto.
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
    // Elenco nuovo e campo vecchio insieme: il numero comune compare una volta
    // (anche se uno ha lo zero davanti) e l'altro non si perde.
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
    // L'etichetta inventata si butta e si rilegge dal numero: un 091 non è un
    // cellulare.
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

// Il numero da consegnare a chi telefona e a chi spedisce: senza spazi né
// barre, e `null` per quel che non è un numero componibile (niente pulsante).
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
    // L'interno non si compone insieme al resto.
    assert.equal(numeroComponibile('091 000 00 00 int. 12'), null)
    assert.equal(numeroComponibile('da chiedere in segreteria'), null)
    assert.equal(numeroComponibile('112'), null)
    assert.equal(numeroComponibile(''), null)
  })
})

describe('i telefoni in una casella sola', () => {
  it('due numeri separati da un trattino fra spazi sono due numeri', () => {
    assert.deepEqual(separaNumeri('079 123 45 67 - 079 765 43 21'), ['079 123 45 67', '079 765 43 21'])
    assert.deepEqual(separaNumeri('091-123-45-67'), ['091-123-45-67'])
    assert.deepEqual(separaNumeri('091 123 45 67 - 12'), ['091 123 45 67 - 12'])
  })
})
