// I messaggi del controllo dei modelli. Le direttive («riga:», «se:», «[frasi]»,
// «verticale») sono codice: restano uguali in ogni lingua e le frasi le citano così.

import { catalogo } from '../i18n/index.js'

/** Che cosa un modello chiama per nome, e può non esistere. */
export type GenereNome = 'frase' | 'tabella' | 'elenco' | 'grafico' | 'galleria' | 'gruppo' | 'blocco'

const it = {
  generi: {
    frase: 'La frase',
    tabella: 'La tabella',
    elenco: 'L’elenco',
    grafico: 'Il grafico',
    galleria: 'La parete di ritratti',
    gruppo: 'Il gruppo',
    blocco: 'Il blocco',
  } as Record<GenereNome, string>,
  nomeNonEsiste: (genere: string, nome: string) =>
    `${genere} «${nome}» non esiste in questo rapporto: la riga sparisce dal foglio.`,
  sezioneSconosciuta: (quale: string) => `Sezione «${quale}» sconosciuta: tutto quel che segue resta dov’era.`,
  senzaDuePunti: 'Manca i due punti: una riga senza «chiave: contenuto» viene saltata.',
  soloBanda: (nome: string) => `«{{${nome}}}» vale solo in intestazione e piede: qui resta vuoto.`,
  segnapostoIgnoto: (nome: string) => `Il segnaposto «{{${nome}}}» non esiste in questo rapporto: esce vuoto.`,
  nonMisura: (chiave: string) => `«${chiave}» non è una misura né una dichiarazione: la riga non conta.`,
  soloRigaEImmagine: (dove: string, chiave: string) =>
    `In ${dove} valgono solo «riga:» e «immagine:»: «${chiave}» viene saltata.`,
  nonDirettiva: (chiave: string) => `«${chiave}» non è una direttiva del corpo: la riga sparisce dal foglio.`,
  fineSpaiato: '«fine:» senza un «se:» o un «ripeti:» aperto.',
  altrimentiFuori: '«altrimenti:» fuori da un «se:».',
  maiTrovato: (direttiva: string, chiesto: string) =>
    `«${direttiva}: ${chiesto}» non trova niente con quel nome: il pezzo non uscirà mai.`,
  maiChiuso: (tipo: string) =>
    `«${tipo}:» aperto e mai chiuso: manca un «fine:», e quel che segue resta dentro.`,
  numeroFra: (chiave: string, min: number, max: number) =>
    `«${chiave}» vuole un numero fra ${min} e ${max}: vale quello di prima.`,
  nomeModelloSemplice: 'Il nome di un modello è una parola sola, senza percorsi.',
  modelloAssente: (nome: string) => `Il modello «${nome}» non c’è fra i modelli: non si eredita niente.`,
  orientamento: '«orientamento» vuole «verticale» oppure «orizzontale».',
  margini: '«margini» vuole quattro numeri: alto destra basso sinistra, in millimetri.',
  formato: (valore: string, noti: string) =>
    `«${valore}» non è un formato: ${noti}, o due misure come «210x297».`,
  corpoIgnoto: (nome: string, corpi: string) => `«${nome}» non è un corpo del testo: ${corpi}.`,
  corpoSenzaMisura: (nome: string) => `Il corpo «${nome}» vuole una misura in punti, come «${nome}=10».`,
  immagineSenzaFile: '«immagine:» senza un file da mostrare.',
  nonImmagine: (nome: string) => `«${nome}» non è un’immagine: servono PNG o JPEG.`,
  immagineIgnota: (nome: string, logo: string) =>
    `L’immagine «${nome}» non la conosce nessuno: l’unica è «${logo}», il logo dell’intestazione. Il foglio esce senza.`,
  sezioniDeiBlocchi: 'Qui le sezioni sono «[blocco: nome]»: da questa riga in giù non si legge più niente.',
  fuoriDaiBlocchi: 'Questa riga sta fuori da ogni blocco: nessun «usa:» può richiamarla.',
  bloccoAssente: (nome: string) => `Il blocco «${nome}» non esiste: la riga sparisce dal foglio.`,
  sezioneDeiTesti: (quale: string) => `Sezione «${quale}» sconosciuta: qui ci sono «[frasi]» e «[colonne]».`,
  senzaDuePuntiTesti: 'Manca i due punti: una riga senza «nome: contenuto» viene saltata.',
  fuoriDaiTesti: 'Questa riga sta fuori da «[frasi]» e «[colonne]»: non la legge nessuno.',
}

