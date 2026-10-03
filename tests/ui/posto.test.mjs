// Il posto unico (`ui/place.ts`): dove si guarda è un valore solo, e
// le regole che oggi stanno sparse (corso aperto, classe del fascicolo, classe
// della pagina Classi, classe dell'allievo, riconvalida dei ricordati, contesto
// dell'elemento) valgono qui in un posto solo, senza stato né DOM.
//
//   1. **la tabella regge nei due sensi**: vista → posto → vista torna, e un
//      posto proiettato sui campi vecchi e riletto torna quel posto;
//   2. **un soggetto sparito non lascia la pagina su niente**: ogni tipo ha il
//      suo ripiego, e il ripiego si dice (`ripiegato`);
//   3. **la chiave è stabile**: lo stesso posto dà la stessa chiave, due posti
//      diversi due chiavi diverse.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const { importaSorgente } = await import('../helpers/sorgente.mjs')
const {
  NASCOSTE,
  VISTA_DELLA_PAGINA,
  chiaveDelPosto,
  completa,
  derivaVista,
  paginaDiAdesso,
  postoDaVecchi,
  postoDaVista,
} = await importaSorgente('ui/place.ts')

const OGGI = '2026-11-10'

/** Un registro piccolo ma con tutto: due anni, docenze e no, ore passate e future. */
function registro () {
  const ist = '2026-09-01T00:00:00.000Z'
  const classe = (id, annoId, nome, docenteDiClasse, allievi = []) => ({
    id, annoId, nome, colore: '#888888', allievi, archiviata: false,
    docenteDiClasse, creataIl: ist, aggiornataIl: ist,
  })
  const corso = (id, classeId, titolo) => ({
    id, classeId, materiaId: 'mat-1', titolo, orario: [], creatoIl: ist, aggiornatoIl: ist,
  })
  const lezione = (id, corsoId, data) => ({
    id, corsoId, data, slot: [], stato: 'pianificata', pianoId: null,
    avanzamento: [], presenze: [], osservazioni: [],
  })
  return {
    anni: [
      {
        id: 'ann-1', etichetta: '2026/2027', inizio: '2026-09-01', fine: '2027-06-30',
        semestri: [
          { id: 'sem-1', numero: 1, inizio: '2026-09-01', fine: '2027-01-31' },
          { id: 'sem-2', numero: 2, inizio: '2027-02-01', fine: '2027-06-30' },
        ],
        sospensioni: [],
      },
      {
        id: 'ann-0', etichetta: '2025/2026', inizio: '2025-09-01', fine: '2026-06-30',
        semestri: [], sospensioni: [],
      },
    ],
    annoCorrenteId: 'ann-1',
    materie: [],
    classi: [
      classe('cls-b', 'ann-1', 'B', false, [{ id: 'all-2', cognome: 'Bianchi', nome: 'Ugo' }]),
      classe('cls-a', 'ann-1', 'A', true, [{ id: 'all-1', cognome: 'Rossi', nome: 'Ada' }]),
      classe('cls-v', 'ann-0', 'Vecchia', true, [{ id: 'all-v', cognome: 'Neri', nome: 'Eva' }]),
    ],
    corsi: [
      corso('cor-b', 'cls-b', 'B · Fisica'),
      corso('cor-a', 'cls-a', 'A · Matematica'),
      corso('cor-v', 'cls-v', 'Vecchia · Storia'),
    ],
    lezioni: [
      lezione('lez-a1', 'cor-a', '2026-10-05'),
      lezione('lez-a2', 'cor-a', '2026-11-09'),
      lezione('lez-a3', 'cor-a', '2027-03-01'),
      lezione('lez-b1', 'cor-b', '2026-10-06'),
      lezione('lez-v1', 'cor-v', '2025-10-01'),
    ],
    piani: [
      { id: 'pia-a', corsoId: 'cor-a', obiettivi: [], attivita: [], risorse: [], tag: [], creatoIl: ist, aggiornatoIl: ist },
    ],
    valutazioni: [
      { id: 'val-a', corsoId: 'cor-a', lezioneId: null, pianoId: null, titolo: 'Prova', tipo: 'scritto', data: '2027-03-02' },
    ],
    progetti: [
      { id: 'prg-a', titolo: 'Giornale', obiettivi: [], fasi: [], criteri: [], livelli: [], integrazioni: [{ corsoId: 'cor-a', stato: 'in-corso', compiti: [], giudizi: [], matrice: [] }], risorse: [], creatoIl: ist, aggiornatoIl: ist },
      { id: 'prg-v', titolo: 'Vecchio', obiettivi: [], fasi: [], criteri: [], livelli: [], integrazioni: [{ corsoId: 'cor-v', stato: 'concluso', compiti: [], giudizi: [], matrice: [] }], risorse: [], creatoIl: ist, aggiornatoIl: ist },
    ],
    fascicoli: [],
    consegne: [],
    check: [],
    smistamenti: [],
    coordinate: [],
  }
}

