// Il cancello dell'assistente: che cosa il modello vede e che cosa gli si
// lascia eseguire. Si prova che il modello **non possa scrivere**, esercitando
// `usaAttrezzo` direttamente (senza motore), nei quattro modi in cui ci prova:
//
//   1. un nome inventato («presenze.riga»);
//   2. il nome vero di una scrittura («ore.appello.riga»);
//   3. argomenti che non sono JSON;
//   4. un id che non esiste.
//
// Nessuno solleva né muove la revisione: il modello riceve un errore da
// leggere. E gli attrezzi mandati sono **soltanto** le letture.

import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-assistente-')

let api
let archivio
let corso
let lezione

/**
 * Una chiamata come arriva dal motore (`ChiamataAttrezzo` in `data/llm.ts`):
 * nome col trattino basso, argomenti come sono.
 */
function chiamata (nome, argomenti) {
  return { nome, argomenti }
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati }))

  const {
    creaAllievo, creaClasse, creaCorso, creaLezione, creaMateria,
  } = api

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
 * Le procedure non di lettura che il modello può chiamare lo stesso. Scritte a
 * mano apposta: se cambiano, lo guarda una persona.
 */
const DEROGHE = ['vista.apri']

describe('gli attrezzi che il modello riceve', () => {
  it('sono le letture, più le sole deroghe dichiarate', () => {
    // Le condizioni di `offribile()` (`api/tools.ts`) riscritte a mano, perché
    // importarle proverebbe che una funzione è uguale a se stessa. La terza,
    // `perAssistente !== false`, esclude le letture inutili a un docente.
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

    // La deroga la dichiara la procedura; l'elenco sopra è il conto da rifare.
    const deroganti = scritture.filter((p) => p.assistente === true).map((p) => p.nome)
    assert.deepEqual(deroganti.sort(), [...DEROGHE].sort())

    // Si concede solo a quel che non tocca l'archivio (`collezioni` vuoto).
    for (const p of scritture.filter((s) => s.assistente === true)) {
      assert.deepEqual(
        [...(p.collezioni ?? [])],
        [],
        `${p.nome} tocca delle collezioni e non può essere data al modello`,
      )
    }
  })

  it('nessun nome contiene un punto', () => {
    // Niente punti nei nomi: i modelli li leggono come accesso a un campo.
    const coi = api.attrezzi().map((a) => a.nome).filter((n) => n.includes('.'))
    assert.deepEqual(coi, [])
  })

  it('il catalogo intero sta nel contesto che si apre, con del posto avanzato', async () => {
    // Il catalogo deve stare nel contesto insieme alle letture di un giro, o il
    // prompt di sistema non ci sta. Si contano i **caratteri** degli schemi per la
    // griglia (i token richiederebbero un `.gguf`): circa 2,7 caratteri per token.
    // Se cade non si alza la soglia: si toglie peso al catalogo (aiuti più corti,
    // meno campi, `perAssistente: false` sulle letture che non servono).
    const { perGriglia } = await import('../../dist-tests/llm.mjs')
    const pesi = api.attrezzi()
      .map((a) => [a.nome, a.descrizione.length + JSON.stringify(perGriglia(a.ingresso)).length])
      .sort((uno, altro) => altro[1] - uno[1])
    const schemi = pesi.reduce((conto, [, peso]) => conto + peso, 0)
    const caratteri = schemi + api.istruzioni().length
    // I più pesanti li dice il messaggio: chi legge la prova rotta sa dove tagliare.
    const primi = pesi.slice(0, 5).map(([nome, peso]) => `${nome} ${peso}`).join(', ')

    // Il tetto: contesto di 16 384 token; 26 000 caratteri sono circa 9600 token e
    // lasciano posto a tre letture di fila da 6000 caratteri (`LIMITE_RISULTATO`),
    // cioè il giro «elenca, scegli, chiedi». Resta fuori dal conto la nota di
    // `componiBattute`, tenuta bassa dai tetti di `descriviContesto` e
    // `ricordaIdVisti`.
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
    // Gli stessi campi della procedura: un campo tolto dallo schema il modello non
    // lo può più passare. `ritirati` serve a richiamare con i ritirati quando la
    // busta dice `esclusiRitirati` > 0 e l'elenco è vuoto.
    assert.deepEqual(
      Object.keys(presenze.ingresso.properties).sort(),
      ['al', 'corsoId', 'dal', 'ritirati', 'semestreId'],
    )
    assert.deepEqual(presenze.ingresso.required, ['corsoId'])
    // La descrizione è il titolo della procedura: una verità sola.
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
    // Il nome col punto, come `AttrezzoUsato.nome`: la pagina lo disegna accanto
    // agli altri.
    assert.equal(usato.nome, 'presenze.riga')
    // Nel messaggio resta com'è arrivato: è il nome da smettere di usare.
    assert.match(testo, /«presenze_riga»/)
  })

  it('una scrittura vera viene rifiutata, e l’appello resta com’era', async () => {
    const prima = archivio.revisione
    const { testo, usato } = await api.usaAttrezzo(
      archivio,
      // `ore.appello.riga` esiste ed è una scrittura con argomenti buoni: il rifiuto
      // viene dal cancello, **prima** della convalida.
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
    // Rifiutate **dal cancello**: con un ingresso vuoto una scrittura cadrebbe
    // anche sulla convalida (`ingresso-non-valido`) e nasconderebbe un cancello
    // aperto.
    const perAltro = []
    for (const p of api.procedure().filter((s) => s.genere === 'scrittura')) {
      // Le deroghe si provano a parte: qui cadrebbero sulla convalida.
      if (p.assistente === true) continue
      const { usato } = await api.usaAttrezzo(archivio, chiamata(p.nome.replace(/\./g, '_'), {}))
      if (usato.ok) rifiutate.push(p.nome)
      else if (usato.codice !== 'non-permesso') perAltro.push(`${p.nome} (${usato.codice})`)
    }
    assert.deepEqual(rifiutate, [], `scritture eseguite dall’assistente: ${rifiutate.join(', ')}`)
    assert.deepEqual(perAltro, [], `scritture fermate non dal cancello: ${perAltro.join(', ')}`)
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
    // La griglia di `node-llama-cpp` esige **tutte** le proprietà dichiarate, quindi
    // per un filtro opzionale il modello può solo mettere `null`: il cancello lo
    // tratta come campo omesso, altrimenti le letture verrebbero rifiutate.
    const busta = await api.usaAttrezzo(
      archivio,
      chiamata('classi_elenco', { annoId: null, archiviate: null, cerca: null }),
    )
    assert.equal(busta.usato.ok, true, busta.testo)
    assert.match(busta.testo, /I MEC A/)

    // Con i campi omessi va uguale: le due forme non divergono.
    const vuota = await api.usaAttrezzo(archivio, chiamata('classi_elenco', {}))
    assert.deepEqual(JSON.parse(busta.testo), JSON.parse(vuota.testo))
  })

  it('un null che lo schema accetta come valore non si tocca', () => {
    // L'altra metà: un campo `nullabile()` tiene il suo `null`, perché lì `null` è
    // un valore («qui non c'è»), non il silenzio della griglia.
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

// Il giro a vuoto: lo stesso attrezzo che torna lo stesso errore più volte di
// fila. La busta gli ricorda che ci è già passato.
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
      // Id diversi, stesso errore: si conta per attrezzo e codice, non per argomenti.
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

  // Un consiglio per codice: su `ingresso-non-valido` si corregge il campo, non
  // si va a cercare un altro id.
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

    // Su un errore di forma il tentativo dopo può riuscire: nessun ordine di
    // arrendersi.
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

  // Un giro a vuoto è fatto di fallimenti di fila: un successo azzera il conto.
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
// Fra la griglia e la convalida del nucleo: quel che passa di qui è la
// differenza fra una chiamata che risponde e un rifiuto letto come «non c'è
// niente».
describe('gli argomenti che il modello compone', () => {
  it('i filtri lasciati vuoti si tolgono, invece di far rifiutare la chiamata', async () => {
    // `cerca: ""` e `stati: []` sono il modo in cui un modello lascia vuoto un
    // filtro: valgono come campo omesso.
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
    // L'altra metà: un campo richiesto non si toglie, o la chiamata si allarga a
    // tutto il registro. Lì il rifiuto è giusto.
    const { usato } = await api.usaAttrezzo(archivio, chiamata('corso_presenze', { corsoId: '' }))
    assert.equal(usato.ok, false)
    assert.equal(usato.codice, 'ingresso-non-valido')
  })

  // `oggetto()` scarta in silenzio le chiavi che non dichiara: chi scrive
  // «classe» invece di «classeId» riceverebbe tutto il registro. Il cancello dice
  // quale campo non esiste e quello giusto.
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

  // La griglia genera già la forma giusta; queste prove valgono per un motore
  // senza griglia collegato a `Motore.chatta`.
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
    // Lo stesso un piano più giù: `stati: [null]` perde il `null`.
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
    // `qualunque()` si stampa senza `type` e accetta `null`: lì il `null` resta.
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
    // Una lettura non muove la revisione.
    assert.equal(archivio.revisione, prima)
  })

  // La stessa chiamata dà il JSON al modello e la busta impaginata alla pagina:
  // la tabella che si legge viene dal registro, non dal modello. L'impaginazione
  // la prova `presentation.test.mjs`.
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
    // `modelli.prova` torna un PDF e non dichiara presentazione: niente griglia.
    const { risultato } = await api.usaAttrezzo(archivio, chiamata('registro_riassunto', {}))
    assert.ok(risultato, 'il riassunto si mostra')
    assert.equal(risultato.blocchi.length, 1)
  })

  it('gli argomenti mandati come stringa JSON si accettano lo stesso', async () => {
    // Gli argomenti arrivano come oggetto o come stringa JSON secondo il servizio:
    // il cancello regge tutti e due.
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
    // Il tracciato è quello della conversazione: così le chiamate di un giro si
    // ritrovano insieme.
    assert.equal(viste[0].tracciato, 'chat-xyz')
  })
})

// ------------------------------------------------ quel che torna al modello
//
// Il risultato accorciato resta JSON valido e con righe intere: un modello che
// non riesce ad aprire la busta ripiega su «non ho trovato niente».
describe('il risultato accorciato', () => {
  before(async () => {
    // Una classe abbastanza grande da non stare in seimila caratteri.
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
    // I conti di «quanti sono» valgono su tutte le righe e non si perdono.
    for (const campo of ['dal', 'al', 'sogliaUsata', 'guardate', 'quante']) {
      assert.ok(campo in letto, `manca il campo d’insieme «${campo}»`)
    }
    const conto = letto.perIlModello.elenchi.persone
    assert.equal(conto.mostrate, letto.persone.length)
    assert.ok(conto.mostrate < conto.di, `${conto.mostrate} su ${conto.di}`)
    // Le righe che arrivano sono intere.
    assert.equal(typeof letto.persone[0].nomeCompleto, 'string')
  })

  it('dice come si vede il resto, e non consiglia di guardare meno giorni', async () => {
    const { testo } = await tagliata()
    const avviso = JSON.parse(testo).perIlModello.avviso
    // Niente «periodo più corto»: su una domanda di assenze vorrebbe dire trovarne
    // meno.
    assert.doesNotMatch(avviso, /periodo più corto/)
    // Né «da», che non è nel catalogo del modello: gli si dice di dichiarare
    // quante ne ha viste e di restringere con un filtro che la domanda nomina.
    assert.doesNotMatch(avviso, /«da»/)
    assert.match(avviso, /quante ne hai viste su quante/)
    assert.match(avviso, /restringi con un filtro che la domanda nomina/)
  })

  it('e la pagina non si offre più al modello, ma resta nel contratto', async () => {
    // La paginazione resta fuori dall'elenco mandato al modello (pesa sul
    // catalogo) ma dentro lo schema pubblicato.
    const suo = api.attrezzi().find((a) => a.nome === 'persone_assenze')
    assert.equal(suo.ingresso.properties.da, undefined)
    assert.equal(suo.ingresso.properties.quanti, undefined)
    // Il contratto invece li ha: è quel che vede uno script dal condotto.
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

// L'unica cosa oltre a leggere. Sta qui perché passa dallo stesso cancello.
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
      // Cambiare pagina non è una scrittura.
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
    // La procedura non espone `nuovo` e `avvio` di `MessaggioNavigazione`: un
    // modulo di creazione aperto dal modello è il primo passo verso una scrittura.
    // Si guarda lo schema pubblicato perché `oggetto()` scarta in silenzio.
    const attrezzo = api.attrezzi().find((a) => a.nome === 'vista_apri')
    assert.ok(attrezzo, 'vista.apri non è fra gli attrezzi')
    assert.deepEqual(
      Object.keys(attrezzo.ingresso.properties).sort(),
      ['data', 'elementoId', 'vista'],
    )
  })
})

// ------------------------------------------------------ la lingua della risposta

// Un modello piccolo torna all'inglese dopo un giro di attrezzi. La regola
// della lingua sta in testa e in coda alle istruzioni (e nella nota di
// `componiBattute`): queste prove tengono ferme le prime due.
describe('la lingua in cui il modello deve rispondere', () => {
  const righe = () => api.istruzioni().split('\n').filter((riga) => riga.trim() !== '')

  it('è la prima cosa che le istruzioni dicono', () => {
    assert.match(righe()[0], /^Scrivi in italiano\./)
  })

  // L'ultima delle istruzioni: dopo vengono il catalogo e la conversazione, e la
  // nota dell'ultima domanda la ripete.
  it('è anche l’ultima delle istruzioni', () => {
    assert.match(righe().at(-1), /la risposta è in italiano/)
  })

  it('non lascia fuori quel che arriva dagli attrezzi', () => {
    assert.match(api.istruzioni(), /anche se quel che ti tornano gli attrezzi non lo è/)
  })

  // Cognomi, classi e materie sono nomi: tradotti non si ritrovano nel registro.
  it('dice che i nomi non si traducono', () => {
    assert.match(api.istruzioni(), /I nomi delle persone, delle classi e delle materie non si\s+traducono/)
  })
})

// ------------------------------------------- le reti che devono poter scattare
//
// Le regole delle istruzioni parlano di un fatto, non di nomi di campo o di
// attrezzo: una regola che nomina il posto sbagliato non scatta mai.
describe('le regole che devono valere anche per i campi che verranno', () => {
  it('l’elenco vuoto si riconosce dal fatto, non da quattro nomi di campo', () => {
    const testo = api.istruzioni()
    assert.match(testo, /Vale sul fatto e non sui nomi dei campi/)
    assert.match(testo, /è maggiore di zero e le righe sono zero/)
    assert.match(testo, /togli \*\*un\n?\s*filtro per volta\*\* e richiama/)
    // I contatori veri sono nominati come esempi, non come elenco chiuso.
    assert.match(testo, /«guardate»/)
    assert.match(testo, /«esclusiRitirati»/)
  })

  it('il «cerca» vale su ogni lettura che ce l’ha, non solo su «persone_cerca»', () => {
    const testo = api.istruzioni()
    assert.match(testo, /«cerca» c’è su quasi ogni lettura/)
    assert.match(testo, /un nome o un pezzo di nome/)
    assert.match(testo, /Lo stesso su ogni attrezzo/)
  })

  // I campi nominati esistono in **uscita** da qualche lettura.
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

// Di che cosa si sta parlando: senza, il modello sceglie una riga plausibile di
// un elenco e risponde sicuro sulla classe sbagliata.
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

  // Le alternative con gli id: «e la terza?» non costringe a indovinare.
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

  // Le scelte dipendono l'una dall'altra (anno, classe, corso, ora): le
  // alternative sono quelle dentro la scelta di sopra.
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
    // Le alternative si dicono ristrette («dentro Classe»).
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
    // `lezioneId` è `null`: non si offre un id che non esiste.
    assert.doesNotMatch(testo, /lezioneId/)
  })

  // `corso.presenze` vuole `dal` e `al` e non sa di semestri: il periodo si dà in
  // date.
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
      scheda: 'Modelli locali',
      sezione: 'Assistente',
    })
    assert.match(testo, /Scheda aperta: Modelli locali/)
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
  // Il testo non ordina di passarli tutti: dice quali valgono sempre e quali
  // solo se la domanda li nomina. Un `corsoId` passato senza che nessuno l'abbia
  // nominato restringe `persone.assenze` fino alla busta vuota. La metà a monte
  // sta in `ui/viewpoint.ts`.
  describe('gli id, divisi fra dove si è e che cosa si è nominato', () => {
    it('dice «dove si sta guardando» per anno e classe, e basta', () => {
      const testo = api.descriviContesto(veduta)
      const riga = testo.split('\n').find((r) => r.startsWith('Gli id di dove si sta guardando'))
      assert.ok(riga, 'manca la riga degli id di dove si è')
      assert.match(riga, /annoId=ann-0001/)
      assert.match(riga, /classeId=cls-0001/)
      // Il corso **non** sta lì dentro.
      assert.doesNotMatch(riga, /corsoId/)
      // Nemmeno il semestre: le letture che contano nel tempo lo accettano, e
      // passarlo di suo risponderebbe su mezzo anno.
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
      // Il semestre si argomenta: senza filtro la risposta ha tutti i periodi.
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

    // Corso e classe che non combaciano danno una busta vuota indistinguibile da
    // «non c'è niente»: il contesto lo dice.
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

    // Una regola che allarga, accanto alle tre che restringono.
    it('ha anche la regola che allarga, e dice di dichiararlo', () => {
      const testo = api.descriviContesto(veduta)
      assert.match(testo, /non nomina né sottintende il corso/)
      assert.match(testo, /rispondi \*\*in generale\*\*/)
      assert.match(testo, /su tutto il registro/)
    })
  })

  // Il contesto sta in una finestra da 12288–16384 token, già più che mezza
  // occupata dal catalogo. Se il prompt di sistema non ci sta, `node-llama-cpp`
  // cancella le chiamate d'attrezzo già fatte: da qui i tetti.
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
      // Trentanove alternative, dodici scritte: le altre ventisette si contano.
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
      // Il tetto: una riga non pesa come le istruzioni intere.
      assert.ok(riga.length < 700, `la riga misura ${riga.length} caratteri`)
    })
  })
})

