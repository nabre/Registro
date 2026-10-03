// La memoria del pannello su disco: le preferenze di forma valgono per tutti i
// documenti, il posto e le scelte con gli id di un anno valgono per il suo
// `.regi`. Un difetto qui riaprirebbe un anno sul corso di un altro, o
// perderebbe tutto al primo JSON storto.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const {
  chiaveDocumento,
  conVoce,
  leggiMemoria,
  LIMITE_CARATTERI,
  MASSIMO_DOCUMENTI,
  serializza,
  voceDel,
} = await importaSorgente('ui/memory.ts')

/** Un `StatoPersistito` come lo scriveva `ricorda()` prima della versione 2. */
const VECCHIO = {
  allievoId: 'allievo-1',
  classiApertePersone: ['classe-1'],
  zoomSfoglio: 310,
  pianoId: 'piano-1',
  valutazioneId: null,
  bloccoAssenzeId: 'blocco-1',
  ricerca: 'Rossi',
  sidebarDesktop: false,
  sidebarMobile: true,
  assistenteAperto: true,
  contestoAssistente: { v: 1, pagina: true },
  documentiScelti: ['esportazioni/a.pdf'],
  vista: 'docenteClasse',
  paginaId: 'pagina.classe.assenze',
  azioniNascoste: true,
  schedaLezione: 'lezione',
  schedaPersona: 'materie',
  schedaTodo: 'tutte',
  schedaDocente: 'assenze',
  ambitoCheck: 'classe',
  schedaDocumenti: 'allievi',
  ambitoImpostazioni: 'programma',
  schedaProgramma: 'recapiti',
  schedaDocumento: 'modelli',
  modoCalendario: 'mese',
  mostraCalendarioEsterno: false,
  strisciaSettimaneChiusa: true,
  data: '2026-10-02',
  lezioneId: 'lezione-1',
  classeId: 'classe-1',
  corsoId: 'corso-1',
  filtroClasseId: 'classe-1',
  classeMappaId: null,
  filtroCorsoAgendaId: 'corso-1',
  semestreId: 'semestre-1',
  schedaMappa: 'lavoro',
}

const CONTESTO_VUOTO = {
  corsoId: null,
  classeId: null,
  filtroClasseId: null,
  lezioneId: null,
  pianoId: null,
  valutazioneId: null,
  allievoId: null,
  progettoId: null,
}

function voce (n) {
  return {
    usato: '',
    posto: { pagina: 'pagina.corsi', soggetto: { tipo: 'corso', id: `corso-${n}` } },
    contesto: { ...CONTESTO_VUOTO, corsoId: `corso-${n}` },
    giorno: '2026-10-02',
  }
}

const quando = (n) => new Date(Date.UTC(2026, 8, 1, 0, n)).toISOString()

