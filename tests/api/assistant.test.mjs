// Il cancello dell'assistente: che cosa il modello vede, e che cosa gli si
// lascia eseguire.
//
// Di tutta la conversazione, una riga sola può fare danno: quella in cui il
// nome che il modello ha prodotto diventa una chiamata al nucleo. Tutto il
// resto — le istruzioni, i giri, il testo che torna — è prosa, e una prosa
// sbagliata si legge e si corregge. Una scrittura decisa da un modello resta
// scritta nel registro di una classe, e non si disfa.
//
// Quindi qui non si prova che l'assistente risponda bene: si prova che **non
// possa scrivere**, in tutti i modi in cui un modello prova a farlo senza
// saperlo. Ollama non serve e non c'è: `usaAttrezzo` è il cancello, e la si
// esercita direttamente — come `tests/api/conduit.test.mjs` fa con
// `permessoMancante`, e per la stessa ragione.
//
// I quattro modi sono questi, e sono tutti stati visti girare con modelli da
// 7B veri:
//
//   1. **il nome inventato** — «presenze.riga», che nell'elenco non c'era mai
//      stato, prodotto perché nel prompt c'era la parola «presenze»;
//   2. **il nome vero di una scrittura** — «ore.appello.riga»: l'elenco degli
//      attrezzi non la conteneva, ma il modello l'ha dedotta dal nome di
//      un'altra, o l'ha vista in una conversazione precedente;
//   3. **gli argomenti che JSON non sono** — una stringa buttata lì al posto
//      dell'oggetto;
//   4. **l'id che non esiste** — un identificatore plausibile e inventato.
//
// Nessuno dei quattro deve sollevare, e nessuno dei quattro deve muovere la
// revisione dell'archivio: la conversazione continua e il modello riceve un
// errore da leggere. È lo stesso contratto del nucleo — «non lancia mai, quel
// che va storto torna nella busta» — portato un piano più su.
//
// E si prova l'elenco: che gli attrezzi mandati siano **soltanto** le letture.
// Non è ridondante con il controllo al ritorno, è l'altra metà — quello
// impedisce il danno, questo impedisce la tentazione — e sono due difetti
// diversi: un elenco che si allargasse da solo alla prossima scrittura
// aggiunta resterebbe innocuo qui e diventerebbe un invito.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-assistente-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

let api
let archivio
let corso
let lezione

/**
 * Una chiamata come arriva dal motore: il nome con il trattino basso, e gli
 * argomenti come sono, senza districarli.
 *
 * È la forma di `ChiamataAttrezzo` in `data/llm.ts` e non quella di Ollama: i
 * nomi del filo — `function.name`, `function.arguments` — restano dentro il
 * motore, e una prova che li nominasse legherebbe il cancello a un servizio.
 */
function chiamata (nome, argomenti) {
  return { nome, argomenti }
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
    creaAllievo, creaAnno, creaClasse, creaCorso, creaLezione, creaMateria,
  } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )
  const annoId = archivio.registro.anni[0].id

  const classe = creaClasse(annoId, 'I MEC A')
  classe.allievi.push(creaAllievo('Rossi', 'Maria'))
  const materia = creaMateria('Matematica')
  corso = creaCorso(classe.id, materia.id, 'I MEC A — Matematica')
  lezione = creaLezione(corso.id, '2026-09-08', '08:15', 90)

  await archivio.modifica((registro) => {
    registro.classi.push(classe)
    registro.materie.push(materia)
    registro.corsi.push(corso)
    registro.lezioni.push(lezione)
  })
})

after(async () => {
  await archivio?.chiudi?.()
  rmSync(radice, { recursive: true, force: true })
})

/**
 * Le procedure che non sono letture e che il modello può chiamare lo stesso.
 *
 * Scritto a mano apposta, come i conti di `coverage.test.mjs`: se cambia, è
 * cambiato il confine su cui si regge tutto il resto di questo file, e va
 * guardato da una persona. Una procedura che si dichiarasse `assistente: true`
 * senza che nessuno lo sappia si fermerebbe qui.
 */
const DEROGHE = ['vista.apri']

describe('gli attrezzi che il modello riceve', () => {
  it('sono le letture, più le sole deroghe dichiarate', () => {
    // Le tre condizioni riscritte a mano, come i conti di `coverage.test.mjs`:
    // la regola vera sta in `offribile()` di `api/tools.ts`, e una prova che
    // la importasse proverebbe che una funzione è uguale a se stessa. La terza
    // — `perAssistente !== false` — è la deroga al contrario: una lettura che
    // con la domanda di un docente non c'entra e che pesa su una finestra di
    // contesto che non la regge.
    const offribili = api
      .procedure()
      .filter((p) => (p.genere === 'lettura' || p.assistente === true) && p.perAssistente !== false)
    const dati = api.attrezzi()
    assert.equal(dati.length, offribili.length)
    assert.deepEqual(
      dati.map((a) => a.nome).sort(),
      offribili.map((p) => p.nome.replace(/\./g, '_')).sort(),
    )
  })

  it('l’unica scrittura che passa è quella dichiarata, e non tocca l’archivio', () => {
    const scritture = api.procedure().filter((p) => p.genere === 'scrittura')
    const nomi = new Set(scritture.map((p) => p.nome.replace(/\./g, '_')))
    const passate = api.attrezzi().map((a) => a.nome).filter((n) => nomi.has(n))
    assert.deepEqual(
      passate.sort(),
      DEROGHE.map((n) => n.replace(/\./g, '_')).sort(),
      `scritture fra gli attrezzi: ${passate.join(', ')}`,
    )

    // La deroga la dichiara la procedura, e l'elenco qui sopra è solo il conto
    // che qualcuno deve rifare a mano quando cambia.
    const deroganti = scritture.filter((p) => p.assistente === true).map((p) => p.nome)
    assert.deepEqual(deroganti.sort(), [...DEROGHE].sort())

    // E si concede a quel che non tocca l'archivio: `collezioni` vuoto è la
    // prova che si può leggere accanto alla dichiarazione.
    for (const p of scritture.filter((s) => s.assistente === true)) {
      assert.deepEqual(
        [...(p.collezioni ?? [])],
        [],
        `${p.nome} tocca delle collezioni e non può essere data al modello`,
      )
    }
  })

  it('nessun nome contiene un punto', () => {
    // Il punto lo mangiano i modelli che lo leggono come accesso a un campo:
    // `corso.presenze` torna indietro come `corso`, e la chiamata si perde.
    const coi = api.attrezzi().map((a) => a.nome).filter((n) => n.includes('.'))
    assert.deepEqual(coi, [])
  })

  it('il catalogo intero sta nel contesto che si apre, con del posto avanzato', async () => {
    // La prova che mancava il giorno in cui l'assistente ha smesso di
    // rispondere. Il catalogo si era allargato fino a **8560 token** — misurati
    // col vocabolario di Qwen2.5 — contro gli 8192 di contesto che
    // `data/llamaCpp.ts` apriva: il prompt di sistema, da solo, non ci stava.
    // Non si vedeva un attrezzo mancante né una risposta storta; si vedeva la
    // libreria dire che la storia della conversazione non entra nel contesto,
    // che è vero e indica il posto sbagliato.
    //
    // Qui non si contano i token: per contarli serve un `.gguf`, e un modello
    // dentro una prova è una prova che cambia idea a ogni scaricamento. Si
    // contano i **caratteri** degli schemi tradotti per la griglia, che è quel
    // che davvero cresce quando si aggiunge una procedura di lettura o le si
    // allunga l'aiuto di un campo. Il rapporto misurato su quel giorno —
    // 23 085 caratteri fra istruzioni e schemi, 8560 token — è di 2,7 caratteri
    // per token, e la soglia qui sotto è scritta a partire da lì.
    //
    // Se questa prova fallisce non c'è un numero da alzare: il contesto è già
    // il doppio di prima, e allargarlo ancora costa memoria video su macchine
    // che non ne hanno. Quel che c'è da fare è **togliere peso al catalogo** —
    // un aiuto più corto, un campo opzionale in meno, una lettura che non serve
    // al modello — oppure smettere di offrirle tutte insieme.
    const { perGriglia } = await import('../../dist-tests/llm.mjs')
    const pesi = api.attrezzi()
      .map((a) => [a.nome, a.descrizione.length + JSON.stringify(perGriglia(a.ingresso)).length])
      .sort((uno, altro) => altro[1] - uno[1])
    const schemi = pesi.reduce((conto, [, peso]) => conto + peso, 0)
    const caratteri = schemi + api.istruzioni().length
    // Quali sono i più pesanti si dice nel messaggio e non in un commento: chi
    // legge questa prova rotta ha bisogno di sapere **dove** tagliare, e
    // l'elenco cambia a ogni procedura nuova. Un `perAssistente: false` su una
    // lettura che con una domanda di un docente non c'entra vale più di dieci
    // aiuti accorciati.
    const primi = pesi.slice(0, 5).map(([nome, peso]) => `${nome} ${peso}`).join(', ')

    // Il tetto in caratteri, e da dove esce. Il contesto è 16 384 token; il
    // catalogo di oggi ne prende 8560, cioè poco più della metà, e ne restano
    // 7824. Una lettura rimandata al modello è tagliata a 6000 caratteri
    // (`LIMITE_RISULTATO`), cioè circa 2200 token, e tre letture di fila sono
    // il giro vero — guarda i corsi, scegline uno, chiedine le presenze: 6600
    // token, più la risposta.
    //
    // Quindi il catalogo può crescere ancora di poco, e questo è il poco:
    // 26 000 caratteri sono circa 9600 token, che lasciano 6780 token — tre
    // letture, al pelo. Oltre, la terza lettura non entra più e il modello
    // conclude con due letture su tre senza sapere che gliene manca una.
    const TETTO = 26000
    assert.ok(
      caratteri < TETTO,
      `il catalogo pesa ${caratteri} caratteri (${api.attrezzi().length} attrezzi) e il tetto ` +
      `è ${TETTO}: vedi il commento qui sopra prima di alzarlo. I più pesanti: ${primi}`,
    )
  })

  it('porta lo schema dell’ingresso, non una descrizione scritta a mano', () => {
    const presenze = api.attrezzi().find((a) => a.nome === 'corso_presenze')
    assert.ok(presenze, 'corso.presenze non è fra gli attrezzi')
    assert.equal(presenze.ingresso.type, 'object')
    // Gli stessi campi che la procedura dichiara: se uno sparisse dallo schema,
    // il modello smetterebbe di poterlo passare e nessuno se ne accorgerebbe.
    // `ritirati` è l'interruttore che mancava: `corso.presenze` teneva fuori
    // chi si è ritirato — `allieviAttivi` — senza nessun modo di farlo
    // rientrare. Adesso la busta emette `esclusiRitirati`, e le istruzioni
    // insegnano al modello a richiamare con «ritirati» a vero quando quel
    // conto è maggiore di zero e l'elenco è vuoto: senza il campo in ingresso
    // `oggetto()` lo avrebbe scartato in silenzio, e quel consiglio sarebbe
    // stato un giro infinito.
    assert.deepEqual(
      Object.keys(presenze.ingresso.properties).sort(),
      ['al', 'corsoId', 'dal', 'ritirati', 'semestreId'],
    )
    assert.deepEqual(presenze.ingresso.required, ['corsoId'])
    // La descrizione è il titolo della procedura: una seconda frase qui sarebbe
    // una seconda verità da tenere allineata.
    const p = api.procedura('corso.presenze')
    assert.equal(presenze.descrizione, p.titolo)
  })
})

