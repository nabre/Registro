// Che cosa finisce sullo schermo della classe.
//
// La prova che porta il peso è la prima: un blocco spento non deve produrre
// dati, non «dati che l'interfaccia non disegna». È la differenza fra una
// proiezione che si può lasciare accesa e una da sorvegliare — il registro
// tiene i voti e le assenze di venticinque persone, e il proiettore sta davanti
// a tutte e venticinque.
//
// Le altre provano che quel che si è acceso arriva davvero: uno schermo che non
// mostra la scaletta è inutile tanto quanto uno che mostra i voti di nascosto.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  BLOCCHI,
  BLOCCHI_PREDEFINITI,
  BLOCCHI_RISERVATI,
  PROIEZIONE_PREDEFINITA,
  blocchiAccesi,
  bloccoAperto,
  bloccoScorrendo,
  contenutoProiezione,
  creaAllievo,
  creaAnno,
  creaAttivita,
  creaClasse,
  creaConsegna,
  creaCorso,
  creaLezione,
  creaMateria,
  creaPiano,
  creaPresenza,
  creaValutazione,
  registroVuoto,
} from '../../dist-prove/dominio.mjs'

const GIORNO = '2026-10-12'

/**
 * Una classe di tre, un'ora con il suo piano, una verifica corretta e una
 * consegna aperta: tutto quel che i sette blocchi sanno mostrare.
 */
function aula () {
  const registro = registroVuoto()
  const anno = creaAnno('2026-09-01', '2027-06-30')
  const classe = creaClasse(anno.id, 'I MEC A')
  const rossi = creaAllievo('Rossi', 'Maria')
  const bianchi = creaAllievo('Bianchi', 'Luca')
  const verdi = creaAllievo('Verdi', 'Anna')
  classe.allievi.push(rossi, bianchi, verdi)
  const materia = creaMateria('Matematica')
  const corso = creaCorso(classe.id, materia.id, 'Matematica — I MEC A')

  const piano = creaPiano(corso.id)
  const introduzione = creaAttivita('Ripasso delle proporzioni', 0.5)
  const esercizi = creaAttivita('Esercizi a coppie', 1)
  piano.attivita.push(introduzione, esercizi)

  const lezione = creaLezione(corso.id, GIORNO, '08:20', 90)
  lezione.pianoId = piano.id
  lezione.argomenti = 'Proporzioni e percentuali'
  lezione.avanzamento.push({
    attivitaId: introduzione.id,
    titolo: introduzione.titolo,
    stato: 'svolta',
  })
  // Due presenti e un assente: l'appello dice tre nomi, e nessun altro blocco
  // deve saperlo.
  lezione.presenze.push(
    creaPresenza(rossi.id, 2, 'presente'),
    creaPresenza(bianchi.id, 2, 'presente'),
    creaPresenza(verdi.id, 2, 'assente'),
  )

  const verifica = creaValutazione(corso.id, 'Test sulle proporzioni')
  verifica.data = '2026-10-05'
  verifica.voti.push(
    { allievoId: rossi.id, valore: 5.5, assente: false },
    { allievoId: bianchi.id, valore: 3, assente: false },
    { allievoId: verdi.id, valore: null, assente: true },
  )

  const consegna = creaConsegna(corso.id, 'Esercizi 12–18', GIORNO, lezione.id)
  consegna.scadenza = '2026-10-19'

  const documento = creaConsegna(corso.id, 'Modulo per la gita', GIORNO)
  documento.documento = 'autorizzazione'
  documento.scadenza = '2026-10-26'
  documento.fatte.push({ chi: rossi.id, fattaIl: '2026-10-13T10:00:00.000Z' })

  registro.anni.push(anno)
  registro.annoCorrenteId = anno.id
  registro.classi.push(classe)
  registro.materie.push(materia)
  registro.corsi.push(corso)
  registro.piani.push(piano)
  registro.lezioni.push(lezione)
  registro.valutazioni.push(verifica)
  registro.consegne.push(consegna, documento)

  const mira = {
    lezioneId: lezione.id,
    corsoId: corso.id,
    classeId: classe.id,
    semestreId: null,
    data: GIORNO,
  }

  return { registro, mira, classe, corso, lezione, piano, verifica, rossi, bianchi, verdi }
}

function impostazioni (blocchi, resto = {}) {
  return { blocchi, nomi: false, sospesa: false, compatta: true, calendario: 'agenda', ...resto }
}

