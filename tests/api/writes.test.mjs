// Le scritture: il canale delle domande le rifiuta, e il contratto le filtra
// prima di toccare l'archivio.
//
// **Il canale.** Il pannello serve le `Domanda` fuori dalla coda delle
// scritture; è sicuro solo se da lì non si può scrivere. `PannelloRegistro`
// non si costruisce senza Electron, quindi si legge `src/panels/panel.ts` come
// sorgente (come fa `bridge.test.mjs`): il confronto sul `genere`, il rifiuto
// **prima** della chiamata al nucleo, e la condizione applicata a tutte le
// procedure. In più si guarda che ogni procedura dichiari un `genere` valido.
//
// **Il contratto.** Sette scritture, una per area, con un ingresso buono e uno
// storto: il rifiuto arriva prima di toccare l'archivio, come vuole `chiama()`.
// La copertura campo per campo è di `coverage.test.mjs`. Sono scelte fra quelle
// che non aprono dialoghi né vanno in rete.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-scritture-')

let api
let archivio
let classe
let rossi
let corso
let consegna
let smistamento
/** La colonna del check del corso: la casella del caso «check» della tabella. */
const COLONNA = 'clc-prova-0001'

const PANNELLO = readFileSync(
  fileURLToPath(new URL('../../src/panels/panel.ts', import.meta.url)),
  'utf8',
)

/**
 * Il corpo di un metodo, contando le graffe: il corpo contiene oggetti e
 * `${...}`, che un'espressione regolare taglierebbe alla prima graffa chiusa.
 */
function corpoDi (sorgente, firma) {
  const inizio = sorgente.indexOf(firma)
  assert.ok(inizio > 0, `«${firma}» non si trova più in src/panels/panel.ts`)
  const apertura = sorgente.indexOf('{', inizio)
  assert.ok(apertura > 0, `«${firma}» non ha un corpo`)
  let profondita = 0
  let i = apertura
  for (; i < sorgente.length; i++) {
    if (sorgente[i] === '{') profondita++
    else if (sorgente[i] === '}') {
      profondita--
      if (profondita === 0) break
    }
  }
  assert.ok(i < sorgente.length, `le graffe di «${firma}» non si chiudono`)
  return sorgente.slice(apertura + 1, i)
}

before(async () => {
  // PDF automatici fermi: qui si prova il contratto.
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, pdfAutomatici: 'mai' }))

  const {
    creaAllievo, creaClasse, creaConsegna, creaCorso, creaLezione,
    creaMateria, creaSmistamento,
  } = api

  const annoId = archivio.registro.anni[0].id

  classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  classe.allievi.push(rossi)
  const materia = creaMateria('Matematica')
  corso = creaCorso(classe.id, materia.id, 'I MEC A — Matematica')
  const lezione = creaLezione(corso.id, '2026-09-01', '08:20', 90)
  consegna = creaConsegna(corso.id, 'Esercizi 1-10', '2026-09-01')
  // Un PDF in quarantena che non esiste su disco: `smistamento.pdf.attribuisci`
  // non ne guarda i byte.
  smistamento = creaSmistamento('archivio/quarantena/prova.pdf', 'prova.pdf', 3)

  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
    r.lezioni.push(lezione)
    r.consegne.push(consegna)
    r.smistamenti.push(smistamento)
    r.check.push({
      id: 'chk-prova-0001',
      corsoId: corso.id,
      colonne: [{ id: COLONNA, titolo: 'Modulo firmato' }],
      spunte: [],
      creatoIl: '2026-09-01T08:00:00.000Z',
      aggiornatoIl: '2026-09-01T08:00:00.000Z',
    })
  }, ['classi', 'corsi', 'lezioni', 'consegne', 'check', 'smistamenti', 'registro'])
})

after(() => smonta(radice, archivio))

// ------------------------------------------- il canale delle domande, la regola