describe('il cancello, quando il modello sbaglia', () => {
  it('un attrezzo inventato torna un errore e non tocca niente', async () => {
    const prima = archivio.revisione
    const { testo, usato } = await api.usaAttrezzo(
      archivio,
      chiamata('presenze_riga', { lezioneId: lezione.id, stato: 'assente' }),
    )
    assert.equal(usato.ok, false)
    assert.equal(usato.codice, 'procedura-sconosciuta')
    assert.match(testo, /non esiste/)
    assert.equal(archivio.revisione, prima)
    // Il nome con il punto, come `AttrezzoUsato.nome` dichiara di essere: la
    // pagina disegna quella riga accanto a «corso.presenze» e «classi.elenco»,
    // e un «presenze_riga» in mezzo si legge come un guasto del registro
    // invece che come un nome che il modello si è inventato.
    assert.equal(usato.nome, 'presenze.riga')
    // Nel messaggio invece resta com'è arrivato: è quello che il modello deve
    // smettere di usare, e riscriverglielo in un'altra forma glielo farebbe
    // riprovare.
    assert.match(testo, /«presenze_riga»/)
  })

  it('una scrittura vera viene rifiutata, e l’appello resta com’era', async () => {
    const prima = archivio.revisione
    const { testo, usato } = await api.usaAttrezzo(
      archivio,
      // `ore.appello.riga` esiste davvero, ed è una scrittura: è il caso in cui
      // il modello indovina un nome buono, con dentro argomenti buoni. Il
      // rifiuto non viene dall'elenco che gli è stato mandato — in quell'elenco
      // questo nome non c'era — viene da qui, e arriva **prima** della convalida.
      chiamata('ore_appello_riga', { lezioneId: lezione.id, allievoId: 'all-x', stato: 'assente' }),
    )
    assert.equal(usato.ok, false)
    assert.equal(usato.codice, 'non-permesso')
    assert.match(testo, /può solo leggere/)
    assert.equal(archivio.revisione, prima)
  })

  it('ogni scrittura del registro è rifiutata, non solo quella provata', async () => {
    const prima = archivio.revisione
    const rifiutate = []
    for (const p of api.procedure().filter((s) => s.genere === 'scrittura')) {
      // Le deroghe si saltano qui e si provano a parte: chiamarle con un
      // ingresso vuoto le farebbe fallire sulla convalida, e questa prova
      // passerebbe per il motivo sbagliato — senza accorgersi il giorno in cui
      // il cancello si aprisse davvero.
      if (p.assistente === true) continue
      const { usato } = await api.usaAttrezzo(archivio, chiamata(p.nome.replace(/\./g, '_'), {}))
      if (usato.ok) rifiutate.push(p.nome)
    }
    assert.deepEqual(rifiutate, [], `scritture eseguite dall’assistente: ${rifiutate.join(', ')}`)
    assert.equal(archivio.revisione, prima, 'una scrittura è passata: la revisione si è mossa')
  })

  it('argomenti che JSON non sono tornano un errore leggibile', async () => {
    const { testo, usato } = await api.usaAttrezzo(
      archivio,
      chiamata('corso_presenze', 'il corso di matematica'),
    )
    assert.equal(usato.ok, false)
    assert.equal(usato.codice, 'ingresso-non-valido')
    assert.match(testo, /JSON/)
  })

  it('i null che la griglia obbliga a scrivere non fanno rifiutare la chiamata', async () => {
    // Il guasto per cui questa prova esiste: la griglia di `node-llama-cpp`
    // esige **tutte** le proprietà che dichiara — `required` si può scrivere e
    // non ha effetto — quindi un attrezzo con dei filtri opzionali è un
    // attrezzo che il modello deve riempire anche quando non vuole filtrare
    // niente, e l'unica uscita che la griglia gli lascia è `null`.
    //
    // Il nucleo quei `null` li rifiutava, giustamente: un campo opzionale si
    // omette. Ma il risultato non era un attrezzo rotto da guardare — era un
    // assistente che chiamava due procedure, le prendeva rifiutate tutte e
    // due, e poi **inventava la risposta**.
    const busta = await api.usaAttrezzo(
      archivio,
      chiamata('classi_elenco', { annoId: null, archiviate: null, cerca: null }),
    )
    assert.equal(busta.usato.ok, true, busta.testo)
    assert.match(busta.testo, /I MEC A/)

    // E con i campi omessi del tutto va uguale: è la stessa chiamata detta in
    // un altro modo, e le due forme non devono divergere.
    const vuota = await api.usaAttrezzo(archivio, chiamata('classi_elenco', {}))
    assert.deepEqual(JSON.parse(busta.testo), JSON.parse(vuota.testo))
  })

  it('un null che lo schema accetta come valore non si tocca', () => {
    // L'altra metà, e quella che non si può esercitare attraverso un attrezzo:
    // oggi nessuna lettura dichiara un campo `nullabile()` nell'ingresso.
    // Quando ne nascerà una, `null` vorrà dire «qui non c'è» — un fatto, non un
    // silenzio — e toglierlo vorrebbe dire cambiare quel che il modello ha
    // chiesto. Senza questa prova, il giorno in cui succede non se ne accorge
    // nessuno: si vedrebbe un filtro che smette di filtrare.
    const schema = {
      type: 'object',
      properties: {
        // Nullabile: `schemaJson` lo stampa così, ed è un valore.
        voto: { type: ['number', 'null'] },
        // Opzionale e basta: qui `null` è il silenzio della griglia.
        cerca: { type: 'string' },
        dentro: { type: 'object', properties: { quando: { type: 'string' } } },
      },
    }
    assert.deepEqual(
      api.senzaNulliDiTroppo({ voto: null, cerca: null, dentro: { quando: null } }, schema),
      { voto: null, dentro: {} },
    )
  })

  it('un id inventato torna «non trovato», non un guasto', async () => {
    const { testo, usato } = await api.usaAttrezzo(
      archivio,
      chiamata('corso_presenze', { corsoId: 'cor-inesistente-0001' }),
    )
    assert.equal(usato.ok, false)
    assert.equal(usato.codice, 'non-trovato')
    assert.match(testo, /^Errore: /)
  })

  it('una chiamata senza nome non solleva', async () => {
    const { usato } = await api.usaAttrezzo(archivio, { function: {} })
    assert.equal(usato.ok, false)
  })
})