/** Tutto il pacchetto come testo: ci si cercano dentro i nomi che non ci devono stare. */
function comeTesto (contenuto) {
  return JSON.stringify(contenuto)
}

describe('quel che non si accende non esce dal registro', () => {
  it('un blocco spento non porta i suoi dati, nemmeno nascosti', () => {
    const { registro, mira } = aula()
    const contenuto = contenutoProiezione(registro, mira, impostazioni([]), GIORNO)

    for (const blocco of BLOCCHI) {
      const chiave = blocco === 'scaletta' ? 'scaletta' : blocco
      assert.equal(contenuto[chiave], null, `${blocco} doveva restare fuori`)
    }
  })

  it('i blocchi che parlano dei singoli allievi partono spenti', () => {
    for (const blocco of BLOCCHI_RISERVATI) {
      assert.ok(
        !BLOCCHI_PREDEFINITI.includes(blocco),
        `${blocco} non può essere acceso di suo`,
      )
    }
  })

  it('con i blocchi predefiniti nessun nome di allievo arriva sullo schermo', () => {
    const { registro, mira, rossi, bianchi, verdi } = aula()
    const contenuto = contenutoProiezione(
      registro,
      mira,
      impostazioni(BLOCCHI_PREDEFINITI),
      GIORNO,
    )
    const testo = comeTesto(contenuto)

    for (const allievo of [rossi, bianchi, verdi]) {
      assert.ok(!testo.includes(allievo.cognome), `${allievo.cognome} non doveva comparire`)
    }
  })

  it('in pausa non parte niente, nemmeno di quel che era acceso', () => {
    const { registro, mira } = aula()
    const contenuto = contenutoProiezione(
      registro,
      mira,
      impostazioni(BLOCCHI, { nomi: true, sospesa: true }),
      GIORNO,
    )

    assert.equal(contenuto.sospesa, true)
    assert.equal(contenuto.scaletta, null)
    assert.equal(contenuto.appello, null)
    assert.equal(contenuto.valutazioni, null)
    // La testata resta: è la classe e l'ora, e la si vede già dal corridoio.
    assert.equal(contenuto.intestazione.classe, 'I MEC A')
  })
})

describe('i voti', () => {
  it('senza i nomi si vedono solo i conti della classe', () => {
    const { registro, mira, rossi } = aula()
    const contenuto = contenutoProiezione(registro, mira, impostazioni(['valutazioni']), GIORNO)
    const prova = contenuto.valutazioni[0]

    assert.equal(prova.titolo, 'Test sulle proporzioni')
    assert.equal(prova.espressi, 2)
    assert.equal(prova.sufficienti, 1)
    assert.equal(prova.insufficienti, 1)
    assert.equal(prova.voti, null)
    assert.ok(!comeTesto(contenuto).includes(rossi.cognome))
  })

  it('con i nomi accesi compare la colonna, e dice chi era assente', () => {
    const { registro, mira, verdi } = aula()
    const contenuto = contenutoProiezione(
      registro,
      mira,
      impostazioni(['valutazioni'], { nomi: true }),
      GIORNO,
    )
    const prova = contenuto.valutazioni[0]

    assert.equal(prova.voti.length, 3)
    const riga = prova.voti.find((v) => v.nome.includes(verdi.cognome))
    assert.equal(riga.assente, true)
    assert.equal(riga.voto, 'assente')
  })
})

describe('i documenti', () => {
  it('il conteggio si vede sempre, i nomi di chi manca no', () => {
    const { registro, mira, bianchi } = aula()
    const contenuto = contenutoProiezione(registro, mira, impostazioni(['documenti']), GIORNO)
    const documento = contenuto.documenti[0]

    assert.equal(documento.consegnati, 1)
    assert.equal(documento.attesi, 3)
    assert.equal(documento.mancano, null)
    assert.ok(!comeTesto(contenuto).includes(bianchi.cognome))
  })

  it('con i nomi accesi si dice chi non l’ha portato', () => {
    const { registro, mira, rossi, bianchi } = aula()
    const contenuto = contenutoProiezione(
      registro,
      mira,
      impostazioni(['documenti'], { nomi: true }),
      GIORNO,
    )
    const documento = contenuto.documenti[0]

    assert.equal(documento.mancano.length, 2)
    assert.ok(documento.mancano.some((nome) => nome.includes(bianchi.cognome)))
    // Chi l'ha portato non compare fra chi manca.
    assert.ok(!documento.mancano.some((nome) => nome.includes(rossi.cognome)))
  })
})

