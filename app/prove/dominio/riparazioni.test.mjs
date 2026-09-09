// Le riparazioni: che cosa il registro sa rimettere a posto da solo.
//
// Sono la rete che sta sotto ai file modificati a mano. Le prove qui contano
// tanto per quel che le riparazioni fanno quanto per quel che si rifiutano di
// fare: una correzione che perde un voto o indovina un corso sarebbe peggio del
// problema che risolve.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaAnno,
  creaClasse,
  creaConsegna,
  creaCorso,
  creaLezione,
  creaMateria,
  creaPiano,
  creaValutazione,
  materieSimili,
  nomeNormalizzato,
  registroVuoto,
  riferimentiRotti,
  riparazioni,
} from '../../dist-prove/dominio.mjs'

/** Un registro minimo ma coerente: anno, classe, materia, corso. */
function registroBase () {
  const registro = registroVuoto()
  const anno = creaAnno('2026-09-01', '2027-06-30')
  const classe = creaClasse(anno.id, 'I MEC A')
  const materia = creaMateria('Matematica')
  const corso = creaCorso(classe.id, materia.id, 'I MEC A — Matematica')
  registro.anni.push(anno)
  registro.annoCorrenteId = anno.id
  registro.classi.push(classe)
  registro.materie.push(materia)
  registro.corsi.push(corso)
  return { registro, anno, classe, materia, corso }
}

/** Applica tutte le correzioni proposte, come fa l'azione di manutenzione. */
function ripara (registro) {
  for (const correzione of riparazioni(registro)) correzione.applica(registro)
  return registro
}

describe('riparazioni', () => {
  it('non propone niente su un registro sano', () => {
    const { registro } = registroBase()
    assert.equal(riferimentiRotti(registro).length, 0)
    assert.equal(riparazioni(registro).length, 0)
  })

  it('rimette la materia tolta dal file, con lo stesso identificatore', () => {
    const { registro, materia, corso } = registroBase()
    registro.materie = registro.materie.filter((m) => m.id !== materia.id)
    assert.equal(riferimentiRotti(registro).length, 1)

    ripara(registro)

    const rimessa = registro.materie.find((m) => m.id === materia.id)
    assert.ok(rimessa, 'la materia deve tornare con il suo id, o il corso resta appeso')
    assert.equal(rimessa.nome, 'Matematica', 'il nome si legge dal titolo del corso')
    assert.equal(corso.materiaId, rimessa.id)
    assert.equal(riferimentiRotti(registro).length, 0)
  })

  it('rimette una materia sola per due corsi che la condividevano', () => {
    const { registro, classe, materia, corso } = registroBase()
    const altra = creaClasse(registro.anni[0].id, 'I MEC B')
    registro.classi.push(altra)
    registro.corsi.push(creaCorso(altra.id, materia.id, 'I MEC B — Matematica'))
    registro.materie = registro.materie.filter((m) => m.id !== materia.id)

    ripara(registro)

    assert.equal(registro.materie.length, 1, 'due copie farebbero due materie uguali')
    assert.equal(registro.corsi[0].materiaId, registro.corsi[1].materiaId)
    assert.equal(corso.classeId, classe.id)
  })

  it('stacca dalla lezione il piano che non esiste più', () => {
    const { registro, corso } = registroBase()
    const lezione = creaLezione(corso.id, '2026-09-14', '08:20', 45)
    lezione.pianoId = 'pia-sparito'
    registro.lezioni.push(lezione)

    ripara(registro)

    assert.equal(registro.lezioni[0].pianoId, null)
    assert.equal(riferimentiRotti(registro).length, 0)
  })

  it('lascia stare il piano che c’è davvero', () => {
    const { registro, corso, materia } = registroBase()
    const piano = creaPiano(materia.id)
    const lezione = creaLezione(corso.id, '2026-09-14', '08:20', 45)
    lezione.pianoId = piano.id
    registro.piani.push(piano)
    registro.lezioni.push(lezione)

    ripara(registro)

    assert.equal(registro.lezioni[0].pianoId, piano.id)
  })

  it('toglie il rinvio a una lezione sparita senza toccare i voti', () => {
    const { registro, corso } = registroBase()
    const momento = creaValutazione(corso.id, 'Verifica', registro.impostazioni.scala, '2026-10-05')
    momento.lezioneId = 'lez-sparita'
    momento.voti = [{ allievoId: 'alv-1', valore: 5, assente: false }]
    registro.valutazioni.push(momento)

    ripara(registro)

    assert.equal(registro.valutazioni[0].lezioneId, null)
    assert.equal(registro.valutazioni[0].voti.length, 1, 'i voti non si toccano mai')
    assert.equal(registro.valutazioni[0].voti[0].valore, 5)
  })

  it('toglie il rinvio a una lezione di un altro corso', () => {
    const { registro, classe, corso } = registroBase()
    const altra = creaMateria('Italiano')
    const altroCorso = creaCorso(classe.id, altra.id, 'Italiano — I MEC A')
    registro.materie.push(altra)
    registro.corsi.push(altroCorso)

    const lezione = creaLezione(altroCorso.id, '2026-09-14', '08:20', 45)
    registro.lezioni.push(lezione)
    const momento = creaValutazione(corso.id, 'Verifica', registro.impostazioni.scala, '2026-10-05')
    momento.lezioneId = lezione.id
    registro.valutazioni.push(momento)

    ripara(registro)

    assert.equal(registro.valutazioni[0].lezioneId, null)
    assert.equal(registro.valutazioni[0].corsoId, corso.id, 'il momento resta dov’era')
  })

  it('non prova a indovinare il corso di una lezione orfana', () => {
    const { registro } = registroBase()
    registro.lezioni.push(creaLezione('cor-sparito', '2026-09-14', '08:20', 45))

    assert.ok(riferimentiRotti(registro).length > 0, 'il problema va comunque segnalato')
    assert.equal(riparazioni(registro).length, 0, 'ma non c’è una correzione sicura')
  })

  it('si può rilanciare senza fare danni', () => {
    const { registro, materia } = registroBase()
    registro.materie = registro.materie.filter((m) => m.id !== materia.id)

    ripara(registro)
    const dopoUna = JSON.stringify(registro)
    ripara(registro)

    assert.equal(JSON.stringify(registro), dopoUna)
  })
})