// Il giro a vuoto, preso dal giornale: dieci «persone.scheda» di fila, tutte
// «non-trovato», tutte con un id inventato da capo. Il modello non insisteva
// per testardaggine — la busta gli diceva «non trovata, forse è sparita», e da
// lì l'unica strada era riprovare. Le due reti sono: la procedura che dice dove
// si cerca, e questa, che gli ricorda che ci è già passato.
describe('quando il modello insiste sullo stesso errore', () => {
  it('alla seconda volta gli si dice che ci è già passato', async () => {
    const ricadute = new Map()
    const primo = await api.usaAttrezzo(
      archivio,
      chiamata('persone_scheda', { allievoId: 'all-inventato-0001' }),
      'chat-prova',
      ricadute,
    )
    assert.equal(primo.usato.ok, false)
    assert.doesNotMatch(primo.testo, /volte in questa conversazione/)

    const secondo = await api.usaAttrezzo(
      archivio,
      // Un id diverso, lo stesso errore: si conta per attrezzo e codice, non
      // per argomenti, perché dieci id inventati sono lo stesso sbaglio dieci
      // volte — ed è esattamente il caso da prendere.
      chiamata('persone_scheda', { allievoId: 'all-inventato-0002' }),
      'chat-prova',
      ricadute,
    )
    assert.match(secondo.testo, /ha già risposto così 2 volte/)
    assert.match(secondo.testo, /Non riprovare con un altro identificatore/)
  })

  it('dopo il quarto tentativo gli si dice di smettere e di chiedere', async () => {
    const ricadute = new Map()
    let ultimo = { testo: '' }
    for (let giro = 0; giro < 4; giro += 1) {
      ultimo = await api.usaAttrezzo(
        archivio,
        chiamata('persone_scheda', { allievoId: `all-inventato-000${giro}` }),
        'chat-prova',
        ricadute,
      )
    }
    assert.match(ultimo.testo, /Basta con «persone\.scheda»/)
    assert.match(ultimo.testo, /rispondi dicendo che cosa ti serve sapere/)
  })

  it('senza il ricordo si comporta come prima: una riga di errore e basta', async () => {
    const solo = await api.usaAttrezzo(
      archivio,
      chiamata('persone_scheda', { allievoId: 'all-inventato-0001' }),
    )
    assert.equal(solo.usato.ok, false)
    assert.doesNotMatch(solo.testo, /volte in questa conversazione/)
  })

  // Il consiglio era uno solo per tutti i codici, ed era quello di
  // `non-trovato`. Il codice più frequente però è `ingresso-non-valido` — il
  // modello sbaglia la **forma** di un campo, `soglia: 250` su una scala che
  // arriva a cento —
  // e a quello si diceva «non riprovare con un altro identificatore, prendilo
  // da un attrezzo che elenca»: un consiglio senza senso, che manda a chiamare
  // l'attrezzo sbagliato invece di correggere il campo.
  describe('un consiglio per ogni guasto, e non quello dell’id inventato', () => {
    const sbagliata = () => chiamata('persone_assenze', { soglia: 250, conAssenze: false })

    it('su un errore di forma dice di correggere il campo, non di cambiare attrezzo', async () => {
      const ricadute = new Map()
      await api.usaAttrezzo(archivio, sbagliata(), 'chat-prova', ricadute)
      const secondo = await api.usaAttrezzo(archivio, sbagliata(), 'chat-prova', ricadute)
      assert.equal(secondo.usato.codice, 'ingresso-non-valido')
      assert.match(secondo.testo, /è un campo/)
      assert.doesNotMatch(secondo.testo, /altro identificatore/)
      assert.match(secondo.testo, /Non cambiare attrezzo/)
    })

    // Su un errore di forma il modello *può* riuscire al tentativo dopo, e
    // glielo si stava impedendo con un ordine. La frase che chi insegna si è
    // visto arrivare — «non sono state trovate assenze» — è la forma che un
    // modello piccolo dà a quell'ordine.
    it('e non gli ordina mai di arrendersi, nemmeno alla quinta volta', async () => {
      const ricadute = new Map()
      let ultimo = { testo: '' }
      for (let giro = 0; giro < 5; giro += 1) {
        ultimo = await api.usaAttrezzo(archivio, sbagliata(), 'chat-prova', ricadute)
      }
      assert.doesNotMatch(ultimo.testo, /Basta con/)
      assert.doesNotMatch(ultimo.testo, /Smetti di provare/)
      assert.match(ultimo.testo, /Rifai \*\*questa stessa chiamata\*\*/)
    })

    it('su una scrittura dice di rispondere a parole, che è l’unica strada', async () => {
      const ricadute = new Map()
      const scrittura = chiamata('ore_appello_riga', { lezioneId: lezione.id })
      await api.usaAttrezzo(archivio, scrittura, 'chat-prova', ricadute)
      const secondo = await api.usaAttrezzo(archivio, scrittura, 'chat-prova', ricadute)
      assert.equal(secondo.usato.codice, 'non-permesso')
      assert.match(secondo.testo, /rispondi a parole/)
      assert.doesNotMatch(secondo.testo, /altro identificatore/)
    })
  })

  // Il conto serve a riconoscere un giro **a vuoto**, e un giro a vuoto è fatto
  // di tentativi che falliscono di fila. «Sbaglio, sbaglio, riesco, sbaglio»
  // arrivava a quattro e si sentiva ordinare di smettere, con la strada buona
  // già trovata una volta.
  it('una chiamata riuscita azzera il conto di quell’attrezzo', async () => {
    const ricadute = new Map()
    const sbagliata = (n) => chiamata('persone_scheda', { allievoId: `all-inventato-000${n}` })
    for (let giro = 0; giro < 3; giro += 1) {
      await api.usaAttrezzo(archivio, sbagliata(giro), 'chat-prova', ricadute)
    }
    const riuscita = await api.usaAttrezzo(
      archivio,
      chiamata('persone_scheda', { allievoId: archivio.registro.classi[0].allievi[0].id }),
      'chat-prova',
      ricadute,
    )
    assert.equal(riuscita.usato.ok, true, riuscita.testo)

    const dopo = await api.usaAttrezzo(archivio, sbagliata(9), 'chat-prova', ricadute)
    assert.doesNotMatch(dopo.testo, /volte in questa conversazione/)
    assert.doesNotMatch(dopo.testo, /Basta con/)
  })
})

// ------------------------------------------- gli argomenti, prima di convalidarli
//
// Fra la griglia che obbliga il modello a riempire quindici caselle e il nucleo
// che rifiuta quel che non è nella forma giusta, c'è questo file. Quel che
// passa di qui non è «tolleranza»: è la differenza fra una chiamata che
// risponde e un rifiuto che il modello legge come «non c'è niente».
describe('gli argomenti che il modello compone', () => {
  it('i filtri lasciati vuoti si tolgono, invece di far rifiutare la chiamata', async () => {
    // `cerca: ""` e `stati: []` sono l'uscita che un modello da 7B si inventa
    // quando la griglia gli chiede un campo che non vuole usare e `null` non
    // gli basta. Il nucleo li rifiutava — «L'elenco deve avere almeno 1 voci.»
    // — per dei filtri che nessuno aveva chiesto.
    const busta = await api.usaAttrezzo(archivio, chiamata('classi_elenco', { cerca: '   ' }))
    assert.equal(busta.usato.ok, true, busta.testo)
    assert.match(busta.testo, /I MEC A/)

    const assenze = await api.usaAttrezzo(
      archivio,
      chiamata('persone_assenze', { stati: [], cerca: '', conAssenze: false }),
    )
    assert.equal(assenze.usato.ok, true, assenze.testo)
  })

  it('un campo obbligatorio lasciato vuoto resta, e si fa dire di no', async () => {
    // L'altra metà: togliere un campo che lo schema esige vorrebbe dire
    // trasformare uno sbaglio del modello in una chiamata larga quanto tutto
    // il registro. Il rifiuto, lì, è la risposta giusta.
    const { usato } = await api.usaAttrezzo(archivio, chiamata('corso_presenze', { corsoId: '' }))
    assert.equal(usato.ok, false)
    assert.equal(usato.codice, 'ingresso-non-valido')
  })

  // `oggetto()` scarta in silenzio le chiavi che non dichiara, mentre lo schema
  // pubblicato dice `additionalProperties: false`. Per un modello le due cose
  // insieme sono una trappola: chi scrive «classe» invece di «classeId» non
  // riceve nessun errore, riceve **tutto il registro**, e ci scrive sopra una
  // risposta sicura sulla domanda sbagliata.
  it('un campo che non esiste torna un messaggio che dice quale, e quello giusto', async () => {
    const { testo, usato } = await api.usaAttrezzo(
      archivio,
      chiamata('persone_assenze', { classe: 'I MEC A', conAssenze: true }),
    )
    assert.equal(usato.ok, false)
    assert.equal(usato.codice, 'ingresso-non-valido')
    assert.match(testo, /il campo «classe» non esiste su «persone_assenze»/)
    assert.match(testo, /forse volevi «classeId»/)
    assert.match(testo, /I campi di questo attrezzo sono: /)
  })

  it('la maiuscola sbagliata si riconosce per quella che è', async () => {
    const { testo, usato } = await api.usaAttrezzo(
      archivio,
      chiamata('corso_presenze', { corsoID: corso.id }),
    )
    assert.equal(usato.ok, false)
    assert.match(testo, /forse volevi «corsoId»/)
  })

  it('senza un candidato plausibile non se ne inventa uno', async () => {
    const { testo } = await api.usaAttrezzo(
      archivio,
      chiamata('corso_presenze', { corsoId: corso.id, zzz: 1 }),
    )
    assert.doesNotMatch(testo, /forse volevi/)
    assert.match(testo, /il campo «zzz» non esiste/)
  })

  // Oggi la griglia genera già la forma giusta e niente di tutto questo
  // capita. Capiterà il giorno in cui qualcuno collega un motore senza
  // griglia — `Motore.chatta` è un punto di estensione dichiarato — e il
  // commento di `argomenti()` prometteva una tolleranza che il codice non
  // aveva.
  describe('il JSON che arriva storto', () => {
    const bene = async (argomenti) => {
      const { usato, testo } = await api.usaAttrezzo(
        archivio,
        chiamata('corso_presenze', argomenti),
      )
      assert.equal(usato.ok, true, testo)
    }

    it('con del testo attorno', async () => {
      await bene(`Ecco la chiamata: ${JSON.stringify({ corsoId: corso.id })}. Grazie.`)
    })

    it('dentro un recinto ```json', async () => {
      await bene('```json\n' + JSON.stringify({ corsoId: corso.id }) + '\n```')
    })

    it('codificato due volte', async () => {
      await bene(JSON.stringify(JSON.stringify({ corsoId: corso.id })))
    })

    it('dentro un array di un oggetto solo', async () => {
      await bene([{ corsoId: corso.id }])
      await bene(JSON.stringify([{ corsoId: corso.id }]))
    })

    it('e quel che JSON non è resta un errore', async () => {
      const { usato } = await api.usaAttrezzo(
        archivio,
        chiamata('corso_presenze', 'il corso di matematica'),
      )
      assert.equal(usato.ok, false)
    })
  })

  it('i null dentro un elenco spariscono come quelli dei campi', () => {
    // Stesso difetto della funzione, un piano più giù: `stati: [null]`
    // arrivava al nucleo e si faceva rifiutare per una casella che il modello
    // non voleva riempire.
    const schema = {
      type: 'object',
      properties: { stati: { type: 'array', items: { type: 'string' } } },
    }
    assert.deepEqual(
      api.senzaNulliDiTroppo({ stati: [null, 'assente', null] }, schema),
      { stati: ['assente'] },
    )
  })

  it('un campo che accetta qualunque cosa tiene il suo null', () => {
    // `qualunque()` si stampa **senza** `type`, e una forma senza `type`
    // accetta tutto, `null` compreso: toglierlo vorrebbe dire cambiare quel
    // che il modello ha chiesto. È la metà gemella del caso per cui
    // `senzaNulliDiTroppo` esiste, sbagliata nella stessa direzione.
    const schema = {
      type: 'object',
      properties: { dato: { description: 'qualunque cosa' }, cerca: { type: 'string' } },
    }
    assert.deepEqual(
      api.senzaNulliDiTroppo({ dato: null, cerca: null }, schema),
      { dato: null },
    )
  })
})

