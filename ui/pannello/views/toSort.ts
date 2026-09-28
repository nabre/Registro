// Tutti i PDF che aspettano di essere divisi, di tutte le classi insieme.
// Serve soprattutto per i PDF senza classe: quelli dalla cartella osservata
// (`smistaFile` non dichiara una classe) restano in quarantena con `classeId`
// nullo, e l'archivio della classe non li mostrerebbe.
//   - con una classe: un clic porta al suo Archivio documentale, con il PDF
//     aperto nella cornice;
//   - senza classe: si dichiara la classe, e il registro rifà le proposte con
//     i suoi nomi (il testo delle pagine è già letto).
// La stessa tendina sposta i resti di una scansione che attraversa due classi;
// le pagine già archiviate non si muovono.

import { raccoglieDocumento } from '../../../core/dominio/assignments.js'
import { formattaData, giornoDi } from '../../../core/dominio/dates.js'
import type { Classe, Registro, Smistamento } from '../../../core/dominio/models.js'
import { daSmistarePerClasse, pagineDaSmistare, type MucchioDaSmistare } from '../../../core/dominio/sorting.js'
import { pastiglia, pulsante, statoVuoto, testataVista } from '../components/base.js'
import { suggerimento } from '../components/hint.js'
import { icona } from '../components/icons.js'
import { h, type Figlio } from '../dom.js'
import { aggiorna, classiDiCuiSonoDocente, stato } from '../state.js'

import { guardaNellArchivio } from './archive.js'
import { spostaInClasse } from './sorting.js'
import { testi } from './sorting.testi.js'

let cacheRegistro: Registro | null = null
let mucchiInMemoria: MucchioDaSmistare[] = []

/**
 * I mucchi da mostrare: uno per classe di cui si è docente, più gli orfani. Le
 * consegne non si restringono al semestre scelto: qui la domanda è che file ci
 * sono, non che cosa manca nel periodo.
 */
function mucchi (): MucchioDaSmistare[] {
  if (cacheRegistro === stato.registro) return mucchiInMemoria

  const classi = classiDiCuiSonoDocente()
  const classiIds = new Set(classi.map((c) => c.id))
  const classePerCorso = new Map<string, string>()
  for (const corso of stato.registro.corsi) {
    if (classiIds.has(corso.classeId)) {
      classePerCorso.set(corso.id, corso.classeId)
    }
  }
  const consegnePerClasse = new Map<string, string[]>()
  for (const c of stato.registro.consegne) {
    if (raccoglieDocumento(c)) {
      const clsId = classePerCorso.get(c.corsoId)
      if (clsId) {
        let elenco = consegnePerClasse.get(clsId)
        if (!elenco) {
          elenco = []
          consegnePerClasse.set(clsId, elenco)
        }
        elenco.push(c.id)
      }
    }
  }

  cacheRegistro = stato.registro
  mucchiInMemoria = daSmistarePerClasse(
    stato.registro.smistamenti,
    classi.map((classe) => ({
      classe,
      consegneIds: consegnePerClasse.get(classe.id) ?? [],
    })),
  )
  return mucchiInMemoria
}

/** Quante pagine aspettano in tutto: è il numero che la barra laterale mostra. */
export function pagineDaSmistareInTutto (): number {
  return pagineDaSmistare(stato.registro.smistamenti)
}

/** Il giorno in cui è arrivato, senza l'ora: qui interessa «da quanto sta lì». */
function quandoArrivato (smistamento: Smistamento): string {
  const giorno = giornoDi(smistamento.arrivatoIl)
  return giorno ? formattaData(giorno) : smistamento.arrivatoIl.slice(0, 10)
}

/**
 * Porta a smistarlo: la sua classe, la scheda dei documenti, il file aperto.
 * Tutte e tre: la cornice vive nell'archivio di una classe, e senza cambiare
 * classe `indiceAperto` non troverebbe il file fra le righe.
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
function riga (
  smistamento: Smistamento,
  t: ReturnType<typeof testi>,
  ...coda: Figlio[]
): HTMLElement {
  const restano = smistamento.blocchi.reduce((n, b) => n + (b.a - b.da + 1), 0)
  return h(
    'div',
    { class: 'da-smistare__riga' },
    icona('documento', 'icona--minuta'),
    h('span', { class: 'da-smistare__nome' }, smistamento.nome),
    h('span', { class: 'da-smistare__conto' }, t.pagine(restano || smistamento.pagine)),
    h('span', { class: 'da-smistare__quando testo-quieto' }, t.dal(quandoArrivato(smistamento))),
    smistamento.errore ? pastiglia(t.nonSiApre, 'negativo') : null,
    h('span', { class: 'da-smistare__coda' }, ...coda),
  )
}

/** Un mucchio con la sua classe: si va e si smista, o si manda altrove. */
function mucchioDiClasse (
  mucchio: MucchioDaSmistare,
  classe: Classe,
  t: ReturnType<typeof testi>,
): HTMLElement {
  return h(
    'section',
    { class: 'da-smistare__mucchio' },
    h(
      'h3',
      { class: 'da-smistare__titolo' },
      classe.nome,
      h('span', { class: 'testo-quieto' }, t.daCollocare(mucchio.pagine)),
    ),
    ...mucchio.smistamenti.map((smistamento) =>
      riga(
        smistamento,
        t,
        // Il gesto normale è dividerlo; spostarlo in un'altra classe viene dopo, più quieto.
        spostaInClasse(smistamento, t.spostaIn),
        pulsante({
          testo: t.smista,
          simbolo: 'destra',
          variante: 'primario',
          titolo: t.apriNellArchivio(smistamento.nome, classe.nome),
          al: () => vaiASmistare(classe, smistamento),
        }),
      ),
    ),
  )
}

/** Il mucchio senza classe. */
function mucchioSenzaClasse (
  mucchio: MucchioDaSmistare,
  t: ReturnType<typeof testi>,
): HTMLElement {
  return h(
    'section',
    { class: 'da-smistare__mucchio da-smistare__mucchio--orfani' },
    h(
      'h3',
      { class: 'da-smistare__titolo' },
      t.nonAttribuiti,
      // Da dove vengono sta dietro la «i»; che senza classe non compaiono altrove
      // resta scritto.
      suggerimento(t.senzaDire, { etichetta: t.nonAttribuiti }),
      h('span', { class: 'testo-quieto' }, t.daCollocare(mucchio.pagine)),
    ),
    h(
      'p',
      { class: 'da-smistare__nota testo-quieto' },
      t.finche,
    ),
    ...mucchio.smistamenti.map((smistamento) =>
      riga(smistamento, t, spostaInClasse(smistamento, t.diQualeClasse)),
    ),
  )
}

export function vistaDaSmistare (): Figlio {
  const tutti = mucchi()
  const pagine = tutti.reduce((totale, mucchio) => totale + mucchio.pagine, 0)
  const t = testi()

  return h(
    'div',
    { class: 'vista vista--da-smistare' },
    testataVista({
      titolo: t.titolo,
      sottotitolo: tutti.length === 0 ? t.nessunPdf : t.inMucchi(pagine, tutti.length),
    }),
    tutti.length === 0
      ? statoVuoto({
          simbolo: 'documento',
          titolo: t.niente,
          testo: t.nienteTesto,
          azione: pulsante({
            testo: t.vaiArchivio,
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
              ? mucchioDiClasse(mucchio, mucchio.classe, t)
              : mucchioSenzaClasse(mucchio, t),
          ),
        ),
  )
}
