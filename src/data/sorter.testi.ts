// I testi di `sorter.ts`: esito dello smistamento di un PDF e pagine non archiviate.
// Le frasi in minuscolo seguono `suFile`, che mette davanti il nome del PDF.

import { catalogo } from '../i18n/index.js'
import { PIF, frase } from '../domain/lexicon.js'
import { plurale } from '../domain/text.js'

const it = {
  /** Una frase su un PDF, con il suo nome davanti. */
  suFile: (nome: string, detto: string) => `«${nome}»: ${detto}`,
  assegnatiEDaSistemare: (assegnate: number, daSistemare: number) =>
    `${assegnate} assegnati, ${daSistemare} da sistemare a mano.`,
  assegnati: (assegnate: number) => `${assegnate} documenti assegnati.`,
  nonSiLegge: (motivo: string) => `non si riesce a leggerlo (${motivo}).`,
  vuoto: 'è vuoto.',
  illeggibilePerche: (motivo: string) => `non è un PDF leggibile (${motivo}).`,
  illeggibile: 'non è un PDF leggibile.',
  senzaAnno: 'non c’è nessun anno aperto in cui metterlo.',
  /** L'etichetta di una pagina in coda alla lettura. */
  pagina: (nome: string, numero: number) => `${nome} · pagina ${numero}`,
  nonPiuQui: (nome: string) => `«${nome}» non è più nella cartella del registro.`,
  nienteDiLeggibile: (etichetta: string) =>
    `${etichetta}: non se n'è cavato niente di leggibile.`,
  pagineGiaFuori: (pagine: readonly number[]) =>
    `Pagine non più da smistare (già archiviate o scartate): ${pagine.join(', ')}.`,
  smistamentoSparito: 'Quello smistamento non c’è più.',
  documentoNonTrovato: 'Documento non trovato.',
  nessunaPagina: 'Nessuna pagina da archiviare.',
  originaleSparito: 'Il PDF originale non è più nella cartella del registro.',
  ritaglioFallito: (motivo: string) => `Ritaglio non riuscito: ${motivo}`,
  pifNonTrovato: frase(PIF, 'trovato', { nega: true }),
  giaUnDocumento: (chi: string, consegna: string) =>
    `${chi} ha già un documento in «${consegna}»: toglierlo prima di metterne un altro.`,
  documentoNonScritto: 'Non si riesce a scrivere il documento.',
  classeSparita: 'La classe di questa richiesta non c’è più.',
  senzaFirme: (consegna: string) => `«${consegna}» non chiede un foglio firme.`,
  giaFirme: (consegna: string) =>
    `«${consegna}» ha già un foglio firme: toglierlo prima di metterne un altro.`,
  firmeNonScritte: 'Non si riesce a scrivere il foglio firme.',
  periodoNonTrovato: 'Periodo non trovato.',
  giaFoglio: (chi: string, foglio: string) =>
    `${chi} ha già il foglio «${foglio}» di questo ` +
    'periodo: toglierlo prima di metterne un altro.',
}