describe('il cancello, quando il modello fa bene', () => {
  it('una lettura passa e torna la busta della procedura', async () => {
    const prima = archivio.revisione
    const { testo, usato } = await api.usaAttrezzo(
      archivio,
      chiamata('corso_presenze', { corsoId: corso.id }),
    )
    assert.equal(usato.ok, true)
    assert.equal(usato.nome, 'corso.presenze')
    const letto = JSON.parse(testo)
    assert.equal(letto.corsoId, corso.id)
    assert.equal(letto.righe.length, 1)
    assert.equal(letto.righe[0].cognome, 'Rossi')
    // Una lettura non muove la revisione: è la stessa misura di
    // `tests/api/reads.test.mjs`, e qui vale per la strada dell'assistente.
    assert.equal(archivio.revisione, prima)
  })

  // L'altra metà della stessa chiamata: al modello il JSON — è con quello che
  // ragiona — e alla pagina la stessa busta già divisa in colonne. È quel che
  // toglie i dati di mano al modello: senza, la tabella che chi ha chiesto
  // legge sarebbe quella che il modello ha ribattuto, con dentro il rischio di
  // una cifra sbagliata. Come si impagina lo prova `presentation.test.mjs`.
  it('una lettura torna anche la busta impaginata, per la pagina', async () => {
    const { risultato } = await api.usaAttrezzo(
      archivio,
      chiamata('corso_presenze', { corsoId: corso.id }),
    )
    assert.ok(risultato, 'la lettura non ha prodotto niente da mostrare')
    assert.equal(risultato.procedura, 'corso.presenze')
    const tabella = risultato.blocchi.find((b) => b.tipo === 'tabella')
    assert.equal(tabella.righe[0][0], 'Rossi')
  })

  it('una lettura senza niente da mostrare non porta un risultato vuoto', async () => {
    // `modelli.prova` torna un PDF in base64, e non dichiara nessuna
    // presentazione: meglio niente che una griglia di duemila caratteri.
    const { risultato } = await api.usaAttrezzo(archivio, chiamata('registro_riassunto', {}))
    assert.ok(risultato, 'il riassunto si mostra')
    assert.equal(risultato.blocchi.length, 1)
  })

  it('gli argomenti mandati come stringa JSON si accettano lo stesso', async () => {
    // Ollama li manda già decodificati, altri servitori no: il cancello deve
    // reggere tutti e due, o l'assistente smetterebbe di funzionare cambiando
    // servizio senza che nessuno capisca perché.
    const { usato } = await api.usaAttrezzo(
      archivio,
      chiamata('corso_presenze', JSON.stringify({ corsoId: corso.id })),
    )
    assert.equal(usato.ok, true)
  })

  it('un ingresso vuoto vale per le procedure che non chiedono niente', async () => {
    const { testo, usato } = await api.usaAttrezzo(
      archivio,
      chiamata('registro_riassunto', undefined),
    )
    assert.equal(usato.ok, true)
    assert.equal(JSON.parse(testo).corsi, 1)
  })

  it('la chiamata finisce nel giornale con la propria origine', async () => {
    const viste = []
    const smetti = api.osserva((voce) => viste.push(voce))
    try {
      await api.usaAttrezzo(archivio, chiamata('registro_riassunto', {}), 'chat-xyz')
    } finally {
      smetti()
    }
    assert.equal(viste.length, 1)
    assert.equal(viste[0].origine, 'assistente')
    assert.equal(viste[0].genere, 'lettura')
    // Il tracciato è quello della conversazione: è così che le chiamate di un
    // giro si ritrovano insieme fra quelle del pannello.
    assert.equal(viste[0].tracciato, 'chat-xyz')
  })
})

// ------------------------------------------------ quel che torna al modello
//
// Il taglio era a caratteri, e cadeva dove capitava: a metà di un numero
// (`…,"quota":0.085714285`), a metà di un cognome (`{"righe":[{"cognome":
// "Ross`). Quel che arrivava al modello era JSON rotto più un avviso, e un
// modello piccolo che non riesce ad aprire la busta non dice «non ho capito la
// busta»: ricade sulla frase più sicura che conosce, cioè «non ho trovato
// niente». La tabella intera intanto era già sotto gli occhi di chi aveva
// chiesto — arriva alla pagina per un'altra strada — e diceva il contrario.
describe('il risultato accorciato', () => {
  before(async () => {
    // Una classe abbastanza grande da non stare in seimila caratteri: con una
    // da venticinque non si esercita niente, ed è esattamente la misura per
    // cui il difetto non si vedeva nelle prove e si vedeva in aula.
    const { creaAllievo, creaClasse } = api
    const annoId = archivio.registro.anni[0].id
    const grande = creaClasse(annoId, 'V AFM B')
    for (let i = 0; i < 60; i += 1) {
      grande.allievi.push(creaAllievo(`Cognome${i}`, `Nome${i}`))
    }
    await archivio.modifica((registro) => {
      registro.classi.push(grande)
    })
  })

  const tagliata = () => api.usaAttrezzo(
    archivio,
    chiamata('persone_assenze', { conAssenze: false }),
  )

  it('si apre: è JSON valido anche quando non ci stava tutto', async () => {
    const { testo, usato } = await tagliata()
    assert.equal(usato.ok, true, testo)
    // Niente `try`: se è rotto, questa riga è l'errore della prova.
    const letto = JSON.parse(testo)
    assert.ok(letto.perIlModello, `non è stato accorciato: ${testo.length} caratteri`)
    assert.ok(Array.isArray(letto.persone))
  })

  it('tiene tutti i campi d’insieme e taglia le righe', async () => {
    const { testo } = await tagliata()
    const letto = JSON.parse(testo)
    // I campi che rispondono a «quanti sono» valgono su tutte le righe, e
    // sono quelli che non si possono perdere: senza, il modello sa solo quel
    // che ha visto e crede che sia tutto.
    for (const campo of ['dal', 'al', 'sogliaUsata', 'guardate', 'quante']) {
      assert.ok(campo in letto, `manca il campo d’insieme «${campo}»`)
    }
    const conto = letto.perIlModello.elenchi.persone
    assert.equal(conto.mostrate, letto.persone.length)
    assert.ok(conto.mostrate < conto.di, `${conto.mostrate} su ${conto.di}`)
    // Le righe che arrivano sono righe intere, non mezze righe.
    assert.equal(typeof letto.persone[0].nomeCompleto, 'string')
  })

  it('dice come si vede il resto, e non consiglia di guardare meno giorni', async () => {
    const { testo } = await tagliata()
    const avviso = JSON.parse(testo).perIlModello.avviso
    // «Restringi la domanda — per esempio con un periodo più corto» detto su
    // una domanda di assenze vuol dire *guarda meno giorni*, cioè **trovane
    // meno**: si consigliava al modello di far sparire quel che gli era stato
    // chiesto di cercare.
    assert.doesNotMatch(avviso, /periodo più corto/)
    // E non consiglia nemmeno «da»: la pagina è uscita dal catalogo del
    // modello, e suggerire un campo che nel suo elenco non c'è vuol dire
    // mandarlo a comporre una chiamata che il nucleo rifiuta. Gli si dice
    // invece quel che può fare davvero — dire quante ne ha viste su quante, e
    // restringere con un filtro che la domanda nomina.
    assert.doesNotMatch(avviso, /«da»/)
    assert.match(avviso, /quante ne hai viste su quante/)
    assert.match(avviso, /restringi con un filtro che la domanda nomina/)
  })

  it('e la pagina non si offre più al modello, ma resta nel contratto', async () => {
    // Due campi su dieci letture valevano duemila caratteri del catalogo che
    // precede ogni domanda — più di quanto pesi una lettura intera — e un
    // modello piccolo la seconda pagina non la chiede. Fuori dall'elenco che
    // gli si manda, dentro lo schema che chiunque altro legge.
    const suo = api.attrezzi().find((a) => a.nome === 'persone_assenze')
    assert.equal(suo.ingresso.properties.da, undefined)
    assert.equal(suo.ingresso.properties.quanti, undefined)
    // Il contratto invece li ha, ed è quel che vede uno script dal condotto.
    const pubblicato = api.procedura('persone.assenze').ingresso.forma.campi
    assert.ok('da' in pubblicato && 'quanti' in pubblicato)
  })

  it('sta nel limite dichiarato, avviso compreso', async () => {
    const { testo } = await tagliata()
    assert.ok(testo.length <= 6000, `la busta misura ${testo.length} caratteri`)
  })

  it('una busta che ci sta arriva intera e senza avvisi', async () => {
    const { testo } = await api.usaAttrezzo(archivio, chiamata('corso_presenze', {
      corsoId: corso.id,
    }))
    const letto = JSON.parse(testo)
    assert.equal(letto.perIlModello, undefined)
    assert.equal(letto.righe.length, 1)
  })
})

// ---------------------------------------------------------- cambiare pagina

