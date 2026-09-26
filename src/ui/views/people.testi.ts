// I testi della pagina delle persone in formazione (`people.ts`).

import { catalogo, perNumero } from '../../i18n/index.js'
import { PERSONE, PIF, un } from '../../domain/lexicon.js'

const it = {
  nessunaCorrispondenza: 'Nessun nome corrisponde a quel che hai scritto.',
  segnaposto: 'cerca per nome, classe, azienda, paese',
  cercaFra: `Cerca fra le ${PIF.plurale}`,
  inFormazione: (quante: number) => `${quante} in formazione`,
  nonFrequentaPiu: (quante: number) => `${quante} non frequenta più`,
  senzaAzienda: (quante: number) => `${quante} senza ${PERSONE.azienda.singolare}`,
  senzaTelefono: (quante: number) => `${quante} senza telefono`,
  nessunaPerOra: 'nessuna, per ora',
  aTuttaPagina: 'A tutta pagina',
  senzaElenco: (nome: string) => `La scheda di ${nome} senza l’elenco accanto`,
  nonFrequenta: 'non frequenta',
  nessuna: `Nessuna ${PIF.singolare}`,
  scegli: `Scegli ${un(PIF)}`,
  comeSiAggiungono:
    `Le ${PIF.plurale} si aggiungono dentro una classe, una per una o incollando l’elenco.`,
  comeSiApre:
    `Dall’elenco a sinistra: la scheda si apre qui accanto, con tutto quel che il registro sa di ${un(PIF)}.`,
  vaiAlleClassi: 'Vai alle classi',
}

export const testi = catalogo(it, {
  de: {
    nessunaCorrispondenza: 'Kein Name passt zu dem, was du geschrieben hast.',
    segnaposto: 'nach Name, Klasse, Lehrbetrieb, Ort suchen',
    cercaFra: 'Unter den Lernenden suchen',
    inFormazione: (quante) => `${quante} in Ausbildung`,
    nonFrequentaPiu: (quante) =>
      `${quante} ${perNumero(quante, 'besucht nicht mehr', 'besuchen nicht mehr')}`,
    senzaAzienda: (quante) => `${quante} ohne Lehrbetrieb`,
    senzaTelefono: (quante) => `${quante} ohne Telefon`,
    nessunaPerOra: 'noch keine',
    aTuttaPagina: 'Ganze Seite',
    senzaElenco: (nome) => `Das Personenblatt von ${nome} ohne die Liste daneben`,
    nonFrequenta: 'besucht nicht mehr',
    nessuna: 'Keine Lernenden',
    scegli: 'Wähle eine lernende Person',
    comeSiAggiungono:
      'Lernende fügst du in einer Klasse hinzu, einzeln oder indem du die Liste einfügst.',
    comeSiApre:
      'Wähle links aus der Liste: Das Personenblatt öffnet sich hier daneben, mit allem, was das ' +
      'Klassenbuch über die Person weiss.',
    vaiAlleClassi: 'Zu den Klassen',
  },
  fr: {
    nessunaCorrispondenza: 'Aucun nom ne correspond à ce que tu as écrit.',
    segnaposto: 'chercher par nom, classe, entreprise, localité',
    cercaFra: 'Rechercher parmi les personnes en formation',
    inFormazione: (quante) => `${quante} en formation`,
    nonFrequentaPiu: (quante) =>
      `${quante} ${perNumero(quante, 'ne suit plus', 'ne suivent plus')}`,
    senzaAzienda: (quante) => `${quante} sans entreprise formatrice`,
    senzaTelefono: (quante) => `${quante} sans téléphone`,
    nessunaPerOra: 'aucune pour l’instant',
    aTuttaPagina: 'Pleine page',
    senzaElenco: (nome) => `La fiche de ${nome} sans la liste à côté`,
    nonFrequenta: 'ne suit plus',
    nessuna: 'Aucune personne en formation',
    scegli: 'Choisis une personne en formation',
    comeSiAggiungono:
      'Les personnes en formation s’ajoutent dans une classe, une par une ou en collant la liste.',
    comeSiApre:
      'Dans la liste à gauche : la fiche s’ouvre ici à côté, avec tout ce que le registre sait ' +
      'd’une personne en formation.',
    vaiAlleClassi: 'Aller aux classes',
  },
  en: {
    nessunaCorrispondenza: 'No name matches what you typed.',
    segnaposto: 'search by name, class, company, town',
    cercaFra: 'Search learners',
    inFormazione: (quante) => `${quante} in training`,
    nonFrequentaPiu: (quante) => `${quante} no longer attending`,
    senzaAzienda: (quante) => `${quante} without a training company`,
    senzaTelefono: (quante) => `${quante} without a phone`,
    nessunaPerOra: 'none yet',
    aTuttaPagina: 'Full page',
    senzaElenco: (nome) => `${nome}’s record without the list beside it`,
    nonFrequenta: 'no longer attending',
    nessuna: 'No learners',
    scegli: 'Choose a learner',
    comeSiAggiungono: 'Learners are added inside a class, one at a time or by pasting the list.',
    comeSiApre:
      'From the list on the left: the record opens here alongside, with everything the register ' +
      'knows about a learner.',
    vaiAlleClassi: 'Go to classes',
  },
})