describe('rispondiDomanda, letto dal sorgente', () => {
  it('cerca la procedura per nome e guarda il suo genere', () => {
    const corpo = corpoDi(PANNELLO, 'private async rispondiDomanda')
    // La stessa funzione del nucleo, non un elenco di nomi del pannello che
    // resterebbe indietro.
    assert.match(corpo, /procedura\(\s*domanda\.procedura\s*\)/)
    assert.match(corpo, /genere/)
  })

  it('chi non è dichiarato di sola lettura esce con un rifiuto, prima del nucleo', () => {
    const corpo = corpoDi(PANNELLO, 'private async rispondiDomanda')
    const guardia = /genere\s*(!==|===)\s*'([a-z]+)'/.exec(corpo)
    assert.ok(guardia, 'nessun confronto sul genere: la guardia è sparita')

    const dove = corpo.indexOf(guardia[0])
    const rifiuto = corpo.indexOf('ok: false', dove)
    const ritorno = corpo.indexOf('return', dove)
    const nucleo = corpo.indexOf('chiama(')

    assert.ok(nucleo > 0, 'rispondiDomanda non chiama più il nucleo')
    assert.ok(rifiuto > dove && rifiuto < nucleo, 'la guardia non manda indietro un rifiuto')
    // Il `return` conta: senza, la guardia rifiuterebbe **e poi** eseguirebbe.
    assert.ok(ritorno > dove && ritorno < nucleo, 'la guardia non esce prima di eseguire')
  })

  it('la condizione letta dal sorgente rifiuta tutte e 168 le scritture', () => {
    // Operatore e valore del confronto si tirano fuori dal sorgente e si applicano
    // all'elenco vero: un `=== 'scrittura'` lascerebbe passare un genere nuovo.
    const corpo = corpoDi(PANNELLO, 'private async rispondiDomanda')
    const [, operatore, atteso] = /genere\s*(!==|===)\s*'([a-z]+)'/.exec(corpo)
    const rifiuterebbe = (p) =>
      operatore === '!==' ? p.genere !== atteso : p.genere === atteso

    const tutte = api.procedure()
    const scritture = tutte.filter((p) => p.genere !== 'lettura')
    const letture = tutte.filter((p) => p.genere === 'lettura')

    // Le letture del nucleo, contate: cambiare il numero è una scelta da fare qui.
    assert.equal(letture.length, 34, `letture: ${letture.length}`)
    // Le scritture, contate. Comprendono gesti che non scrivono l'archivio (zoom,
    // dialoghi, aggiornamenti): il genere dice chi può chiamarli da fuori, non se
    // l'archivio cambia.
    assert.equal(scritture.length, 168, `scritture: ${scritture.length}`)

    const passate = scritture.filter((p) => !rifiuterebbe(p)).map((p) => p.nome)
    assert.deepEqual(passate, [], `scritture che una domanda farebbe passare:\n${passate.join('\n')}`)

    // L'altra metà: una guardia che rifiutasse tutto sarebbe inutile.
    const bloccate = letture.filter((p) => rifiuterebbe(p)).map((p) => p.nome)
    assert.deepEqual(bloccate, [], `letture che una domanda non farebbe passare:\n${bloccate.join('\n')}`)
  })

  it('una domanda non entra nella coda delle scritture', () => {
    // Le domande saltano `this.coda`: si prova anche il salto, non solo la guardia.
    const corpo = corpoDi(PANNELLO, 'private gestisci (messaggio: unknown)')
    const smista = corpo.search(/typeof\s+busta\.procedura\s*===\s*'string'/)
    assert.ok(smista > 0, 'il pannello non riconosce più una domanda dal campo «procedura»')
    const versoLeDomande = corpo.indexOf('rispondiDomanda', smista)
    const ritorno = corpo.indexOf('return', versoLeDomande)
    const coda = corpo.indexOf('this.coda')
    assert.ok(versoLeDomande > smista, 'la domanda non va più a rispondiDomanda')
    assert.ok(coda > 0, 'la coda delle scritture non c’è più')
    assert.ok(ritorno > 0 && ritorno < coda, 'una domanda arriva fino alla coda delle scritture')
  })

  it('ogni procedura dichiara un genere che quella condizione sa giudicare', () => {
    // Un `genere` scritto storto (maiuscola, spazio) il canale non lo
    // riconoscerebbe come scrittura, e il compilatore non guarda i JSON.
    const storte = api.procedure()
      .filter((p) => p.genere !== 'lettura' && p.genere !== 'scrittura')
      .map((p) => `${p.nome}: «${String(p.genere)}»`)
    assert.deepEqual(storte, [], storte.join('\n'))
  })
})

// --------------------------------------------- sette scritture, una per area