// L'unica cosa che il modello può fare oltre a leggere. Sta qui e non in un
// file suo perché è lo stesso cancello: `usaAttrezzo` la lascia passare per la
// porta dichiarata, e se quella porta si allargasse sarebbe questo il file che
// deve accorgersene.
describe('cambiare pagina', () => {
  it('senza un registro aperto lo dice, invece di far finta di sì', async () => {
    api.registraNavigatore(null)
    const { testo, usato } = await api.usaAttrezzo(
      archivio,
      chiamata('vista_apri', { vista: 'valutazioni' }),
    )
    assert.equal(usato.ok, false)
    assert.equal(usato.codice, 'non-disponibile')
    assert.match(testo, /non è aperto/)
  })

  it('porta il registro dove il modello chiede, con la cosa da mostrare', async () => {
    const chieste = []
    api.registraNavigatore((n) => chieste.push(n))
    try {
      const prima = archivio.revisione
      const { usato } = await api.usaAttrezzo(
        archivio,
        chiamata('vista_apri', { vista: 'valutazioni', elementoId: corso.id }),
      )
      assert.equal(usato.ok, true)
      assert.equal(usato.nome, 'vista.apri')
      assert.deepEqual(chieste, [
        { tipo: 'naviga', vista: 'valutazioni', elementoId: corso.id },
      ])
      // Cambiare pagina non è una scrittura: è tutto il motivo per cui la si
      // concede a un modello.
      assert.equal(archivio.revisione, prima)
    } finally {
      api.registraNavigatore(null)
    }
  })

  it('una pagina che non esiste è un ingresso non valido, non una navigazione', async () => {
    const chieste = []
    api.registraNavigatore((n) => chieste.push(n))
    try {
      const { usato } = await api.usaAttrezzo(
        archivio,
        chiamata('vista_apri', { vista: 'impostazioniSegrete' }),
      )
      assert.equal(usato.ok, false)
      assert.equal(usato.codice, 'ingresso-non-valido')
      assert.deepEqual(chieste, [])
    } finally {
      api.registraNavigatore(null)
    }
  })

  it('non può aprire un modulo di creazione: lo schema non lo nomina', () => {
    // `MessaggioNavigazione` porta `nuovo` e `avvio`, e la procedura no: un
    // modulo di creazione aperto da un modello è il primo passo verso una
    // scrittura che nessuno ha chiesto. `oggetto()` scarta le chiavi che non
    // dichiara, quindi non basta che il gestore le ignori — devono non
    // arrivarci, e l'unico modo di saperlo è leggere lo schema pubblicato.
    const attrezzo = api.attrezzi().find((a) => a.nome === 'vista_apri')
    assert.ok(attrezzo, 'vista.apri non è fra gli attrezzi')
    assert.deepEqual(
      Object.keys(attrezzo.ingresso.properties).sort(),
      ['data', 'elementoId', 'vista'],
    )
  })
})

// ------------------------------------------------------ la lingua della risposta

// Chi insegna legge in italiano, e un modello piccolo torna all'inglese da
// solo: non sulla prima risposta, ma dopo un giro di attrezzi, quando fra la
// domanda e la frase da scrivere si sono infilate delle buste di dati con
// dentro dei nomi di campo. La difesa è una regola detta due volte — in testa e
// in coda alle istruzioni — e queste prove tengono ferme tutte e due le volte:
// riordinando il prompt, una delle due è esattamente quel che si perde senza
// accorgersene, perché il difetto non si vede finché non si carica un modello.
describe('la lingua in cui il modello deve rispondere', () => {
  const righe = () => api.istruzioni().split('\n').filter((riga) => riga.trim() !== '')

  it('è la prima cosa che le istruzioni dicono', () => {
    assert.match(righe()[0], /^Scrivi in italiano\./)
  })

  it('è anche l’ultima, che è quella più vicina alla risposta', () => {
    assert.match(righe().at(-1), /la risposta è in italiano/)
  })

  it('non lascia fuori quel che arriva dagli attrezzi', () => {
    assert.match(api.istruzioni(), /anche se quel che ti tornano gli attrezzi non lo è/)
  })

  // I cognomi, le classi e le materie sono nomi e non parole: un modello che
  // traduce «I MEC A — Matematica» in «1st MEC A — Mathematics» ha scritto una
  // riga che nel registro non si ritrova.
  it('dice che i nomi non si traducono', () => {
    assert.match(api.istruzioni(), /I nomi delle persone, delle classi e delle materie non si\s+traducono/)
  })
})

// ------------------------------------------- le reti che devono poter scattare
//
// Due regole delle istruzioni erano scritte su **dei nomi** invece che su un
// fatto, e i nomi non erano quelli giusti: la rete dei filtri accesi da soli
// nominava quattro campi che `persone.assenze`, `persone.medie` e
// `corso.presenze` — proprio le tre letture che quei filtri ce l'hanno — non
// emettevano; quella del «cerca» nominava un attrezzo solo su una decina che
// hanno quel campo. Una regola che nomina il posto sbagliato non è una mezza
// regola: è una regola che non scatta mai, e intanto si legge come una rete.
describe('le regole che devono valere anche per i campi che verranno', () => {
  it('l’elenco vuoto si riconosce dal fatto, non da quattro nomi di campo', () => {
    const testo = api.istruzioni()
    assert.match(testo, /Vale sul fatto e non sui nomi dei campi/)
    assert.match(testo, /è maggiore di zero e le righe sono zero/)
    assert.match(testo, /togli \*\*un\n?\s*filtro per volta\*\* e richiama/)
    // E i contatori che le letture emettono davvero sono nominati come
    // esempi, non come elenco chiuso.
    assert.match(testo, /«guardate»/)
    assert.match(testo, /«esclusiRitirati»/)
  })

  it('il «cerca» vale su ogni lettura che ce l’ha, non solo su «persone_cerca»', () => {
    const testo = api.istruzioni()
    assert.match(testo, /«cerca» c’è su quasi ogni lettura/)
    assert.match(testo, /un nome o un pezzo di nome/)
    assert.match(testo, /Lo stesso su ogni attrezzo/)
  })

  // Il conto che dice se quelle regole hanno davvero su che cosa scattare: i
  // campi nominati devono esistere in **uscita** da qualche lettura, o si sta
  // insegnando al modello a cercare una cosa che non c'è.
  it('i contatori che le istruzioni nominano esistono in qualche busta', () => {
    const uscite = JSON.stringify(
      api.procedure().filter((p) => p.genere === 'lettura').map((p) => p.uscita?.forma ?? null),
    )
    for (const campo of ['guardate', 'esclusiRitirati', 'esclusiArchiviate', 'quante']) {
      assert.ok(uscite.includes(`"${campo}"`), `nessuna lettura emette «${campo}»`)
    }
  })
})

// ------------------------------------------------- il contesto della domanda