/** Il contesto di partenza: niente scelto. */
const NIENTE = Object.freeze({
  corsoId: null, classeId: null, filtroClasseId: null, lezioneId: null,
  pianoId: null, valutazioneId: null, allievoId: null, progettoId: null,
})

/** Ogni vista del protocollo, con l'elemento che le si può chiedere di aprire. */
const TABELLA = [
  ['oggi', undefined, { pagina: 'pagina.oggi' }],
  ['calendario', 'lez-a1', { pagina: 'pagina.calendario', soggetto: { tipo: 'lezione', id: 'lez-a1' } }],
  ['todo', 'cor-a', { pagina: 'pagina.pendenze', soggetto: { tipo: 'corso', id: 'cor-a' } }],
  ['daSmistare', undefined, { pagina: 'pagina.daSmistare' }],
  ['lezione', 'lez-a1', { pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: 'lez-a1' } }],
  ['classi', 'cls-a', { pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: 'cls-a' } }],
  ['persone', undefined, { pagina: 'pagina.persone' }],
  ['allievo', 'all-1', { pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id: 'all-1' } }],
  ['docenteClasse', 'cls-a', { pagina: 'pagina.classe.pendenze', soggetto: { tipo: 'classe', id: 'cls-a' } }],
  ['corsi', 'cor-a', { pagina: 'pagina.corsi', soggetto: { tipo: 'corso', id: 'cor-a' } }],
  ['piani', 'pia-a', { pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: 'pia-a' } }],
  ['progetti', 'prg-a', { pagina: 'pagina.progetti', soggetto: { tipo: 'progetto', id: 'prg-a' } }],
  ['valutazioni', 'val-a', { pagina: 'pagina.corso.valutazioni', soggetto: { tipo: 'valutazione', id: 'val-a' } }],
  ['check', 'cor-a', { pagina: 'pagina.corso.check', soggetto: { tipo: 'corso', id: 'cor-a' } }],
  ['documenti', undefined, { pagina: 'pagina.corso.documenti' }],
  ['overview', 'cor-a', { pagina: 'pagina.corso.overview', soggetto: { tipo: 'corso', id: 'cor-a' } }],
  ['mappa', undefined, { pagina: 'pagina.mappa' }],
  ['guida', undefined, { pagina: 'pagina.guida' }],
  ['impostazioni', undefined, { pagina: 'pagina.impostazioni' }],
  ['modelli', undefined, { pagina: 'pagina.impostazioni', scheda: 'utente#stampa' }],
  ['modelliLinguistici', undefined, { pagina: 'pagina.impostazioni', scheda: 'programma#modelli' }],
]

