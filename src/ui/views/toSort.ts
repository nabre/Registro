// Tutti i PDF che aspettano di essere divisi, di tutte le classi insieme.
//
// È una pagina trasversale, e sta fra le pagine trasversali: il fascicolo
// guarda una classe alla volta, e finché la quarantena si leggeva solo di là
// bisognava già sapere dove cercare per trovare qualcosa.
//
// **Il motivo per cui esiste** non è la comodità di non cambiare classe. È che
// c'erano file che non si vedevano affatto. Un PDF entrato dalla cartella
// osservata arriva senza classe — `smistaFile` non ne dichiara una — e se il
// nome della cartella non basta a indovinare la richiesta, resta in quarantena
// con `classeId` nullo. Il fascicolo filtra per classe, e quindi non lo mostra;
// nessun'altra vista leggeva la quarantena. Quel file era dentro il documento
// dell'anno, contato da `pagineDaSmistare()`, e invisibile.
//
// Di qui si vede tutto, e ogni mucchio ha la sua strada:
//
//   - **con una classe**: un clic porta nel suo Archivio documentale, con il
//     PDF già aperto nella cornice — che è il posto in cui le pagine si
//     prendono e si lasciano cadere sulla casella di chi sono. La pagina non
//     rifà quel mestiere: ci accompagna.
//   - **senza classe**: prima va detto di chi è. Dichiarata la classe, il
//     registro rifà le proposte con i nomi di quella classe — il testo delle
//     pagine l'ha già letto, e non dipende da chi siano — e da lì in poi è un
//     PDF come gli altri.
//
// La stessa tendina serve anche dopo, ed è il caso della scansione che
// attraversa due classi: finito di dividere quel che era della prima restano
// pagine, e sono di un'altra. Si sposta il mucchio, non il lavoro fatto: le
// pagine già archiviate sono documenti di qualcuno e non si muovono.

import { consegneDocumento } from '../../domain/assignments.js'
import type { Classe, Smistamento } from '../../domain/models.js'
import { daSmistarePerClasse, type MucchioDaSmistare } from '../../domain/sorting.js'
import { pastiglia, pulsante, statoVuoto, testataVista } from '../components/base.js'
import { icona } from '../components/icons.js'
import { h, type Figlio } from '../dom.js'
import { aggiorna, classiDiCuiSonoDocente, corsiDi, stato } from '../state.js'

import { guardaNellArchivio } from './archive.js'
import { spostaInClasse } from './sorting.js'

/**
 * I mucchi da mostrare: uno per classe di cui si è docente, più gli orfani.
 *
 * Le consegne non si restringono al semestre scelto, e qui è voluto — altrove
 * sì. La matrice dell'archivio è una domanda sul periodo («che cosa manca in
 * questo semestre»); questa pagina è una domanda sul disco («che file ho in
 * casa»), e un PDF arrivato a gennaio non smette di esistere perché si sta
 * guardando il secondo semestre.
 */
function mucchi (): MucchioDaSmistare[] {
  return daSmistarePerClasse(
    stato.registro.smistamenti,
    classiDiCuiSonoDocente().map((classe) => ({
      classe,
      consegneIds: consegneDocumento(stato.registro, corsiDi(classe.id)).map((c) => c.id),
    })),
  )
}

/** Quante pagine aspettano in tutto: è il numero che la barra laterale mostra. */
export function pagineDaSmistareInTutto (): number {
  return mucchi().reduce((totale, mucchio) => totale + mucchio.pagine, 0)
}

/** Il giorno in cui è arrivato, senza l'ora: qui interessa «da quanto sta lì». */
function quandoArrivato (smistamento: Smistamento): string {
  const giorno = smistamento.arrivatoIl.slice(0, 10)
  const [anno, mese, di] = giorno.split('-')
  return di && mese && anno ? `${di}.${mese}.${anno}` : giorno
}

/**
 * Porta a smistarlo: la sua classe, la scheda dei documenti, il file aperto.
 *
 * Tre cose insieme e non una: la cornice che mostra le pagine vive dentro
 * l'archivio di *una* classe, e le sue righe nascono da `smistamentiDellaClasse`.
 * Aprendo il file senza cambiare classe, `indiceAperto` non lo troverebbe fra le
 * righe e la cornice resterebbe chiusa — un clic che non fa niente.
 */
function vaiASmistare (classe: Classe, smistamento: Smistamento): void {
  aggiorna({
    vista: 'docenteClasse',
    schedaDocente: 'documenti',
    classeId: classe.id,
    filtroClasseId: classe.id,
  })
  guardaNellArchivio(smistamento.file)
}

