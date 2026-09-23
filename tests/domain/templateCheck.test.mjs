// Il controllo dei modelli: che cosa il registro non capirà, detto prima.
//
// Due prove, e sono due mestieri diversi.
//
// La prima è sui casi: una direttiva che non esiste, un `ripeti:` mai chiuso,
// una tabella chiamata con un nome che quel rapporto non produce. Sono le
// righe che il lettore salta in silenzio — è la sua regola, e resta giusta — e
// quindi le sole che qualcuno deve pur dire.
//
// La seconda è sui modelli di serie: passati al controllo con i nomi veri dei
// loro rapporti, non devono dare nemmeno un errore. Vale in due sensi. Se un
// giorno un modello di serie ne desse uno, vorrebbe dire che quel foglio esce
// monco da quando è stato scritto; e se il controllo ne inventasse uno, la
// pagina Modelli segnalerebbe come sbagliato proprio quel che il registro
// stampa da sempre — che è il modo più rapido di far smettere di fidarsi di un
// controllo.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  IMPOSTAZIONI_PREDEFINITE,
  conBase,
  creaAllievo,
  creaAnno,
  creaAttivita,
  creaFascicolo,
  creaLezione,
  creaPiano,
  creaValutazione,
  datiAllievo,
  datiFascicolo,
  datiFotoClasse,
  datiLezione,
  datiMomento,
  datiPiano,
  datiPresenze,
  datiValutazioni,
  formaModello,
  genereDiProva,
  leggiBlocchi,
  leggiModello,
  leggiTesti,
  nomiVuoti,
  normalizzaRegistro,
  verificaModello,
} from '../../dist-tests/domain.mjs'

import { leggiModelli } from '../../tools/templates.mjs'

const errori = (sorgente, noti = nomiVuoti()) =>
  verificaModello(sorgente, noti).filter((problema) => problema.gravita === 'errore')