describe('la tabella vista ⇄ posto', () => {
  for (const [vista, elemento, atteso] of TABELLA) {
    it(`${vista}${elemento ? ` (+${elemento})` : ''}`, () => {
      assert.deepEqual(postoDaVista(vista, elemento), atteso)
      // Gli alias arrivano sulle impostazioni: la vista derivata è quella.
      const derivata = derivaVista(atteso).vista
      const attesa = vista === 'modelli' || vista === 'modelliLinguistici' ? 'impostazioni' : vista
      assert.equal(derivata, attesa)
    })
  }

  it('ogni pagina ha una vista, e proiettata sui campi vecchi torna sé stessa', () => {
    for (const pagina of Object.keys(VISTA_DELLA_PAGINA)) {
      const posto = pagina === 'pagina.impostazioni'
        ? { pagina, scheda: 'utente' }
        : { pagina }
      const vecchi = derivaVista(posto)
      assert.equal(vecchi.vista, VISTA_DELLA_PAGINA[pagina])
      assert.deepEqual(postoDaVecchi(vecchi), posto, pagina)
    }
  })

  it('check e docente di classe distinguono le pagine con ambito e scheda', () => {
    assert.deepEqual(derivaVista({ pagina: 'pagina.classe.check' }),
      { vista: 'check', ambitoCheck: 'classe' })
    assert.deepEqual(derivaVista({ pagina: 'pagina.classe.pendenze' }),
      { vista: 'docenteClasse', schedaDocente: 'todo' })
    assert.deepEqual(derivaVista({ pagina: 'pagina.classe.assenze' }),
      { vista: 'docenteClasse', schedaDocente: 'assenze' })
    assert.deepEqual(derivaVista({ pagina: 'pagina.impostazioni', scheda: 'calendario#ics' }), {
      vista: 'impostazioni', areaImpostazioni: 'calendario',
    })
  })

  it('le nascoste non hanno voce nella barra', () => {
    assert.deepEqual([...NASCOSTE].sort(), ['pagina.allievo', 'pagina.classe.pendenze'])
  })

  it('con il registro, un id di classe apre il lato classe', () => {
    const r = registro()
    assert.deepEqual(postoDaVista('check', 'cls-a', r),
      { pagina: 'pagina.classe.check', soggetto: { tipo: 'classe', id: 'cls-a' } })
    assert.deepEqual(postoDaVista('todo', 'cls-a', r),
      { pagina: 'pagina.pendenze', soggetto: { tipo: 'classe', id: 'cls-a' } })
    assert.deepEqual(postoDaVista('check', 'cor-a', r).pagina, 'pagina.corso.check')
  })
})

describe('dai campi vecchi', () => {
  it('la pagina scelta vince se è coerente con la vista', () => {
    assert.equal(postoDaVecchi({ vista: 'persone', paginaId: 'pagina.persone' }).pagina, 'pagina.persone')
    // Una destinazione di un'altra vista si ignora: comanda la vista.
    assert.equal(postoDaVecchi({ vista: 'mappa', paginaId: 'pagina.persone' }).pagina, 'pagina.mappa')
    assert.equal(postoDaVecchi({ vista: 'storta', paginaId: null }).pagina, 'pagina.oggi')
  })

  it('porta con sé il soggetto della pagina', () => {
    assert.deepEqual(postoDaVecchi({ vista: 'lezione', lezioneId: 'lez-a1', corsoId: 'cor-a' }),
      { pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: 'lez-a1' } })
    assert.deepEqual(postoDaVecchi({ vista: 'check', ambitoCheck: 'classe', classeId: 'cls-a' }),
      { pagina: 'pagina.classe.check', soggetto: { tipo: 'classe', id: 'cls-a' } })
    assert.deepEqual(postoDaVecchi({ vista: 'piani', corsoId: 'cor-a', pianoId: null }),
      { pagina: 'pagina.corso.piani', soggetto: { tipo: 'corso', id: 'cor-a' } })
    assert.deepEqual(postoDaVecchi({ vista: 'allievo', allievoId: 'all-1', classeId: 'cls-a' }),
      { pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id: 'all-1' } })
  })

  it('alias e schede sparite delle impostazioni', () => {
    // Le sezioni di prima delle aree arrivano nell'area dove stanno adesso.
    assert.deepEqual(postoDaVecchi({ vista: 'impostazioni', ambitoImpostazioni: 'programma', schedaProgramma: 'recapiti' }),
      { pagina: 'pagina.impostazioni', scheda: 'utente#posta' })
    assert.deepEqual(postoDaVecchi({ vista: 'impostazioni', ambitoImpostazioni: 'documento', schedaDocumento: 'modelli' }),
      { pagina: 'pagina.impostazioni', scheda: 'utente#stampa' })
    assert.deepEqual(postoDaVecchi({ vista: 'modelli' }),
      { pagina: 'pagina.impostazioni', scheda: 'utente#stampa' })
    assert.deepEqual(postoDaVecchi({ vista: 'modelliLinguistici', schedaProgramma: 'aspetto' }),
      { pagina: 'pagina.impostazioni', scheda: 'programma#modelli' })
    // Niente di valido: i predefiniti dello stato di prima, nel posto di oggi.
    assert.deepEqual(postoDaVecchi({ vista: 'impostazioni', ambitoImpostazioni: 'boh' }),
      { pagina: 'pagina.impostazioni', scheda: 'calendario#anno' })
  })
})