// Staccare non perde niente per strada: `oggetto()` scarta in silenzio le
// chiavi non dichiarate, quindi si manda un turno intero (con le tabelle) e si
// guarda che esca intero.
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
    // Anche `quante` e `troncata`: senza, una tabella tagliata si legge intera.
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

  // Si stacca soprattutto mentre la risposta tarda: il filo vive nell'host e
  // viaggia il conto degli eventi già visti, perché l'host tenga da parte il giro.
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

// Il giro che cambia finestra: il filo col modello vive nell'host, e quel che
// torna va alla finestra nuova. Qui l'assistente è spento e la conversazione
// finisce subito in un guasto: si prova **a chi arriva**, non la risposta.
describe('il giro che cambia finestra', () => {
  const domanda = (id) => ({ id, storia: [{ ruolo: 'utente', testo: 'che corsi ho?' }] })

  it('sospeso, quel che torna aspetta la finestra nuova invece di cadere', async () => {
    const prima = []
    const partita = api.rispondiConversazione(archivio, domanda(1), (m) => prima.push(m))
    const chiave = api.sospendiGiroInCorso()
    assert.notEqual(chiave, null)
    await partita

    // Alla finestra che se ne va non arriva niente.
    assert.deepEqual(prima, [])

    const dopo = []
    assert.equal(api.riprendiGiro(chiave, 9, 0, (m) => dopo.push(m)), true)
    assert.equal(dopo.length, 1)
    // L'id è quello della finestra nuova: il filo è lo stesso, chi ascolta no.
    assert.equal(dopo[0].id, 9)
    assert.equal(dopo[0].evento, 'guasto')
  })

  it('«da» salta quel che la finestra di prima aveva già visto', async () => {
    const partita = api.rispondiConversazione(archivio, domanda(2), () => undefined)
    const chiave = api.sospendiGiroInCorso()
    await partita

    // Gli eventi già consegnati di là non si riconsegnano.
    const dopo = []
    assert.equal(api.riprendiGiro(chiave, 3, 1, (m) => dopo.push(m)), true)
    assert.deepEqual(dopo, [])
  })

  it('ripreso una volta non si riprende due: quel che c’era dentro non resta', async () => {
    const partita = api.rispondiConversazione(archivio, domanda(4), () => undefined)
    const chiave = api.sospendiGiroInCorso()
    await partita
    api.riprendiGiro(chiave, 5, 0, () => undefined)
    // Consegnato, il giro (con i nomi di una classe) non resta nell'host.
    assert.equal(api.riprendiGiro(chiave, 6, 0, () => undefined), false)
  })

  it('un giro che non c’è più si dice, invece di non rispondere più', () => {
    assert.equal(api.riprendiGiro(9999, 1, 0, () => undefined), false)
  })

  it('senza niente in volo non c’è niente da sospendere', async () => {
    // Finita e consegnata, la domanda non è più un giro: sta nei turni.
    await api.rispondiConversazione(archivio, domanda(7), () => undefined)
    assert.equal(api.sospendiGiroInCorso(), null)
  })
})