describe('il controllo di un modello', () => {
  it('non dice niente su un modello che va bene', () => {
    assert.deepEqual(
      verificaModello('titolo: Prova\nestende: _base\n\n[corpo]\nparagrafo: Ciao\n', {
        ...nomiVuoti(),
        modelli: ['_base'],
      }),
      [],
    )
  })

  it('segnala una riga senza i due punti: il lettore la salta', () => {
    const [problema] = errori('titolo: Prova\nquesta riga non ha niente\n')
    assert.equal(problema.riga, 2)
    assert.match(problema.testo, /due punti/)
  })

  it('segnala una direttiva che non esiste', () => {
    const [problema] = errori('[corpo]\nparagrafone: Ciao\n')
    assert.equal(problema.riga, 2)
    assert.match(problema.testo, /direttiva/)
  })

  it('segnala una sezione sconosciuta', () => {
    const [problema] = errori('[intestazioni]\nriga: Ciao\n')
    assert.equal(problema.riga, 1)
    assert.match(problema.testo, /Sezione/)
  })

  it('in intestazione valgono solo «riga» e «immagine»', () => {
    const [problema] = errori('[intestazione]\nparagrafo: Ciao\n')
    assert.equal(problema.riga, 2)
    assert.match(problema.testo, /riga/)
  })

  it('segnala un «ripeti» che nessuno chiude', () => {
    const [problema] = errori('[corpo]\nripeti: allievi\nparagrafo: Ciao\n')
    assert.equal(problema.riga, 2)
    assert.match(problema.testo, /mai chiuso/)
  })

  it('segnala un «fine» che non chiude niente', () => {
    const [problema] = errori('[corpo]\nfine:\n')
    assert.equal(problema.riga, 2)
  })

  it('accetta un giro aperto e chiuso', () => {
    assert.deepEqual(errori('[corpo]\nripeti: allievi\nparagrafo: Ciao\nfine:\n'), [])
  })

  it('segnala le misure scritte male, e lascia stare quelle buone', () => {
    assert.equal(errori('margini: 20 18\n').length, 1)
    assert.equal(errori('margini: 20 18 18 18\n').length, 0)
    assert.equal(errori('formato: a7\n').length, 1)
    assert.equal(errori('formato: a4\n').length, 0)
    assert.equal(errori('formato: 210x297\n').length, 0)
    assert.equal(errori('scala: 12\n').length, 1)
    assert.equal(errori('scala: 1.15\n').length, 0)
    assert.equal(errori('corpo: titolone=17\n').length, 1)
    assert.equal(errori('corpo: titolo=17; testo=9.5\n').length, 0)
  })

  it('segnala un nome che quel rapporto non produce', () => {
    const noti = { ...nomiVuoti(), tabelle: ['voti'], valori: ['media'] }
    assert.equal(errori('[corpo]\ntabella: voti\n', noti).length, 0)
    const [problema] = errori('[corpo]\ntabella: vot\n', noti)
    assert.match(problema.testo, /vot/)
    const [segnaposto] = errori('[corpo]\nparagrafo: {{medie}}\n', noti)
    assert.match(segnaposto.testo, /medie/)
  })

  it('non controlla i nomi quando non li sa', () => {
    assert.deepEqual(errori('[corpo]\ntabella: qualunque\nparagrafo: {{boh}}\n'), [])
  })

  it('lascia passare i segnaposto che ogni rapporto ha', () => {
    assert.deepEqual(
      errori('[corpo]\nparagrafo: {{classe}} {{materia}} {{generato}}\n', {
        ...nomiVuoti(),
        valori: ['media'],
      }),
      [],
    )
  })

  it('dice che il numero di pagina vale solo in testata, senza gridare', () => {
    const problemi = verificaModello('[corpo]\nparagrafo: pagina {{pagina}}\n', {
      ...nomiVuoti(),
      valori: ['media'],
    })
    assert.equal(problemi.length, 1)
    assert.equal(problemi[0].gravita, 'avviso')
    assert.deepEqual(
      verificaModello('[piede]\nriga: pagina {{pagina}} di {{pagine}}\n', {
        ...nomiVuoti(),
        valori: ['media'],
      }),
      [],
    )
  })

  it('segnala un’immagine che non sta in templates/', () => {
    const noti = { ...nomiVuoti(), immagini: ['logo.jpg'] }
    assert.equal(errori('[intestazione]\nimmagine: logo.jpg | altezza 14\n', noti).length, 0)
    assert.equal(errori('[intestazione]\nimmagine: stemma.png | altezza 14\n', noti).length, 1)
    // Un percorso con delle barre è un file dell'anno — il ritratto di un
    // allievo — e non si può controllare da qui: sta dentro il documento.
    assert.equal(errori('[corpo]\nimmagine: documentazione/DIC4a/foto/Rossi.jpg\n', noti).length, 0)
  })

  it('segnala un «estende» che nomina un modello che non c’è', () => {
    const noti = { ...nomiVuoti(), modelli: ['_base', '_stile'] }
    assert.equal(errori('estende: _base\n', noti).length, 0)
    assert.equal(errori('estende: _basi\n', noti).length, 1)
    assert.equal(errori('estende: ../../altro\n', noti).length, 1)
  })

  it('non dice niente sui commenti e sulle righe vuote', () => {
    assert.deepEqual(verificaModello('# un commento\n\n#  un altro\n'), [])
  })
})

// --------------------------------------------- i modelli di serie sono puliti

/** Un registro con dentro un po' di tutto: lo stesso di `modelliRapporti`. */
function registroCompleto () {
  const anno = creaAnno('2026-09-01', '2027-06-30', '2026/27', '2027-01-31')
  anno.id = 'a1'
  anno.semestri[0].id = 's1'

  const anna = { ...creaAllievo('Rossi', 'Anna'), id: 'al-1' }
  const luca = { ...creaAllievo('Bianchi', 'Luca'), id: 'al-2' }

  const piano = { ...creaPiano('cor-1'), id: 'pia-1' }
  piano.obiettivi = ['Saper leggere una fattura']
  piano.attivita = [creaAttivita('Esercizi', 2)]

  const lezione = creaLezione('cor-1', '2026-10-06', '08:00', 90)
  lezione.id = 'lez-1'
  lezione.stato = 'svolta'
  lezione.pianoId = piano.id
  lezione.presenze = [{ allievoId: 'al-1', stati: ['presente', 'assente'] }]
  lezione.argomenti = 'Le percentuali'

  const valutazione = creaValutazione('cor-1', 'Prova di ottobre', undefined, '2026-10-20')
  valutazione.id = 'val-1'
  valutazione.voti = [{ allievoId: 'al-1', valore: 5, assente: false, nota: '' }]

  const fascicolo = creaFascicolo('cl-1')
  fascicolo.id = 'fas-1'

  return normalizzaRegistro({
    anni: [anno],
    annoCorrenteId: 'a1',
    materie: [{ id: 'mat-1', nome: 'Calcolo professionale' }],
    classi: [{ id: 'cl-1', annoId: 'a1', nome: 'DIC2', allievi: [anna, luca] }],
    corsi: [{ id: 'cor-1', classeId: 'cl-1', materiaId: 'mat-1', titolo: 'CP — DIC2' }],
    lezioni: [lezione],
    piani: [piano],
    valutazioni: [valutazione],
    fascicoli: [fascicolo],
    impostazioni: IMPOSTAZIONI_PREDEFINITE,
  })
}

