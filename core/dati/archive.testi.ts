// I testi di `archive.ts`: documento dell'anno che non si apre, non si salva o
// è stato portato a un formato nuovo. Il nome arriva con l'estensione; il motivo
// è quello del sistema, non tradotto, perché chi aiuta a distanza lo chiede così.

import { catalogo } from '../i18n/index.js'

const it = {
  /** Come si nomina il documento quando il suo nome non c'è. */
  lAnno: 'l’anno',
  ilDocumento: 'Il documento',
  nonLascio: (nome: string) =>
    `Non lascio ${nome}: le ultime modifiche non sono ancora sul disco — il file può essere ` +
    'tenuto da OneDrive o dall’antivirus. L’anno resta aperto e il registro riprova a salvare ' +
    'da sé: riprova fra poco.',
  copiaNonFatta: (nome: string, a: number, da: number) =>
    `Non sono riuscito a mettere da parte una copia di ${nome} prima di portarlo al ` +
    `formato ${a}: resta al ${da} finché non lo si modifica.`,
  /** `racconto` è quello di `raccontaAggiornamento`. */
  portatoAlFormato: (nome: string, racconto: string, copia: string) =>
    `${nome} è stato scritto da un registro più vecchio, e l’ho portato ` +
    `${racconto}. La copia com’era sta in «${copia}».`,
  voceNonJson: (nome: string, dove: string, motivo: string) =>
    `${nome} dentro ${dove} non è un JSON valido ` +
    `(${motivo}): il documento resta com’è.`,
  collezioneNonJson: (nome: string, motivo: string) =>
    `${nome} non è un JSON valido (${motivo}): ` +
    'resta com’è, e alla prima modifica viene messo da parte con un altro nome.',
  nonSiApre: (file: string, motivo: string) => `Non riesco ad aprire ${file}: ${motivo}`,
  giaAperto: (nome: string) => `${nome} è l’anno aperto: la classe c’è già.`,
  sparito: (nome: string) => `${nome} non si trova più dove era.`,
  nonSiLegge: (nome: string, motivo: string) => `Non riesco a leggere ${nome}: ${motivo}`,
  senzaAnno: (nome: string) => `${nome} non contiene un anno del registro.`,
  nonSiSalva: (file: string, motivo: string) => `Non riesco a salvare ${file}: ${motivo}`,
  /** Il nome della copia di emergenza, senza l'estensione: `marca` è giorno e ora. */
  copiaDiEmergenza: (nome: string, marca: string) => `${nome} (copia di emergenza ${marca})`,
  modificheInCopia: (file: string, copia: string) =>
    `Non sono riuscito a scrivere ${file}. Le ultime modifiche sono in ` +
    `${copia}: aprilo per riprenderle.`,
  modifichePerse: (file: string) =>
    `Non sono riuscito a scrivere ${file}, né una sua copia: ` +
    'le ultime modifiche non sono sul disco.',
  annoNonCreato: (etichetta: string, motivo: string) =>
    `Non riesco a creare il documento dell’anno ${etichetta}: ${motivo}`,
  nonSalvatoIn: (dove: string, motivo: string) =>
    `Non riesco a salvare l’anno in ${dove}: ${motivo}`,
  inChiusura: 'L’anno si sta chiudendo: la modifica non è stata fatta.',
  salvataggioFallito: (motivo: string) => `Salvataggio dell’anno non riuscito: ${motivo}`,
  messaDaParte: (nome: string, altrove: string) =>
    `${nome} non si leggeva: la copia è dentro l’anno con il nome ${altrove}, ` +
    'e il registro riparte da una collezione nuova.',
}