/** Una riga: che file è, quante pagine restano, da quando aspetta. */
function riga (smistamento: Smistamento, ...coda: Figlio[]): HTMLElement {
  const restano = smistamento.blocchi.reduce((n, b) => n + (b.a - b.da + 1), 0)
  return h(
    'div',
    { class: 'da-smistare__riga' },
    icona('documento', 'icona--minuta'),
    h('span', { class: 'da-smistare__nome' }, smistamento.nome),
    h('span', { class: 'da-smistare__conto' }, `${restano || smistamento.pagine} pagine`),
    h('span', { class: 'da-smistare__quando testo-quieto' }, `dal ${quandoArrivato(smistamento)}`),
    smistamento.errore ? pastiglia('non si apre', 'negativo') : null,
    h('span', { class: 'da-smistare__coda' }, ...coda),
  )
}

/** Un mucchio con la sua classe: si va e si smista, o si manda altrove. */
function mucchioDiClasse (mucchio: MucchioDaSmistare, classe: Classe): HTMLElement {
  return h(
    'section',
    { class: 'da-smistare__mucchio' },
    h(
      'h3',
      { class: 'da-smistare__titolo' },
      classe.nome,
      h('span', { class: 'testo-quieto' }, ` · ${mucchio.pagine} pagine da collocare`),
    ),
    ...mucchio.smistamenti.map((smistamento) =>
      riga(
        smistamento,
        // Due gesti, e l'ordine dice quale è quello normale: si va a dividerlo.
        // Lo spostamento è la seconda domanda — «queste pagine che restano non
        // sono di questa classe» — e sta dopo, più quieto.
        spostaInClasse(smistamento, 'Sposta in…'),
        pulsante({
          testo: 'Smista',
          simbolo: 'destra',
          variante: 'primario',
          titolo: `Apri «${smistamento.nome}» nell’archivio di ${classe.nome}`,
          al: () => vaiASmistare(classe, smistamento),
        }),
      ),
    ),
  )
}

/** Il mucchio di nessuno: il motivo per cui questa pagina esiste. */
function mucchioSenzaClasse (mucchio: MucchioDaSmistare): HTMLElement {
  return h(
    'section',
    { class: 'da-smistare__mucchio da-smistare__mucchio--orfani' },
    h(
      'h3',
      { class: 'da-smistare__titolo' },
      'Non attribuiti a una classe',
      h('span', { class: 'testo-quieto' }, ` · ${mucchio.pagine} pagine da collocare`),
    ),
    h(
      'p',
      { class: 'da-smistare__nota testo-quieto' },
      'Sono entrati senza dire di chi fossero — di solito dalla cartella osservata. ' +
      'Finché non hanno una classe non compaiono in nessun fascicolo: dichiarala qui, ' +
      'e il registro li rilegge cercando i nomi.',
    ),
    ...mucchio.smistamenti.map((smistamento) =>
      riga(smistamento, spostaInClasse(smistamento, 'Di quale classe è?')),
    ),
  )
}

export function vistaDaSmistare (): Figlio {
  const tutti = mucchi()
  const pagine = tutti.reduce((totale, mucchio) => totale + mucchio.pagine, 0)

  return h(
    'div',
    { class: 'vista vista--da-smistare' },
    testataVista({
      titolo: 'Da smistare',
      sottotitolo:
        tutti.length === 0
          ? 'Nessun PDF in attesa.'
          : `${pagine} pagine in ${tutti.length === 1 ? 'un mucchio' : `${tutti.length} mucchi`}.`,
    }),
    tutti.length === 0
      ? statoVuoto({
          simbolo: 'documento',
          titolo: 'Niente da smistare',
          testo:
            'Qui compaiono i PDF caricati che aspettano di essere divisi, di tutte le classi ' +
            'di cui sei docente — compresi quelli arrivati senza una classe, che altrove non ' +
            'si vedono. Si caricano dall’Archivio documentale, o trascinandoli nella pagina.',
          azione: pulsante({
            testo: 'Vai all’archivio documentale',
            variante: 'primario',
            simbolo: 'documento',
            al: () => aggiorna({ vista: 'docenteClasse', schedaDocente: 'documenti' }),
          }),
        })
      : h(
          'div',
          { class: 'da-smistare', dataset: { scorrimento: 'da-smistare' } },
          ...tutti.map((mucchio) =>
            mucchio.classe
              ? mucchioDiClasse(mucchio, mucchio.classe)
              : mucchioSenzaClasse(mucchio),
          ),
        ),
  )
}
