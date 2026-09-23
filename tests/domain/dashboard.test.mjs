// Il cruscotto: che cosa conta come buco, e dove riparte il conto delle ore.
//
// Sono due regole che nessuno vede applicare e tutti leggono come vere: se il
// registro dice «3 ore da completare» quel numero deve essere quello giusto, e
// se dice «lezione n. 4» a maggio dev'essere la quarta del secondo semestre.
// Provarle qui costa poco; scoprirle sbagliate a fine anno costa un colloquio.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaAnno,
  creaClasse,
  creaCorso,
  creaLezione,
  creaMateria,
  creaOsservazione,
  creaValutazione,
  diagnosiLezione,
  registroVuoto,
} from '../../dist-tests/domain.mjs'
import { conPiano } from '../helpers/register.mjs'

const OGGI = '2027-03-01'

/** Un anno con due semestri, una classe, un corso: il minimo per contare. */
function registroConCorso () {
  const registro = registroVuoto()
  const anno = creaAnno('2026-09-01', '2027-06-30', '2026/27', '2027-01-31')
  const classe = creaClasse(anno.id, 'I MEC A')
  const materia = creaMateria('Matematica')
  const corso = creaCorso(classe.id, materia.id, 'Matematica — I MEC A')
  registro.anni.push(anno)
  registro.annoCorrenteId = anno.id
  registro.classi.push(classe)
  registro.materie.push(materia)
  registro.corsi.push(corso)
  return { registro, anno, classe, corso }
}

/** Aggiunge un'ora al corso e la torna, così il test la può sporcare. */
function ora (registro, corso, data, ritocchi = {}) {
  const lezione = Object.assign(creaLezione(corso.id, data, '08:20', 45), ritocchi)
  registro.lezioni.push(lezione)
  return lezione
}

describe('diagnosi di un’ora', () => {
  it('un’ora passata senza appello è un buco', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-02-10')

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.ok(esito.segni.includes('senza-appello'))
  })

  it('righe d’appello tutte vuote sono un appello non fatto', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-02-10', {
      stato: 'svolta',
      presenze: [{ allievoId: 'a1', stati: ['non-impostato'] }],
    })
    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.ok(esito.segni.includes('senza-appello'))
    assert.equal(esito.urgenza, 'manca')
  })

  it('la stessa ora domani è solo un’ora da fare', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-03-10')

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.ok(!esito.segni.includes('senza-appello'), 'il futuro non ha buchi')
    // Senza piano, un'ora futura è lavoro da preparare, non un errore.
    assert.equal(esito.urgenza, 'da-preparare')
  })

  it('non si fida dello stato dichiarato: guarda la data', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-02-10', {
      presenze: [{ allievoId: 'a1', stati: ['presente'] }],
    })

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.ok(
      esito.segni.includes('da-segnare'),
      'passata e non segnata svolta: è proprio la cosa che si dimentica',
    )
  })

  it('un’ora futura con la scaletta piena è preparata', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-03-10')
    conPiano(registro, lezione, 1)

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.ok(esito.segni.includes('coperta'))
    assert.equal(esito.urgenza, 'apposto')
  })

  it('una scaletta che non arriva in fondo all’ora lascia l’ora da preparare', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-03-10')
    // Mezz'ora di attività su un'ora da 45 minuti: il piano c'è, il quarto d'ora
    // in fondo non l'ha pensato nessuno, ed è quello che si paga in aula.
    conPiano(registro, lezione, 0.5)

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.ok(esito.segni.includes('scoperta'))
    assert.ok(!esito.segni.includes('coperta'))
    assert.equal(esito.urgenza, 'da-preparare')
  })

  it('un piano assegnato e ancora vuoto non prepara niente', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-03-10')
    conPiano(registro, lezione, 0)

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.equal(esito.urgenza, 'da-preparare')
  })

  it('una scaletta più lunga dell’ora la copre: sforare è un altro problema', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-03-10')
    conPiano(registro, lezione, 2)

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.ok(esito.segni.includes('coperta'))
    assert.equal(esito.urgenza, 'apposto')
  })

  it('un’ora passata senza piano non è un buco: si è svolta lo stesso', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-02-10', {
      stato: 'svolta',
      presenze: [{ allievoId: 'a1', stati: ['presente'] }],
    })

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.ok(!esito.segni.includes('scoperta'))
    assert.equal(esito.urgenza, 'apposto')
  })

  it('dice quel che c’è, non solo quel che manca', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-02-10', {
      stato: 'svolta',
      consuntivo: 'fatto tutto',
      presenze: [
        { allievoId: 'a1', stati: ['presente'] },
        { allievoId: 'a2', stati: ['assente'] },
      ],
      osservazioni: [creaOsservazione('merito', 'bravo', 'a1')],
    })
    conPiano(registro, lezione, 1)
    const momento = creaValutazione(corso.id, 'Verifica', registro.impostazioni.scala, '2027-02-10')
    momento.lezioneId = lezione.id
    registro.valutazioni.push(momento)

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    const attesi = ['svolta', 'coperta', 'consuntivo', 'valutazione', 'osservazioni', 'assenze']
    for (const atteso of attesi) {
      assert.ok(esito.segni.includes(atteso), `manca il segno ${atteso}`)
    }
    assert.equal(esito.assenti, 1)
    assert.equal(esito.urgenza, 'apposto')
  })
})

describe('il todo nel cruscotto', () => {
  it('un’ora annullata e passata non è un buco', () => {
    const { registro, corso } = registroConCorso()
    ora(registro, corso, '2027-02-10', { stato: 'annullata' })

    const diagnosi = diagnosiLezione(registro, registro.lezioni[0], 1, OGGI)

    assert.ok(!diagnosi.segni.includes('senza-appello'))
    assert.ok(!diagnosi.segni.includes('da-segnare'))
    assert.equal(diagnosi.urgenza, 'apposto')
  })
})