export const testi = catalogo(it, {
  de: {
    lAnno: 'das Schuljahr',
    ilDocumento: 'Das Dokument',
    nonLascio: (nome) =>
      `${nome} wird nicht geschlossen: Die letzten Änderungen sind noch nicht auf der ` +
      'Festplatte — die Datei kann von OneDrive oder vom Virenschutz blockiert sein. Das ' +
      'Schuljahr bleibt offen, und das Klassenbuch versucht selbst, erneut zu speichern: ' +
      'Versuch es gleich noch einmal.',
    copiaNonFatta: (nome, a, da) =>
      `Es ist mir nicht gelungen, eine Kopie von ${nome} beiseitezulegen, bevor es auf das ` +
      `Format ${a} gebracht wird: Es bleibt beim Format ${da}, bis es geändert wird.`,
    portatoAlFormato: (nome, racconto, copia) =>
      `${nome} wurde von einem älteren Klassenbuch geschrieben, und ich habe es ` +
      `aktualisiert — ${racconto}. Die Kopie im alten Zustand liegt unter «${copia}».`,
    voceNonJson: (nome, dove, motivo) =>
      `${nome} in ${dove} ist kein gültiges JSON (${motivo}): Das Dokument bleibt, wie es ist.`,
    collezioneNonJson: (nome, motivo) =>
      `${nome} ist kein gültiges JSON (${motivo}): Es bleibt, wie es ist, und bei der ` +
      'ersten Änderung wird es unter einem anderen Namen beiseitegelegt.',
    nonSiApre: (file, motivo) => `${file} lässt sich nicht öffnen: ${motivo}`,
    giaAperto: (nome) => `${nome} ist das geöffnete Schuljahr: Die Klasse ist schon da.`,
    sparito: (nome) => `${nome} ist nicht mehr dort, wo es war.`,
    nonSiLegge: (nome, motivo) => `${nome} lässt sich nicht lesen: ${motivo}`,
    senzaAnno: (nome) => `${nome} enthält kein Schuljahr des Klassenbuchs.`,
    nonSiSalva: (file, motivo) => `${file} lässt sich nicht speichern: ${motivo}`,
    copiaDiEmergenza: (nome, marca) => `${nome} (Notfallkopie ${marca})`,
    modificheInCopia: (file, copia) =>
      `${file} liess sich nicht schreiben. Die letzten Änderungen sind in ${copia}: ` +
      'Öffne die Datei, um sie wiederherzustellen.',
    modifichePerse: (file) =>
      `${file} liess sich nicht schreiben, auch keine Kopie davon: Die letzten Änderungen ` +
      'sind nicht auf der Festplatte.',
    annoNonCreato: (etichetta, motivo) =>
      `Das Dokument für das Schuljahr ${etichetta} lässt sich nicht erstellen: ${motivo}`,
    nonSalvatoIn: (dove, motivo) =>
      `Das Schuljahr lässt sich nicht in ${dove} speichern: ${motivo}`,
    inChiusura: 'Das Schuljahr wird gerade geschlossen: Die Änderung wurde nicht ausgeführt.',
    salvataggioFallito: (motivo) => `Speichern des Schuljahrs nicht gelungen: ${motivo}`,
    messaDaParte: (nome, altrove) =>
      `${nome} war nicht lesbar: Die Kopie liegt im Schuljahr unter dem Namen ${altrove}, ` +
      'und das Klassenbuch beginnt mit einer neuen Sammlung.',
  },
  fr: {
    lAnno: 'l’année',
    ilDocumento: 'Le document',
    nonLascio: (nome) =>
      `Je ne ferme pas ${nome} : les dernières modifications ne sont pas encore sur le ` +
      'disque — le fichier est peut-être bloqué par OneDrive ou par l’antivirus. L’année ' +
      'reste ouverte et le registre réessaie d’enregistrer tout seul : réessaie dans un instant.',
    copiaNonFatta: (nome, a, da) =>
      `Je n’ai pas réussi à mettre de côté une copie de ${nome} avant de le passer au ` +
      `format ${a} : il reste au format ${da} tant qu’on ne le modifie pas.`,
    portatoAlFormato: (nome, racconto, copia) =>
      `${nome} a été écrit par un registre plus ancien, et je l’ai fait passer ` +
      `${racconto}. La copie telle qu’elle était se trouve dans « ${copia} ».`,
    voceNonJson: (nome, dove, motivo) =>
      `${nome} dans ${dove} n’est pas un JSON valide (${motivo}) : le document reste tel quel.`,
    collezioneNonJson: (nome, motivo) =>
      `${nome} n’est pas un JSON valide (${motivo}) : il reste tel quel, et à la première ` +
      'modification il est mis de côté sous un autre nom.',
    nonSiApre: (file, motivo) => `Impossible d’ouvrir ${file} : ${motivo}`,
    giaAperto: (nome) => `${nome} est l’année ouverte : la classe y est déjà.`,
    sparito: (nome) => `${nome} ne se trouve plus là où il était.`,
    nonSiLegge: (nome, motivo) => `Impossible de lire ${nome} : ${motivo}`,
    senzaAnno: (nome) => `${nome} ne contient pas d’année du registre.`,
    nonSiSalva: (file, motivo) => `Impossible d’enregistrer ${file} : ${motivo}`,
    copiaDiEmergenza: (nome, marca) => `${nome} (copie de secours ${marca})`,
    modificheInCopia: (file, copia) =>
      `Je n’ai pas réussi à écrire ${file}. Les dernières modifications sont dans ${copia} : ` +
      'ouvre-le pour les récupérer.',
    modifichePerse: (file) =>
      `Je n’ai pas réussi à écrire ${file}, ni une copie : les dernières modifications ne ` +
      'sont pas sur le disque.',
    annoNonCreato: (etichetta, motivo) =>
      `Impossible de créer le document de l’année ${etichetta} : ${motivo}`,
    nonSalvatoIn: (dove, motivo) => `Impossible d’enregistrer l’année dans ${dove} : ${motivo}`,
    inChiusura: 'L’année est en train de se fermer : la modification n’a pas été faite.',
    salvataggioFallito: (motivo) => `Échec de l’enregistrement de l’année : ${motivo}`,
    messaDaParte: (nome, altrove) =>
      `${nome} était illisible : la copie se trouve dans l’année sous le nom ${altrove}, ` +
      'et le registre repart d’une collection neuve.',
  },
  en: {
    lAnno: 'the year',
    ilDocumento: 'The document',
    nonLascio: (nome) =>
      `I’m not closing ${nome}: the latest changes aren’t on disk yet — the file may be locked ` +
      'by OneDrive or by the antivirus. The year stays open and the register tries saving ' +
      'again by itself: try again in a moment.',
    copiaNonFatta: (nome, a, da) =>
      `I couldn’t put aside a copy of ${nome} before bringing it to format ${a}: it stays at ` +
      `format ${da} until it’s changed.`,
    portatoAlFormato: (nome, racconto, copia) =>
      `${nome} was written by an older version of the register, and I’ve brought it ` +
      `${racconto}. The copy as it was is in “${copia}”.`,
    voceNonJson: (nome, dove, motivo) =>
      `${nome} in ${dove} isn’t valid JSON (${motivo}): the document stays as it is.`,
    collezioneNonJson: (nome, motivo) =>
      `${nome} isn’t valid JSON (${motivo}): it stays as it is, and at the first change it ` +
      'is put aside under another name.',
    nonSiApre: (file, motivo) => `I can’t open ${file}: ${motivo}`,
    giaAperto: (nome) => `${nome} is the open year: the class is already there.`,
    sparito: (nome) => `${nome} is no longer where it was.`,
    nonSiLegge: (nome, motivo) => `I can’t read ${nome}: ${motivo}`,
    senzaAnno: (nome) => `${nome} doesn’t contain a register year.`,
    nonSiSalva: (file, motivo) => `I can’t save ${file}: ${motivo}`,
    copiaDiEmergenza: (nome, marca) => `${nome} (emergency copy ${marca})`,
    modificheInCopia: (file, copia) =>
      `I couldn’t write ${file}. The latest changes are in ${copia}: open it to get them back.`,
    modifichePerse: (file) =>
      `I couldn’t write ${file}, nor a copy of it: the latest changes aren’t on disk.`,
    annoNonCreato: (etichetta, motivo) =>
      `I can’t create the document for the year ${etichetta}: ${motivo}`,
    nonSalvatoIn: (dove, motivo) => `I can’t save the year in ${dove}: ${motivo}`,
    inChiusura: 'The year is closing: the change wasn’t made.',
    salvataggioFallito: (motivo) => `Saving the year failed: ${motivo}`,
    messaDaParte: (nome, altrove) =>
      `${nome} couldn’t be read: the copy is inside the year under the name ${altrove}, ` +
      'and the register starts again from a new collection.',
  },
})