// L'altra metà dell'assistente: non che cosa può fare, ma di che cosa sta
// parlando. Un modello a cui non si dice dove si sta guardando chiama un
// elenco, ne sceglie una riga plausibile e risponde su quella — e in un
// registro una risposta sicura sulla classe sbagliata è indistinguibile da una
// giusta finché non la si controlla.
describe('il contesto che precede la domanda', () => {
  const veduta = {
    vista: 'valutazioni',
    pagina: 'Valutazioni',
    scheda: null,
    sezione: null,
    scelte: [
      {
        campo: 'Periodo',
        valore: 'Secondo semestre',
        id: 'sem-0002',
        opzioni: [
          { valore: 'Primo semestre', id: 'sem-0001' },
          { valore: 'Secondo semestre', id: 'sem-0002' },
          { valore: 'Anno intero', id: null },
        ],
      },
      {
        campo: 'Corso',
        valore: 'I MEC A · Matematica',
        id: 'cor-0003',
        opzioni: [
          { valore: 'I MEC A · Matematica', id: 'cor-0003' },
          { valore: 'II MEC B · Fisica', id: 'cor-0004' },
        ],
      },
    ],
    filtri: [{ campo: 'Corso in agenda', valore: 'Tutti i corsi', id: null }],
    riferimenti: {
      annoId: 'ann-0001',
      semestreId: 'sem-0002',
      corsoId: 'cor-0003',
      classeId: 'cls-0001',
      lezioneId: null,
      allievoId: null,
      pianoId: null,
      valutazioneId: null,
    },
    periodo: { etichetta: '2° semestre', dal: '2027-02-01', al: '2027-06-30' },
    data: '2027-02-10',
    oggi: '2027-02-12',
    ricerca: null,
    visibili: {
      cosa: 'persone in formazione della I MEC A',
      quanti: 25,
      ids: ['all-0001', 'all-0002'],
      troncato: true,
    },
  }

  it('dice la pagina e le scelte come si leggono, con gli id accanto', () => {
    const testo = api.descriviContesto(veduta)
    assert.match(testo, /Pagina: Valutazioni/)
    assert.match(testo, /Corso: I MEC A · Matematica \[cor-0003\]/)
    assert.match(testo, /Periodo: Secondo semestre \[sem-0002\]/)
  })

  // Le alternative sono la metà che mancava: senza, «e la terza?» costringeva
  // il modello a chiamare un elenco e a scegliere la riga che gli sembrava —
  // cioè a indovinare di nuovo quel che la barra ha già scritto.
  it('dice anche che cosa si potrebbe scegliere, con gli id', () => {
    const testo = api.descriviContesto(veduta)
    assert.match(testo, /si può scegliere: Primo semestre \[sem-0001\], Anno intero/)
    assert.match(testo, /si può scegliere: II MEC B · Fisica \[cor-0004\]/)
  })

  it('non ripete fra le alternative quella che è già scelta', () => {
    const testo = api.descriviContesto(veduta)
    const riga = testo.split('\n').find((r) => r.startsWith('— Corso:'))
    assert.equal(riga.match(/cor-0003/g).length, 1)
  })

  it('una voce senza alternative resta una riga sola', () => {
    const testo = api.descriviContesto({
      ...veduta,
      scelte: [{ campo: 'Modello aperto', valore: 'verbale-lezione', id: null }],
    })
    assert.match(testo, /— Modello aperto: verbale-lezione\n/)
  })

  // Le tendine della barra non sono indipendenti fra loro: l'anno tiene le
  // classi, la classe tiene i corsi, il corso tiene le ore. Prima il contesto
  // le mandava piatte, e a «e la terza?» il modello sceglieva un corso
  // qualunque dell'anno invece di un altro corso di quella classe.
  it('dice da che cosa dipende una scelta, e che le alternative sono quelle lì dentro', () => {
    const testo = api.descriviContesto({
      ...veduta,
      scelte: [
        { campo: 'Anno scolastico', valore: '2026/2027', id: 'ann-1' },
        { campo: 'Classe', valore: 'I MEC A', id: 'cls-1', dentro: 'Anno scolastico' },
        {
          campo: 'Corso',
          valore: 'I MEC A · Matematica',
          id: 'cor-1',
          dentro: 'Classe',
          opzioni: [
            { valore: 'I MEC A · Matematica', id: 'cor-1' },
            { valore: 'I MEC A · Storia', id: 'cor-2' },
          ],
        },
      ],
    })
    assert.match(testo, /— Classe \(dentro Anno scolastico\): I MEC A/)
    // E le alternative si leggono come ristrette: un elenco di corsi scritto
    // senza dire «di questa classe» si legge come l'elenco dei corsi.
    assert.match(testo, /— Corso \(dentro Classe\): I MEC A · Matematica/)
    assert.match(testo, /si può scegliere, dentro Classe: I MEC A · Storia/)
  })

  it('separa i filtri dalle scelte: sono due domande diverse', () => {
    const testo = api.descriviContesto(veduta)
    assert.match(testo, /Filtri accesi nella pagina:/)
    assert.match(testo, /Corso in agenda: Tutti i corsi/)
  })

  it('elenca gli id da passare agli attrezzi, e tace su quelli che non ci sono', () => {
    const testo = api.descriviContesto(veduta)
    assert.match(testo, /corsoId=cor-0003/)
    assert.match(testo, /classeId=cls-0001/)
    // `lezioneId` è `null`: dirlo vorrebbe dire offrire un id da passare che
    // non esiste, ed è esattamente quel che un modello prova a fare.
    assert.doesNotMatch(testo, /lezioneId/)
  })

  // La riga che rende chiamabili gli attrezzi. `corso.presenze` vuole `dal` e
  // `al`, e di semestri non sa niente: un contesto che dicesse soltanto
  // «secondo semestre» lascerebbe il modello a scegliere fra chiedere l'anno
  // intero e inventarsi due date — e le medie del semestre sbagliato in un
  // registro si trascrivono.
  it('dà il periodo in date, e dice di passarle come «dal» e «al»', () => {
    const testo = api.descriviContesto(veduta)
    assert.match(testo, /Periodo dei conti: 2° semestre, dal 2027-02-01 al 2027-06-30/)
    assert.match(testo, /passa dal=2027-02-01 e al=2027-06-30/)
  })

  it('senza anno non offre date da passare, invece di inventarne', () => {
    const testo = api.descriviContesto({
      ...veduta,
      periodo: { etichetta: 'Anno intero', dal: null, al: null },
    })
    assert.match(testo, /Periodo dei conti: Anno intero\./)
    assert.doesNotMatch(testo, /passa dal=/)
  })

  it('dice la sezione aperta, quando la pagina ne ha due livelli', () => {
    const testo = api.descriviContesto({
      ...veduta,
      vista: 'impostazioni',
      pagina: 'Impostazioni',
      scheda: 'Il programma',
      sezione: 'Assistente',
    })
    assert.match(testo, /Scheda aperta: Il programma/)
    assert.match(testo, /Sezione aperta: Assistente/)
  })

  it('dice il giorno mostrato e oggi, che non sono la stessa cosa', () => {
    const testo = api.descriviContesto(veduta)
    assert.match(testo, /Giorno mostrato: 2027-02-10/)
    assert.match(testo, /Oggi è 2027-02-12/)
  })

  it('dice che l’elenco a schermo è tagliato, invece di lasciarlo credere intero', () => {
    const testo = api.descriviContesto(veduta)
    assert.match(testo, /25 persone in formazione della I MEC A/)
    assert.match(testo, /all-0001, all-0002, e altri fino a 25/)
  })

  it('un elenco intero non porta la coda dei troncati', () => {
    const testo = api.descriviContesto({
      ...veduta,
      visibili: { cosa: 'corsi', quanti: 2, ids: ['cor-1', 'cor-2'], troncato: false },
    })
    assert.match(testo, /2 corsi, già filtrati come si vedono: cor-1, cor-2\./)
  })

  it('dice che cosa farne: gli id al posto degli elenchi, i filtri che si vedono', () => {
    const testo = api.descriviContesto(veduta)
    assert.match(testo, /passa quegli id agli attrezzi\n?\s*invece di cercarli con un elenco/)
    assert.match(testo, /il periodo non si passa per nome/)
    assert.match(testo, /Se l’elenco a schermo è ristretto, rispondi su quello/)
  })

  // ------------------------------------------------ gli id, e quando si passano
  //
  // Il falso negativo da cui tutto questo parte, per intero: chi insegna chiede
  // «elenco degli allievi con assenze» e si sente rispondere «non sono state
  // trovate assenze per nessun allievo in questa classe e in questo corso».
  // Nessuno aveva nominato un corso. Il contesto ne portava uno — la pagina ne
  // ha sempre uno aperto — e sopra c'era scritto, senza nessuna condizione,
  // «gli id da passare agli attrezzi». Il modello, con davanti quindici caselle
  // da riempire e una lista di id «da passare», li ha passati tutti;
  // `persone.assenze` restringe in cascata e la busta è tornata vuota.
  //
  // La metà a monte — un `corsoId` messo nei riferimenti anche dove nessuno
  // l'aveva scelto — sta in `ui/viewpoint.ts`. Questa è la metà di qui:
  // **il testo non ordina più di passarli tutti**, e dice quali valgono sempre
  // e quali solo se la domanda li nomina.
  describe('gli id, divisi fra dove si è e che cosa si è nominato', () => {
    it('dice «dove si sta guardando» per anno e classe, e basta', () => {
      const testo = api.descriviContesto(veduta)
      const riga = testo.split('\n').find((r) => r.startsWith('Gli id di dove si sta guardando'))
      assert.ok(riga, 'manca la riga degli id di dove si è')
      assert.match(riga, /annoId=ann-0001/)
      assert.match(riga, /classeId=cls-0001/)
      // E il corso **non** sta lì dentro: è quel che ha svuotato la busta.
      assert.doesNotMatch(riga, /corsoId/)
      // Nemmeno il semestre, e non è sempre stato così. Finché nessun attrezzo
      // lo accettava, stare qui non faceva niente; da quando le quattro letture
      // che contano nel tempo lo accettano, passarlo di suo vuol dire rispondere
      // su mezzo anno a chi ha chiesto dell'anno — «dal 31 agosto al 22 gennaio»
      // consegnato come se fosse tutto, che è il guasto del corso con un altro id.
      assert.doesNotMatch(riga, /semestreId/)
    })

    it('mette corso e semestre fra quelli che si passano solo se nominati', () => {
      const testo = api.descriviContesto(veduta)
      const riga = testo.split('\n').find((r) => r.includes('solo se la domanda nomina'))
      assert.ok(riga, 'manca la riga degli id condizionati')
      assert.match(riga, /corsoId=cor-0003/)
      assert.match(riga, /semestreId=sem-0002/)
    })

    it('lo dice in parole, e nomina i tre casi che sbagliavano', () => {
      const testo = api.descriviContesto(veduta)
      assert.match(testo, /senza nominare una\n?\s*materia o un corso \*\*non prende corsoId\*\*/)
      assert.match(testo, /non nomina una persona non prende\n?«?allievoId/)
      // Il semestre lo si argomenta invece di vietarlo: senza quel filtro la
      // risposta è **più** ricca, non più povera — tutti i periodi, a parte.
      assert.match(testo, /non nomina un semestre \*\*non prende semestreId\*\*/)
      assert.match(testo, /per \*\*tutti\*\* i periodi, ciascuno a parte/)
    })

    it('scrive il corso dentro la classe in cui la barra lo mostra', () => {
      const testo = api.descriviContesto({
        ...veduta,
        scelte: [
          { campo: 'Classe', valore: 'I MEC A', id: 'cls-0001' },
          { campo: 'Corso', valore: 'I MEC A · Matematica', id: 'cor-0003', dentro: 'Classe' },
        ],
      })
      assert.match(testo, /corsoId=cor-0003 \(della classe cls-0001\)/)
    })

    // Quando il corso in cima non è di quella classe i due id insieme non
    // lasciano passare niente, e il modello non ha modo di saperlo: riceve una
    // busta vuota, che è indistinguibile da «non c'è niente».
    it('quando il corso è di un’altra classe lo dice apertamente', () => {
      const testo = api.descriviContesto({
        ...veduta,
        scelte: [
          { campo: 'Classe', valore: 'II MEC B', id: 'cls-0009' },
          { campo: 'Corso', valore: 'I MEC A · Matematica', id: 'cor-0003', dentro: 'Classe' },
        ],
      })
      assert.match(testo, /corsoId=cor-0003 \(della classe cls-0009\)/)
      assert.match(testo, /il corso scelto in cima è di un’altra classe/)
      assert.match(testo, /non passarli insieme/)
    })

    // La regola che mancava: le altre tre dicono tutte di restringere, e un
    // elenco di sole regole che restringono insegna a restringere sempre.
    it('ha anche la regola che allarga, e dice di dichiararlo', () => {
      const testo = api.descriviContesto(veduta)
      assert.match(testo, /non nomina né sottintende il corso/)
      assert.match(testo, /rispondi \*\*in generale\*\*/)
      assert.match(testo, /su tutto il registro/)
    })
  })

  // Il contesto entra in una finestra che atterra fra 12288 e 16384 token, e il
  // catalogo degli attrezzi ne prende già più della metà. Quando il prompt di
  // sistema non ci sta, `node-llama-cpp` non dice che è troppo grande:
  // **cancella le chiamate d'attrezzo già fatte e i loro risultati** — cioè
  // produce esattamente il falso negativo da cui parte questo file.
  describe('quanto può essere lungo il contesto', () => {
    it('le alternative di una tendina si fermano, e dicono quante ne restano', () => {
      const molte = Array.from({ length: 40 }, (_, i) => ({
        valore: `Classe ${i}`,
        id: `cls-${i}`,
      }))
      const testo = api.descriviContesto({
        ...veduta,
        scelte: [{ campo: 'Classe', valore: 'Classe 0', id: 'cls-0', opzioni: molte }],
      })
      const riga = testo.split('\n').find((r) => r.startsWith('— Classe:'))
      // Trentanove alternative, dodici scritte: le altre ventisette si dicono.
      assert.equal(riga.match(/cls-/g).length, 13)
      assert.match(riga, /e altre 27 che si vedono nella tendina/)
    })

    it('gli id a schermo si fermano a quaranta, e il conto intero resta', () => {
      const ids = Array.from({ length: 300 }, (_, i) => `all-${i}`)
      const testo = api.descriviContesto({
        ...veduta,
        visibili: { cosa: 'persone in formazione', quanti: 300, ids, troncato: false },
      })
      const riga = testo.split('\n').find((r) => r.startsWith('A schermo'))
      assert.equal(riga.match(/all-/g).length, 40)
      assert.match(riga, /e altri fino a 300/)
      // Quarantamila caratteri di soli id non entrano da nessuna parte: il
      // tetto serve a questo, e una riga sola non deve pesare come le
      // istruzioni intere.
      assert.ok(riga.length < 700, `la riga misura ${riga.length} caratteri`)
    })
  })
})

