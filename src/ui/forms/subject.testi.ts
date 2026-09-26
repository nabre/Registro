// I testi di `forms/subject.ts`: la finestra di una materia e quella che ne
// unisce due.

import { catalogo } from '../../i18n/index.js'
import { plurale } from '../../domain/text.js'

const it = {
  serveUnAltra: 'Serve almeno un’altra materia con cui unirla.',
  titoloUnisci: (nome: string) => `Unisci «${nome}»`,
  unisci: 'Unisci',
  passano: (corsi: number, piani: number, nome: string) =>
    `${plurale(corsi, 'corso', 'corsi')} e ` +
    `${plurale(piani, 'piano', 'piani')} passano alla materia scelta. ` +
    `«${nome}» sparisce.`,
  materiaCheResta: 'Materia che resta',
  unire: (da: string, a: string) => `Unire «${da}» a «${a}»?`,
  nienteSiPerde:
    'Non si torna indietro, ma nessun dato va perso: cambia solo a quale materia stanno attaccati.',
  unita: (da: string, a: string) => `«${da}» unita a «${a}».`,
  assomiglia: (nomi: readonly string[]) =>
    `Assomiglia a ${nomi.map((n) => `«${n}»`).join(', ')}: è la stessa materia scritta due volte?`,
  titoloMateria: (nome: string) => `Materia ${nome}`,
  nuova: 'Nuova materia',
  nome: 'Nome',
  segnapostoNome: 'Matematica',
  sigla: 'Sigla',
  aggiornata: 'Materia aggiornata.',
  creata: 'Materia creata.',
  eliminata: 'Materia eliminata.',
}

export const testi = catalogo(it, {
  de: {
    serveUnAltra: 'Zum Zusammenführen braucht es mindestens ein weiteres Fach.',
    titoloUnisci: (nome) => `«${nome}» zusammenführen`,
    unisci: 'Zusammenführen',
    passano: (corsi, piani, nome) =>
      `${plurale(corsi, 'Kurs', 'Kurse')} und ` +
      `${plurale(piani, 'Plan', 'Pläne')} gehen an das gewählte Fach über. ` +
      `«${nome}» verschwindet.`,
    materiaCheResta: 'Fach, das bleibt',
    unire: (da, a) => `«${da}» mit «${a}» zusammenführen?`,
    nienteSiPerde:
      'Das lässt sich nicht rückgängig machen, aber es gehen keine Daten verloren: Es ändert ' +
      'sich nur, an welchem Fach sie hängen.',
    unita: (da, a) => `«${da}» mit «${a}» zusammengeführt.`,
    assomiglia: (nomi) =>
      `Ähnelt ${nomi.map((n) => `«${n}»`).join(', ')}: Ist das dasselbe Fach, zweimal geschrieben?`,
    titoloMateria: (nome) => `Fach ${nome}`,
    nuova: 'Neues Fach',
    nome: 'Name',
    segnapostoNome: 'Mathematik',
    sigla: 'Kürzel',
    aggiornata: 'Fach aktualisiert.',
    creata: 'Fach erstellt.',
    eliminata: 'Fach gelöscht.',
  },
  fr: {
    serveUnAltra: 'Il faut au moins une autre branche avec laquelle la fusionner.',
    titoloUnisci: (nome) => `Fusionner « ${nome} »`,
    unisci: 'Fusionner',
    passano: (corsi, piani, nome) =>
      `${plurale(corsi, 'cours', 'cours')} et ` +
      `${plurale(piani, 'plan', 'plans')} passent à la branche choisie. ` +
      `« ${nome} » disparaît.`,
    materiaCheResta: 'Branche conservée',
    unire: (da, a) => `Fusionner « ${da} » avec « ${a} » ?`,
    nienteSiPerde:
      'On ne peut pas revenir en arrière, mais aucune donnée ne se perd : seule change la ' +
      'branche à laquelle elles sont rattachées.',
    unita: (da, a) => `« ${da} » fusionnée avec « ${a} ».`,
    assomiglia: (nomi) =>
      `Ressemble à ${nomi.map((n) => `« ${n} »`).join(', ')} : est-ce la même branche ` +
      'écrite deux fois ?',
    titoloMateria: (nome) => `Branche ${nome}`,
    nuova: 'Nouvelle branche',
    nome: 'Nom',
    segnapostoNome: 'Mathématiques',
    sigla: 'Sigle',
    aggiornata: 'Branche mise à jour.',
    creata: 'Branche créée.',
    eliminata: 'Branche supprimée.',
  },
  en: {
    serveUnAltra: 'You need at least one other subject to merge it with.',
    titoloUnisci: (nome) => `Merge “${nome}”`,
    unisci: 'Merge',
    passano: (corsi, piani, nome) =>
      `${plurale(corsi, 'course', 'courses')} and ` +
      `${plurale(piani, 'plan', 'plans')} move to the chosen subject. ` +
      `“${nome}” disappears.`,
    materiaCheResta: 'Subject to keep',
    unire: (da, a) => `Merge “${da}” into “${a}”?`,
    nienteSiPerde:
      'There’s no going back, but no data is lost: only the subject they are attached to changes.',
    unita: (da, a) => `“${da}” merged into “${a}”.`,
    assomiglia: (nomi) =>
      `Looks like ${nomi.map((n) => `“${n}”`).join(', ')}: is it the same subject written twice?`,
    titoloMateria: (nome) => `Subject ${nome}`,
    nuova: 'New subject',
    nome: 'Name',
    segnapostoNome: 'Maths',
    sigla: 'Abbreviation',
    aggiornata: 'Subject updated.',
    creata: 'Subject created.',
    eliminata: 'Subject deleted.',
  },
})
