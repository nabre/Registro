// Le scritture: che il canale delle domande le rifiuti, e che il contratto le
// filtri prima di toccare l'archivio.
//
// Sono due cose che si tengono, e la seconda senza la prima non basta.
//
// **La regola del canale.** Il protocollo ha da poco una `Domanda`, che il
// pannello serve fuori dalla coda delle scritture: una lettura è sincrona sul
// registro in memoria, e metterla in fila dietro la generazione di venti PDF
// vorrebbe dire un'agenda ferma dieci secondi per disegnare la settimana. Quel
// salto di corsia è sicuro a una condizione sola: che da quel canale non si
// possa scrivere. Se ci si potesse, basterebbe il nome giusto in una domanda
// per scrivere nel registro saltando la serializzazione — cioè la garanzia più
// forte che il sistema abbia, quella che impedisce a due gesti arrivati
// insieme di intrecciarsi sullo stesso stato.
//
// **Come la si prova, e perché così.** `rispondiDomanda` è un metodo privato
// di `PannelloRegistro`, e un `PannelloRegistro` non si costruisce senza una
// finestra di Electron: istanziarlo qui vorrebbe dire un finto webview, un
// finti `apparato.dialoghi`, e a quel punto si proverebbe il finto. Le strade
// erano due:
//
//   (a) leggere `src/panels/panel.ts` come sorgente e tirarne fuori la
//       condizione, come `tests/api/bridge.test.mjs` fa con il protocollo;
//   (b) verificare l'invariante equivalente sull'elenco delle procedure —
//       cioè che ogni procedura dichiari un `genere`, e che le letture siano
//       otto.
//
// **Qui si è presa la (a)**, e si fa anche la (b) come secondo passo. La
// ragione è che la (b) da sola non prova niente di quel che conta: dice che le
// procedure si dichiarano, non che il pannello le guardi. Un
// `rispondiDomanda` a cui domani si togliesse la guardia — per una
// rifattorizzazione, per un `chiama` spostato due righe più su — lascerebbe la
// (b) verde e il registro scoperto. Leggendo il sorgente si pinza invece la
// cosa vera: che esista un confronto sul `genere`, che chi non è «lettura»
// esca da lì con un rifiuto, e che quel rifiuto stia **prima** della chiamata
// al nucleo. Poi la condizione letta dal sorgente si applica a tutte e 158 le
// procedure, e si guarda chi passerebbe.
//
// **Il filtro del contratto.** Sei scritture, una per area, con un ingresso
// buono e uno storto. Non tutte e 149: la copertura campo per campo la fa già
// `tests/api/coverage.test.mjs` leggendo il protocollo, e quel che manca qui
// è un'altra cosa — che il rifiuto avvenga *prima* di toccare l'archivio. È
// l'ordine scritto in `chiama()`: «si convalida prima di toccare l'archivio,
// perché la regola del registro — si valida prima, e se non passa non si
// scrive niente — deve valere anche per chi arriva da fuori dal pannello».
// Una procedura che scrivesse e poi si accorgesse dell'ingresso storto
// lascerebbe dietro di sé un dato che nessuna schermata mostra.
//
// Le sei sono scelte fra chi non apre dialoghi di sistema e non esce in rete:
// niente `smistamento.pdf.carica`, che si ferma ad aspettare una persona
// davanti a una finestra, e niente `posta.*`, che vuole una casella collegata.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-scritture-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

let api
let archivio
let classe
let rossi
let corso
let consegna
let smistamento

const PANNELLO = readFileSync(
  fileURLToPath(new URL('../../src/panels/panel.ts', import.meta.url)),
  'utf8',
)

