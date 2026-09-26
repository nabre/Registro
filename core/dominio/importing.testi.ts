// I testi di `importing.ts`: che cosa ha portato un import e quali classi ha saltato.

import { catalogo } from '../i18n/index.js'
import { plurale } from './text.js'

const it = {
  classeSparita: 'una classe che nell’altro registro non c’è più',
  ceGia: (nome: string) => `${nome}: c’è già`,
  classi: (n: number) => plurale(n, 'classe', 'classi'),
  persone: (n: number) => plurale(n, 'persona', 'persone'),
  corsi: (n: number) => plurale(n, 'corso', 'corsi'),
  materieNuove: (n: number) => plurale(n, 'materia nuova', 'materie nuove'),
  piani: (n: number) => plurale(n, 'piano', 'piani'),
  calendari: (n: number) => plurale(n, 'calendario', 'calendari'),
  regole: (n: number) => plurale(n, 'regola', 'regole'),
  impostazioni: 'impostazioni',
  /** «Importato: 3 classi, 57 persone; saltata I MEC A: c’è già.» */
  esito: (parti: readonly string[], saltate: readonly string[]) => {
    const detto = parti.length ? parti.join(', ') : 'niente di nuovo'
    if (saltate.length === 0) return `Importato: ${detto}.`
    const quali = saltate.length === 1 ? 'saltata' : 'saltate'
    return `Importato: ${detto}; ${quali} ${saltate.join('; ')}.`
  },
}

export const testi = catalogo(it, {
  de: {
    classeSparita: 'eine Klasse, die es im anderen Klassenbuch nicht mehr gibt',
    ceGia: (nome) => `${nome} (schon vorhanden)`,
    classi: (n) => plurale(n, 'Klasse', 'Klassen'),
    persone: (n) => plurale(n, 'Person', 'Personen'),
    corsi: (n) => plurale(n, 'Kurs', 'Kurse'),
    materieNuove: (n) => plurale(n, 'neues Fach', 'neue Fächer'),
    piani: (n) => plurale(n, 'Unterrichtsplan', 'Unterrichtspläne'),
    calendari: (n) => plurale(n, 'Kalender', 'Kalender'),
    regole: (n) => plurale(n, 'Regel', 'Regeln'),
    impostazioni: 'Einstellungen',
    esito: (parti, saltate) => {
      const detto = parti.length ? parti.join(', ') : 'nichts Neues'
      if (saltate.length === 0) return `Importiert: ${detto}.`
      return `Importiert: ${detto}; übersprungen: ${saltate.join('; ')}.`
    },
  },
  fr: {
    classeSparita: 'une classe qui n’existe plus dans l’autre registre',
    ceGia: (nome) => `${nome} (existe déjà)`,
    classi: (n) => plurale(n, 'classe', 'classes'),
    persone: (n) => plurale(n, 'personne', 'personnes'),
    corsi: (n) => plurale(n, 'cours', 'cours'),
    materieNuove: (n) => plurale(n, 'nouvelle branche', 'nouvelles branches'),
    piani: (n) => plurale(n, 'plan de leçon', 'plans de leçon'),
    calendari: (n) => plurale(n, 'calendrier', 'calendriers'),
    regole: (n) => plurale(n, 'règle', 'règles'),
    impostazioni: 'paramètres',
    esito: (parti, saltate) => {
      const detto = parti.length ? parti.join(', ') : 'rien de nouveau'
      if (saltate.length === 0) return `Importé : ${detto}.`
      const ignorate = saltate.length === 1 ? 'classe ignorée' : 'classes ignorées'
      return `Importé : ${detto} ; ${ignorate} : ${saltate.join(' ; ')}.`
    },
  },
  en: {
    classeSparita: 'a class that no longer exists in the other register',
    ceGia: (nome) => `${nome} (already exists)`,
    classi: (n) => plurale(n, 'class', 'classes'),
    persone: (n) => plurale(n, 'person', 'people'),
    corsi: (n) => plurale(n, 'course', 'courses'),
    materieNuove: (n) => plurale(n, 'new subject', 'new subjects'),
    piani: (n) => plurale(n, 'lesson plan', 'lesson plans'),
    calendari: (n) => plurale(n, 'calendar', 'calendars'),
    regole: (n) => plurale(n, 'rule', 'rules'),
    impostazioni: 'settings',
    esito: (parti, saltate) => {
      const detto = parti.length ? parti.join(', ') : 'nothing new'
      if (saltate.length === 0) return `Imported: ${detto}.`
      return `Imported: ${detto}; skipped: ${saltate.join('; ')}.`
    },
  },
})
