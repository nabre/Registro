// I numeri delle pendenze nella barra di stato: nelle pagine del registro
// quello del corso e, se della sua classe si è docente di classe, accanto
// quello del fascicolo; fuori, il conto della barra laterale.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { apriInterfaccia } from '../helpers/statoInterfaccia.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

const { registroVuoto, creaAnno, creaClasse, creaMateria, creaCorso, creaConsegna, creaAllievo } =
  await importaSorgente('core/dominio/factories.ts')

const OGGI = '2026-09-09'

/** Una consegna aperta con termine passato: conta anche fra le urgenti. */
function arretrata (corsoId, testo, extra = {}) {
  return { ...creaConsegna(corsoId, testo, '2026-09-01'), scadenza: '2026-09-02', ...extra }
}

/**
 * Due classi, una col fascicolo: il suo corso ha una consegna, il fascicolo
 * due; l'altro corso una.
 */
function annoDiProva () {
  const registro = registroVuoto()
  const anno = creaAnno('2026-09-01', '2027-06-30')
  registro.anni.push(anno)
  registro.annoCorrenteId = anno.id
  const materia = creaMateria('Matematica')
  registro.materie.push(materia)
  for (const nome of ['DIC4a', 'DIC4b']) {
    const classe = { ...creaClasse(anno.id, nome), allievi: [creaAllievo('Rossi', 'Maria')] }
    classe.docenteDiClasse = nome === 'DIC4a'
    registro.classi.push(classe)
    registro.corsi.push(creaCorso(classe.id, materia.id, `${nome} · Matematica`))
  }
  const [mio, altro] = registro.corsi
  registro.consegne = [
    arretrata(mio.id, 'Esercizi 4–7'),
    arretrata(mio.id, 'Autorizzazione uscita', { docenteDiClasse: true }),
    arretrata(mio.id, 'Pagella', { docenteDiClasse: true }),
    arretrata(altro.id, 'Esercizi 1–3'),
  ]
  return registro
}

function apri () {
  const ui = apriInterfaccia({ getState: () => null, setState: () => {} })
  const registro = annoDiProva()
  ui.inBlocco(() => {
    ui.aggiorna({ registro, caricato: true, adessoData: OGGI })
    ui.vai({ pagina: 'pagina.oggi' })
  })
  return { ui, registro }
}

/** Il risultato come dato semplice: viene da un altro contesto di esecuzione. */
function conti (voci) {
  return [...voci].map((voce) => ({
    aperti: voce.aperti,
    corso: voce.corso?.id ?? null,
    classe: voce.classe?.id ?? null,
  }))
}

describe('le pendenze della barra di stato', () => {
  it('nel registro di un corso della classe del fascicolo: il corso e, accanto, la classe', () => {
    const { ui, registro } = apri()
    const [mio] = registro.corsi
    assert.deepEqual(conti(ui.pendenzeDellaBarraDiStato(mio)), [
      { aperti: 1, corso: mio.id, classe: null },
      { aperti: 2, corso: null, classe: mio.classeId },
    ])
  })

  it('nel registro di un altro corso: il corso solo', () => {
    const { ui, registro } = apri()
    const altro = registro.corsi[1]
    assert.deepEqual(conti(ui.pendenzeDellaBarraDiStato(altro)), [
      { aperti: 1, corso: altro.id, classe: null },
    ])
  })

  it('fuori dal registro: il conto della barra laterale, di tutto l’anno', () => {
    const { ui } = apri()
    assert.deepEqual(conti(ui.pendenzeDellaBarraDiStato(null)), [
      { aperti: 4, corso: null, classe: null },
    ])
    assert.equal(ui.pendenzeDellaBarra().aperti, 4)
  })
})
