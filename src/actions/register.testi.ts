// I testi di `register.ts`: anagrafica, orari, foto, import da un altro registro.
// «File → Salva l’anno con nome…» deve coincidere con `manifest.testi.ts`.

import { catalogo } from '../i18n/index.js'
import { PIF } from '../domain/lexicon.js'
import { plurale } from '../domain/text.js'

const it = {
  senzaCartella: 'Non c’è una cartella in cui far nascere l’anno nuovo.',
  annoNonCreato: 'Non si è potuto creare il documento dell’anno.',
  annoCreato: (etichetta: string) =>
    `Anno ${etichetta} creato e aperto, ma non ancora salvato: ` +
    'con Ctrl+S (o «File → Salva l’anno con nome…») scegli come chiamarlo e dove tenerlo.',
  tolteInChiusura: (n: number) =>
    `${plurale(n, 'lezione tolta', 'lezioni tolte')} dai giorni di chiusura.`,
  restanoInChiusura: (n: number) =>
    ` ${plurale(n, 'lezione resta', 'lezioni restano')} in un giorno di chiusura ` +
    'perché ha già appello, testi o voti: da spostare o annullare a mano.',
  stessaMateria: 'Sono la stessa materia.',
  classeOMateria: 'Classe o materia non trovata.',
  senzaOrario: 'Il corso non ha ancora un orario: prima si dichiarano le ore fisse.',
  periodoRovescio: 'Il periodo finisce prima di cominciare.',
  giaTutte: (n: number) => `Le ${n} lezioni di questo periodo ci sono già tutte.`,
  orarioMaiNelPeriodo:
    'In questo periodo l’orario non cade mai: controllare le date e le sospensioni.',
  aggiunte: (n: number, corso: string, saltate: number, conflitti: number) =>
    `${n} lezioni aggiunte a ${corso}` +
    (saltate > 0 ? `, ${saltate} c’erano già` : '') +
    (conflitti > 0 ? `, ${conflitti} in conflitto con un’altra classe` : '') +
    '.',
  nonSiTogliDaQui: (nomi: readonly string[]) =>
    `L'elenco non contiene ${nomi.join(', ')}: per togliere ` +
    `${nomi.length === 1 ? 'una persona' : 'delle persone'} dalla classe si usa ` +
    '`persone.elimina` (azione `allievo.elimina`), che toglie anche voti e presenze.',
  fotoDi: (nome: string) => `Foto di ${nome}`,
  usaFoto: 'Usa questa foto',
  nonJpegNePng: (nome: string) =>
    `«${nome}» non è un JPEG né un PNG: sono i due formati che finiscono nei rapporti.`,
  copiaFotoNonRiuscita: (errore: string) => `Copia della foto non riuscita: ${errore}`,
  senzaAnnoPerClasse: 'Non c’è un anno aperto in cui portare la classe.',
  classeSparitaAltrove: 'Nell’altro anno quella classe non c’è più.',
  senzaAnnoPerImport: 'Non c’è un anno aperto in cui portare qualcosa.',
  nienteScelto: 'Non si è scelto niente da portare.',
  nessunoNelTesto: `Nessuna ${PIF.singolare} riconosciuta nel testo incollato.`,
}