describe('sette scritture: l’ingresso buono passa, quello storto non scrive', () => {
  /**
   * Le sette, una per file di `src/api/procedures/`. `storto` è un errore
   * plausibile di chi compone la chiamata da fuori, mai una struttura assurda.
   */
  const sette = () => [
    {
      area: 'registro',
      nome: 'materie.salva',
      buono: () => ({ materia: api.creaMateria('Storia') }),
      storto: { materia: 'Storia' },
      campo: 'materia',
      scrive: true,
    },
    {
      area: 'piani',
      nome: 'piani.salva',
      buono: () => ({ piano: api.creaPiano(corso.id) }),
      // Un piano senza corso: lo rifiuta `validaPiano`, che lo schema `entita`
      // lascia passare perché la regola stia in un posto solo.
      storto: { piano: { id: 'pia-inventato-0001', obiettivi: [], attivita: [] } },
      campo: 'piano',
      scrive: true,
    },
    {
      area: 'consegne',
      nome: 'consegne.spunta',
      buono: () => ({ consegnaId: consegna.id, chi: rossi.id, fatta: true }),
      // Un booleano arrivato come testo da un `<input>`.
      storto: { consegnaId: consegna.id, chi: rossi.id, fatta: 'sì' },
      campo: 'fatta',
      scrive: true,
    },
    {
      area: 'check',
      nome: 'check.spunta',
      buono: () => ({ corsoId: corso.id, allievoId: rossi.id, colonnaId: COLONNA, fatta: true }),
      // Il giorno scritto come lo mostra la pagina, non come lo chiede il contratto.
      storto: {
        corsoId: corso.id, allievoId: rossi.id, colonnaId: COLONNA, fatta: true,
        data: '24/09/2026',
      },
      campo: 'data',
      scrive: true,
    },
    {
      area: 'docenteClasse',
      nome: 'classe.recapiti.salva',
      buono: () => ({
        classeId: classe.id,
        recapito: api.creaRecapito('Segreteria', 'segreteria@scuola.it'),
      }),
      storto: {
        classeId: classe.id,
        recapito: api.creaRecapito('Segreteria', 'segreteria'),
      },
      campo: 'recapito',
      scrive: true,
    },
    {
      area: 'smistamento',
      nome: 'smistamento.pdf.attribuisci',
      buono: () => ({ smistamentoId: smistamento.id, classeId: classe.id }),
      // Un id vuoto: uno inventato sarebbe «non-trovato», dopo la dogana.
      storto: { smistamentoId: smistamento.id, classeId: '' },
      campo: 'classeId',
      scrive: true,
    },
    {
      area: 'sistema',
      nome: 'programma.salva',
      buono: () => ({ chiave: 'registroDocenti.proiezione.schermoIntero', valore: true }),
      // La chiave senza prefisso, copiata dalla pagina invece che dal manifesto.
      storto: { chiave: 'proiezione.schermoIntero', valore: true },
      campo: 'chiave',
      // `collezioni: []`: `impostazioni.json` sta in `userData`, non nel documento
      // d'anno, e la revisione non si muove nemmeno quando va bene.
      scrive: false,
    },
  ]

  it('le sette stanno in sette aree diverse, e sono tutte scritture', () => {
    const aree = sette().map((c) => c.area)
    assert.equal(new Set(aree).size, 7, `aree ripetute: ${aree.join(', ')}`)
    for (const caso of sette()) {
      const p = api.procedura(caso.nome)
      assert.ok(p, `«${caso.nome}» non è nell’elenco`)
      assert.equal(p.genere, 'scrittura', `«${caso.nome}» non è una scrittura`)
    }
  })

  for (const caso of [
    'registro', 'piani', 'consegne', 'check', 'docenteClasse', 'smistamento', 'sistema',
  ]) {
    it(`${caso}: l’ingresso buono passa`, async () => {
      const { nome, buono, scrive } = sette().find((c) => c.area === caso)
      const prima = archivio.revisione
      const esito = await api.chiama(archivio, nome, buono())
      assert.equal(esito.ok, true, `${nome}: ${JSON.stringify(esito).slice(0, 300)}`)
      assert.equal(esito.procedura, nome)
      assert.equal(typeof esito.dati.revisione, 'number')
      if (scrive) {
        assert.ok(
          archivio.revisione > prima,
          `${nome} ha risposto «fatto» senza scrivere niente`,
        )
        // La busta riporta la revisione dopo la scrittura.
        assert.equal(esito.dati.revisione, archivio.revisione)
      } else {
        assert.equal(archivio.revisione, prima, `${nome} dichiara collezioni: [] e scrive`)
      }
    })

    it(`${caso}: l’ingresso storto è «ingresso-non-valido» e non scrive`, async () => {
      const { nome, storto, campo } = sette().find((c) => c.area === caso)
      const prima = archivio.revisione
      const esito = await api.chiama(archivio, nome, storto)
      assert.equal(esito.ok, false, `${nome} ha accettato l’ingresso storto`)
      assert.equal(esito.codice, 'ingresso-non-valido', JSON.stringify(esito))
      // Il campo che non va, perché l'interfaccia accenda la casella giusta.
      assert.equal(esito.campo, campo, JSON.stringify(esito))
      assert.ok(esito.messaggi.length > 0, 'un rifiuto senza una frase da mostrare')
      assert.equal(archivio.revisione, prima, `${nome} ha scritto e poi ha detto di no`)
    })
  }

  it('rifiutare non lascia niente dietro di sé, nemmeno a metà', async () => {
    // Tutte e sette di fila, un conto solo in fondo: l'archivio conta le modifiche,
    // quindi anche una scrittura poi annullata si vedrebbe.
    const prima = archivio.revisione
    for (const { nome, storto } of sette()) {
      const esito = await api.chiama(archivio, nome, storto)
      assert.equal(esito.ok, false, nome)
    }
    assert.equal(archivio.revisione, prima)
  })
})