export const testi = catalogo(it, {
  de: {
    generi: {
      frase: 'Der Satz',
      tabella: 'Die Tabelle',
      elenco: 'Die Liste',
      grafico: 'Die Grafik',
      galleria: 'Die Fotowand',
      gruppo: 'Die Gruppe',
      blocco: 'Der Block',
    },
    nomeNonEsiste: (genere, nome) =>
      `${genere} «${nome}» gibt es in diesem Bericht nicht: Die Zeile erscheint nicht auf dem Blatt.`,
    sezioneSconosciuta: (quale) => `Unbekannter Abschnitt «${quale}»: Alles, was folgt, bleibt, wo es war.`,
    senzaDuePunti: 'Der Doppelpunkt fehlt: Eine Zeile ohne «Schlüssel: Inhalt» wird übersprungen.',
    soloBanda: (nome) => `«{{${nome}}}» gilt nur in Kopf- und Fusszeile: Hier bleibt es leer.`,
    segnapostoIgnoto: (nome) => `Den Platzhalter «{{${nome}}}» gibt es in diesem Bericht nicht: Er bleibt leer.`,
    nonMisura: (chiave) => `«${chiave}» ist weder ein Mass noch eine Angabe: Die Zeile zählt nicht.`,
    soloRigaEImmagine: (dove, chiave) =>
      `In «[${dove}]» gelten nur «riga:» und «immagine:»: «${chiave}» wird übersprungen.`,
    nonDirettiva: (chiave) => `«${chiave}» ist keine Anweisung des Hauptteils: Die Zeile erscheint nicht auf dem Blatt.`,
    fineSpaiato: '«fine:» ohne offenes «se:» oder «ripeti:».',
    altrimentiFuori: '«altrimenti:» ausserhalb eines «se:».',
    maiTrovato: (direttiva, chiesto) =>
      `«${direttiva}: ${chiesto}» findet unter diesem Namen nichts: Der Teil erscheint nie.`,
    maiChiuso: (tipo) =>
      `«${tipo}:» geöffnet und nie geschlossen: Es fehlt ein «fine:», und alles Folgende bleibt darin.`,
    numeroFra: (chiave, min, max) =>
      `«${chiave}» verlangt eine Zahl zwischen ${min} und ${max}: Es gilt der bisherige Wert.`,
    nomeModelloSemplice: 'Der Name einer Vorlage ist ein einziges Wort, ohne Pfade.',
    modelloAssente: (nome) => `Die Vorlage «${nome}» gibt es nicht: Es wird nichts geerbt.`,
    orientamento: '«orientamento» verlangt «verticale» oder «orizzontale».',
    margini: '«margini» verlangt vier Zahlen: oben, rechts, unten, links, in Millimetern.',
    formato: (valore, noti) =>
      `«${valore}» ist kein Format: ${noti}, oder zwei Masse wie «210x297».`,
    corpoIgnoto: (nome, corpi) => `«${nome}» ist keine Schriftgrösse: ${corpi}.`,
    corpoSenzaMisura: (nome) => `Die Schriftgrösse «${nome}» verlangt ein Mass in Punkt, etwa «${nome}=10».`,
    immagineSenzaFile: '«immagine:» ohne eine Datei, die gezeigt werden soll.',
    nonImmagine: (nome) => `«${nome}» ist kein Bild: Es braucht PNG oder JPEG.`,
    immagineIgnota: (nome, logo) =>
      `Das Bild «${nome}» kennt niemand: Das einzige ist «${logo}», das Logo der Kopfzeile. Das Blatt erscheint ohne Bild.`,
    sezioniDeiBlocchi: 'Hier heissen die Abschnitte «[blocco: nome]»: Ab dieser Zeile wird nichts mehr gelesen.',
    fuoriDaiBlocchi: 'Diese Zeile steht ausserhalb jedes Blocks: Kein «usa:» kann sie aufrufen.',
    bloccoAssente: (nome) => `Den Block «${nome}» gibt es nicht: Die Zeile erscheint nicht auf dem Blatt.`,
    sezioneDeiTesti: (quale) => `Unbekannter Abschnitt «${quale}»: Hier gibt es «[frasi]» und «[colonne]».`,
    senzaDuePuntiTesti: 'Der Doppelpunkt fehlt: Eine Zeile ohne «Name: Inhalt» wird übersprungen.',
    fuoriDaiTesti: 'Diese Zeile steht ausserhalb von «[frasi]» und «[colonne]»: Niemand liest sie.',
  },
  fr: {
    generi: {
      frase: 'La phrase',
      tabella: 'Le tableau',
      elenco: 'La liste',
      grafico: 'Le graphique',
      galleria: 'Le mur de portraits',
      gruppo: 'Le groupe',
      blocco: 'Le bloc',
    },
    nomeNonEsiste: (genere, nome) =>
      `${genere} « ${nome} » n’existe pas dans ce rapport : la ligne disparaît de la feuille.`,
    sezioneSconosciuta: (quale) => `Section « ${quale} » inconnue : tout ce qui suit reste où il était.`,
    senzaDuePunti: 'Il manque les deux-points : une ligne sans « clé: contenu » est ignorée.',
    soloBanda: (nome) => `« {{${nome}}} » ne vaut que dans l’en-tête et le pied de page : ici, il reste vide.`,
    segnapostoIgnoto: (nome) => `L’espace réservé « {{${nome}}} » n’existe pas dans ce rapport : il sort vide.`,
    nonMisura: (chiave) => `« ${chiave} » n’est ni une mesure ni une déclaration : la ligne ne compte pas.`,
    soloRigaEImmagine: (dove, chiave) =>
      `Dans « [${dove}] », seuls « riga: » et « immagine: » sont valables : « ${chiave} » est ignoré.`,
    nonDirettiva: (chiave) => `« ${chiave} » n’est pas une directive du corps : la ligne disparaît de la feuille.`,
    fineSpaiato: '« fine: » sans « se: » ni « ripeti: » ouvert.',
    altrimentiFuori: '« altrimenti: » en dehors d’un « se: ».',
    maiTrovato: (direttiva, chiesto) =>
      `« ${direttiva}: ${chiesto} » ne trouve rien sous ce nom : cette partie ne sortira jamais.`,
    maiChiuso: (tipo) =>
      `« ${tipo}: » ouvert et jamais fermé : il manque un « fine: », et tout ce qui suit reste dedans.`,
    numeroFra: (chiave, min, max) =>
      `« ${chiave} » demande un nombre entre ${min} et ${max} : la valeur précédente reste.`,
    nomeModelloSemplice: 'Le nom d’un modèle est un seul mot, sans chemin.',
    modelloAssente: (nome) => `Le modèle « ${nome} » n’existe pas : rien n’est hérité.`,
    orientamento: '« orientamento » demande « verticale » ou « orizzontale ».',
    margini: '« margini » demande quatre nombres : haut, droite, bas, gauche, en millimètres.',
    formato: (valore, noti) =>
      `« ${valore} » n’est pas un format : ${noti}, ou deux mesures comme « 210x297 ».`,
    corpoIgnoto: (nome, corpi) => `« ${nome} » n’est pas un corps de texte : ${corpi}.`,
    corpoSenzaMisura: (nome) => `Le corps « ${nome} » demande une mesure en points, comme « ${nome}=10 ».`,
    immagineSenzaFile: '« immagine: » sans fichier à montrer.',
    nonImmagine: (nome) => `« ${nome} » n’est pas une image : il faut du PNG ou du JPEG.`,
    immagineIgnota: (nome, logo) =>
      `Personne ne connaît l’image « ${nome} » : la seule est « ${logo} », le logo de l’en-tête. La feuille sort sans.`,
    sezioniDeiBlocchi: 'Ici, les sections sont « [blocco: nome] » : à partir de cette ligne, plus rien n’est lu.',
    fuoriDaiBlocchi: 'Cette ligne est en dehors de tout bloc : aucun « usa: » ne peut l’appeler.',
    bloccoAssente: (nome) => `Le bloc « ${nome} » n’existe pas : la ligne disparaît de la feuille.`,
    sezioneDeiTesti: (quale) => `Section « ${quale} » inconnue : ici, il y a « [frasi] » et « [colonne] ».`,
    senzaDuePuntiTesti: 'Il manque les deux-points : une ligne sans « nom: contenu » est ignorée.',
    fuoriDaiTesti: 'Cette ligne est en dehors de « [frasi] » et « [colonne] » : personne ne la lit.',
  },
  en: {
    generi: {
      frase: 'The phrase',
      tabella: 'The table',
      elenco: 'The list',
      grafico: 'The chart',
      galleria: 'The portrait wall',
      gruppo: 'The group',
      blocco: 'The block',
    },
    nomeNonEsiste: (genere, nome) =>
      `${genere} “${nome}” does not exist in this report: the line drops off the sheet.`,
    sezioneSconosciuta: (quale) => `Unknown section “${quale}”: everything that follows stays where it was.`,
    senzaDuePunti: 'The colon is missing: a line without “key: content” is skipped.',
    soloBanda: (nome) => `“{{${nome}}}” only works in the header and footer: here it stays empty.`,
    segnapostoIgnoto: (nome) => `The placeholder “{{${nome}}}” does not exist in this report: it comes out empty.`,
    nonMisura: (chiave) => `“${chiave}” is neither a measurement nor a declaration: the line does not count.`,
    soloRigaEImmagine: (dove, chiave) =>
      `In “[${dove}]” only “riga:” and “immagine:” work: “${chiave}” is skipped.`,
    nonDirettiva: (chiave) => `“${chiave}” is not a body directive: the line drops off the sheet.`,
    fineSpaiato: '“fine:” without an open “se:” or “ripeti:”.',
    altrimentiFuori: '“altrimenti:” outside a “se:”.',
    maiTrovato: (direttiva, chiesto) =>
      `“${direttiva}: ${chiesto}” finds nothing by that name: that part will never appear.`,
    maiChiuso: (tipo) =>
      `“${tipo}:” opened and never closed: a “fine:” is missing, and everything after it stays inside.`,
    numeroFra: (chiave, min, max) =>
      `“${chiave}” needs a number between ${min} and ${max}: the previous value stays.`,
    nomeModelloSemplice: 'A template name is a single word, with no paths.',
    modelloAssente: (nome) => `There is no template “${nome}”: nothing is inherited.`,
    orientamento: '“orientamento” needs “verticale” or “orizzontale”.',
    margini: '“margini” needs four numbers: top, right, bottom, left, in millimetres.',
    formato: (valore, noti) =>
      `“${valore}” is not a format: ${noti}, or two measurements such as “210x297”.`,
    corpoIgnoto: (nome, corpi) => `“${nome}” is not a text size: ${corpi}.`,
    corpoSenzaMisura: (nome) => `The text size “${nome}” needs a measurement in points, such as “${nome}=10”.`,
    immagineSenzaFile: '“immagine:” without a file to show.',
    nonImmagine: (nome) => `“${nome}” is not an image: PNG or JPEG is needed.`,
    immagineIgnota: (nome, logo) =>
      `Nobody knows the image “${nome}”: the only one is “${logo}”, the header logo. The sheet comes out without it.`,
    sezioniDeiBlocchi: 'Here the sections are “[blocco: nome]”: from this line on, nothing more is read.',
    fuoriDaiBlocchi: 'This line is outside every block: no “usa:” can call it.',
    bloccoAssente: (nome) => `The block “${nome}” does not exist: the line drops off the sheet.`,
    sezioneDeiTesti: (quale) => `Unknown section “${quale}”: here there are “[frasi]” and “[colonne]”.`,
    senzaDuePuntiTesti: 'The colon is missing: a line without “name: content” is skipped.',
    fuoriDaiTesti: 'This line is outside “[frasi]” and “[colonne]”: nobody reads it.',
  },
})
