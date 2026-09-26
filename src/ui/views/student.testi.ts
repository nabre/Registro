// I testi della scheda personale (`student.ts`).

import { catalogo } from '../../i18n/index.js'
import { PIF, un } from '../../domain/lexicon.js'

const it = {
  vuota: 'Qui non c’è ancora niente.',
  nessunaScelta: `Nessuna ${PIF.singolare} scelta`,
  comeSiApre: `La scheda si apre dal nome di ${un(PIF)}, nell’elenco della sua classe.`,
  vaiAllePersone: `Vai alle ${PIF.plurale}`,
  ritirato: ' · ritirato',
  posizione: (dove: number, quanti: number) => ` · ${dove} di ${quanti}`,
  schedaDi: (nome: string) => `Scheda di ${nome}`,
  primo: 'È il primo della classe',
  ultimo: 'È l’ultimo della classe',
  tornaAllElenco: 'Torna all’elenco',
}

export const testi = catalogo(it, {
  de: {
    vuota: 'Hier ist noch nichts.',
    nessunaScelta: 'Keine Lernende ausgewählt',
    comeSiApre:
      'Das Personenblatt öffnet sich über den Namen einer lernenden Person in der Liste ihrer Klasse.',
    vaiAllePersone: 'Zu den Lernenden',
    ritirato: ' · ausgetreten',
    posizione: (dove, quanti) => ` · ${dove} von ${quanti}`,
    schedaDi: (nome) => `Personenblatt von ${nome}`,
    primo: 'Das ist die erste Person der Klasse',
    ultimo: 'Das ist die letzte Person der Klasse',
    tornaAllElenco: 'Zurück zur Liste',
  },
  fr: {
    vuota: 'Il n’y a encore rien ici.',
    nessunaScelta: 'Aucune personne en formation choisie',
    comeSiApre:
      'La fiche s’ouvre depuis le nom d’une personne en formation, dans la liste de sa classe.',
    vaiAllePersone: 'Aller aux personnes en formation',
    ritirato: ' · retiré',
    posizione: (dove, quanti) => ` · ${dove} sur ${quanti}`,
    schedaDi: (nome) => `Fiche de ${nome}`,
    primo: 'C’est la première personne de la classe',
    ultimo: 'C’est la dernière personne de la classe',
    tornaAllElenco: 'Retour à la liste',
  },
  en: {
    vuota: 'Nothing here yet.',
    nessunaScelta: 'No learner selected',
    comeSiApre: 'A learner’s record opens from their name, in their class list.',
    vaiAllePersone: 'Go to learners',
    ritirato: ' · withdrawn',
    posizione: (dove, quanti) => ` · ${dove} of ${quanti}`,
    schedaDi: (nome) => `${nome}’s record`,
    primo: 'First in the class',
    ultimo: 'Last in the class',
    tornaAllElenco: 'Back to the list',
  },
})