describe('impostazioni.salva non perde il calendario ICS', () => {
  it('i calendari e le regole restano dopo un ritocco dalla pagina Impostazioni', async () => {
    // La pagina rimanda le impostazioni intere a ogni ritocco: `calendario` è nello
    // schema, o `oggetto()` lo scarterebbe cancellando il calendario della scuola.
    const calendario = {
      calendari: [{
        id: 'ics-prova-0001',
        nome: 'Orario',
        origine: percorso.join(tmpdir(), 'orario.ics'),
        copiatoIl: '2026-09-01T08:00:00.000Z',
      }],
      regole: [{ id: 'rcl-prova-0001', testo: 'DIC4a CP', corsoId: null }],
    }
    const impostazioni = { ...archivio.registro.impostazioni, calendario }
    const primo = await api.chiama(archivio, 'impostazioni.salva', { impostazioni })
    assert.equal(primo.ok, true, JSON.stringify(primo))
    assert.deepEqual(archivio.registro.impostazioni.calendario, calendario)

    const ritocco = { ...archivio.registro.impostazioni, oraInizioGiornata: '07:45' }
    const secondo = await api.chiama(archivio, 'impostazioni.salva', { impostazioni: ritocco })
    assert.equal(secondo.ok, true, JSON.stringify(secondo))
    assert.equal(archivio.registro.impostazioni.oraInizioGiornata, '07:45')
    assert.deepEqual(archivio.registro.impostazioni.calendario, calendario)
  })
})