describe('completa: il soggetto trovato', () => {
  it('una lezione porta corso, filtro, giorno e semestre', () => {
    const esito = completa(postoDaVista('lezione', 'lez-a3'), NIENTE, registro(), OGGI)
    assert.equal(esito.ripiegato, false)
    assert.deepEqual(esito.posto, { pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: 'lez-a3' } })
    assert.equal(esito.contesto.lezioneId, 'lez-a3')
    assert.equal(esito.contesto.corsoId, 'cor-a')
    assert.equal(esito.contesto.filtroClasseId, 'cls-a')
    assert.deepEqual(esito.preferenzeDoc, { giorno: '2027-03-01', semestreId: 'sem-2' })
    assert.equal(esito.derivati.vista, 'lezione')
  })

  it('una valutazione porta corso e semestre, non il giorno', () => {
    const esito = completa(postoDaVista('valutazioni', 'val-a'), NIENTE, registro(), OGGI)
    assert.equal(esito.contesto.valutazioneId, 'val-a')
    assert.equal(esito.contesto.corsoId, 'cor-a')
    assert.deepEqual(esito.preferenzeDoc, { semestreId: 'sem-2' })
  })

  it('un allievo porta la sua classe, anche se il contesto ne dice un\'altra', () => {
    const esito = completa(postoDaVista('allievo', 'all-1'), { ...NIENTE, classeId: 'cls-b' }, registro(), OGGI)
    assert.equal(esito.contesto.allievoId, 'all-1')
    assert.equal(esito.contesto.classeId, 'cls-a')
    assert.equal(esito.contesto.filtroClasseId, 'cls-a')
  })

  it('una pagina del corso senza soggetto prende il corso del contesto', () => {
    const esito = completa({ pagina: 'pagina.corso.check' }, { ...NIENTE, corsoId: 'cor-b' }, registro(), OGGI)
    assert.deepEqual(esito.posto.soggetto, { tipo: 'corso', id: 'cor-b' })
    assert.equal(esito.contesto.filtroClasseId, 'cls-b')
    assert.equal(esito.ripiegato, false)
  })

  it('il Registro senza ora apre l\'ultima passata del corso (nel semestre scelto)', () => {
    const r = registro()
    const primo = completa({ pagina: 'pagina.corso.registro' }, { ...NIENTE, corsoId: 'cor-a' }, r, OGGI, { semestreId: 'sem-1' })
    assert.deepEqual(primo.posto.soggetto, { tipo: 'lezione', id: 'lez-a2' })
    // Nel secondo semestre nessuna ora è passata: la prima che verrà.
    const secondo = completa({ pagina: 'pagina.corso.registro' }, { ...NIENTE, corsoId: 'cor-a' }, r, OGGI, { semestreId: 'sem-2' })
    assert.deepEqual(secondo.posto.soggetto, { tipo: 'lezione', id: 'lez-a3' })
  })

  it('l’indirizzo delle impostazioni si convalida, e quelli di prima si traducono', () => {
    const r = registro()
    const scheda = (chiesta) => completa({ pagina: 'pagina.impostazioni', scheda: chiesta }, NIENTE, r, OGGI).posto.scheda
    // I rimandi di prima delle aree portano ancora al loro posto.
    assert.equal(scheda('programma.recapiti'), 'utente#posta')
    assert.equal(scheda('programma.modelli'), 'programma#modelli')
    assert.equal(scheda('programma.account'), 'utente#account')
    assert.equal(scheda('documento.calendario'), 'calendario#giornata')
    assert.equal(scheda('documento.liste'), 'didattica#liste')
    // «Questo file» e gli anni sono usciti dalle impostazioni: si torna sull'anno.
    assert.equal(scheda('documento.file'), 'calendario#anno')
    assert.equal(scheda('calendario#file'), 'calendario#anno')
    assert.equal(scheda('calendario#anni'), 'calendario#anno')
    // Le materie stanno solo nei Corsi: chi le cercava qui ritrova la Didattica.
    assert.equal(scheda('documento.materie'), 'didattica')
    assert.equal(scheda('didattica#materie'), 'didattica')
    assert.equal(scheda('documento.boh'), undefined)
    // Un'area, con o senza voce; una voce è un id o una chiave puntata.
    assert.equal(scheda('didattica'), 'didattica')
    assert.equal(scheda('programma#registroDocenti.aspetto.tema'), 'programma#registroDocenti.aspetto.tema')
    assert.equal(scheda('boh#anno'), undefined)
    assert.equal(scheda('utente#a|b'), undefined)
    assert.equal(scheda('utente#a#b'), undefined)
    // Fuori dalle impostazioni la scheda non ha senso.
    assert.equal(completa({ pagina: 'pagina.oggi', scheda: 'calendario#anno' }, NIENTE, r, OGGI).posto.scheda, undefined)
  })

  it('una pagina che non esiste torna alla Dashboard', () => {
    const esito = completa({ pagina: 'pagina.sparita' }, NIENTE, registro(), OGGI)
    assert.deepEqual(esito.posto, { pagina: 'pagina.oggi' })
    assert.equal(esito.ripiegato, true)
  })
})