export const testi = catalogo(it, {
  de: {
    senzaCartella: 'Es gibt keinen Ordner, in dem das neue Schuljahr entstehen kann.',
    annoNonCreato: 'Das Dokument des Schuljahrs konnte nicht erstellt werden.',
    annoCreato: (etichetta) =>
      `Schuljahr ${etichetta} erstellt und geöffnet, aber noch nicht gespeichert: ` +
      'Mit Ctrl+S (oder «Datei → Schuljahr speichern unter…») wählst du Namen und Speicherort.',
    tolteInChiusura: (n) =>
      `${plurale(n, 'Stunde', 'Stunden')} von den schulfreien Tagen entfernt.`,
    restanoInChiusura: (n) =>
      ` ${plurale(n, 'Stunde bleibt', 'Stunden bleiben')} an einem ` +
      'schulfreien Tag, weil schon eine Präsenzkontrolle, Texte oder Noten erfasst sind: ' +
      'von Hand verschieben oder absagen.',
    stessaMateria: 'Das ist dasselbe Fach.',
    classeOMateria: 'Klasse oder Fach nicht gefunden.',
    senzaOrario: 'Der Kurs hat noch keinen Stundenplan: Erfasse zuerst die festen Stunden.',
    periodoRovescio: 'Der Zeitraum endet, bevor er beginnt.',
    giaTutte: (n) => `Die ${n} Stunden dieses Zeitraums sind schon alle da.`,
    orarioMaiNelPeriodo:
      'In diesem Zeitraum fällt keine Stunde des Stundenplans: Prüfe die Daten und die Unterbrüche.',
    aggiunte: (n, corso, saltate, conflitti) =>
      `${plurale(n, 'Stunde', 'Stunden')} zu ${corso} hinzugefügt` +
      (saltate > 0 ? `, ${saltate} waren schon da` : '') +
      (conflitti > 0 ? `, ${conflitti} im Konflikt mit einer anderen Klasse` : '') +
      '.',
    nonSiTogliDaQui: (nomi) =>
      `Die Liste enthält ${nomi.join(', ')} nicht: Um ` +
      `${nomi.length === 1 ? 'eine Person' : 'Personen'} aus der Klasse zu entfernen, dient ` +
      '`persone.elimina` (Aktion `allievo.elimina`), das auch Noten und Präsenzen entfernt.',
    fotoDi: (nome) => `Foto von ${nome}`,
    usaFoto: 'Dieses Foto verwenden',
    nonJpegNePng: (nome) =>
      `«${nome}» ist weder JPEG noch PNG: Das sind die zwei Formate, die in die Berichte kommen.`,
    copiaFotoNonRiuscita: (errore) => `Kopieren des Fotos fehlgeschlagen: ${errore}`,
    senzaAnnoPerClasse: 'Es ist kein Schuljahr geöffnet, in das die Klasse kommen könnte.',
    classeSparitaAltrove: 'Im anderen Schuljahr gibt es diese Klasse nicht mehr.',
    senzaAnnoPerImport: 'Es ist kein Schuljahr geöffnet, in das etwas kommen könnte.',
    nienteScelto: 'Es wurde nichts zum Übernehmen ausgewählt.',
    nessunoNelTesto: 'Im eingefügten Text wurden keine Lernenden erkannt.',
  },
  fr: {
    senzaCartella: 'Il n’y a pas de dossier où créer la nouvelle année.',
    annoNonCreato: 'Le document de l’année n’a pas pu être créé.',
    annoCreato: (etichetta) =>
      `Année ${etichetta} créée et ouverte, mais pas encore enregistrée : avec Ctrl+S ` +
      '(ou « Fichier → Enregistrer l’année sous… ») choisis son nom et son emplacement.',
    tolteInChiusura: (n) =>
      `${plurale(n, 'leçon retirée', 'leçons retirées')} des jours de fermeture.`,
    restanoInChiusura: (n) =>
      ` ${plurale(n, 'leçon reste', 'leçons restent')} sur un jour de fermeture ` +
      'parce qu’il y a déjà un appel, des textes ou des notes : à déplacer ou annuler à la main.',
    stessaMateria: 'C’est la même branche.',
    classeOMateria: 'Classe ou branche introuvable.',
    senzaOrario: 'Le cours n’a pas encore d’horaire : il faut d’abord saisir les heures fixes.',
    periodoRovescio: 'L’intervalle se termine avant de commencer.',
    giaTutte: (n) => `Les ${n} leçons de cet intervalle existent déjà toutes.`,
    orarioMaiNelPeriodo:
      'Dans cet intervalle, l’horaire ne prévoit aucune leçon : vérifie les dates et les interruptions.',
    aggiunte: (n, corso, saltate, conflitti) =>
      `${plurale(n, 'leçon ajoutée', 'leçons ajoutées')} à ${corso}` +
      (saltate > 0 ? `, ${saltate} existaient déjà` : '') +
      (conflitti > 0 ? `, ${conflitti} en conflit avec une autre classe` : '') +
      '.',
    nonSiTogliDaQui: (nomi) =>
      `La liste ne contient pas ${nomi.join(', ')} : pour retirer ` +
      `${nomi.length === 1 ? 'une personne' : 'des personnes'} de la classe, on utilise ` +
      '`persone.elimina` (action `allievo.elimina`), qui retire aussi notes et présences.',
    fotoDi: (nome) => `Photo de ${nome}`,
    usaFoto: 'Utiliser cette photo',
    nonJpegNePng: (nome) =>
      `« ${nome} » n’est ni un JPEG ni un PNG : ` +
      'ce sont les deux formats qui vont dans les rapports.',
    copiaFotoNonRiuscita: (errore) => `Copie de la photo impossible : ${errore}`,
    senzaAnnoPerClasse: 'Aucune année n’est ouverte pour y amener la classe.',
    classeSparitaAltrove: 'Dans l’autre année, cette classe n’existe plus.',
    senzaAnnoPerImport: 'Aucune année n’est ouverte pour y amener quoi que ce soit.',
    nienteScelto: 'Rien n’a été choisi à reprendre.',
    nessunoNelTesto: 'Aucune personne en formation reconnue dans le texte collé.',
  },
  en: {
    senzaCartella: 'There’s no folder to create the new year in.',
    annoNonCreato: 'The year’s document couldn’t be created.',
    annoCreato: (etichetta) =>
      `Year ${etichetta} created and opened, but not saved yet: ` +
      'with Ctrl+S (or “File → Save the year as…”) choose its name and where to keep it.',
    tolteInChiusura: (n) =>
      `${plurale(n, 'lesson', 'lessons')} removed from closure days.`,
    restanoInChiusura: (n) =>
      ` ${plurale(n, 'lesson remains', 'lessons remain')} on a closure day ` +
      'because attendance, texts or grades are already in: move or cancel by hand.',
    stessaMateria: 'They’re the same subject.',
    classeOMateria: 'Class or subject not found.',
    senzaOrario: 'The course has no timetable yet: enter the fixed hours first.',
    periodoRovescio: 'The period ends before it starts.',
    giaTutte: (n) => `All ${n} lessons in this period are already there.`,
    orarioMaiNelPeriodo:
      'No timetabled lesson falls in this period: check the dates and the breaks.',
    aggiunte: (n, corso, saltate, conflitti) =>
      `${plurale(n, 'lesson', 'lessons')} added to ${corso}` +
      (saltate > 0 ? `, ${saltate} already there` : '') +
      (conflitti > 0 ? `, ${conflitti} clashing with another class` : '') +
      '.',
    nonSiTogliDaQui: (nomi) =>
      `The list doesn’t contain ${nomi.join(', ')}: to remove ` +
      `${nomi.length === 1 ? 'a person' : 'people'} from the class, use ` +
      '`persone.elimina` (action `allievo.elimina`), which also removes grades and attendance.',
    fotoDi: (nome) => `Photo of ${nome}`,
    usaFoto: 'Use this photo',
    nonJpegNePng: (nome) =>
      `“${nome}” is neither a JPEG nor a PNG: those are the two formats that go into the reports.`,
    copiaFotoNonRiuscita: (errore) => `Copying the photo failed: ${errore}`,
    senzaAnnoPerClasse: 'There’s no open year to bring the class into.',
    classeSparitaAltrove: 'That class is no longer in the other year.',
    senzaAnnoPerImport: 'There’s no open year to bring anything into.',
    nienteScelto: 'Nothing was chosen to bring over.',
    nessunoNelTesto: 'No learner recognised in the pasted text.',
  },
})