describe('le carte intestate stanno nel documento, e ogni corso ne ha una', () => {
  // Scuola, altezza del logo, corsi e chi firma passano da `impostazioni.salva`;
  // i loghi sono file e passano da `intestazione.logo` e `intestazione.togliLogo`.
  // Il dialogo di `intestazione.logo` aspetta una persona: qui si prova solo che
  // il nucleo lo conosca.
  const LOGO = 'intestazione/car-prima.png'
  const senzaIntestazione = () => {
    const { intestazione: _carta, ...resto } = archivio.registro.impostazioni
    return resto
  }
  const carte = () => archivio.registro.impostazioni.intestazione.carte
  const corsi = () => archivio.registro.corsi.map((c) => c.id)

  it('la matrice è completa già alla lettura: ogni corso su una carta sola', () => {
    const nominati = carte().flatMap((c) => c.corsi)
    assert.deepEqual([...nominati].sort(), [...corsi()].sort())
  })

  it('impostazioni.salva scrive carte, corsi e chi firma, e tiene i loghi', async () => {
    const primaId = carte()[0].id
    archivio.modifica((r) => { r.impostazioni.intestazione.carte[0].logo = LOGO }, ['registro'])
    const [uno, ...altri] = corsi()
    const esito = await api.chiama(archivio, 'impostazioni.salva', {
      impostazioni: {
        ...senzaIntestazione(),
        intestazione: {
          docente: 'M. Bianchi',
          firma: '<p>MB</p>',
          carte: [
            // Il logo mandato di qui non passa: resta quello del documento.
            { id: primaId, sede: 'CPT Trevano', altezzaLogo: 18, corsi: altri, logo: 'altro.png' },
            { id: 'car-serale', sede: 'Scuola serale', altezzaLogo: 14, corsi: [uno] },
          ],
        },
      },
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const intestazione = archivio.registro.impostazioni.intestazione
    assert.equal(intestazione.docente, 'M. Bianchi')
    assert.equal(intestazione.firma, '<p>MB</p>')
    assert.equal(intestazione.carte[0].sede, 'CPT Trevano')
    assert.equal(intestazione.carte[0].altezzaLogo, 18)
    assert.equal(intestazione.carte[0].logo, LOGO)
    assert.deepEqual(intestazione.carte[1].corsi, [uno])
  })

  it('un corso che la pagina non manda finisce sulla prima carta', async () => {
    const intestazione = structuredClone(archivio.registro.impostazioni.intestazione)
    const tolto = intestazione.carte[1].corsi[0]
    intestazione.carte[1].corsi = []
    const esito = await api.chiama(archivio, 'impostazioni.salva', {
      impostazioni: { ...senzaIntestazione(), intestazione },
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.ok(carte()[0].corsi.includes(tolto), 'il corso è rimasto senza carta')
  })

  it('impostazioni.salva senza intestazione la lascia com’era', async () => {
    const prima = structuredClone(archivio.registro.impostazioni.intestazione)
    const esito = await api.chiama(archivio, 'impostazioni.salva', {
      impostazioni: { ...senzaIntestazione(), oraInizioGiornata: '07:50' },
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(archivio.registro.impostazioni.oraInizioGiornata, '07:50')
    assert.deepEqual(archivio.registro.impostazioni.intestazione, prima)
  })

  it('intestazione.togliLogo toglie il logo di quella carta, e la seconda volta non cambia niente', async () => {
    const cartaId = carte()[0].id
    const esito = await api.chiama(archivio, 'intestazione.togliLogo', { cartaId })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(carte()[0].logo, undefined)
    // La scuola resta: si toglie il logo, non la carta intestata.
    assert.equal(carte()[0].sede, 'CPT Trevano')

    const prima = archivio.revisione
    const ancora = await api.chiama(archivio, 'intestazione.togliLogo', { cartaId })
    assert.equal(ancora.ok, true, JSON.stringify(ancora))
    assert.equal(archivio.revisione, prima, 'senza logo non c’è niente da scrivere')
  })

  it('intestazione.togliLogo su una carta che non c’è si rifiuta', async () => {
    const esito = await api.chiama(archivio, 'intestazione.togliLogo', { cartaId: 'car-inesistente' })
    assert.equal(esito.ok, false)
  })

  it('togliendo una carta, un logo ancora usato da un’altra non va nel cestino', async () => {
    const LOGO_COMUNE = 'intestazione/comune.png'
    archivio.modifica((r) => {
      r.impostazioni.intestazione.carte = [
        { id: 'car-a', sede: 'A', altezzaLogo: 14, corsi: [], logo: LOGO_COMUNE },
        { id: 'car-b', sede: 'B', altezzaLogo: 14, corsi: [], logo: LOGO_COMUNE },
      ]
    }, ['registro'])
    const intestazione = structuredClone(archivio.registro.impostazioni.intestazione)
    intestazione.carte = intestazione.carte.filter((c) => c.id === 'car-a')
    const esito = await api.chiama(archivio, 'impostazioni.salva', {
      impostazioni: { ...senzaIntestazione(), intestazione },
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(carte()[0].logo, LOGO_COMUNE)
  })

  it('intestazione.logo è una scrittura del registro, e non si ritenta da sola', () => {
    const logo = api.TUTTE.find((p) => p.nome === 'intestazione.logo')
    assert.ok(logo, 'il nucleo non conosce intestazione.logo')
    assert.equal(logo.genere, 'scrittura')
    assert.equal(logo.idempotente, false)
    assert.deepEqual(logo.collezioni, ['registro'])
  })
})

describe('le regole del calendario ICS si gestiscono dalle impostazioni del documento', () => {
  // Le regole della scheda «Calendari ICS» (`ui/views/settings/icsCalendar.ts`)
  // passano da `impostazioni.salva` col campo `calendario` intero, o senza per
  // toglierlo. I calendari hanno procedure loro (`calendar.test.mjs`).
  const CALENDARI = [{ id: 'ics-prova-0002', nome: 'Sede', origine: 'https://esempio.invalid/orario.ics' }]
  const salva = (calendario) => {
    const { calendario: _vecchio, ...resto } = archivio.registro.impostazioni
    const impostazioni = calendario ? { ...resto, calendario } : resto
    return api.chiama(archivio, 'impostazioni.salva', { impostazioni })
  }

  it('una regola cambia testo e corso, e un’altra se ne va', async () => {
    const corsoId = archivio.registro.corsi[0].id
    await salva({
      calendari: CALENDARI,
      regole: [
        { id: 'rgc-prova-0001', testo: 'DIC4a CP', corsoId: null },
        { id: 'rgc-prova-0002', testo: 'Riunione', corsoId: null },
      ],
    })
    const esito = await salva({
      calendari: CALENDARI,
      regole: [{ id: 'rgc-prova-0001', testo: 'DIC4a Calcolo', corsoId }],
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(archivio.registro.impostazioni.calendario.regole, [
      { id: 'rgc-prova-0001', testo: 'DIC4a Calcolo', corsoId },
    ])
  })

  it('le regole restano anche senza calendari', async () => {
    const regole = archivio.registro.impostazioni.calendario.regole
    const esito = await salva({ calendari: [], regole })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(archivio.registro.impostazioni.calendario.calendari, [])
    assert.deepEqual(archivio.registro.impostazioni.calendario.regole, regole)
  })

  it('senza il campo il documento torna senza calendario', async () => {
    const esito = await salva(null)
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(archivio.registro.impostazioni.calendario, undefined)
  })
})

describe('il check: il quando di una spunta, e chi può averne una', () => {
  // Un corso con la sua lista e un'altra classe con corso e ora: i due posti da
  // cui una spunta non deve arrivare.
  let corsoCheck
  let ora
  let verdi
  let altroCorso
  let oraAltrove
  let estraneo

  const lista = () => archivio.registro.check.find((c) => c.corsoId === corsoCheck.id)
  const colonna = (titolo) => lista().colonne.find((c) => c.titolo === titolo).id
  const spuntaDi = (colonnaId) =>
    lista().spunte.find((s) => s.allievoId === verdi.id && s.colonnaId === colonnaId)
  const spunta = (colonnaId, altro = {}) => api.chiama(archivio, 'check.spunta', {
    corsoId: corsoCheck.id, allievoId: verdi.id, colonnaId, fatta: true, ...altro,
  })
  const giornoLetto = async (colonnaId) => {
    const letto = await api.chiama(archivio, 'check.leggi', { corsoId: corsoCheck.id })
    const riga = letto.dati.righe.find((r) => r.allievoId === verdi.id)
    return riga.caselle.find((c) => c.colonnaId === colonnaId)
  }

  before(async () => {
    const annoId = archivio.registro.anni[0].id
    const classeCheck = api.creaClasse(annoId, 'III ELE C')
    verdi = api.creaAllievo('Verdi', 'Anna')
    classeCheck.allievi.push(verdi)
    const altraClasse = api.creaClasse(annoId, 'IV ELE D')
    estraneo = api.creaAllievo('Grigi', 'Dario')
    altraClasse.allievi.push(estraneo)
    const fisica = api.creaMateria('Fisica')
    corsoCheck = api.creaCorso(classeCheck.id, fisica.id, 'III ELE C — Fisica')
    altroCorso = api.creaCorso(altraClasse.id, fisica.id, 'IV ELE D — Fisica')
    ora = api.creaLezione(corsoCheck.id, '2026-09-03', '08:20', 90)
    oraAltrove = api.creaLezione(altroCorso.id, '2026-09-04', '08:20', 90)
    archivio.modifica((r) => {
      r.classi.push(classeCheck, altraClasse)
      r.materie.push(fisica)
      r.corsi.push(corsoCheck, altroCorso)
      r.lezioni.push(ora, oraAltrove)
    }, ['classi', 'corsi', 'lezioni', 'registro'])

    const esito = await api.chiama(archivio, 'check.colonne', {
      corsoId: corsoCheck.id,
      colonne: [
        { id: '', titolo: 'Modulo firmato' },
        { id: '', titolo: 'Quaderno' },
        { id: '', titolo: 'Relazione' },
      ],
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
  })

  it('la lista nasce alla prima colonna, e le stesse colonne non scrivono due volte', async () => {
    assert.equal(lista().colonne.length, 3)
    const prima = archivio.revisione
    const esito = await api.chiama(archivio, 'check.colonne', {
      corsoId: corsoCheck.id, colonne: lista().colonne,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.invariato, true)
    assert.equal(archivio.revisione, prima)
  })

  it('dentro un’ora la spunta prende il giorno dell’ora, e lo segue se si sposta', async () => {
    const modulo = colonna('Modulo firmato')
    const esito = await spunta(modulo, { lezioneId: ora.id, data: '2026-12-25' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    // La data passata accanto non conta: dentro un'ora vale l'ora.
    assert.deepEqual(
      { lezioneId: spuntaDi(modulo).lezioneId, data: spuntaDi(modulo).data },
      { lezioneId: ora.id, data: '2026-09-03' },
    )
    archivio.modifica((r) => {
      r.lezioni.find((l) => l.id === ora.id).data = '2026-09-05'
    }, ['lezioni'])
    assert.equal((await giornoLetto(modulo)).data, '2026-09-05')
  })

  it('rispuntare non cambia il quando, e non scrive', async () => {
    const modulo = colonna('Modulo firmato')
    const prima = archivio.revisione
    const com = structuredClone(spuntaDi(modulo))
    const esito = await spunta(modulo, { data: '2026-10-01' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.invariato, true)
    assert.equal(archivio.revisione, prima)
    assert.deepEqual(spuntaDi(modulo), com)
  })

  it('senza ora e senza giorno vale oggi; togliere la spunta non la lascia', async () => {
    const quaderno = colonna('Quaderno')
    const esito = await spunta(quaderno)
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(spuntaDi(quaderno).lezioneId, null)
    assert.match(spuntaDi(quaderno).data, /^\d{4}-\d{2}-\d{2}$/)
    const tolta = await spunta(quaderno, { fatta: false })
    assert.equal(tolta.ok, true, JSON.stringify(tolta))
    assert.equal(spuntaDi(quaderno), undefined)
  })

  it('il giorno scelto a mano stacca la spunta dalla sua ora', async () => {
    const modulo = colonna('Modulo firmato')
    const esito = await api.chiama(archivio, 'check.data', {
      corsoId: corsoCheck.id, allievoId: verdi.id, colonnaId: modulo, data: '2026-09-20',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(await giornoLetto(modulo), {
      colonnaId: modulo, data: '2026-09-20', lezioneId: null,
    })
    // L'ora si sposta ancora, e la spunta non la segue più.
    archivio.modifica((r) => {
      r.lezioni.find((l) => l.id === ora.id).data = '2026-09-06'
    }, ['lezioni'])
    assert.equal((await giornoLetto(modulo)).data, '2026-09-20')
  })

  it('una casella vuota, con il giorno scelto a mano, diventa spuntata', async () => {
    const relazione = colonna('Relazione')
    const esito = await api.chiama(archivio, 'check.data', {
      corsoId: corsoCheck.id, allievoId: verdi.id, colonnaId: relazione, data: '2026-09-21',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(
      { lezioneId: spuntaDi(relazione).lezioneId, data: spuntaDi(relazione).data },
      { lezioneId: null, data: '2026-09-21' },
    )
  })

  it('l’ora di un altro corso è un rifiuto che nomina il campo, e non scrive', async () => {
    const quaderno = colonna('Quaderno')
    const prima = archivio.revisione
    const esito = await spunta(quaderno, { lezioneId: oraAltrove.id })
    assert.equal(esito.ok, false, 'ha accettato l’ora di un altro corso')
    assert.equal(esito.codice, 'rifiutato', JSON.stringify(esito))
    assert.equal(esito.campo, 'lezioneId', JSON.stringify(esito))
    assert.equal(archivio.revisione, prima)
    assert.equal(spuntaDi(quaderno), undefined)
  })

  it('una persona di un’altra classe è un rifiuto, e non scrive', async () => {
    const prima = archivio.revisione
    const esito = await api.chiama(archivio, 'check.spunta', {
      corsoId: corsoCheck.id, allievoId: estraneo.id, colonnaId: colonna('Quaderno'), fatta: true,
    })
    assert.equal(esito.ok, false, 'ha accettato una persona di un’altra classe')
    assert.equal(esito.codice, 'rifiutato', JSON.stringify(esito))
    assert.equal(esito.campo, 'allievoId', JSON.stringify(esito))
    assert.equal(archivio.revisione, prima)
  })

  it('quel che non c’è è «non-trovato»: la colonna, la lista, la persona', async () => {
    const colonnaSparita = await spunta('clc-sparita-0001')
    assert.equal(colonnaSparita.codice, 'non-trovato', JSON.stringify(colonnaSparita))
    const senzaLista = await api.chiama(archivio, 'check.data', {
      corsoId: altroCorso.id, allievoId: estraneo.id, colonnaId: 'clc-sparita-0001',
      data: '2026-09-21',
    })
    assert.equal(senzaLista.codice, 'non-trovato', JSON.stringify(senzaLista))
    const nessuno = await api.chiama(archivio, 'check.spunta', {
      corsoId: corsoCheck.id, allievoId: 'alv-nessuno-0001',
      colonnaId: colonna('Quaderno'), fatta: true,
    })
    assert.equal(nessuno.codice, 'non-trovato', JSON.stringify(nessuno))
  })

  it('l’ingresso storto non scrive', async () => {
    const prima = archivio.revisione
    const esito = await api.chiama(archivio, 'check.colonne', {
      corsoId: corsoCheck.id, colonne: 'Modulo firmato',
    })
    assert.equal(esito.codice, 'ingresso-non-valido', JSON.stringify(esito))
    assert.equal(esito.campo, 'colonne', JSON.stringify(esito))
    assert.equal(archivio.revisione, prima)
  })

  it('«lezione corrente»: una spunta di un altro giorno torna a seguire l’ora', async () => {
    const relazione = colonna('Relazione')
    // Scelta a mano il 21: non segue nessuna ora.
    assert.equal(spuntaDi(relazione).lezioneId, null)
    const prima = archivio.revisione
    const esito = await api.chiama(archivio, 'check.lezione', {
      corsoId: corsoCheck.id, allievoId: verdi.id, colonnaId: relazione, lezioneId: ora.id,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.ok(archivio.revisione > prima)
    const giorno = archivio.registro.lezioni.find((l) => l.id === ora.id).data
    assert.deepEqual(await giornoLetto(relazione), {
      colonnaId: relazione, data: giorno, lezioneId: ora.id,
    })
    // La stessa ora due volte non scrive.
    const dopo = archivio.revisione
    const ancora = await api.chiama(archivio, 'check.lezione', {
      corsoId: corsoCheck.id, allievoId: verdi.id, colonnaId: relazione, lezioneId: ora.id,
    })
    assert.equal(ancora.dati.invariato, true, JSON.stringify(ancora))
    assert.equal(archivio.revisione, dopo)
    // E l'ora si sposta: la spunta la segue di nuovo.
    archivio.modifica((r) => {
      r.lezioni.find((l) => l.id === ora.id).data = '2026-09-07'
    }, ['lezioni'])
    assert.equal((await giornoLetto(relazione)).data, '2026-09-07')
  })

  it('«lezione corrente» con l’ora di un altro corso è un rifiuto, e non scrive', async () => {
    const prima = archivio.revisione
    const esito = await api.chiama(archivio, 'check.lezione', {
      corsoId: corsoCheck.id, allievoId: verdi.id,
      colonnaId: colonna('Relazione'), lezioneId: oraAltrove.id,
    })
    assert.equal(esito.codice, 'rifiutato', JSON.stringify(esito))
    assert.equal(esito.campo, 'lezioneId', JSON.stringify(esito))
    assert.equal(archivio.revisione, prima)
  })

  it('una colonna tolta si porta via le sue spunte; con l’ultima se ne va la lista', async () => {
    const modulo = colonna('Modulo firmato')
    const restano = lista().colonne.filter((c) => c.id !== modulo)
    const esito = await api.chiama(archivio, 'check.colonne', {
      corsoId: corsoCheck.id, colonne: restano,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(lista().spunte.some((s) => s.colonnaId === modulo), false)
    assert.equal(lista().colonne.length, 2)

    const vuota = await api.chiama(archivio, 'check.colonne', {
      corsoId: corsoCheck.id, colonne: [],
    })
    assert.equal(vuota.ok, true, JSON.stringify(vuota))
    assert.equal(lista(), undefined)
  })
})

describe('il check segue il corso quando le materie si fondono e le classi si copiano', () => {
  // Due materie nate dalla stessa, con un corso ciascuna nella stessa classe e
  // una lista su tutti e due: la fusione le tiene entrambe.
  let classe
  let bianchi
  let da
  let a
  let corsoDa
  let corsoA

  const listaDi = (corsoId) => archivio.registro.check.filter((c) => c.corsoId === corsoId)
  const colonne = (corsoId, ...titoli) => api.chiama(archivio, 'check.colonne', {
    corsoId, colonne: titoli.map((titolo) => ({ id: '', titolo })),
  })
  const spunta = (corsoId, titolo, data) => {
    const [lista] = listaDi(corsoId)
    const colonnaId = lista.colonne.find((c) => c.titolo === titolo).id
    return api.chiama(archivio, 'check.data', {
      corsoId, allievoId: bianchi.id, colonnaId, data,
    })
  }

  before(async () => {
    const annoId = archivio.registro.anni[0].id
    classe = api.creaClasse(annoId, 'I INF E')
    bianchi = api.creaAllievo('Bianchi', 'Carla')
    classe.allievi.push(bianchi)
    da = api.creaMateria('Informatica applicata')
    a = api.creaMateria('Informatica')
    corsoDa = api.creaCorso(classe.id, da.id, 'I INF E — Informatica applicata')
    corsoA = api.creaCorso(classe.id, a.id, 'I INF E — Informatica')
    archivio.modifica((r) => {
      r.classi.push(classe)
      r.materie.push(da, a)
      r.corsi.push(corsoDa, corsoA)
    }, ['classi', 'corsi', 'registro'])
    for (const esito of [
      await colonne(corsoDa.id, 'Modulo firmato'),
      await colonne(corsoA.id, 'Quaderno'),
      await spunta(corsoDa.id, 'Modulo firmato', '2026-09-10'),
      await spunta(corsoA.id, 'Quaderno', '2026-09-11'),
    ]) assert.equal(esito.ok, true, JSON.stringify(esito))
  })

  it('materie.unisci fonde le due liste nel corso che resta, senza perdere spunte', async () => {
    const esito = await api.chiama(archivio, 'materie.unisci', { daId: da.id, aId: a.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(listaDi(corsoDa.id).length, 0, 'la lista del corso sparito è rimasta appesa')
    const [lista] = listaDi(corsoA.id)
    assert.equal(listaDi(corsoA.id).length, 1, 'un corso con due liste')
    assert.deepEqual(lista.colonne.map((c) => c.titolo).sort(), ['Modulo firmato', 'Quaderno'])
    assert.deepEqual(lista.spunte.map((s) => s.data).sort(), ['2026-09-10', '2026-09-11'])
  })

  it('classi.duplica copia le colonne con id nuovi, e nessuna spunta', async () => {
    const esito = await api.chiama(archivio, 'classi.duplica', {
      classeId: classe.id, annoId: classe.annoId, nome: 'II INF E',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const copia = archivio.registro.classi.find((c) => c.nome === 'II INF E')
    const corsoCopia = archivio.registro.corsi.find((c) => c.classeId === copia.id)
    const [nuova] = listaDi(corsoCopia.id)
    const [vecchia] = listaDi(corsoA.id)
    assert.ok(nuova, 'la copia del corso non ha la sua lista')
    assert.deepEqual(
      nuova.colonne.map((c) => c.titolo),
      vecchia.colonne.map((c) => c.titolo),
    )
    const vecchi = new Set(vecchia.colonne.map((c) => c.id))
    assert.equal(nuova.colonne.some((c) => vecchi.has(c.id)), false, 'id di colonna condivisi')
    assert.deepEqual(nuova.spunte, [])
  })
})