describe('completa: i ripieghi', () => {
  it('lezione sparita nel Registro: l\'ora di riferimento del corso del contesto', () => {
    const esito = completa(postoDaVista('lezione', 'lez-x'), { ...NIENTE, corsoId: 'cor-a', lezioneId: 'lez-x' }, registro(), OGGI, { semestreId: 'sem-1' })
    assert.equal(esito.ripiegato, true)
    assert.deepEqual(esito.posto, { pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: 'lez-a2' } })
    assert.equal(esito.contesto.lezioneId, 'lez-a2')
  })

  it('lezione sparita e corso senza ore: i piani del corso', () => {
    const r = registro()
    r.lezioni = r.lezioni.filter((l) => l.corsoId !== 'cor-b')
    const esito = completa(postoDaVista('lezione', 'lez-x'), { ...NIENTE, corsoId: 'cor-b' }, r, OGGI)
    assert.deepEqual(esito.posto, { pagina: 'pagina.corso.piani', soggetto: { tipo: 'corso', id: 'cor-b' } })
  })

  it('lezione sparita e nessun corso: i corsi, o la Dashboard senza anno', () => {
    const r = registro()
    r.corsi = []
    r.lezioni = []
    assert.deepEqual(completa(postoDaVista('lezione', 'lez-x'), NIENTE, r, OGGI).posto, { pagina: 'pagina.corsi' })
    const vuoto = {
      ...registro(), anni: [], annoCorrenteId: null, classi: [], corsi: [], lezioni: [],
    }
    assert.deepEqual(completa(postoDaVista('lezione', 'lez-x'), NIENTE, vuoto, OGGI).posto, { pagina: 'pagina.oggi' })
  })

  it('lezione sparita nel calendario: si toglie il soggetto', () => {
    const esito = completa(postoDaVista('calendario', 'lez-x'), NIENTE, registro(), OGGI)
    assert.deepEqual(esito.posto, { pagina: 'pagina.calendario' })
    assert.equal(esito.ripiegato, true)
  })

  it('piano sparito: la stessa pagina sul corso del contesto', () => {
    const esito = completa(postoDaVista('piani', 'pia-x'), { ...NIENTE, corsoId: 'cor-b', pianoId: 'pia-x' }, registro(), OGGI)
    assert.deepEqual(esito.posto, { pagina: 'pagina.corso.piani', soggetto: { tipo: 'corso', id: 'cor-b' } })
    assert.equal(esito.contesto.pianoId, null)
    assert.equal(esito.ripiegato, true)
  })

  it('progetto: la biblioteca lo apre e basta; sparito, la biblioteca senza soggetto', () => {
    const r = registro()
    const aperto = completa(postoDaVista('progetti', 'prg-a'), { ...NIENTE, corsoId: 'cor-b' }, r, OGGI)
    assert.deepEqual(aperto.posto, { pagina: 'pagina.progetti', soggetto: { tipo: 'progetto', id: 'prg-a' } })
    assert.equal(aperto.contesto.corsoId, 'cor-b')
    assert.equal(aperto.contesto.progettoId, 'prg-a')
    assert.equal(aperto.ripiegato, false)
    const sparito = completa(postoDaVista('progetti', 'prg-x'), { ...NIENTE, corsoId: 'cor-b', progettoId: 'prg-x' }, r, OGGI)
    assert.deepEqual(sparito.posto, { pagina: 'pagina.progetti' })
    assert.equal(sparito.contesto.progettoId, null)
    assert.equal(sparito.ripiegato, true)
  })

  it('progetto nell’integrazione: porta un corso dell’anno in cui è integrato; se no il corso del contesto', () => {
    const r = registro()
    const integrazione = (id) => ({ pagina: 'pagina.corso.integrazione', soggetto: { tipo: 'progetto', id } })
    const aperto = completa(integrazione('prg-a'), { ...NIENTE, corsoId: 'cor-b' }, r, OGGI)
    assert.deepEqual(aperto.posto, integrazione('prg-a'))
    assert.equal(aperto.contesto.corsoId, 'cor-a')
    assert.equal(aperto.contesto.progettoId, 'prg-a')
    for (const id of ['prg-x', 'prg-v']) {
      const esito = completa(integrazione(id), { ...NIENTE, corsoId: 'cor-b', progettoId: id }, r, OGGI)
      assert.deepEqual(esito.posto, { pagina: 'pagina.corso.integrazione', soggetto: { tipo: 'corso', id: 'cor-b' } }, id)
      assert.equal(esito.ripiegato, true)
    }
  })

  it('l’id di prima dei progetti, ricordato o chiesto, apre la biblioteca', () => {
    const r = registro()
    const esito = completa({ pagina: 'pagina.corso.progetti', soggetto: { tipo: 'progetto', id: 'prg-a' } }, NIENTE, r, OGGI)
    assert.deepEqual(esito.posto, { pagina: 'pagina.progetti', soggetto: { tipo: 'progetto', id: 'prg-a' } })
    assert.equal(paginaDiAdesso('pagina.corso.progetti'), 'pagina.progetti')
    assert.equal(paginaDiAdesso('pagina.corso.piani'), 'pagina.corso.piani')
  })

  it('il ricordato che il documento non ha più si scorda', () => {
    const r = registro()
    // Il ricordato che il documento non ha più si scorda.
    assert.equal(completa({ pagina: 'pagina.oggi' }, { ...NIENTE, progettoId: 'prg-x' }, r, OGGI).contesto.progettoId, null)
  })

  it('valutazione sparita: la stessa pagina sul corso del contesto', () => {
    const esito = completa(postoDaVista('valutazioni', 'val-x'), { ...NIENTE, corsoId: 'cor-a' }, registro(), OGGI)
    assert.deepEqual(esito.posto, { pagina: 'pagina.corso.valutazioni', soggetto: { tipo: 'corso', id: 'cor-a' } })
  })

  it('allievo sparito: la sua classe nel contesto, se no le persone', () => {
    const r = registro()
    assert.deepEqual(completa(postoDaVista('allievo', 'all-x'), { ...NIENTE, classeId: 'cls-b' }, r, OGGI).posto,
      { pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: 'cls-b' } })
    assert.deepEqual(completa(postoDaVista('allievo', 'all-x'), NIENTE, r, OGGI).posto, { pagina: 'pagina.persone' })
    // Una persona di una classe dell'anno scorso è come sparita.
    assert.deepEqual(completa(postoDaVista('allievo', 'all-v'), NIENTE, r, OGGI).posto, { pagina: 'pagina.persone' })
  })

  it('corso sparito: il primo con ore nel semestre, poi il primo dell\'anno', () => {
    const r = registro()
    // Nel primo semestre hanno ore tutti e due: il primo per nome.
    assert.deepEqual(completa(postoDaVista('check', 'cor-x'), NIENTE, r, OGGI, { semestreId: 'sem-1' }).posto.soggetto,
      { tipo: 'corso', id: 'cor-a' })
    // Nel secondo solo A: B ha ore, ma altrove.
    r.corsi.find((c) => c.id === 'cor-a').titolo = 'Z · Matematica'
    assert.deepEqual(completa(postoDaVista('check', 'cor-x'), NIENTE, r, OGGI, { semestreId: 'sem-2' }).posto.soggetto,
      { tipo: 'corso', id: 'cor-a' })
    assert.deepEqual(completa(postoDaVista('check', 'cor-x'), NIENTE, r, OGGI, { semestreId: 'sem-1' }).posto.soggetto,
      { tipo: 'corso', id: 'cor-b' })
  })

  it('corso di un altro anno: vale come sparito, anche nel contesto', () => {
    const esito = completa({ pagina: 'pagina.corso.documenti' }, { ...NIENTE, corsoId: 'cor-v' }, registro(), OGGI)
    assert.deepEqual(esito.posto.soggetto, { tipo: 'corso', id: 'cor-a' })
    assert.equal(esito.contesto.corsoId, 'cor-a')
    const chiesto = completa(postoDaVista('check', 'cor-v'), NIENTE, registro(), OGGI)
    assert.equal(chiesto.ripiegato, true)
    assert.deepEqual(chiesto.posto.soggetto, { tipo: 'corso', id: 'cor-a' })
    // Anche un'ora di quel corso.
    assert.equal(completa(postoDaVista('lezione', 'lez-v1'), NIENTE, registro(), OGGI).posto.soggetto.id, 'lez-a2')
  })

  it('corso sparito nelle pagine che non lo chiedono: resta la pagina', () => {
    assert.deepEqual(completa(postoDaVista('corsi', 'cor-x'), NIENTE, registro(), OGGI).posto, { pagina: 'pagina.corsi' })
  })

  it('classe sparita nella pagina Classi: la scelta se c\'è, se no la prima dell\'anno', () => {
    const r = registro()
    assert.deepEqual(completa(postoDaVista('classi', 'cls-x'), NIENTE, r, OGGI).posto.soggetto, { tipo: 'classe', id: 'cls-a' })
    assert.deepEqual(completa(postoDaVista('classi', 'cls-x'), { ...NIENTE, classeId: 'cls-b' }, r, OGGI).posto.soggetto,
      { tipo: 'classe', id: 'cls-b' })
    assert.deepEqual(completa(postoDaVista('classi', 'cls-v'), NIENTE, r, OGGI).posto.soggetto, { tipo: 'classe', id: 'cls-a' })
  })

  it('classe sparita nel fascicolo: la prima con docenza', () => {
    const r = registro()
    const esito = completa({ pagina: 'pagina.classe.assenze', soggetto: { tipo: 'classe', id: 'cls-b' } }, NIENTE, r, OGGI)
    assert.deepEqual(esito.posto, { pagina: 'pagina.classe.assenze', soggetto: { tipo: 'classe', id: 'cls-a' } })
    assert.equal(esito.ripiegato, true)
    assert.equal(esito.contesto.classeId, 'cls-a')
    assert.equal(esito.contesto.filtroClasseId, 'cls-a')
  })

  it('classe senza docenze: la pagina Classi, o la Dashboard senza anno', () => {
    const r = registro()
    for (const classe of r.classi) classe.docenteDiClasse = false
    assert.deepEqual(completa(postoDaVista('docenteClasse', 'cls-a'), NIENTE, r, OGGI).posto,
      { pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: 'cls-a' } })
    assert.deepEqual(completa({ pagina: 'pagina.classe.check' }, { ...NIENTE, classeId: 'cls-b' }, r, OGGI).posto,
      { pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: 'cls-b' } })
    const vuoto = { ...registro(), anni: [], annoCorrenteId: null, classi: [] }
    assert.deepEqual(completa({ pagina: 'pagina.classe.check' }, NIENTE, vuoto, OGGI).posto, { pagina: 'pagina.oggi' })
  })

  it('gli id del contesto che non esistono più si scordano', () => {
    const esito = completa({ pagina: 'pagina.oggi' }, {
      corsoId: 'cor-x', classeId: 'cls-x', filtroClasseId: 'cls-x', lezioneId: 'lez-x',
      pianoId: 'pia-x', valutazioneId: 'val-x', allievoId: 'all-x',
    }, registro(), OGGI)
    assert.deepEqual(esito.contesto, NIENTE)
    assert.equal(esito.ripiegato, false)
  })
})

