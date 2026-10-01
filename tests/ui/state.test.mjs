// Lo stato dell'interfaccia nel webview: una finestra nuova riparte da quel che
// la precedente aveva lasciato nel ponte. Le preferenze di forma valgono per
// tutti i documenti; il posto e le scelte con gli id, per il suo `.regi`.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { apriInterfaccia } from '../helpers/statoInterfaccia.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

const { registroVuoto, creaAnno, creaClasse, creaMateria, creaCorso, creaLezione, creaProgetto } =
  await importaSorgente('core/dominio/factories.ts')

/** Un anno con due classi, un corso e un'ora ciascuna; la prima col fascicolo. */
function annoDiProva () {
  const registro = registroVuoto()
  const anno = creaAnno('2026-09-01', '2027-06-30')
  registro.anni.push(anno)
  registro.annoCorrenteId = anno.id
  for (const nome of ['DIC4a', 'DIC4b']) {
    const classe = creaClasse(anno.id, nome)
    classe.docenteDiClasse = nome === 'DIC4a'
    const materia = creaMateria('Matematica')
    const corso = creaCorso(classe.id, materia.id, `${nome} · Matematica`)
    registro.classi.push(classe)
    registro.materie.push(materia)
    registro.corsi.push(corso)
    registro.lezioni.push(creaLezione(corso.id, '2026-09-14', '08:20', 45))
  }
  return registro
}

/** Una finestra con il ponte in comune: `salvato` è quel che resta sul disco. */
function ponte () {
  const disco = { salvato: null, scritture: 0 }
  const apri = () => apriInterfaccia({
    getState: () => disco.salvato,
    setState: (valore) => {
      disco.scritture += 1
      disco.salvato = JSON.parse(JSON.stringify(valore))
    },
  })
  return { disco, apri }
}

/** Il posto come dato semplice: l'oggetto viene da un altro contesto di esecuzione. */
function posto (ui) {
  return JSON.parse(JSON.stringify(ui.postoCorrente()))
}

/** Come l'arrivo dei dati in `main.ts`: registro, documento, la sua voce, il posto riconfermato. */
function arrivaDocumento (ui, registro, percorso) {
  ui.inBlocco(() => {
    ui.aggiorna({ registro, caricato: true, documenti: { corrente: percorso, elenco: [] } })
    ui.ritrovaDocumento()
    ui.allineaSemestre()
    ui.riconvalidaRicordati()
  })
}

