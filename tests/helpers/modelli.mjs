// Il registro e i dati su cui si provano i modelli di `templates/`: il
// controllo dei modelli (`templateCheck`) e i dati che i rapporti ricevono
// (`reportTemplates`) guardano gli stessi fogli con gli stessi dati.

import {
  IMPOSTAZIONI_PREDEFINITE,
  creaAllievo,
  creaAnno,
  creaAttivita,
  creaFascicolo,
  creaLezione,
  creaPiano,
  creaValutazione,
  datiAllievo,
  datiFascicolo,
  datiFotoClasse,
  datiLezione,
  datiMomento,
  datiPiano,
  datiPresenze,
  datiValutazioni,
  normalizzaRegistro,
} from '../../dist-tests/domain.mjs'

/**
 * Un registro con dentro un po' di tutto: serve a far uscire ogni tabella che
 * i modelli sanno chiedere, non a essere realistico.
 */
export function registroCompleto () {
  const anno = creaAnno('2026-09-01', '2027-06-30', '2026/27', '2027-01-31')
  anno.id = 'a1'
  anno.semestri[0].id = 's1'

  const anna = { ...creaAllievo('Rossi', 'Anna'), id: 'al-1' }
  const luca = { ...creaAllievo('Bianchi', 'Luca'), id: 'al-2' }

  const piano = { ...creaPiano('cor-1'), id: 'pia-1' }
  piano.obiettivi = ['Saper leggere una fattura']
  piano.attivita = [creaAttivita('Esercizi', 2)]
  piano.prerequisiti = 'Le quattro operazioni'
  piano.note = 'Portare la calcolatrice'

  const lezione = creaLezione('cor-1', '2026-10-06', '08:00', 90)
  lezione.id = 'lez-1'
  lezione.stato = 'svolta'
  lezione.pianoId = piano.id
  lezione.presenze = [{ allievoId: 'al-1', stati: ['presente', 'assente'] }]
  lezione.argomenti = 'Le percentuali'
  lezione.consuntivo = 'Fatto quasi tutto'
  lezione.materiali = 'Fotocopie'

  const valutazione = creaValutazione('cor-1', 'Prova di ottobre', undefined, '2026-10-20')
  valutazione.id = 'val-1'
  valutazione.voti = [{ allievoId: 'al-1', valore: 5, assente: false, nota: '' }]

  const fascicolo = creaFascicolo('cl-1')
  fascicolo.id = 'fas-1'

  return normalizzaRegistro({
    anni: [anno],
    annoCorrenteId: 'a1',
    materie: [{ id: 'mat-1', nome: 'Calcolo professionale' }],
    classi: [{ id: 'cl-1', annoId: 'a1', nome: 'DIC2', allievi: [anna, luca] }],
    corsi: [{ id: 'cor-1', classeId: 'cl-1', materiaId: 'mat-1', titolo: 'CP — DIC2' }],
    lezioni: [lezione],
    piani: [piano],
    valutazioni: [valutazione],
    fascicoli: [fascicolo],
    impostazioni: IMPOSTAZIONI_PREDEFINITE,
  })
}

/**
 * I dati di un genere di rapporto, come li preparano `actions/reports.ts` per
 * la stampa e `actions/templates.ts` per l'anteprima.
 */
export function datiDelGenere (registro, genere) {
  const classe = registro.classi[0]
  const corso = registro.corsi[0]
  const semestre = registro.anni[0].semestri[0]
  switch (genere) {
    case 'lezione':
      return datiLezione(registro, registro.lezioni[0], [])
    case 'piano':
      return datiPiano(registro, registro.piani[0])
    case 'valutazioni':
      return datiValutazioni(registro, corso, semestre)
    case 'presenze':
      return datiPresenze(registro, corso, semestre)
    case 'momento':
      return datiMomento(registro, registro.valutazioni[0])
    case 'fascicolo':
      return datiFascicolo(registro, classe)
    case 'foto-classe':
      return datiFotoClasse(registro, classe)
    default:
      return datiAllievo(registro, classe, classe.allievi[0], semestre, corso)
  }
}