// Staccare non deve perdere niente per strada.
//
// `oggetto()` scarta le chiavi che non dichiara — è la tolleranza che lascia
// parlare un pannello più nuovo con un host più vecchio — e lo fa in silenzio.
// Sotto ogni risposta dell'assistente ci sono le tabelle lette dal registro, e
// lo schema del turno non le nominava: la finestra nuova si apriva con le bolle
// al posto giusto e sotto il vuoto. Qui si manda un turno intero e si guarda
// che esca intero.
describe('la conversazione che cambia finestra', () => {
  const turno = {
    ruolo: 'assistente',
    testo: 'Sono 24.',
    attrezzi: [{ nome: 'classe.persone', ok: true }],
    risultati: [{
      procedura: 'classe.persone',
      titolo: 'Le persone della classe',
      blocchi: [
        { tipo: 'valori', voci: [{ etichetta: 'Persone', valore: '24' }] },
        {
          tipo: 'tabella',
          colonne: [{ testo: 'Cognome', allinea: 'sinistra' }],
          righe: [['Rossi']],
          quante: 24,
          troncata: true,
        },
      ],
    }],
  }

  const passa = (ingresso) =>
    api.procedura('assistente.stacca').ingresso['~standard'].validate(ingresso)

  it('i risultati impaginati arrivano dall’altra parte', () => {
    const esito = passa({ storia: [turno] })
    assert.equal(esito.issues, undefined, JSON.stringify(esito.issues))
    assert.deepEqual(esito.value.storia[0], turno)
  })

  it('i blocchi passano interi, riga per riga', () => {
    const esito = passa({ storia: [turno] })
    const [valori, tabella] = esito.value.storia[0].risultati[0].blocchi
    assert.deepEqual(valori.voci, [{ etichetta: 'Persone', valore: '24' }])
    assert.deepEqual(tabella.righe, [['Rossi']])
    // Anche `quante` e `troncata`: senza, una tabella tagliata si legge come
    // intera, che è il modo peggiore di sbagliare in un registro.
    assert.equal(tabella.quante, 24)
    assert.equal(tabella.troncata, true)
  })

  it('la mezza domanda viaggia con la conversazione', () => {
    const esito = passa({ storia: [], bozza: 'quante ore ha perso la ' })
    assert.equal(esito.issues, undefined, JSON.stringify(esito.issues))
    assert.equal(esito.value.bozza, 'quante ore ha perso la ')
  })

  it('e senza bozza l’ingresso resta buono: si stacca anche a campo vuoto', () => {
    const esito = passa({ storia: [] })
    assert.equal(esito.issues, undefined)
    assert.equal(esito.value.bozza, undefined)
  })

  // Il caso per cui si stacca più spesso di ogni altro: la risposta tarda, e il
  // riquadro sta stretto proprio mentre si aspetta. Il filo con il modello vive
  // nell'host — chiudere una finestra non lo ferma — e quel che viaggia è il
  // conto degli eventi già visti. Senza questo campo lo schema lo scartava in
  // silenzio, e l'host non sapeva che c'era un giro da tenere da parte: la
  // domanda diventava «Fermato.» e si ribatteva da capo.
  it('la domanda ancora senza risposta viaggia con la conversazione', () => {
    const esito = passa({ storia: [turno], giro: { visti: 3 } })
    assert.equal(esito.issues, undefined, JSON.stringify(esito.issues))
    assert.deepEqual(esito.value.giro, { visti: 3 })
  })

  it('un giro appena partito ha zero eventi visti, e zero è un numero', () => {
    const esito = passa({ storia: [turno], giro: { visti: 0 } })
    assert.equal(esito.issues, undefined, JSON.stringify(esito.issues))
    assert.equal(esito.value.giro.visti, 0)
  })

  it('e un conto che non è un conto non passa: l’host riconsegnerebbe a caso', () => {
    assert.ok(passa({ storia: [], giro: { visti: -1 } }).issues)
    assert.ok(passa({ storia: [], giro: { visti: 'tre' } }).issues)
    assert.ok(passa({ storia: [], giro: {} }).issues)
  })
})

// Il giro che cambia finestra.
//
// Il filo con il modello vive nell'host e non nella pagina: chiudere una
// finestra non lo ferma, e fin qui quel che tornava non trovava più nessuno —
// staccare o riattaccare mentre si aspettava voleva dire buttare via la domanda
// e ribatterla. Siccome si stacca **proprio** quando la risposta tarda, il giro
// perduto era sempre il più lungo.
//
// Qui l'assistente è spento — non c'è nessun modello su questa macchina — e la
// conversazione finisce subito in un guasto: è quel che serve, perché quel che
// si prova non è la risposta, è **a chi arriva**.
describe('il giro che cambia finestra', () => {
  const domanda = (id) => ({ id, storia: [{ ruolo: 'utente', testo: 'che corsi ho?' }] })

  it('sospeso, quel che torna aspetta la finestra nuova invece di cadere', async () => {
    const prima = []
    const partita = api.rispondiConversazione(archivio, domanda(1), (m) => prima.push(m))
    const chiave = api.sospendiGiroInCorso()
    assert.notEqual(chiave, null)
    await partita

    // Alla finestra che se n'è andata non arriva niente: sta per chiudersi, e
    // quel che le si scrivesse adesso sarebbe scritto su una pagina morta.
    assert.deepEqual(prima, [])

    const dopo = []
    assert.equal(api.riprendiGiro(chiave, 9, 0, (m) => dopo.push(m)), true)
    assert.equal(dopo.length, 1)
    // L'id è quello della finestra nuova e non quello di chi aveva chiesto:
    // il filo è lo stesso, chi lo ascolta no.
    assert.equal(dopo[0].id, 9)
    assert.equal(dopo[0].evento, 'guasto')
  })

  it('«da» salta quel che la finestra di prima aveva già visto', async () => {
    const partita = api.rispondiConversazione(archivio, domanda(2), () => undefined)
    const chiave = api.sospendiGiroInCorso()
    await partita

    // Un evento era già arrivato di là, ed è già disegnato nel turno che
    // viaggia: riconsegnarlo vorrebbe dire lo stesso attrezzo due volte sotto
    // la stessa risposta.
    const dopo = []
    assert.equal(api.riprendiGiro(chiave, 3, 1, (m) => dopo.push(m)), true)
    assert.deepEqual(dopo, [])
  })

  it('ripreso una volta non si riprende due: quel che c’era dentro non resta', async () => {
    const partita = api.rispondiConversazione(archivio, domanda(4), () => undefined)
    const chiave = api.sospendiGiroInCorso()
    await partita
    api.riprendiGiro(chiave, 5, 0, () => undefined)
    // Dentro un giro ci sono le tabelle lette dal registro, cioè i nomi di una
    // classe: consegnate, non restano in mano all'host.
    assert.equal(api.riprendiGiro(chiave, 6, 0, () => undefined), false)
  })

  it('un giro che non c’è più si dice, invece di non rispondere più', () => {
    assert.equal(api.riprendiGiro(9999, 1, 0, () => undefined), false)
  })

  it('senza niente in volo non c’è niente da sospendere', async () => {
    // Finita e consegnata, la domanda non è più un giro: quel che si è detto sta
    // nei turni, e viaggia da sé.
    await api.rispondiConversazione(archivio, domanda(7), () => undefined)
    assert.equal(api.sospendiGiroInCorso(), null)
  })
})