describe('l’appello', () => {
  it('porta i nomi anche a interruttore dei nomi spento: senza, non correggerebbe niente', () => {
    const { registro, mira, verdi } = aula()
    const contenuto = contenutoProiezione(registro, mira, impostazioni(['appello']), GIORNO)

    assert.equal(contenuto.appello.totale, 3)
    assert.equal(contenuto.appello.presenti, 2)
    const riga = contenuto.appello.righe.find((r) => r.nome.includes(verdi.cognome))
    assert.equal(riga.presente, false)
    // Le sigle sono quelle del registro e del verbale stampato: X per assente.
    assert.deepEqual(riga.sigle, ['X', 'X'])
  })
})

describe('la scaletta', () => {
  it('mostra le tappe del piano con lo stato che ha l’ora, non quello del piano', () => {
    const { registro, mira } = aula()
    const contenuto = contenutoProiezione(registro, mira, impostazioni(['scaletta']), GIORNO)

    assert.equal(contenuto.scaletta.length, 2)
    assert.equal(contenuto.scaletta[0].titolo, 'Ripasso delle proporzioni')
    assert.equal(contenuto.scaletta[0].stato, 'svolta')
    // La seconda non è stata toccata: «da fare», e non l'assenza di uno stato.
    assert.equal(contenuto.scaletta[1].stato, 'da-fare')
  })
})

describe('le consegne', () => {
  it('quelle di chi insegna restano fuori: sullo schermo sarebbero rumore', () => {
    const { registro, mira, corso } = aula()
    const mia = creaConsegna(corso.id, 'Preparare le fotocopie', GIORNO)
    mia.a = 'docente'
    registro.consegne.push(mia)

    const contenuto = contenutoProiezione(registro, mira, impostazioni(['consegne']), GIORNO)
    assert.ok(!contenuto.consegne.some((c) => c.testo.includes('fotocopie')))
    assert.ok(contenuto.consegne.some((c) => c.testo === 'Esercizi 12–18'))
  })

  it('una consegna a qualcuno in particolare non dice a chi, senza i nomi', () => {
    const { registro, mira, corso, rossi } = aula()
    const suo = creaConsegna(corso.id, 'Recupero del test', GIORNO)
    suo.a = 'allievi'
    suo.allieviIds.push(rossi.id)
    registro.consegne.push(suo)

    const spento = contenutoProiezione(registro, mira, impostazioni(['consegne']), GIORNO)
    const riga = spento.consegne.find((c) => c.testo === 'Recupero del test')
    assert.equal(riga.a, 'a una persona')
    assert.ok(!comeTesto(spento).includes(rossi.cognome))

    const acceso = contenutoProiezione(
      registro,
      mira,
      impostazioni(['consegne'], { nomi: true }),
      GIORNO,
    )
    const stessa = acceso.consegne.find((c) => c.testo === 'Recupero del test')
    assert.ok(stessa.a.includes(rossi.cognome))
  })
})

describe('senza un’ora da mostrare', () => {
  it('lo dice invece di mostrare una testata vuota', () => {
    const registro = registroVuoto()
    const contenuto = contenutoProiezione(
      registro,
      { lezioneId: null, corsoId: null, classeId: null, semestreId: null, data: GIORNO },
      impostazioni(BLOCCHI),
      GIORNO,
    )

    assert.equal(contenuto.vuota, true)
    assert.equal(contenuto.intestazione.classe, null)
  })
})

