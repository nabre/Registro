// Le guardie del registro che più aree condividono: stanno qui perché nessuna
// area importi da un'altra con cui non ha a che fare.

import { corsoPerId } from '../../../domain/courses.js'
import type {
  Allievo, AnnoScolastico, Classe, Corso, Materia, Registro,
} from '../../../domain/models.js'
import { errore, ErroreApi, type Ambito } from '../../contract.js'
import { testi } from './common.testi.js'

/**
 * L'anno nominato, o il motivo per cui non c'è. In `anni` c'è solo il
 * documento aperto, quindi «non trovato» vuol dire quasi sempre «è un altro
 * documento», e il rimedio lo dice.
 */
export function esigiAnno (ambito: Ambito, annoId: string): AnnoScolastico {
  const anno = ambito.contesto.registro.anni.find((a) => a.id === annoId)
  if (!anno) {
    throw errore.nonTrovato('annoScolastico', testi().rimedioAnno)
  }
  return anno
}

export function esigiMateria (ambito: Ambito, materiaId: string): Materia {
  const materia = ambito.contesto.registro.materie.find((m) => m.id === materiaId)
  if (!materia) throw errore.nonTrovato('materia')
  return materia
}

/**
 * Il corso, o il motivo per cui non c'è. `suggerimento` è la seconda frase del
 * «non trovato» (dove si trovano i corsi); `null` la toglie.
 */
export function esigiCorso (
  ambito: Ambito,
  corsoId: string,
  suggerimento: string | null = testi().rimedioCorsi,
): Corso {
  const corso = corsoPerId(ambito.contesto.registro, corsoId)
  if (!corso) throw errore.nonTrovato('corso', suggerimento ?? undefined)
  return corso
}

/**
 * La persona in formazione nominata, con la sua classe: gli allievi stanno
 * dentro la classe, e chi risponde ne vuole quasi sempre il nome. Il rimedio
 * dice dove prendere un id buono.
 */
export function esigiPersona (
  ambito: Ambito,
  allievoId: string,
): { classe: Classe, allievo: Allievo } {
  const registro = ambito.contesto.registro
  const classe = registro.classi.find((c) => c.allievi.some((a) => a.id === allievoId))
  const allievo = classe?.allievi.find((a) => a.id === allievoId)
  if (!classe || !allievo) {
    throw errore.nonTrovato('pif', testi().rimedioPersona)
  }
  return { classe, allievo }
}

/**
 * La classe, o il motivo per cui non c'è: senza, un `classeId` inventato
 * passerebbe e tornerebbe «fatto». `suggerimento` come in `esigiCorso`.
 */
export function esigiClasse (
  ambito: Ambito,
  classeId: string,
  suggerimento: string | null = testi().rimedioClassi,
): Classe {
  const classe = ambito.contesto.registro.classi.find((c) => c.id === classeId)
  if (!classe) throw errore.nonTrovato('classe', suggerimento ?? undefined)
  return classe
}

/**
 * Che il corso chiesto sia di quella classe, o si dica quale dei due è di
 * troppo («il corso X è della classe Y, non della Z»): altrimenti l'incrocio
 * dei filtri è vuoto e sembra «nessuna assenza». Qui perché la usano più
 * letture.
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
      testi().corsoDiAltraClasse(corso.titolo, sua?.nome ?? corso.classeId, chiesta.nome),
      testi().classeOCorso,
    ],
    'corsoId',
  )
}
