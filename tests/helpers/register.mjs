// Il registro finto da cui partono quasi tutte le prove del dominio: un anno,
// una classe di tre, una materia, un corso. Quel che ogni prova aggiunge (ore,
// verifiche, piani) resta nella prova, che è dove si legge.

import {
  creaAllievo,
  creaAnno,
  creaAttivita,
  creaClasse,
  creaCorso,
  creaLezione,
  creaMateria,
  creaPiano,
  registroVuoto,
} from '../../dist-tests/domain.mjs'

/** L'anno su cui girano le prove: settembre 2026 → giugno 2027. */
export const INIZIO = '2026-09-01'
export const FINE = '2027-06-30'

/**
 * Una scuola minima: un anno in corso, una classe di tre allievi, una materia e
 * il corso che le lega. Gli allievi sono sempre Rossi, Bianchi e Verdi, in
 * quest'ordine: le prove sugli elenchi ordinati contano su di loro.
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
 * Le ore del corso, aggiunte al registro e restituite in ordine. Le date si
 * passano perché sono il soggetto di metà delle prove.
 */
export function ore (registro, corso, date, ora = '08:20', minuti = 45) {
  const nate = date.map((data) => creaLezione(corso.id, data, ora, minuti))
  registro.lezioni.push(...nate)
  return nate
}

/**
 * Appende a un'ora un piano che dura `ud` unità didattiche, e lo torna. Le ore
 * delle prove durano una UD: `1` le copre, `0.5` le lascia mezze scoperte, `0`
 * è un piano vuoto (l'ora non è pronta).
 */
export function conPiano (registro, lezione, ud) {
  const piano = creaPiano(lezione.corsoId)
  if (ud > 0) piano.attivita.push(creaAttivita('Spiegazione', ud))
  registro.piani.push(piano)
  lezione.pianoId = piano.id
  return piano
}
