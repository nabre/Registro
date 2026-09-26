// I testi dei mattoni della pagina Documenti (`sheets.ts`).
// `nome` è il foglio detto in una frase, con il suo articolo: lo scrivono i
// riquadri (`cards.testi.ts`).

import { catalogo, conMaiuscola } from '../../../i18n/index.js'

const it = {
  buttareTitolo: (nome: string) => `Buttare via ${nome}?`,
  buttareTesto:
    'Va via solo il file nella cartella delle esportazioni: i dati restano nel ' +
    'registro, e il documento si rifà quando serve.',
  metti: (nome: string) => `Metti ${nome} nella composizione da guardare unita`,
  /** Di quando è la copia nella cartella, per i fogli che portano il giorno nel nome. */
  del: (giorno: string) => `del ${giorno}`,
  nellaCartella: (quando: string) => `nella cartella, ${quando}`,
  daFare: 'da fare',
  nellaCartellaTitolo: (quando: string) => `Nella cartella · ${quando}`,
  nonAncora: 'Non è ancora nella cartella',
  nonAncoraNome: (nome: string) => `${nome} non è ancora nella cartella: prima si aggiorna`,
  aperto: (nome: string) => `${nome} è quello aperto qui accanto`,
  guardaQui: (nome: string) => `Guarda ${nome} qui dentro, come sta nella cartella`,
  apreFuori: (nome: string) => `Apre ${nome} con il programma del sistema`,
  rifa: (nome: string) => `Rifà ${nome} e mostra il foglio qui accanto`,
  fa: (nome: string) => `Fa ${nome} e mostra il foglio qui accanto`,
  buttaDallaCartella: (nome: string) => `Butta via ${nome} dalla cartella`,
  togliTutte: 'Togli la spunta a tutti i fogli di questa scheda',
  spuntaTutti: (quanti: number) => `Spunta i ${quanti} fogli di questa scheda`,
  pronti: (pronti: number, tutti: number) => `${pronti} di ${tutti} nella cartella`,
}

export const testi = catalogo(it, {
  de: {
    buttareTitolo: (nome) => `${conMaiuscola(nome)} wegwerfen?`,
    buttareTesto:
      'Entfernt wird nur die Datei im Ordner der Exporte: Die Daten bleiben im Klassenbuch, ' +
      'und das Dokument lässt sich bei Bedarf neu erstellen.',
    metti: (nome) =>
      `${conMaiuscola(nome)} in die Zusammenstellung aufnehmen, die man vereint ansieht`,
    del: (giorno) => `vom ${giorno}`,
    nellaCartella: (quando) => `im Ordner, ${quando}`,
    daFare: 'noch zu erstellen',
    nellaCartellaTitolo: (quando) => `Im Ordner · ${quando}`,
    nonAncora: 'Noch nicht im Ordner',
    nonAncoraNome: (nome) =>
      `${conMaiuscola(nome)} ist noch nicht im Ordner: zuerst aktualisieren`,
    aperto: (nome) => `${conMaiuscola(nome)} ist das, was daneben offen ist`,
    guardaQui: (nome) => `${conMaiuscola(nome)} hier ansehen, so wie es im Ordner liegt`,
    apreFuori: (nome) => `Öffnet ${nome} mit dem Programm des Systems`,
    rifa: (nome) => `Erstellt ${nome} neu und zeigt das Blatt daneben`,
    fa: (nome) => `Erstellt ${nome} und zeigt das Blatt daneben`,
    buttaDallaCartella: (nome) => `Wirft ${nome} aus dem Ordner`,
    togliTutte: 'Häkchen bei allen Blättern dieses Reiters entfernen',
    spuntaTutti: (quanti) => `Die ${quanti} Blätter dieses Reiters abhaken`,
    pronti: (pronti, tutti) => `${pronti} von ${tutti} im Ordner`,
  },
  fr: {
    buttareTitolo: (nome) => `Jeter ${nome} ?`,
    buttareTesto:
      'Seul le fichier du dossier des exportations s’en va : les données restent dans le ' +
      'registre, et le document se refait quand il le faut.',
    metti: (nome) => `Mettre ${nome} dans la compilation à regarder d’un seul tenant`,
    del: (giorno) => `du ${giorno}`,
    nellaCartella: (quando) => `dans le dossier, ${quando}`,
    daFare: 'à faire',
    nellaCartellaTitolo: (quando) => `Dans le dossier · ${quando}`,
    nonAncora: 'Pas encore dans le dossier',
    nonAncoraNome: (nome) =>
      `${conMaiuscola(nome)} n’est pas encore dans le dossier : il faut d’abord le mettre à jour`,
    aperto: (nome) => `${conMaiuscola(nome)} est celui qui est ouvert à côté`,
    guardaQui: (nome) => `Regarder ${nome} ici, tel qu’il est dans le dossier`,
    apreFuori: (nome) => `Ouvre ${nome} avec le programme du système`,
    rifa: (nome) => `Refait ${nome} et montre la feuille à côté`,
    fa: (nome) => `Crée ${nome} et montre la feuille à côté`,
    buttaDallaCartella: (nome) => `Jette ${nome} hors du dossier`,
    togliTutte: 'Décocher toutes les feuilles de cette rubrique',
    spuntaTutti: (quanti) => `Cocher les ${quanti} feuilles de cette rubrique`,
    pronti: (pronti, tutti) => `${pronti} sur ${tutti} dans le dossier`,
  },
  en: {
    buttareTitolo: (nome) => `Throw away ${nome}?`,
    buttareTesto:
      'Only the file in the exports folder goes: the data stays in the register, and the ' +
      'document can be remade when needed.',
    metti: (nome) => `Put ${nome} in the compilation to view as one`,
    del: (giorno) => `from ${giorno}`,
    nellaCartella: (quando) => `in the folder, ${quando}`,
    daFare: 'to do',
    nellaCartellaTitolo: (quando) => `In the folder · ${quando}`,
    nonAncora: 'Not in the folder yet',
    nonAncoraNome: (nome) => `${conMaiuscola(nome)} isn’t in the folder yet: update it first`,
    aperto: (nome) => `${conMaiuscola(nome)} is the one open alongside`,
    guardaQui: (nome) => `View ${nome} here, as it is in the folder`,
    apreFuori: (nome) => `Opens ${nome} with the system’s program`,
    rifa: (nome) => `Remakes ${nome} and shows the sheet alongside`,
    fa: (nome) => `Makes ${nome} and shows the sheet alongside`,
    buttaDallaCartella: (nome) => `Throws ${nome} out of the folder`,
    togliTutte: 'Untick all the sheets in this section',
    spuntaTutti: (quanti) => `Tick the ${quanti} sheets in this section`,
    pronti: (pronti, tutti) => `${pronti} of ${tutti} in the folder`,
  },
})