/** I dati di un genere, come li prepara `actions/templates.ts` per l'anteprima. */
function datiDelGenere (registro, genere) {
  const classe = registro.classi[0]
  const corso = registro.corsi[0]
  const semestre = registro.anni[0].semestri[0]
  switch (genere) {
    case 'lezione':
      return datiLezione(registro, registro.lezioni[0], [])
    case 'piano':
      return datiPiano(registro, registro.piani[0])
    case 'valutazioni':
      return datiValutazioni(registro, corso, semestre)
    case 'presenze':
      return datiPresenze(registro, corso, semestre)
    case 'momento':
      return datiMomento(registro, registro.valutazioni[0])
    case 'fascicolo':
      return datiFascicolo(registro, classe)
    case 'foto-classe':
      return datiFotoClasse(registro, classe)
    default:
      return datiAllievo(registro, classe, classe.allievi[0], semestre, corso)
  }
}

describe('i modelli di serie passano il controllo', () => {
  const sorgenti = new Map(leggiModelli().map(({ nome, testo }) => [nome, testo]))
  const registro = registroCompleto()
  const parole = leggiTesti(sorgenti.get('_testi') ?? '')
  const pezzi = leggiBlocchi(sorgenti.get('_blocchi') ?? '')
  const nomiModelli = [...sorgenti.keys()].filter((nome) => !nome.includes('.'))

  for (const [nome, sorgente] of sorgenti) {
    it(`«${nome}» non ha niente che il registro salterebbe`, () => {
      const genere = genereDiProva(nome)
      const dati = genere ? datiDelGenere(registro, genere) : null
      const problemi = verificaModello(sorgente, {
        modelli: nomiModelli,
        immagini: ['logo.jpg'],
        valori: Object.keys(dati?.valori ?? {}),
        elenchi: Object.keys(dati?.elenchi ?? {}),
        tabelle: Object.keys(dati?.tabelle ?? {}),
        grafici: Object.keys(dati?.grafici ?? {}),
        gallerie: Object.keys(dati?.gallerie ?? {}),
        gruppi: Object.keys(dati?.gruppi ?? {}),
        blocchi: Object.keys(pezzi),
        frasi: Object.keys(parole.frasi),
      }, formaModello(nome))
      const gravi = problemi.filter((problema) => problema.gravita === 'errore')
      assert.deepEqual(
        gravi,
        [],
        gravi.map((problema) => `riga ${problema.riga}: ${problema.testo}`).join('\n'),
      )
    })
  }

  it('i blocchi riusabili di `_blocchi.tpl` sono quelli che i modelli chiamano', () => {
    // Un `usa:` che nomina un blocco inesistente sparisce dal foglio in
    // silenzio: qui si controlla che il controllo lo veda davvero.
    const finto = '[corpo]\nusa: blocco-che-non-esiste\n'
    const [problema] = verificaModello(finto, { ...nomiVuoti(), blocchi: Object.keys(pezzi) })
    assert.match(problema.testo, /blocco-che-non-esiste/)
  })

  it('un modello composto sulla sua base resta quello che il registro legge', () => {
    // Non è una prova del controllo: è la rete che dice che i sorgenti letti
    // qui sono gli stessi che l'impaginatore riceve.
    const base = conBase(
      leggiModello('_base', sorgenti.get('_base') ?? ''),
      leggiModello('_stile', sorgenti.get('_stile') ?? ''),
    )
    assert.ok(base.intestazione.length > 0)
    assert.ok(base.stile.formato.larghezza > 0)
  })
})