describe('una scheda alla volta', () => {
  it('accese due, ne esce una sola', () => {
    // È la regola della privacy applicata più stretta: prima un blocco spento
    // non produceva dati, adesso non li produce nemmeno uno acceso che non è
    // in vista. Chi apre gli strumenti di sviluppo sullo schermo grande trova
    // quel che la classe sta guardando, e nient'altro.
    const { registro, mira } = aula()

    const contenuto = contenutoProiezione(
      registro,
      mira,
      impostazioni(['scaletta', 'consegne'], { aperto: 'consegne' }),
      GIORNO,
    )

    assert.equal(contenuto.scaletta, null, 'accesa ma non in vista: non esce')
    assert.ok(contenuto.consegne?.length, 'quella aperta esce')
  })

  it('la striscia dice quali schede ci sono e dove si è', () => {
    const { registro, mira } = aula()

    const { schede } = contenutoProiezione(
      registro,
      mira,
      impostazioni(['scaletta', 'consegne', 'calendario'], { aperto: 'consegne' }),
      GIORNO,
    )

    assert.deepEqual(schede.map((s) => s.blocco), ['scaletta', 'consegne', 'calendario'])
    assert.deepEqual(schede.map((s) => s.corrente), [false, true, false])
  })

  it('in pausa non dice nemmeno i nomi delle schede', () => {
    // Durante la pausa lo schermo non deve lasciar capire che cosa il docente
    // stia guardando: la striscia sparisce con il resto.
    const { registro, mira } = aula()

    const contenuto = contenutoProiezione(
      registro,
      mira,
      impostazioni(BLOCCHI, { aperto: 'valutazioni', sospesa: true }),
      GIORNO,
    )

    assert.deepEqual(contenuto.schede, [])
    assert.equal(contenuto.valutazioni, null)
  })

  it('le schede stanno nell’ordine dichiarato, non in quello dei clic', () => {
    // È l'ordine in cui scorrono con le frecce: cambiarlo a seconda dei clic
    // vorrebbe dire che «la prossima» non è sempre la stessa.
    assert.deepEqual(blocchiAccesi(impostazioni(['consegne', 'scaletta'])), [
      'scaletta',
      'consegne',
    ])
  })

  it('spegnendo la scheda aperta si scivola sulla prima che resta', () => {
    // Lo schermo non deve restare vuoto davanti alla classe perché si è
    // spento il blocco che si stava guardando.
    const messe = impostazioni(['scaletta', 'consegne'], { aperto: 'documenti' })

    assert.equal(bloccoAperto(messe), 'scaletta')
    assert.equal(bloccoAperto(impostazioni([], { aperto: 'scaletta' })), null)
  })

  it('le frecce girano in tondo', () => {
    // Le schede accese sono tre o quattro: arrivati in fondo si vuole tornare
    // alla prima, non trovarsi un pulsante che smette di funzionare.
    const messe = impostazioni(['scaletta', 'consegne', 'calendario'], { aperto: 'calendario' })

    assert.equal(bloccoScorrendo(messe, 1), 'scaletta')
    assert.equal(bloccoScorrendo(messe, -1), 'consegne')
    assert.equal(bloccoScorrendo(impostazioni([]), 1), null)
  })
})

describe('le misure della pagina', () => {
  it('sono strette di partenza', () => {
    // Il foglio non scorre: quel che non ci sta non lo legge nessuno, e
    // davanti a una classe non c'è nessuno che possa scorrere.
    assert.equal(PROIEZIONE_PREDEFINITA.compatta, true)
  })

  it('lo schermo lo sa, perché è lui a disegnarsi', () => {
    const { registro, mira } = aula()

    const stretta = contenutoProiezione(registro, mira, impostazioni(['scaletta']), GIORNO)
    const larga = contenutoProiezione(
      registro,
      mira,
      impostazioni(['scaletta'], { compatta: false }),
      GIORNO,
    )

    assert.equal(stretta.compatta, true)
    assert.equal(larga.compatta, false)
  })

  it('anche in pausa: la finestra non deve saltare quando si riprende', () => {
    const { registro, mira } = aula()

    const contenuto = contenutoProiezione(
      registro,
      mira,
      impostazioni(['scaletta'], { compatta: false, sospesa: true }),
      GIORNO,
    )

    assert.equal(contenuto.compatta, false)
  })
})

describe('la distribuzione di una prova proiettata', () => {
  it('è la stessa che finisce sul PDF, non una cugina', () => {
    // Restituendo una verifica il docente commenta sul proiettore una forma, e
    // riguardandola sul portatile o sul foglio deve trovare quella: erano tre
    // istogrammi scritti a mano, e la stessa prova aveva tre disegni diversi.
    const { registro, mira } = aula()

    const { valutazioni } = contenutoProiezione(
      registro,
      mira,
      impostazioni(['valutazioni'], { aperto: 'valutazioni' }),
      GIORNO,
    )
    const prova = valutazioni[0]

    // L'asse è la scala di serie, da 1 a 6, numerata al mezzo punto.
    assert.equal(prova.grafico.da, 1)
    assert.equal(prova.grafico.a, 6)
    assert.deepEqual(prova.grafico.tacche, [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6])
    assert.equal(prova.grafico.soglia, 4, 'il grafico ne ricava il colore')
    assert.equal(prova.sufficienza, 4)
    // Un 5.5 e un 3: due punti, ai loro valori esatti — non due colonne.
    assert.deepEqual(prova.grafico.punti, [
      { valore: 3, quanti: 1 },
      { valore: 5.5, quanti: 1 },
    ])
  })
})