export const testi = catalogo(it, {
  de: {
    suFile: (nome, detto) => `«${nome}»: ${detto}`,
    assegnatiEDaSistemare: (assegnate, daSistemare) =>
      `${assegnate} zugeordnet, ${daSistemare} von Hand zu erledigen.`,
    assegnati: (assegnate) => `${plurale(assegnate, 'Dokument', 'Dokumente')} zugeordnet.`,
    nonSiLegge: (motivo) => `lässt sich nicht lesen (${motivo}).`,
    vuoto: 'ist leer.',
    illeggibilePerche: (motivo) => `ist kein lesbares PDF (${motivo}).`,
    illeggibile: 'ist kein lesbares PDF.',
    senzaAnno: 'es ist kein Schuljahr geöffnet, in das es gelegt werden könnte.',
    pagina: (nome, numero) => `${nome} · Seite ${numero}`,
    nonPiuQui: (nome) => `«${nome}» ist nicht mehr im Ordner des Klassenbuchs.`,
    nienteDiLeggibile: (etichetta) => `${etichetta}: Es liess sich nichts Lesbares herausholen.`,
    pagineGiaFuori: (pagine) =>
      `Seiten nicht mehr zuzuordnen (bereits abgelegt oder verworfen): ${pagine.join(', ')}.`,
    smistamentoSparito: 'Diese Zuordnung gibt es nicht mehr.',
    documentoNonTrovato: 'Dokument nicht gefunden.',
    nessunaPagina: 'Keine Seite zum Ablegen.',
    originaleSparito: 'Das Original-PDF ist nicht mehr im Ordner des Klassenbuchs.',
    ritaglioFallito: (motivo) => `Ausschneiden nicht gelungen: ${motivo}`,
    pifNonTrovato: 'Lernende Person nicht gefunden.',
    giaUnDocumento: (chi, consegna) =>
      `${chi} hat bereits ein Dokument in «${consegna}»: Entferne es zuerst, bevor du ein ` +
      'anderes hinzufügst.',
    documentoNonScritto: 'Das Dokument lässt sich nicht schreiben.',
    classeSparita: 'Die Klasse dieser Anfrage gibt es nicht mehr.',
    senzaFirme: (consegna) => `«${consegna}» verlangt kein Unterschriftenblatt.`,
    giaFirme: (consegna) =>
      `«${consegna}» hat bereits ein Unterschriftenblatt: Entferne es zuerst, bevor du ein ` +
      'anderes hinzufügst.',
    firmeNonScritte: 'Das Unterschriftenblatt lässt sich nicht schreiben.',
    periodoNonTrovato: 'Zeitraum nicht gefunden.',
    giaFoglio: (chi, foglio) =>
      `${chi} hat für diesen Zeitraum bereits das Blatt «${foglio}»: Entferne es zuerst, ` +
      'bevor du ein anderes hinzufügst.',
  },
  fr: {
    suFile: (nome, detto) => `« ${nome} » : ${detto}`,
    assegnatiEDaSistemare: (assegnate, daSistemare) =>
      `${assegnate} attribués, ${daSistemare} à régler à la main.`,
    assegnati: (assegnate) => `${plurale(assegnate, 'document attribué', 'documents attribués')}.`,
    nonSiLegge: (motivo) => `impossible de le lire (${motivo}).`,
    vuoto: 'est vide.',
    illeggibilePerche: (motivo) => `n’est pas un PDF lisible (${motivo}).`,
    illeggibile: 'n’est pas un PDF lisible.',
    senzaAnno: 'aucune année scolaire n’est ouverte pour l’y mettre.',
    pagina: (nome, numero) => `${nome} · page ${numero}`,
    nonPiuQui: (nome) => `« ${nome} » n’est plus dans le dossier du registre.`,
    nienteDiLeggibile: (etichetta) => `${etichetta} : rien de lisible n’en est sorti.`,
    pagineGiaFuori: (pagine) =>
      `Pages qui ne sont plus à trier (déjà classées ou écartées) : ${pagine.join(', ')}.`,
    smistamentoSparito: 'Ce tri n’existe plus.',
    documentoNonTrovato: 'Document introuvable.',
    nessunaPagina: 'Aucune page à classer.',
    originaleSparito: 'Le PDF d’origine n’est plus dans le dossier du registre.',
    ritaglioFallito: (motivo) => `Découpage impossible : ${motivo}`,
    pifNonTrovato: 'Personne en formation introuvable.',
    giaUnDocumento: (chi, consegna) =>
      `${chi} a déjà un document dans « ${consegna} » : enlève-le avant d’en mettre un autre.`,
    documentoNonScritto: 'Impossible d’écrire le document.',
    classeSparita: 'La classe de cette demande n’existe plus.',
    senzaFirme: (consegna) => `« ${consegna} » ne demande pas de feuille de signatures.`,
    giaFirme: (consegna) =>
      `« ${consegna} » a déjà une feuille de signatures : enlève-la avant d’en mettre une autre.`,
    firmeNonScritte: 'Impossible d’écrire la feuille de signatures.',
    periodoNonTrovato: 'Intervalle introuvable.',
    giaFoglio: (chi, foglio) =>
      `${chi} a déjà la feuille « ${foglio} » pour cet intervalle : enlève-la avant d’en ` +
      'mettre une autre.',
  },
  en: {
    suFile: (nome, detto) => `“${nome}”: ${detto}`,
    assegnatiEDaSistemare: (assegnate, daSistemare) =>
      `${assegnate} assigned, ${daSistemare} to sort out by hand.`,
    assegnati: (assegnate) => `${plurale(assegnate, 'document', 'documents')} assigned.`,
    nonSiLegge: (motivo) => `it can’t be read (${motivo}).`,
    vuoto: 'it’s empty.',
    illeggibilePerche: (motivo) => `it isn’t a readable PDF (${motivo}).`,
    illeggibile: 'it isn’t a readable PDF.',
    senzaAnno: 'there’s no school year open to put it in.',
    pagina: (nome, numero) => `${nome} · page ${numero}`,
    nonPiuQui: (nome) => `“${nome}” is no longer in the register folder.`,
    nienteDiLeggibile: (etichetta) => `${etichetta}: nothing readable came out of it.`,
    pagineGiaFuori: (pagine) =>
      `Pages no longer to be sorted (already filed or discarded): ${pagine.join(', ')}.`,
    smistamentoSparito: 'That sorting no longer exists.',
    documentoNonTrovato: 'Document not found.',
    nessunaPagina: 'No pages to file.',
    originaleSparito: 'The original PDF is no longer in the register folder.',
    ritaglioFallito: (motivo) => `Cropping failed: ${motivo}`,
    pifNonTrovato: 'Learner not found.',
    giaUnDocumento: (chi, consegna) =>
      `${chi} already has a document in “${consegna}”: remove it before adding another one.`,
    documentoNonScritto: 'The document can’t be written.',
    classeSparita: 'The class for this request no longer exists.',
    senzaFirme: (consegna) => `“${consegna}” doesn’t ask for a signature sheet.`,
    giaFirme: (consegna) =>
      `“${consegna}” already has a signature sheet: remove it before adding another one.`,
    firmeNonScritte: 'The signature sheet can’t be written.',
    periodoNonTrovato: 'Period not found.',
    giaFoglio: (chi, foglio) =>
      `${chi} already has the “${foglio}” sheet for this period: remove it before adding ` +
      'another one.',
  },
})