describe('completa: il filtro dell\'agenda', () => {
  it('un\'ora nascosta dal filtro sposta il filtro sul suo corso', () => {
    const esito = completa(postoDaVista('calendario', 'lez-b1'), NIENTE, registro(), OGGI, { filtroCorsoAgendaId: 'cor-a' })
    assert.equal(esito.preferenzeDoc.filtroCorsoAgendaId, 'cor-b')
    assert.equal(esito.preferenzeDoc.giorno, '2026-10-06')
    assert.equal(esito.preferenzeDoc.semestreId, 'sem-1')
    // Il calendario non sposta il corso di lavoro.
    assert.equal(esito.contesto.corsoId, null)
  })

  it('senza filtro, o già sul suo corso, non si tocca', () => {
    const r = registro()
    assert.equal('filtroCorsoAgendaId' in completa(postoDaVista('calendario', 'lez-b1'), NIENTE, r, OGGI).preferenzeDoc, false)
    assert.equal('filtroCorsoAgendaId' in completa(postoDaVista('calendario', 'lez-b1'), NIENTE, r, OGGI, { filtroCorsoAgendaId: 'cor-b' }).preferenzeDoc, false)
  })

  it('un filtro su un corso sparito si spegne', () => {
    const esito = completa({ pagina: 'pagina.calendario' }, NIENTE, registro(), OGGI, { filtroCorsoAgendaId: 'cor-x' })
    assert.equal(esito.preferenzeDoc.filtroCorsoAgendaId, null)
  })
})

