// Il registro finto da cui partono quasi tutte le prove del dominio.
//
// Cinque file costruivano la stessa scuola riga per riga — un anno, una classe
// di tre, una materia, un corso — e poi ognuno ci aggiungeva la cosa sua: le
// ore, una verifica, un piano. Le prime venti righe erano le stesse, e già
// avevano cominciato a divergere: chi metteva tre allievi e chi due, chi
// chiamava la classe «I MEC A» e chi no.
//
// Qui c'è il nucleo, una volta sola. Quel che ogni prova aggiunge resta dov'era,
// perché è quello il soggetto della prova e va letto lì: chi apre
// `recuperi.test.mjs` deve vedere la verifica di cui si sta parlando senza
// aprire un secondo file.

import {
  creaAllievo,
  creaAnno,
  creaClasse,
  creaCorso,
  creaLezione,
  creaMateria,
  registroVuoto,
} from '../../dist-prove/dominio.mjs'

/** L'anno su cui girano le prove: settembre 2026 → giugno 2027. */
export const INIZIO = '2026-09-01'
export const FINE = '2027-06-30'

/**
 * Una scuola minima: un anno in corso, una classe di tre allievi, una materia e
 * il corso che le lega.
 *
 * I tre allievi si chiamano sempre Rossi, Bianchi e Verdi, e sempre in
 * quell'ordine: le prove che guardano un elenco ordinato contano su di loro, e
 * cambiare un cognome qui vuol dire far cadere un'asserzione tre file più in là.
 */
export function scuolaMinima () {
  const registro = registroVuoto()
  const anno = creaAnno(INIZIO, FINE)
  const classe = creaClasse(anno.id, 'I MEC A')
  const rossi = creaAllievo('Rossi', 'Maria')
  const bianchi = creaAllievo('Bianchi', 'Luca')
  const verdi = creaAllievo('Verdi', 'Anna')
  classe.allievi.push(rossi, bianchi, verdi)
  const materia = creaMateria('Matematica')
  const corso = creaCorso(classe.id, materia.id, 'Matematica — I MEC A')

  registro.anni.push(anno)
  registro.annoCorrenteId = anno.id
  registro.classi.push(classe)
  registro.materie.push(materia)
  registro.corsi.push(corso)

  return { registro, anno, classe, materia, corso, rossi, bianchi, verdi }
}

/**
 * Le ore del corso, aggiunte al registro e restituite in ordine.
 *
 * Le date si passano perché sono il soggetto di metà delle prove — una consegna
 * che si sposta con la sua lezione, un recupero fissato la settimana dopo — e
 * nasconderle qui vorrebbe dire leggere una prova senza sapere di che giorni
 * parla.
 */
export function ore (registro, corso, date, ora = '08:20', minuti = 45) {
  const nate = date.map((data) => creaLezione(corso.id, data, ora, minuti))
  registro.lezioni.push(...nate)
  return nate
}