describe('lo stato dell’interfaccia nel ponte', () => {
  it('convalida l’ambito del check ricordato', () => {
    const interfaccia = apriInterfaccia({
      getState: () => ({ ambitoCheck: 'altro' }),
      setState: () => {},
    })
    assert.equal(interfaccia.stato.ambitoCheck, 'corso')
  })

  it('una nuova finestra ripristina preferenze, posto e scelte del documento', () => {
    const { disco, apri } = ponte()
    const registro = annoDiProva()
    const [a, b] = registro.classi
    const corsoB = registro.corsi[1]
    const prima = apri()
    arrivaDocumento(prima, registro, 'C:/esempio/A.regi')
    prima.aggiorna({ sidebarDesktop: false, modoCalendario: 'mese', ricerca: 'Rossi' })
    prima.vai({ pagina: 'pagina.classe.assenze' })
    prima.aggiorna({ data: '2026-10-02', filtroCorsoAgendaId: corsoB.id, semestreId: null })
    prima.aggiorna({ classiApertePersone: [a.id, b.id] })
    assert.equal(disco.salvato.v, 2)

    const seconda = apri()
    // Le preferenze di forma ci sono subito, prima del documento.
    assert.equal(seconda.stato.sidebarDesktop, false)
    assert.equal(seconda.stato.modoCalendario, 'mese')
    arrivaDocumento(seconda, registro, 'c:\\esempio\\a.regi')
    const atteso = {
      vista: 'docenteClasse',
      schedaDocente: 'assenze',
      data: '2026-10-02',
      ricerca: 'Rossi',
      classeId: a.id,
      filtroClasseId: a.id,
      semestreId: null,
      filtroCorsoAgendaId: corsoB.id,
    }
    for (const [chiave, valore] of Object.entries(atteso)) {
      assert.equal(seconda.stato[chiave], valore, chiave)
    }
    assert.deepEqual(posto(seconda), {
      pagina: 'pagina.classe.assenze', soggetto: { tipo: 'classe', id: a.id },
    })
    assert.deepEqual(Array.from(seconda.stato.classiApertePersone), [a.id, b.id])
    assert.notEqual(b.id, a.id)
  })

  it('una nuova finestra riapre il progetto e la scheda Progetto dell’ora', () => {
    const { apri } = ponte()
    const registro = annoDiProva()
    const corso = registro.corsi[1]
    const progetto = creaProgetto(corso.id, 'Giornale')
    registro.progetti.push(progetto)
    const prima = apri()
    arrivaDocumento(prima, registro, 'C:/esempio/A.regi')
    prima.aggiorna({ schedaLezione: 'progetto' })
    prima.vai({ pagina: 'pagina.corso.progetti', soggetto: { tipo: 'progetto', id: progetto.id } })
    assert.equal(prima.stato.vista, 'progetti')
    assert.equal(prima.stato.corsoId, corso.id)
    assert.equal(prima.stato.progettoId, progetto.id)

    const seconda = apri()
    assert.equal(seconda.stato.schedaLezione, 'progetto')
    arrivaDocumento(seconda, registro, 'C:/esempio/A.regi')
    assert.deepEqual(posto(seconda), {
      pagina: 'pagina.corso.progetti', soggetto: { tipo: 'progetto', id: progetto.id },
    })
    assert.equal(seconda.stato.progettoId, progetto.id)
  })

  it('un altro documento apre la sua memoria o la Dashboard, e ritornando si ritrova il posto', () => {
    const { apri } = ponte()
    const annoA = annoDiProva()
    const annoB = annoDiProva()
    const ui = apri()
    arrivaDocumento(ui, annoA, 'C:/esempio/A.regi')
    ui.vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'corso', id: annoA.corsi[1].id } })
    ui.aggiorna({ filtroCorsoAgendaId: annoA.corsi[0].id })

    arrivaDocumento(ui, annoB, 'C:/esempio/B.regi')
    assert.deepEqual(posto(ui), { pagina: 'pagina.oggi' })
    assert.equal(ui.stato.corsoId, null)
    // Il filtro dell'agenda è del documento: nell'anno B non c'è.
    assert.equal(ui.stato.filtroCorsoAgendaId, null)

    arrivaDocumento(ui, annoA, 'C:/esempio/A.regi')
    assert.deepEqual(posto(ui), {
      pagina: 'pagina.corso.piani', soggetto: { tipo: 'corso', id: annoA.corsi[1].id },
    })
    assert.equal(ui.stato.vista, 'piani')
    assert.equal(ui.stato.filtroCorsoAgendaId, annoA.corsi[0].id)
  })

  it('il JSON di prima si migra: il primo documento aperto ne prende il posto', () => {
    const registro = annoDiProva()
    const corso = registro.corsi[1]
    let salvato = { vista: 'check', ambitoCheck: 'corso', corsoId: corso.id, modoCalendario: 'anno' }
    const ui = apriInterfaccia({
      getState: () => salvato,
      setState: (valore) => { salvato = JSON.parse(JSON.stringify(valore)) },
    })
    assert.equal(ui.stato.modoCalendario, 'anno')
    arrivaDocumento(ui, registro, 'C:/esempio/A.regi')
    assert.deepEqual(posto(ui), {
      pagina: 'pagina.corso.check', soggetto: { tipo: 'corso', id: corso.id },
    })
    assert.equal(salvato.v, 2)
    assert.deepEqual(Object.keys(salvato.documenti), ['c:/esempio/a.regi'])
  })

  it('ricorda() salva senza ritardo (nessun setTimeout)', () => {
    const { disco, apri } = ponte()
    const interfaccia = apri()
    arrivaDocumento(interfaccia, annoDiProva(), 'C:/esempio/A.regi')
    const prima = disco.scritture
    interfaccia.vai({ pagina: 'pagina.persone' }, { altro: { ricerca: 'Bianchi' } })
    // La scrittura deve avvenire in modo perfettamente sincrono sulla stessa riga di esecuzione
    assert.equal(disco.scritture, prima + 1, 'setState non è stato chiamato subito')
    const voce = disco.salvato.documenti['c:/esempio/a.regi']
    assert.equal(voce.posto.pagina, 'pagina.persone')
    assert.equal(voce.ricerca, 'Bianchi')
  })

  it('senza dati né documento non scrive niente, e un documento provvisorio tiene solo le preferenze', () => {
    const { disco, apri } = ponte()
    const ui = apri()
    ui.aggiorna({ sidebarDesktop: false })
    assert.equal(disco.scritture, 0)
    ui.inBlocco(() => {
      ui.aggiorna({
        registro: annoDiProva(),
        caricato: true,
        documenti: { corrente: 'C:/tmp/nuovo.regi', provvisorio: true, elenco: [] },
      })
      ui.ritrovaDocumento()
    })
    ui.aggiorna({ sidebarDesktop: true })
    assert.equal(disco.salvato.globali.sidebarDesktop, true)
    assert.deepEqual(disco.salvato.documenti, {})
  })
})