describe('la memoria del pannello', () => {
  it('la chiave è il percorso normalizzato; provvisorio e null non ne hanno', () => {
    assert.equal(chiaveDocumento('C:\\Utenti\\Anna\\Registro 2026.REGI'), 'c:/utenti/anna/registro 2026.regi')
    assert.equal(chiaveDocumento('C:/utenti/anna/registro 2026.regi'), 'c:/utenti/anna/registro 2026.regi')
    assert.equal(chiaveDocumento(null), null)
    assert.equal(chiaveDocumento(undefined), null)
    assert.equal(chiaveDocumento(''), null)
    assert.equal(chiaveDocumento('C:\\tmp\\nuovo.regi', true), null)
  })

  it('migra un JSON vecchio: globali a parte, posizione nella voce «*»', () => {
    const memoria = leggiMemoria(VECCHIO)
    assert.equal(memoria.v, 2)
    assert.deepEqual({ ...memoria.globali }, {
      schedaLezione: 'lezione',
      schedaPersona: 'materie',
      schedaDocumenti: 'allievi',
      schedaMappa: 'lavoro',
      modoCalendario: 'mese',
      mostraCalendarioEsterno: false,
      strisciaSettimaneChiusa: true,
      zoomSfoglio: 310,
      sidebarDesktop: false,
      sidebarMobile: true,
      assistenteAperto: true,
      contestoAssistente: { v: 1, pagina: true },
      azioniNascoste: true,
      // L'ambito aperto per ultimo era il programma, e `recapiti` è dentro la posta.
      sezioneImpostazioni: 'posta',
    })
    const stella = memoria.documenti['*']
    assert.ok(stella)
    assert.deepEqual({ ...stella.contesto }, {
      corsoId: 'corso-1',
      classeId: 'classe-1',
      filtroClasseId: 'classe-1',
      lezioneId: 'lezione-1',
      pianoId: 'piano-1',
      valutazioneId: null,
      allievoId: 'allievo-1',
      progettoId: null,
    })
    assert.equal(stella.giorno, '2026-10-02')
    assert.equal(stella.semestreId, 'semestre-1')
    assert.equal(stella.filtroCorsoAgendaId, 'corso-1')
    assert.equal(stella.classeMappaId, null)
    assert.equal(stella.bloccoAssenzeId, 'blocco-1')
    assert.equal(stella.schedaTodo, 'tutte')
    assert.deepEqual([...stella.classiApertePersone], ['classe-1'])
    // Le spunte della pagina Documenti non ci sono più: un file di prima le porta, e si ignorano.
    assert.ok(!('documentiScelti' in stella))
    assert.equal(stella.ricerca, 'Rossi')
    // Senza `postoDaVecchi` i campi di posizione restano grezzi.
    assert.equal(stella.posto, null)
    assert.equal(stella.vecchi.vista, 'docenteClasse')
    assert.equal(stella.vecchi.paginaId, 'pagina.classe.assenze')
    assert.equal(stella.vecchi.schedaDocente, 'assenze')
    // Nessun campo del documento finisce fra le globali, e viceversa.
    for (const campo of ['corsoId', 'data', 'vista', 'ricerca', 'semestreId'])
      assert.ok(!(campo in memoria.globali), campo)
    assert.ok(!('sidebarDesktop' in stella))
  })

  it('con `postoDaVecchi` la voce «*» ha già il posto', () => {
    const visti = []
    const memoria = leggiMemoria(VECCHIO, {
      postoDaVecchi: (vecchi) => {
        visti.push(vecchi)
        return { pagina: 'pagina.classe.assenze', soggetto: { tipo: 'classe', id: vecchi.classeId } }
      },
    })
    assert.equal(visti.length, 1)
    assert.equal(visti[0].vista, 'docenteClasse')
    assert.deepEqual({ ...memoria.documenti['*'].posto }, {
      pagina: 'pagina.classe.assenze',
      soggetto: { tipo: 'classe', id: 'classe-1' },
    })
    assert.ok(!('vecchi' in memoria.documenti['*']))
  })

  it('un semestre mai scelto resta assente; `null` è l’anno intero', () => {
    const { semestreId: _, ...senza } = VECCHIO
    assert.ok(!('semestreId' in leggiMemoria(senza).documenti['*']))
    assert.equal(leggiMemoria({ ...VECCHIO, semestreId: null }).documenti['*'].semestreId, null)
  })

  it('scarta i valori storti senza cadere', () => {
    const memoria = leggiMemoria({
      ...VECCHIO,
      schedaLezione: 'sparita',
      modoCalendario: 42,
      sidebarDesktop: 'sì',
      zoomSfoglio: 'grande',
      data: '2026-02-31',
      corsoId: { id: 'x' },
      classiApertePersone: 'classe-1',
      documentiScelti: ['ok.pdf', 3, null],
      semestreId: 7,
    })
    assert.ok(!('schedaLezione' in memoria.globali))
    assert.ok(!('modoCalendario' in memoria.globali))
    assert.ok(!('sidebarDesktop' in memoria.globali))
    assert.ok(!('zoomSfoglio' in memoria.globali))
    const stella = memoria.documenti['*']
    assert.ok(!('giorno' in stella))
    assert.equal(stella.contesto.corsoId, null)
    assert.ok(!('classiApertePersone' in stella))
    assert.ok(!('documentiScelti' in stella))
    assert.ok(!('semestreId' in stella))
  })

  it('il compito aperto per progetto: coppie di id buone, le ultime se troppe', () => {
    const grezze = JSON.parse('{"prg-1":"cmp-1","__proto__":"x","prg-2":3,"":"cmp","prg-3":"cmp-3"}')
    const stella = leggiMemoria({ ...VECCHIO, compitiScelti: grezze }).documenti['*']
    assert.deepEqual({ ...stella.compitiScelti }, { 'prg-1': 'cmp-1', 'prg-3': 'cmp-3' })
    assert.ok(!('compitiScelti' in leggiMemoria({ ...VECCHIO, compitiScelti: ['cmp-1'] }).documenti['*']))
    const molte = Object.fromEntries(Array.from({ length: 150 }, (_, i) => [`prg-${i}`, `cmp-${i}`]))
    const tenute = Object.keys(leggiMemoria({ ...VECCHIO, compitiScelti: molte }).documenti['*'].compitiScelti)
    assert.equal(tenute.length, 100)
    assert.equal(tenute.at(-1), 'prg-149')
  })

  it('la linguetta di un progetto: solo quelle che ci sono, le ultime se troppe', () => {
    const grezze = JSON.parse('{"prg-1":"matrice","__proto__":"fasi","prg-2":"giudizi","prg-3":"esiti","prg-4":7}')
    const stella = leggiMemoria({ ...VECCHIO, linguetteProgetti: grezze }).documenti['*']
    assert.deepEqual({ ...stella.linguetteProgetti }, { 'prg-1': 'matrice', 'prg-3': 'esiti' })
    assert.ok(!('linguetteProgetti' in leggiMemoria({ ...VECCHIO, linguetteProgetti: 'fasi' }).documenti['*']))
    const molte = Object.fromEntries(Array.from({ length: 150 }, (_, i) => [`prg-${i}`, 'fasi']))
    const tenute = Object.keys(leggiMemoria({ ...VECCHIO, linguetteProgetti: molte }).documenti['*'].linguetteProgetti)
    assert.equal(tenute.length, 100)
    assert.equal(tenute.at(-1), 'prg-149')
  })

  it('JSON rotto e forme strane danno una memoria vuota', () => {
    for (const strano of [null, undefined, '{rotto', 'null', 42, [], [1, 2], true, '']) {
      const memoria = leggiMemoria(strano)
      assert.equal(memoria.v, 2)
      assert.deepEqual({ ...memoria.globali }, {})
      assert.deepEqual(Object.keys(memoria.documenti), [])
    }
    const storta = leggiMemoria({
      v: 2,
      globali: 'no',
      documenti: {
        'c:/a.regi': 'no',
        'c:/b.regi': { usato: 5, posto: { pagina: 3 }, contesto: [] },
        __proto__: { usato: quando(1) },
      },
    })
    assert.deepEqual({ ...storta.globali }, {})
    assert.ok(!('c:/a.regi' in storta.documenti))
    const b = storta.documenti['c:/b.regi']
    assert.equal(b.posto, null)
    assert.deepEqual({ ...b.contesto }, CONTESTO_VUOTO)
    assert.equal(Object.getPrototypeOf(storta.documenti), Object.prototype)
    // Anche una stringa JSON si legge.
    assert.equal(leggiMemoria(JSON.stringify(VECCHIO)).globali.modoCalendario, 'mese')
  })

  it('il posto ricordato con l’id di prima dei progetti riapre la biblioteca', () => {
    const memoria = leggiMemoria({
      v: 2,
      globali: {},
      documenti: {
        'c:/a.regi': {
          usato: quando(1),
          posto: { pagina: 'pagina.corso.progetti', soggetto: { tipo: 'progetto', id: 'prg-1' } },
          contesto: CONTESTO_VUOTO,
        },
      },
    })
    assert.deepEqual({ ...memoria.documenti['c:/a.regi'].posto }, {
      pagina: 'pagina.progetti', soggetto: { tipo: 'progetto', id: 'prg-1' },
    })
  })

  it('la forma nuova torna uguale dopo serializza e leggi', () => {
    let memoria = leggiMemoria(VECCHIO)
    memoria = conVoce(memoria, 'c:/a.regi', voce(1), new Date(quando(5)))
    const riletta = leggiMemoria(serializza(memoria))
    assert.equal(serializza(riletta), serializza(memoria))
    assert.equal(riletta.documenti['c:/a.regi'].usato, quando(5))
  })

  it('la voce «*» si adotta una volta sola, poi sparisce', () => {
    const memoria = leggiMemoria(VECCHIO)
    const nulla = voceDel(memoria, null)
    assert.equal(nulla.voce, null)
    assert.ok('*' in nulla.memoria.documenti)
    const primo = voceDel(memoria, 'c:/a.regi')
    assert.equal(primo.voce.contesto.corsoId, 'corso-1')
    assert.ok(!('*' in primo.memoria.documenti))
    assert.equal(primo.memoria.documenti['c:/a.regi'].contesto.corsoId, 'corso-1')
    // La memoria di partenza non si tocca.
    assert.ok('*' in memoria.documenti)
    const secondo = voceDel(primo.memoria, 'c:/b.regi')
    assert.equal(secondo.voce, null)
    // Un documento con la sua voce non adotta la «*».
    const proprio = voceDel(conVoce(memoria, 'c:/b.regi', voce(2), new Date(quando(1))), 'c:/b.regi')
    assert.equal(proprio.voce.contesto.corsoId, 'corso-2')
    assert.ok('*' in proprio.memoria.documenti)
  })

  it('conVoce aggiorna `usato`, ignora la chiave nulla, tiene i venti più recenti', () => {
    let memoria = leggiMemoria(null)
    assert.equal(conVoce(memoria, null, voce(0), new Date()), memoria)
    for (let n = 0; n < MASSIMO_DOCUMENTI + 5; n++)
      memoria = conVoce(memoria, `c:/${n}.regi`, voce(n), new Date(quando(n)))
    // Il primo, riusato, torna fra i recenti.
    memoria = conVoce(memoria, 'c:/0.regi', voce(0), new Date(quando(100)))
    const chiavi = Object.keys(memoria.documenti)
    assert.equal(chiavi.length, MASSIMO_DOCUMENTI)
    assert.ok(chiavi.includes('c:/0.regi'))
    for (let n = 1; n <= 5; n++) assert.ok(!chiavi.includes(`c:/${n}.regi`), n)
    assert.ok(chiavi.includes('c:/6.regi'))
    assert.equal(memoria.documenti['c:/0.regi'].usato, quando(100))
  })

  it('venti documenti pieni stanno sotto il limite del disco', () => {
    assert.equal(LIMITE_CARATTERI, 256000)
    let memoria = leggiMemoria(VECCHIO)
    for (let n = 0; n < MASSIMO_DOCUMENTI; n++) {
      const cartella = `c:/users/insegnante/onedrive - scuola professionale/registro/anno-${n}`
      memoria = conVoce(memoria, `${cartella}/registro ${n}.regi`, {
        ...voce(n),
        contesto: Object.fromEntries(Object.keys(CONTESTO_VUOTO).map((k) => [k, `${k}-${crypto.randomUUID()}`])),
        semestreId: crypto.randomUUID(),
        filtroCorsoAgendaId: crypto.randomUUID(),
        classeMappaId: crypto.randomUUID(),
        bloccoAssenzeId: crypto.randomUUID(),
        schedaTodo: 'tutte',
        classiApertePersone: Array.from({ length: 30 }, () => crypto.randomUUID()),
        ricerca: 'x'.repeat(5000),
      }, new Date(quando(n)))
    }
    const testo = serializza(memoria)
    assert.ok(testo.length < LIMITE_CARATTERI, `${testo.length}`)
    const riletta = leggiMemoria(testo)
    // Il più recente c'è sempre, con le sue scelte.
    const ultimo = Object.entries(riletta.documenti).find(([k]) => k.includes('anno-19'))
    assert.ok(ultimo)
    assert.equal(ultimo[1].classiApertePersone.length, 30)
  })

  it('una sola voce enorme non fa superare il limite', () => {
    const memoria = conVoce(leggiMemoria(null), 'c:/a.regi', {
      ...voce(1),
      classiApertePersone: Array.from({ length: 200 }, (_, i) => `${i}-${'p'.repeat(2000)}`),
    }, new Date(quando(1)))
    const testo = serializza(memoria)
    assert.ok(testo.length < LIMITE_CARATTERI, `${testo.length}`)
    assert.ok(leggiMemoria(testo).documenti['c:/a.regi'])
  })
})
