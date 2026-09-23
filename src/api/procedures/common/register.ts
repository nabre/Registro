// Le guardie che più aree condividono, dal vecchio `procedure/registro.ts`.
//
// Stanno qui e non in una delle aree perché le usano aree diverse: tenerle in
// una di quelle vorrebbe dire che l'area A importa da B senza averci a che fare.

import { corsoPerId } from '../../../domain/courses.js'
import { PIF, SCUOLA } from '../../../domain/lexicon.js'
import type {
  Allievo, AnnoScolastico, Classe, Corso, Materia, Registro,
} from '../../../domain/models.js'
import { errore, ErroreApi, type Ambito } from '../../contract.js'

/**
 * L'anno nominato, o il motivo per cui non c'è.
 *
 * Gli anni caricati sono **uno solo** — `archivio.leggiTutto` mette in `anni`
 * il documento aperto e nient'altro — quindi «non trovato» qui vuol dire quasi
 * sempre «è un altro documento», non «è sparito». Il rimedio lo dice, perché
 * senza, chi chiama ritenta con lo stesso id.
 */
export function esigiAnno (ambito: Ambito, annoId: string): AnnoScolastico {
  const anno = ambito.contesto.registro.anni.find((a) => a.id === annoId)
  if (!anno) {
    throw errore.nonTrovato(
      SCUOLA.annoScolastico,
      'Un anno alla volta: quello aperto lo dice «registro.riassunto».',
    )
  }
  return anno
}

export function esigiMateria (ambito: Ambito, materiaId: string): Materia {
  const materia = ambito.contesto.registro.materie.find((m) => m.id === materiaId)
  if (!materia) throw errore.nonTrovato(SCUOLA.materia)
  return materia
}

export function esigiCorso (ambito: Ambito, corsoId: string): Corso {
  const corso = corsoPerId(ambito.contesto.registro, corsoId)
  if (!corso) throw errore.nonTrovato(SCUOLA.corso, 'I corsi dell’anno li elenca «corsi.elenco».')
  return corso
}

/**
 * La persona in formazione nominata, con la classe in cui sta.
 *
 * Le due cose insieme perché non si trovano una senza l'altra: gli allievi
 * stanno **dentro** la classe, e chi ha l'id di una persona ha quasi sempre
 * bisogno anche del nome della sua classe per rispondere.
 *
 * Il rimedio nomina tutte e due le strade per avere un id buono. Dal giornale:
 * dieci `persone.scheda` di fila, tutte non-trovato, tutte con un id inventato
 * da capo — un «non trovato» che non dice dove si cerca è un invito a
 * riprovare.
 */
export function esigiPersona (
  ambito: Ambito,
  allievoId: string,
): { classe: Classe, allievo: Allievo } {
  const registro = ambito.contesto.registro
  const classe = registro.classi.find((c) => c.allievi.some((a) => a.id === allievoId))
  const allievo = classe?.allievi.find((a) => a.id === allievoId)
  if (!classe || !allievo) {
    throw errore.nonTrovato(
      PIF,
      'Le persone si cercano per nome con «persone.cerca», o si elencano per classe con ' +
      '«classe.persone»: l’id da passare qui viene da lì.',
    )
  }
  return { classe, allievo }
}

export function esigiClasse (ambito: Ambito, classeId: string): Classe {
  const classe = ambito.contesto.registro.classi.find((c) => c.id === classeId)
  if (!classe) throw errore.nonTrovato(SCUOLA.classe, 'Le classi dell’anno le elenca «classi.elenco».')
  return classe
}

/**
 * Che il corso chiesto sia di quella classe, o si dica quale dei due è di
 * troppo.
 *
 * È la guardia nata da un guasto vero. «Elenco degli allievi con assenze»
 * rispondeva «non sono state trovate assenze per nessun allievo», con la busta
 * in ordine e `ok: true`, perché il contesto dell'interfaccia aveva infilato
 * accanto alla classe il `corsoId` di un corso di un'**altra** classe:
 * l'incrocio dei due filtri non lasciava in piedi nessuna classe, e zero classi
 * guardate uscivano identiche a zero assenze trovate.
 *
 * Un errore che **nomina il conflitto** — il corso X è della classe Y, non
 * della Z — è la sola risposta che chi chiama possa correggere: uno zero
 * silenzioso lo fa rispondere che non ci sono assenze. Sta qui e non dentro una
 * procedura perché le letture che incrociano quei due id sono più d'una, e due
 * guardie uguali in due file, fra sei mesi, non dicono più la stessa cosa.
 */
export function esigiCorsoDiClasse (
  registro: Registro,
  corso: Corso | null,
  chiesta: Classe | null,
): void {
  if (!corso || !chiesta || corso.classeId === chiesta.id) return
  const sua = registro.classi.find((classe) => classe.id === corso.classeId)
  throw new ErroreApi(
    'ingresso-non-valido',
    [
      `Il corso «${corso.titolo}» è della classe «${sua?.nome ?? corso.classeId}», ` +
      `non della classe «${chiesta.nome}».`,
      'O si chiede la classe, o si chiede il corso: i corsi di una classe li elenca ' +
      '«corsi.elenco», che dice per ciascuno a quale classe appartiene.',
    ],
    'corsoId',
  )
}