// Nel prompt non c'è nessuno.
//
// La prova nasce da un guasto riportato da chi usa il registro: l'assistente
// ha risposto nominando «Rossi Mario», e Rossi Mario fra gli allievi non
// c'era. Non era un'allucinazione dal nulla — quel nome stava **in una nostra
// riga**, dentro le istruzioni, in un esempio che mostrava la forma di una
// risposta giusta: «Rossi Mario, 12 UD perse». Un modello piccolo non
// distingue un esempio di forma da un dato, e quella riga gli arrivava a ogni
// domanda insieme ai nomi veri della classe.
//
// La regola è quindi semplice e assoluta: **in quel che il modello legge prima
// della domanda non c'è nessun dato di questo registro**, e in particolare
// nessuna cosa che si possa leggere come una persona. Gli esempi servono a
// mostrare la forma di un campo — corta, minuscola, incompleta — e per quello
// una sigla di classe va bene quanto un cognome, senza somigliare a nessuno.
describe('nel prompt non c’è nessuno', () => {
  // Cognomi e nomi di battesimo fra i più comuni in italiano: bastano a
  // prendere la ricaduta, che è sempre qualcuno che scrive un esempio
  // «realistico» per farsi capire meglio.
  const PERSONE = [
    'rossi', 'bianchi', 'ferrari', 'russo', 'esposito', 'colombo', 'ricci',
    'mario', 'giuseppe', 'anna', 'maria', 'luca', 'giulia', 'marco', 'paolo',
  ]

  const dovePuòNascondersi = async () => {
    const { perGriglia } = await import('../../dist-tests/llm.mjs')
    const pezzi = [['le istruzioni', api.istruzioni()]]
    for (const attrezzo of api.attrezzi()) {
      pezzi.push([`il titolo di ${attrezzo.nome}`, attrezzo.descrizione])
      const dentro = perGriglia(attrezzo.ingresso).properties ?? {}
      for (const [campo, forma] of Object.entries(dentro)) {
        pezzi.push([`${attrezzo.nome}.${campo}`, forma.description ?? ''])
      }
    }
    return pezzi
  }

  it('nessun esempio si può leggere come una persona del registro', async () => {
    const colpevoli = []
    for (const [dove, testo] of await dovePuòNascondersi()) {
      for (const nome of PERSONE) {
        if (new RegExp(`\\b${nome}\\b`, 'i').test(testo)) colpevoli.push(`${dove}: «${nome}»`)
      }
    }
    assert.deepEqual(
      colpevoli,
      [],
      `un nome di persona arriva al modello e può tornare indietro come un allievo: ${
        colpevoli.join(' · ')}`,
    )
  })

  it('e nemmeno un nome che non è in quell’elenco: si guarda la forma', async () => {
    // La prova di sopra tiene una lista, e una lista copre quel che qualcuno ha
    // già pensato. Questa guarda invece **come è fatto** un nome di persona in
    // questo dominio: due parole con l'iniziale grande, fra virgolette, che è
    // esattamente la forma in cui un esempio «realistico» viene scritto —
    // «Rossi Mario», «Bernasconi Elia». Non serve conoscere il cognome.
    //
    // Le cose legittime non hanno questa forma: «Anno intero», «Modelli
    // linguistici» e «I MEC A — Matematica» hanno la seconda parola minuscola o
    // non sono due parole.
    //
    // Il nome non deve essere in fondo alle virgolette: l'esempio che ha
    // causato il guasto era «Rossi Mario, 12 UD perse», con la cifra attaccata.
    // Una prima versione di questa regex pretendeva la chiusura subito dopo il
    // cognome e non lo prendeva — provata mettendo un nome dentro le istruzioni
    // e guardandola cadere, che è l'unico modo di sapere se una guardia
    // guarda.
    const comeUnNome = /«[^»]*[A-ZÀ-Ý][a-zà-ÿ]+ [A-ZÀ-Ý][a-zà-ÿ]+/
    const colpevoli = []
    for (const [dove, testo] of await dovePuòNascondersi()) {
      const trovato = testo.match(comeUnNome)
      if (trovato) colpevoli.push(`${dove}: ${trovato[0]}`)
    }
    assert.deepEqual(
      colpevoli,
      [],
      `qualcosa di fatto come un nome e cognome arriva al modello: ${colpevoli.join(' · ')}`,
    )
  })

  it('e lo dice, perché la regola valga anche per gli esempi che verranno', () => {
    const testo = api.istruzioni()
    assert.match(testo, /non c’è nessun dato di questo registro/)
    assert.match(testo, /nessuno si chiama come un\n?\s*esempio scritto qui/)
  })
})

// Che cosa una conversazione si ricorda, e che cosa no.
//
// Fino a qui fra un turno e l'altro non sopravviveva niente: `storia` porta
// ruolo e testo, e i risultati degli attrezzi restavano fuori. «Chi ha assenze
// in DIC4a?» e poi «e quante ne ha Bernasconi?» erano due domande senza
// parentela — la seconda ricominciava da una ricerca per nome per ritrovare un
// id che era passato un turno prima.
//
// La memoria che si è aggiunta ricorda **gli id e i nomi, mai le cifre**, ed è
// la distinzione che la rende sicura. Un id è stabile: `alv-7` è quella persona
// oggi e l'anno prossimo. Una quota di assenza no — basta che qualcuno faccia
// l'appello — e una cifra vecchia riproposta come attuale, in un registro di
// classe, è plausibile e si trascrive.
describe('quel che la conversazione si ricorda', () => {
  it('raccoglie gli id con il nome con cui si leggono, anche annidati', () => {
    const busta = {
      dal: '2026-09-01',
      periodi: [{ semestreId: 'sem-1', etichetta: '1° semestre' }],
      persone: [
        { allievoId: 'alv-7', nomeCompleto: 'Bernasconi Elia', classeId: 'cls-4', classe: 'DIC4a' },
        { allievoId: 'alv-9', nomeCompleto: 'Pedrazzini Nora', classeId: 'cls-4', classe: 'DIC4a' },
      ],
    }
    assert.deepEqual(api.idVisti(busta), [
      { id: 'alv-7', nome: 'Bernasconi Elia', cosa: 'allievo' },
      { id: 'cls-4', nome: 'DIC4a', cosa: 'classe' },
      { id: 'alv-9', nome: 'Pedrazzini Nora', cosa: 'allievo' },
    ])
  })

  it('un id senza il suo nome non si tiene', () => {
    // Nel testo che il modello legge sarebbe una riga che non dice di chi si
    // tratta: contesto speso per niente, e un id che non saprebbe collegare a
    // nessuna domanda.
    assert.deepEqual(api.idVisti({ allievoId: 'alv-7' }), [])
    assert.deepEqual(api.idVisti({ allievoId: 'alv-7', nomeCompleto: '' }), [])
  })

  it('la convenzione regge su una busta vera, non solo su un oggetto scritto qui', async () => {
    // È la prova che conta: i nomi dei campi li decidono le procedure, e questa
    // memoria li dà per noti. Se domani `persone.assenze` chiamasse la persona
    // in un altro modo, la raccolta smetterebbe di trovarla **in silenzio** —
    // e la conversazione tornerebbe a cercare per nome senza che nulla lo dica.
    // Si passa da `usaAttrezzo`, cioè dalla strada vera, e non da `idVisti` su
    // un oggetto scritto a mano qui: un oggetto scritto qui prova solo che so
    // che cosa ho scritto.
    const { visti } = await api.usaAttrezzo(
      archivio,
      chiamata('persone_assenze', { conAssenze: false }),
    )
    assert.ok(
      visti?.some((v) => v.cosa === 'allievo' && v.nome !== ''),
      `da una busta di persone.assenze non si è imparato nessun allievo: ${JSON.stringify(visti)}`,
    )
    assert.ok(
      visti?.some((v) => v.cosa === 'classe' && v.nome !== ''),
      'e nemmeno la classe, che sta nella stessa riga',
    )
  })

  it('i più recenti vincono, e l’elenco non cresce all’infinito', () => {
    const prima = [{ id: 'alv-1', nome: 'Primo', cosa: 'allievo' }]
    const adesso = [{ id: 'alv-2', nome: 'Secondo', cosa: 'allievo' }]
    assert.deepEqual(api.ultimiVisti(prima, adesso).map((v) => v.id), ['alv-2', 'alv-1'])
    // Lo stesso id due volte resta uno solo, con il nome più fresco.
    const rivisto = api.ultimiVisti(prima, [{ id: 'alv-1', nome: 'Primo Bis', cosa: 'allievo' }])
    assert.deepEqual(rivisto, [{ id: 'alv-1', nome: 'Primo Bis', cosa: 'allievo' }])
    // E il tetto: la lista finisce nel testo che precede ogni domanda dopo, e
    // un elenco che cresce a ogni lettura si mangia il posto dei dati.
    const tanti = Array.from({ length: 60 }, (_, i) => ({
      id: `alv-${i}`, nome: `Persona ${i}`, cosa: 'allievo',
    }))
    assert.equal(api.ultimiVisti([], tanti).length, 40)
  })

  it('al modello si dice a che cosa servono, e soprattutto che cosa non sono', () => {
    const testo = api.ricordaIdVisti([{ id: 'alv-7', nome: 'Bernasconi Elia', cosa: 'allievo' }])
    assert.match(testo, /Bernasconi Elia \(allievo\) = alv-7/)
    // A che cosa servono.
    assert.match(testo, /passa il suo id all’attrezzo invece di cercarlo di nuovo/)
    // E che cosa non sono: è la metà che evita che un elenco di nomi messo
    // davanti a un modello piccolo diventi la risposta a «chi c’è in DIC4a?».
    assert.match(testo, /Non sono una risposta/)
    assert.match(testo, /non c’è dentro nessuna cifra/)
    assert.match(testo, /questa non è quella lista/)
  })

  it('senza niente da ricordare non si scrive niente', () => {
    assert.equal(api.ricordaIdVisti([]), '')
  })
})
