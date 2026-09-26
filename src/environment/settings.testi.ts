// I testi della dogana delle impostazioni (perché un valore non si scrive) e i
// filtri del dialogo che sceglie un percorso.

import { catalogo } from '../i18n/index.js'

const it = {
  nonÈUnImpostazione: (chiave: string) => `«${chiave}» non è un’impostazione del registro.`,
  nonÈUnaScelta: (scelte: string) => `Non è una delle scelte: ${scelte}.`,
  vuoleAccesoOSpento: 'Vuole acceso o spento.',
  vuoleUnNumero: 'Vuole un numero.',
  sottoIlMinimo: (minimo: number) => `Sotto il minimo: non meno di ${minimo}.`,
  sopraIlMassimo: (massimo: number) => `Sopra il massimo: non più di ${massimo}.`,
  vuoleDelTesto: 'Vuole del testo.',
  nonÈUnIndirizzo: 'Non sembra un indirizzo di posta: ci vuole qualcosa come nome@dominio.ch.',
  tipoIgnoto: 'Tipo non riconosciuto.',
  cartellaIntera: 'Ci vuole il percorso intero di una cartella.',
  programmaIntero: 'Ci vuole il percorso intero del programma.',
  soloExe: 'Dev’essere un programma .exe.',
  fileIntero: 'Ci vuole il percorso intero del file.',
  unFile: (estensioni: readonly string[]) =>
    `Ci vuole un file ${estensioni.map((e) => `.${e}`).join(' o ')}.`,

  // I filtri del dialogo che sceglie un percorso
  filtroProgrammi: 'Programmi',
  filtroFile: 'File',
}

export const testi = catalogo(it, {
  de: {
    nonÈUnImpostazione: (chiave) => `«${chiave}» ist keine Einstellung des Klassenbuchs.`,
    nonÈUnaScelta: (scelte) => `Das ist keine der möglichen Optionen: ${scelte}.`,
    vuoleAccesoOSpento: 'Erwartet ein oder aus.',
    vuoleUnNumero: 'Erwartet eine Zahl.',
    sottoIlMinimo: (minimo) => `Unter dem Minimum: nicht weniger als ${minimo}.`,
    sopraIlMassimo: (massimo) => `Über dem Maximum: nicht mehr als ${massimo}.`,
    vuoleDelTesto: 'Erwartet Text.',
    nonÈUnIndirizzo: 'Das sieht nicht wie eine E-Mail-Adresse aus: nötig ist etwas wie name@domain.ch.',
    tipoIgnoto: 'Unbekannter Typ.',
    cartellaIntera: 'Nötig ist der vollständige Pfad eines Ordners.',
    programmaIntero: 'Nötig ist der vollständige Pfad des Programms.',
    soloExe: 'Es muss ein .exe-Programm sein.',
    fileIntero: 'Nötig ist der vollständige Pfad der Datei.',
    unFile: (estensioni) => `Nötig ist eine Datei vom Typ ${estensioni.map((e) => `.${e}`).join(' oder ')}.`,
    filtroProgrammi: 'Programme',
    filtroFile: 'Dateien',
  },
  fr: {
    nonÈUnImpostazione: (chiave) => `« ${chiave} » n’est pas un paramètre du registre.`,
    nonÈUnaScelta: (scelte) => `Ce n’est pas l’un des choix possibles : ${scelte}.`,
    vuoleAccesoOSpento: 'Attend activé ou désactivé.',
    vuoleUnNumero: 'Attend un nombre.',
    sottoIlMinimo: (minimo) => `Sous le minimum : pas moins de ${minimo}.`,
    sopraIlMassimo: (massimo) => `Au-dessus du maximum : pas plus de ${massimo}.`,
    vuoleDelTesto: 'Attend du texte.',
    nonÈUnIndirizzo:
      'Ça ne ressemble pas à une adresse e-mail : il faut quelque chose comme nom@domaine.ch.',
    tipoIgnoto: 'Type non reconnu.',
    cartellaIntera: 'Il faut le chemin complet d’un dossier.',
    programmaIntero: 'Il faut le chemin complet du programme.',
    soloExe: 'Ce doit être un programme .exe.',
    fileIntero: 'Il faut le chemin complet du fichier.',
    unFile: (estensioni) => `Il faut un fichier ${estensioni.map((e) => `.${e}`).join(' ou ')}.`,
    filtroProgrammi: 'Programmes',
    filtroFile: 'Fichiers',
  },
  en: {
    nonÈUnImpostazione: (chiave) => `“${chiave}” is not a setting of the register.`,
    nonÈUnaScelta: (scelte) => `That is not one of the choices: ${scelte}.`,
    vuoleAccesoOSpento: 'Expects on or off.',
    vuoleUnNumero: 'Expects a number.',
    sottoIlMinimo: (minimo) => `Below the minimum: no less than ${minimo}.`,
    sopraIlMassimo: (massimo) => `Above the maximum: no more than ${massimo}.`,
    vuoleDelTesto: 'Expects text.',
    nonÈUnIndirizzo: 'That doesn’t look like an email address: it needs something like name@domain.ch.',
    tipoIgnoto: 'Unrecognised type.',
    cartellaIntera: 'It needs the full path of a folder.',
    programmaIntero: 'It needs the full path of the program.',
    soloExe: 'It must be an .exe program.',
    fileIntero: 'It needs the full path of the file.',
    unFile: (estensioni) => `It needs a ${estensioni.map((e) => `.${e}`).join(' or ')} file.`,
    filtroProgrammi: 'Programs',
    filtroFile: 'Files',
  },
})