describe('nomi delle materie', () => {
  it('riduce all’osso maiuscole, accenti e spazi', () => {
    assert.equal(nomeNormalizzato('Ed.  Fisica'), 'ed fisica')
    assert.equal(nomeNormalizzato('Matemàtica'), 'matematica')
  })

  it('segnala il refuso, non la materia diversa', () => {
    const materie = [
      creaMateria('Calcolo professionale'),
      creaMateria('Storia'),
      creaMateria('Storia dell’arte'),
    ]
    const simili = materieSimili('Calcolo profesisonale', materie)
    assert.deepEqual(simili.map((m) => m.nome), ['Calcolo professionale'])
    assert.equal(materieSimili('Storia dell’arte', materie).length, 0)
  })

  it('non segnala una materia identica a se stessa', () => {
    const materia = creaMateria('Matematica')
    assert.equal(materieSimili('Matematica', [materia], materia.id).length, 0)
  })
})

describe('quel che resta appeso a un corso o a un’ora spariti', () => {
  it('stacca il piano che cita un corso che non c’è più', () => {
    const { registro } = registroBase()
    const piano = creaPiano('cor-mai-esistito')
    registro.piani.push(piano)

    assert.ok(riferimentiRotti(registro).length > 0)
    ripara(registro)

    assert.equal(registro.piani[0].corsoId, null, 'resta fra le bozze, non punta nel vuoto')
    assert.deepEqual(riferimentiRotti(registro), [])
  })

  it('la consegna che perde la sua ora tiene la data che aveva', () => {
    const { registro, corso } = registroBase()
    const consegna = creaConsegna(corso.id, 'Esercizi 4–7', '2026-09-14', 'lez-mai-esistita')
    consegna.scadenzaLezioneId = 'lez-mai-esistita'
    registro.consegne.push(consegna)

    ripara(registro)

    assert.equal(registro.consegne[0].dataLezioneId, null)
    assert.equal(registro.consegne[0].scadenzaLezioneId, null)
    assert.equal(registro.consegne[0].data, '2026-09-14', '«per la prossima volta» non diventa «per mai»')
    assert.deepEqual(riferimentiRotti(registro), [])
  })
})

describe('i titoli dei corsi', () => {
  it('rimette nell’ordine di adesso i titoli scritti al contrario', () => {
    // I registri di prima hanno 'Materia — Classe': in un elenco ordinato per
    // titolo finiscono lontani dagli altri corsi della stessa classe.
    const { registro, corso, classe, materia } = registroBase()
    corso.titolo = `${materia.nome} — ${classe.nome}`

    // Non è una rottura: nessun riferimento è appeso, e il registro funziona.
    assert.equal(riferimentiRotti(registro).length, 0)
    assert.equal(riparazioni(registro).length, 1)

    ripara(registro)
    assert.equal(registro.corsi[0].titolo, 'I MEC A — Matematica')
    assert.equal(riparazioni(registro).length, 0)
  })

  it('lascia stare un titolo scritto a mano', () => {
    const { registro, corso } = registroBase()
    corso.titolo = 'Matematica del giovedì'

    assert.equal(riparazioni(registro).length, 0)
    ripara(registro)
    assert.equal(registro.corsi[0].titolo, 'Matematica del giovedì')
  })

  it('recupera la materia sparita anche da un titolo dell’ordine vecchio', () => {
    // Il nome della materia si legge togliendo la classe, non prendendo una
    // metà per posizione: al contrario si recupererebbe «I MEC A» come materia.
    const { registro, corso, classe, materia } = registroBase()
    corso.titolo = `${materia.nome} — ${classe.nome}`
    registro.materie = registro.materie.filter((m) => m.id !== materia.id)

    ripara(registro)

    assert.equal(registro.materie.find((m) => m.id === materia.id).nome, 'Matematica')
  })
})