/**
 * Il corpo di un metodo, contando le graffe.
 *
 * Contare invece di cercare con un'espressione regolare: il corpo contiene
 * oggetti letterali e stringhe con dentro `${...}`, e un pattern che provasse
 * a fermarsi alla prima graffa chiusa prenderebbe tre righe invece di venti.
 * Le graffe dei template letterali sono bilanciate, quindi il conto regge.
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
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  api = await import('../../dist-tests/api.mjs')
  api.registraTutte()

  const {
    Archivio, Uri,
    creaAllievo, creaAnno, creaClasse, creaConsegna, creaCorso, creaLezione,
    creaMateria, creaSmistamento,
  } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )
  const annoId = archivio.registro.anni[0].id

  classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  classe.allievi.push(rossi)
  const materia = creaMateria('Matematica')
  corso = creaCorso(classe.id, materia.id, 'I MEC A — Matematica')
  const lezione = creaLezione(corso.id, '2026-09-01', '08:20', 90)
  consegna = creaConsegna(corso.id, 'Esercizi 1-10', '2026-09-01')
  // Un PDF in quarantena che non esiste su disco: a
  // `smistamento.pdf.attribuisci` servono lo smistamento e la classe, e i
  // byte del file non li guarda — rifà la bozza sulle letture, che sono
  // vuote.
  smistamento = creaSmistamento('archivio/quarantena/prova.pdf', 'prova.pdf', 3)

  archivio.modifica((r) => {
    // I PDF automatici fermi: qui si prova il contratto, non la cartella dei
    // documenti.
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
    r.lezioni.push(lezione)
    r.consegne.push(consegna)
    r.smistamenti.push(smistamento)
  }, ['classi', 'corsi', 'lezioni', 'consegne', 'smistamenti', 'registro'])
})

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

// ------------------------------------------- il canale delle domande, la regola

describe('rispondiDomanda, letto dal sorgente', () => {
  it('cerca la procedura per nome e guarda il suo genere', () => {
    const corpo = corpoDi(PANNELLO, 'private async rispondiDomanda')
    // La stessa funzione del nucleo, non una copia dell'elenco: se il
    // pannello si tenesse una lista di nomi di sua, quella lista resterebbe
    // indietro alla prima lettura nuova, e la lettura nuova sarebbe rifiutata
    // — o peggio, una scrittura nuova sarebbe accettata.
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
    // Il `return` è la parte che conta: senza, la guardia manderebbe il
    // rifiuto **e poi** eseguirebbe lo stesso. Una scrittura fatta, e un «no»
    // a schermo.
    assert.ok(ritorno > dove && ritorno < nucleo, 'la guardia non esce prima di eseguire')
  })

  it('la condizione letta dal sorgente rifiuta tutte e 152 le scritture', () => {
    // La regola non si riscrive a mano qui: si tira fuori dal sorgente
    // l'operatore e il valore del confronto, e si applica all'elenco vero. Se
    // un giorno qualcuno cambiasse quella riga in `=== 'scrittura'` —
    // lasciando scoperte le procedure che un genere nuovo dichiarassero — la
    // prova cadrebbe qui invece che in produzione.
    const corpo = corpoDi(PANNELLO, 'private async rispondiDomanda')
    const [, operatore, atteso] = /genere\s*(!==|===)\s*'([a-z]+)'/.exec(corpo)
    const rifiuterebbe = (p) =>
      operatore === '!==' ? p.genere !== atteso : p.genere === atteso

    const tutte = api.procedure()
    const scritture = tutte.filter((p) => p.genere !== 'lettura')
    const letture = tutte.filter((p) => p.genere === 'lettura')

    assert.equal(letture.length, 27, `letture: ${letture.length}`)
    // 152 da quando la barra del titolo la disegna il registro: lo zoom, lo
    // schermo intero e la via d'uscita vivevano nella barra dei menu di
    // sistema, che su Windows e Linux non si vede più, e sono diventate
    // procedure come tutto il resto. Scritture benché non scrivano niente: il
    // genere dice chi può chiamarle da fuori, non se l'archivio cambia.
    assert.equal(scritture.length, 152, `scritture: ${scritture.length}`)

    const passate = scritture.filter((p) => !rifiuterebbe(p)).map((p) => p.nome)
    assert.deepEqual(passate, [], `scritture che una domanda farebbe passare:\n${passate.join('\n')}`)

    // E l'altra metà: una guardia che rifiutasse tutto sarebbe «sicura» e
    // inutile — il canale non risponderebbe più a niente.
    const bloccate = letture.filter((p) => rifiuterebbe(p)).map((p) => p.nome)
    assert.deepEqual(bloccate, [], `letture che una domanda non farebbe passare:\n${bloccate.join('\n')}`)
  })

  it('una domanda non entra nella coda delle scritture', () => {
    // L'altra metà della ragione per cui la guardia esiste: le domande
    // saltano `this.coda`. Il salto è giusto solo finché di lì non si scrive,
    // e provare la guardia senza provare il salto proverebbe metà della
    // frase.
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
    // Il passo (b): una procedura con un `genere` scritto storto — una
    // maiuscola, uno spazio — non verrebbe riconosciuta come scrittura e il
    // canale la lascerebbe passare. Il tipo lo dice al compilatore, e il
    // compilatore non guarda quel che arriva da un JSON.
    const storte = api.procedure()
      .filter((p) => p.genere !== 'lettura' && p.genere !== 'scrittura')
      .map((p) => `${p.nome}: «${String(p.genere)}»`)
    assert.deepEqual(storte, [], storte.join('\n'))
  })
})

// --------------------------------------------- sei scritture, una per area

describe('sei scritture: l’ingresso buono passa, quello storto non scrive', () => {
  /**
   * Le sei, una per file di `src/api/procedures/`.
   *
   * `storto` è sempre un errore plausibile di chi compone la chiamata da
   * fuori — un tipo sbagliato, un id vuoto, una mail senza chiocciola — e mai
   * una struttura assurda: quel che si vuole sapere è se la dogana regge agli
   * sbagli che si fanno davvero.
   */
  const sei = () => [
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
      // Un piano senza corso: `validaPiano` lo rifiuta, e lo schema `entita`
      // gli passa davanti proprio perché quella regola stia in un posto solo.
      storto: { piano: { id: 'pia-inventato-0001', obiettivi: [], attivita: [] } },
      campo: 'piano',
      scrive: true,
    },
    {
      area: 'consegne',
      nome: 'consegne.spunta',
      buono: () => ({ consegnaId: consegna.id, chi: rossi.id, fatta: true }),
      // La spunta arrivata da un `<input>` letto come testo invece che come
      // booleano: è lo sbaglio classico di chi parla in JSON.
      storto: { consegnaId: consegna.id, chi: rossi.id, fatta: 'sì' },
      campo: 'fatta',
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
      // Un id vuoto e non un id inventato: uno inventato sarebbe
      // «non-trovato», che è un'altra risposta e un altro momento — dopo la
      // dogana, dentro la procedura.
      storto: { smistamentoId: smistamento.id, classeId: '' },
      campo: 'classeId',
      scrive: true,
    },
    {
      area: 'sistema',
      nome: 'programma.salva',
      buono: () => ({ chiave: 'registroDocenti.agenda.attiva', valore: true }),
      // La chiave senza il prefisso: è quel che scrive chi copia il nome
      // dalla pagina delle impostazioni invece che dal manifesto.
      storto: { chiave: 'agenda.attiva', valore: true },
      campo: 'chiave',
      // `collezioni: []` e non per svista: `impostazioni.json` sta in
      // `userData` e non è una collezione del documento d'anno. La revisione
      // non si muove nemmeno quando va bene, ed è quel che dichiara.
      scrive: false,
    },
  ]

  it('le sei stanno in sei aree diverse, e sono tutte scritture', () => {
    const aree = sei().map((c) => c.area)
    assert.equal(new Set(aree).size, 6, `aree ripetute: ${aree.join(', ')}`)
    for (const caso of sei()) {
      const p = api.procedura(caso.nome)
      assert.ok(p, `«${caso.nome}» non è nell’elenco`)
      assert.equal(p.genere, 'scrittura', `«${caso.nome}» non è una scrittura`)
    }
  })

  for (const caso of [
    'registro', 'piani', 'consegne', 'docenteClasse', 'smistamento', 'sistema',
  ]) {
    it(`${caso}: l’ingresso buono passa`, async () => {
      const { nome, buono, scrive } = sei().find((c) => c.area === caso)
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
        // La busta riporta il contatore dell'archivio dopo la scrittura: è
        // quel che dice a chi chiama da fuori che il registro si è mosso, e
        // che stato ha adesso.
        assert.equal(esito.dati.revisione, archivio.revisione)
      } else {
        assert.equal(archivio.revisione, prima, `${nome} dichiara collezioni: [] e scrive`)
      }
    })

    it(`${caso}: l’ingresso storto è «ingresso-non-valido» e non scrive`, async () => {
      const { nome, storto, campo } = sei().find((c) => c.area === caso)
      const prima = archivio.revisione
      const esito = await api.chiama(archivio, nome, storto)
      assert.equal(esito.ok, false, `${nome} ha accettato l’ingresso storto`)
      assert.equal(esito.codice, 'ingresso-non-valido', JSON.stringify(esito))
      // Il campo che non va: è quel che permette a un'interfaccia di accendere
      // la casella giusta invece di mostrare un errore generico sotto il modulo.
      assert.equal(esito.campo, campo, JSON.stringify(esito))
      assert.ok(esito.messaggi.length > 0, 'un rifiuto senza una frase da mostrare')
      assert.equal(archivio.revisione, prima, `${nome} ha scritto e poi ha detto di no`)
    })
  }

  it('rifiutare non lascia niente dietro di sé, nemmeno a metà', async () => {
    // Un ultimo giro su tutte e sei di fila: si guarda il contatore una volta
    // sola, in fondo. Una procedura che scrivesse e poi tornasse indietro
    // muoverebbe comunque la revisione — l'archivio conta le modifiche, non i
    // risultati — e qui si vedrebbe.
    const prima = archivio.revisione
    for (const { nome, storto } of sei()) {
      const esito = await api.chiama(archivio, nome, storto)
      assert.equal(esito.ok, false, nome)
    }
    assert.equal(archivio.revisione, prima)
  })
})