// Nel prompt non c'è nessuno: quel che il modello legge prima della domanda
// non contiene dati del registro né nomi che sembrino persone. Un modello
// piccolo non distingue un esempio di forma («Rossi Mario, 12 UD perse») da un
// dato. Gli esempi usano forme corte e sigle di classe.
describe('nel prompt non c’è nessuno', () => {
  // Cognomi e nomi fra i più comuni in italiano.
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
    // Oltre alla lista, la forma di un nome: due parole con l'iniziale grande fra
    // virgolette («Rossi Mario»), anche con altro dopo («Rossi Mario, 12 UD»).
    // «Anno intero» o «I MEC A — Matematica» non hanno questa forma.
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

// Che cosa una conversazione si ricorda: **gli id e i nomi, mai le cifre**. Un
// id è stabile; una quota di assenza cambia al prossimo appello, e una cifra
// vecchia riproposta come attuale si trascrive.
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
    // Un id senza nome non dice di chi si tratta.
    assert.deepEqual(api.idVisti({ allievoId: 'alv-7' }), [])
    assert.deepEqual(api.idVisti({ allievoId: 'alv-7', nomeCompleto: '' }), [])
  })

  it('la convenzione regge su una busta vera, non solo su un oggetto scritto qui', async () => {
    // I nomi dei campi li decidono le procedure: si passa da `usaAttrezzo` (la
    // strada vera) così un campo rinominato rompe questa prova invece di far
    // smettere la memoria in silenzio.
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
    // Il tetto: la lista finisce nel testo che precede ogni domanda.
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
    // E che cosa non sono: un elenco di nomi non è la risposta a «chi c'è?».
    assert.match(testo, /Non sono una risposta/)
    assert.match(testo, /non c’è dentro nessuna cifra/)
    assert.match(testo, /questa non è quella lista/)
  })

  it('senza niente da ricordare non si scrive niente', () => {
    assert.equal(api.ricordaIdVisti([]), '')
  })
})