/*
 * Il calendario proiettato, nelle quattro viste del registro.
 *
 * Le prove guardano due cose. La prima è la regola di tutto il file applicata
 * dentro un blocco solo: la vista scelta esce piena e le altre tre restano
 * `null` — proiettare la settimana non manda al proiettore l'anno intero «per
 * non doverlo ricalcolare». La seconda è che quel che si vede è davvero il
 * calendario del registro: gli stessi giorni spenti, le stesse vacanze, lo
 * stesso confine di semestre, e il giorno che segue quello aperto sul
 * portatile invece di restare fermo su oggi.
 */
describe('il calendario, nelle quattro viste del registro', () => {
  const perVista = (vista, resto = {}) =>
    impostazioni(['calendario'], { aperto: 'calendario', calendario: vista, ...resto })

  it('parte dall’agenda: è quel che il blocco ha sempre mostrato', () => {
    const { registro, mira } = aula()

    const { calendario } = contenutoProiezione(registro, mira, perVista('agenda'), GIORNO)

    assert.equal(calendario.vista, 'agenda')
    assert.ok(calendario.agenda.length > 0, 'l’elenco di prima è ancora lì')
    assert.equal(PROIEZIONE_PREDEFINITA.calendario, 'agenda')
  })

  it('una vista sola esce piena: le altre tre non partono nemmeno', () => {
    // La stessa regola dei blocchi, applicata dentro il blocco: quel che non
    // si mostra non arriva all'altro pannello.
    const { registro, mira } = aula()

    for (const vista of ['agenda', 'settimana', 'mese', 'anno']) {
      const { calendario } = contenutoProiezione(registro, mira, perVista(vista), GIORNO)
      const piene = ['agenda', 'settimana', 'mese', 'anno'].filter(
        (altra) => calendario[altra] !== null,
      )
      assert.deepEqual(piene, [vista], `${vista}: doveva uscire da sola`)
    }
  })

  it('la settimana porta i giorni con le loro ore', () => {
    const { registro, mira, lezione } = aula()

    const { calendario } = contenutoProiezione(registro, mira, perVista('settimana'), GIORNO)
    const settimana = calendario.settimana

    // Lunedì–venerdì: i giorni configurati, non i sette della settimana.
    assert.equal(settimana.giorni.length, 5)
    const lunedi = settimana.giorni[0]
    assert.equal(lunedi.data, GIORNO)
    assert.equal(lunedi.ore.length, 1)
    assert.equal(lunedi.ore[0].inizio, '08:20')
    assert.equal(lunedi.ore[0].daMinuti, 500)
    assert.equal(lunedi.ore[0].corrente, true, 'l’ora aperta si riconosce')
    assert.equal(lunedi.ore[0].id, lezione.id)
    assert.equal(settimana.giorni[1].ore.length, 0, 'martedì non ha niente')
  })

  it('la fascia oraria si stringe sulle lezioni che ci sono', () => {
    // Proiettare dalle 07:30 alle 18:00 per un'ora e mezza vuol dire un
    // rettangolino in mezzo a un campo vuoto, e da in fondo all'aula non si
    // legge. La giornata configurata resta il ripiego, non il riferimento.
    const { registro, mira } = aula()

    const { calendario } = contenutoProiezione(registro, mira, perVista('settimana'), GIORNO)

    assert.equal(calendario.settimana.daMinuti, 480, 'le otto, non le sette e mezza')
    assert.ok(calendario.settimana.aMinuti <= 660, 'e non le sei di sera')
    assert.ok(calendario.settimana.ore.length > 0, 'le ore piene sono segnate')
  })

  it('il mese porta le settimane del mese guardato, con le code segnate', () => {
    const { registro, mira } = aula()

    const { calendario } = contenutoProiezione(registro, mira, perVista('mese'), GIORNO)
    const giorni = calendario.mese.righe.flatMap((r) => r.giorni)

    assert.equal(calendario.titolo, 'ottobre 2026')
    assert.ok(calendario.mese.righe.length >= 4)
    assert.deepEqual(calendario.mese.colonne, ['lun', 'mar', 'mer', 'gio', 'ven'])
    assert.ok(
      giorni.some((g) => g.data === GIORNO && g.ore.length === 1),
      'la lezione sta nella sua cella',
    )
    // Le code — gli ultimi giorni di settembre — ci sono, ma segnate: senza,
    // la prima settimana comincerebbe a mezz'aria.
    assert.ok(giorni.some((g) => g.fuori && g.data < '2026-10-01'))
    assert.ok(giorni.filter((g) => !g.fuori).every((g) => g.data.startsWith('2026-10')))
  })

  it('l’anno porta i mesi dell’anno scolastico e conta le ore', () => {
    const { registro, mira } = aula()

    const { calendario } = contenutoProiezione(registro, mira, perVista('anno'), GIORNO)
    const anno = calendario.anno

    assert.equal(anno.etichetta, '2026/2027')
    assert.equal(anno.mesi.length, 10, 'da settembre a giugno')
    // Trentuno caselle per mese, comprese quelle che non esistono: le righe
    // devono restare allineate, o il calendario non si legge in orizzontale.
    assert.ok(anno.mesi.every((m) => m.giorni.length === 31))
    const novembre = anno.mesi.find((m) => m.titolo === 'novembre')
    assert.equal(novembre.giorni[30].data, null, 'il 31 di novembre non esiste')

    const ottobre = anno.mesi.find((m) => m.titolo === 'ottobre')
    assert.equal(ottobre.giorni[11].data, GIORNO)
    assert.equal(ottobre.giorni[11].ore, 1)
    assert.equal(ottobre.giorni[0].ore, 0)
  })

  it('il giorno di riferimento è quello che il registro sta guardando', () => {
    // Si scorre la settimana sul portatile e la classe vede scorrere la sua:
    // è il gesto che si sta già facendo mentre si parla.
    const { registro, mira } = aula()

    const dopo = contenutoProiezione(
      registro,
      { ...mira, lezioneId: null, data: '2026-11-09' },
      perVista('settimana'),
      GIORNO,
    )

    assert.equal(dopo.calendario.giorno, '2026-11-09')
    assert.equal(dopo.calendario.settimana.giorni[0].data, '2026-11-09')
    assert.ok(dopo.calendario.settimana.giorni.every((g) => g.ore.length === 0))
  })

  it('le vacanze e il confine di semestre arrivano allo schermo', () => {
    // Sono le due domande che la classe fa guardando il calendario, e nel
    // registro si vedono: qui devono vedersi uguali.
    const { registro, mira } = aula()
    const anno = registro.anni[0]
    anno.sospensioni.push({
      id: 'sos-1',
      etichetta: 'Vacanze autunnali',
      dal: '2026-10-19',
      al: '2026-10-30',
    })

    const settimana = contenutoProiezione(
      registro,
      { ...mira, lezioneId: null, data: '2026-10-19' },
      perVista('settimana'),
      GIORNO,
    ).calendario.settimana

    assert.ok(settimana.giorni.every((g) => g.chiuso === 'Vacanze autunnali'))

    const secondo = anno.semestri[1]
    const mese = contenutoProiezione(
      registro,
      { ...mira, lezioneId: null, data: secondo.inizio },
      perVista('mese'),
      GIORNO,
    ).calendario.mese

    const apre = mese.righe
      .flatMap((r) => r.giorni)
      .find((g) => g.data === secondo.inizio)
    assert.ok(apre.semestre?.includes('inizio'), 'il giorno in cui le medie ripartono si vede')
  })

  it('la scheda spenta non manda il calendario in nessuna vista', () => {
    const { registro, mira } = aula()

    for (const vista of ['agenda', 'settimana', 'mese', 'anno']) {
      const contenuto = contenutoProiezione(
        registro,
        mira,
        impostazioni(['scaletta'], { aperto: 'scaletta', calendario: vista }),
        GIORNO,
      )
      assert.equal(contenuto.calendario, null, `${vista}: doveva restare fuori`)
    }
  })

  it('una vista che non esiste non lascia lo schermo senza niente', () => {
    // Un messaggio vecchio, un pannello ricaricato: si torna all'agenda invece
    // di disegnare il vuoto davanti alla classe.
    const { registro, mira } = aula()

    const { calendario } = contenutoProiezione(
      registro,
      mira,
      impostazioni(['calendario'], { aperto: 'calendario', calendario: undefined }),
      GIORNO,
    )

    assert.equal(calendario.vista, 'agenda')
    assert.ok(calendario.agenda.length > 0)
  })
})