describe('chiaveDelPosto', () => {
  it('è stabile e dice pagina, soggetto e scheda', () => {
    const posto = { pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: 'lez-a1' } }
    assert.equal(chiaveDelPosto(posto), 'pagina.corso.registro|lezione:lez-a1|')
    assert.equal(chiaveDelPosto({ ...posto }), chiaveDelPosto(posto))
    assert.equal(chiaveDelPosto(posto, 'pagina'), 'pagina.corso.registro||')
    assert.equal(chiaveDelPosto({ pagina: 'pagina.impostazioni', scheda: 'utente#posta' }), 'pagina.impostazioni||utente#posta')
  })

  it('non confonde due posti diversi', () => {
    const posti = [
      { pagina: 'pagina.oggi' },
      { pagina: 'pagina.classi' },
      { pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: 'a' } },
      { pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: 'b' } },
      { pagina: 'pagina.pendenze', soggetto: { tipo: 'classe', id: 'a' } },
      { pagina: 'pagina.pendenze', soggetto: { tipo: 'corso', id: 'a' } },
      { pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: 'a|b' } },
      { pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: 'a:b' } },
      { pagina: 'pagina.impostazioni', scheda: 'utente#posta' },
      { pagina: 'pagina.impostazioni', scheda: 'utente' },
      { pagina: 'pagina.impostazioni', scheda: 'calendario#anno' },
    ]
    const chiavi = new Set(posti.map((p) => chiaveDelPosto(p)))
    assert.equal(chiavi.size, posti.length)
  })

  it('a livello di pagina, lo stesso posto con un altro soggetto ha la stessa chiave', () => {
    assert.equal(
      chiaveDelPosto({ pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: 'a' } }, 'pagina'),
      chiaveDelPosto({ pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: 'b' } }, 'pagina'),
    )
  })
})

describe('PaginaId e PAGINE', () => {
  it('ogni pagina della barra è un PaginaId, e ogni PaginaId è in PAGINE o fra le nascoste', async () => {
    const { preparaDomSintetico } = await import('../helpers/domSintetico.mjs')
    preparaDomSintetico()
    const { PAGINE } = await importaSorgente('ui/pages.ts')
    const dellaBarra = PAGINE.map((p) => p.id).sort()
    const tutte = Object.keys(VISTA_DELLA_PAGINA)
    assert.deepEqual(dellaBarra, tutte.filter((id) => !NASCOSTE.includes(id)).sort())
  })
})