// ------------------------------------------------- l'ordine delle battute

// Il catalogo (più di ottomila token) la libreria lo scrive dopo le battute di
// sistema: quel che sta prima deve restare identico fra le domande perché il
// motore riusi il prefisso. Quel che cambia a ogni clic va in una nota davanti
// all'ultima domanda.
describe('l’ordine delle battute che il modello riceve', () => {
  const vedutaDi = (corsoId, oggi) => ({
    vista: 'valutazioni',
    pagina: 'Valutazioni',
    scheda: null,
    sezione: null,
    scelte: [{ campo: 'Corso', valore: `Corso ${corsoId}`, id: corsoId }],
    filtri: [],
    riferimenti: {
      annoId: 'ann-0001',
      semestreId: null,
      corsoId,
      classeId: 'cls-0001',
      lezioneId: null,
      allievoId: null,
      pianoId: null,
      valutazioneId: null,
    },
    periodo: null,
    data: oggi,
    oggi,
    ricerca: null,
    visibili: null,
  })
  const prima = vedutaDi('cor-0003', '2027-02-12')
  const dopo = vedutaDi('cor-0004', '2027-02-13')
  const visti = [{ id: 'alv-7', nome: 'Bernasconi Elia', cosa: 'allievo' }]
  const domanda = 'quante ore ha perso la I MEC A?'
  const storia = [
    { ruolo: 'utente', testo: 'chi c’è in classe?' },
    { ruolo: 'assistente', testo: 'Ventiquattro persone.' },
    { ruolo: 'utente', testo: domanda },
  ]
  const sistema = (battute) => battute.filter((b) => b.ruolo === 'sistema')

  it('ha una sola battuta di sistema, ed è le istruzioni, anche con veduta e visti', () => {
    const battute = api.componiBattute(storia, prima, visti)
    assert.deepEqual(sistema(battute), [{ ruolo: 'sistema', testo: api.istruzioni() }])
    assert.equal(battute[0].ruolo, 'sistema')
  })

  it('le battute di sistema non cambiano con la veduta né con gli id visti', () => {
    // Il prefisso riusato: un carattere diverso e il catalogo si rilegge intero.
    const una = sistema(api.componiBattute(storia, prima, []))
    const altra = sistema(api.componiBattute(storia, dopo, visti))
    const senza = sistema(api.componiBattute(storia, null, []))
    assert.deepEqual(una, altra)
    assert.deepEqual(una, senza)
  })

  it('contesto e id visti stanno nell’ultima domanda, prima del suo testo, che la chiude intatto', () => {
    const ultima = api.componiBattute(storia, prima, visti).at(-1)
    assert.equal(ultima.ruolo, 'utente')
    assert.ok(ultima.testo.endsWith(domanda), 'il testo della domanda deve chiudere la battuta')
    const contesto = ultima.testo.indexOf(api.descriviContesto(prima))
    const rubrica = ultima.testo.indexOf(api.ricordaIdVisti(visti))
    const inizio = ultima.testo.indexOf('[Nota del registro, non scritta da chi chiede]')
    const fine = ultima.testo.indexOf('[Fine della nota')
    const testo = ultima.testo.lastIndexOf(domanda)
    // Prima dove si sta guardando, poi la rubrica dei nomi.
    assert.ok(inizio === 0, 'la nota apre la battuta')
    assert.ok(inizio < contesto && contesto < rubrica && rubrica < fine && fine < testo)
    // Gli id della nota non sono nominati dalla domanda (la regola del `corsoId`).
    assert.match(ultima.testo, /non sono nominati\s+dalla domanda/)
    assert.match(ultima.testo, /rispondi in italiano/)
  })

  it('le battute di prima restano come sono, e la storia che arriva non si tocca', () => {
    const copia = structuredClone(storia)
    const battute = api.componiBattute(storia, prima, visti)
    assert.deepEqual(storia, copia)
    // Le battute fra le istruzioni e l'ultima sono la storia, senza note.
    assert.deepEqual(battute.slice(1, -1), copia.slice(0, -1))
    for (const b of battute.slice(1, -1)) assert.doesNotMatch(b.testo, /Nota del registro/)
  })

  it('senza veduta e senza id visti la domanda arriva com’è', () => {
    for (const veduta of [null, undefined]) {
      const battute = api.componiBattute(storia, veduta, [])
      assert.deepEqual(battute.at(-1), { ruolo: 'utente', testo: domanda })
      assert.equal(battute.length, storia.length + 1)
    }
  })

  it('se l’ultima battuta non è di chi chiede, non si incolla niente', () => {
    const finita = storia.slice(0, 2)
    const battute = api.componiBattute(finita, prima, visti)
    assert.deepEqual(battute.slice(1), finita)
    for (const b of battute) assert.doesNotMatch(b.testo, /Nota del registro/)
  })
})
