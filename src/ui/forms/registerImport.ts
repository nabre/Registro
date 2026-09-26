// «Importa da un altro registro…»: si sceglie un altro `.regi` e, una casella
// per blocco, se ne porta quel che vale anche qui (impostazioni, materie,
// classi con persone e corsi, piani, calendari ICS), coi nomi di là. Lo aprono
// il menu File, la palette e il modulo del nuovo anno (`forms/year.ts`). Il
// lavoro è dell'host: `registro.altrove` legge senza aprire, `registro.sfoglia`
// apre il dialogo, `registro.importa` scrive.

import { Molti, quanti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { parole } from '../../domain/words.testi.js'
import { campo, pulsante, sezioneModulo } from '../components/base.js'
import { apriModale, type ContestoModale } from '../components/modal.js'
import { h } from '../dom.js'
import { chiedi } from '../bridge.js'
import { aggiorna, stato } from '../state.js'
import { inviaDalModulo } from './common.js'
import { testi } from './registerImport.testi.js'

/** Quel che `registro.altrove` racconta di un altro registro. */
interface RegistroAltrove {
  anno: string
  impostazioni: { scala: string, carte: number, loghi: number, docente: string, liste: number }
  materie: Array<{ nome: string, nuova: boolean }>
  classi: Array<{
    id: string
    nome: string
    persone: number
    corsi: number
    materie: string[]
    piani: number
    esiste: boolean
  }>
  calendari: string[]
  regole: number
}

/** Il prefisso delle caselle delle classi: il resto del nome è l'id. */
const CASELLA_CLASSE = 'classe:'

/** Una riga sotto una casella: quel che quel blocco porterebbe, letto di là. */
function quanto (testo: string): HTMLElement {
  return h('small', { class: 'campo__aiuto' }, testo)
}

/** Il riepilogo delle impostazioni, in una riga. */
function riepilogoImpostazioni (letto: RegistroAltrove): string {
  const t = testi()
  const { scala, carte, loghi, docente, liste } = letto.impostazioni
  return [
    t.scala(scala),
    `${t.carte(carte)}${loghi ? `, ${t.loghi(loghi)}` : ''}`,
    docente ? t.firma(docente) : '',
    liste ? t.liste(liste) : '',
  ].filter(Boolean).join(' · ')
}

/**
 * Le caselle dei blocchi, ognuna con sotto quanto porterebbe, letto dall'altro
 * registro: si guarda prima di spuntare.
 */
function blocchi (letto: RegistroAltrove): HTMLElement {
  const t = testi()
  const L = lessico()
  const nuove = letto.materie.filter((m) => m.nuova).length
  const piani = letto.classi.reduce((somma, c) => somma + c.piani, 0)
  return h(
    'div',
    null,
    sezioneModulo(
      t.impostazioni,
      campo({
        nome: 'impostazioni',
        etichetta: t.impostazioni,
        tipo: 'checkbox',
        valore: true,
        aiuto: t.aiutoImpostazioni,
      }),
      quanto(riepilogoImpostazioni(letto)),
    ),
    sezioneModulo(
      Molti(L.materia),
      campo({
        nome: 'materie',
        etichetta: t.tutteLeMaterie,
        tipo: 'checkbox',
        valore: true,
        aiuto: t.aiutoMaterie,
      }),
      quanto(letto.materie.length === 0
        ? t.nessunaMateria
        : t.materieLette(letto.materie.length, nuove)),
    ),
    sezioneModulo(
      t.classiPersoneCorsi,
      campo({
        nome: 'classi',
        etichetta: t.classiSpuntate,
        tipo: 'checkbox',
        valore: letto.classi.length > 0,
        aiuto: t.aiutoClassi,
      }),
      campo({
        nome: 'anagrafica',
        etichetta: t.anagrafica,
        tipo: 'checkbox',
        valore: true,
        aiuto: t.aiutoAnagrafica,
      }),
      campo({
        nome: 'corsi',
        etichetta: t.corsiConOrario,
        tipo: 'checkbox',
        valore: true,
        aiuto: t.aiutoCorsi,
      }),
      ...(letto.classi.length === 0
        ? [quanto(t.nessunaClasse)]
        : letto.classi.map((c) =>
            campo({
              nome: `${CASELLA_CLASSE}${c.id}`,
              etichetta: [
                c.nome,
                quanti(c.persone, L.pif),
                t.corsi(c.corsi),
                c.esiste ? t.ceGia : '',
              ].filter(Boolean).join(' — '),
              tipo: 'checkbox',
              valore: true,
            }),
          )),
    ),
    sezioneModulo(
      t.pianiECalendari,
      campo({
        nome: 'piani',
        etichetta: Molti(L.pianoLezione),
        tipo: 'checkbox',
        valore: false,
        aiuto: t.aiutoPiani,
      }),
      quanto(t.pianiLetti(piani)),
      campo({
        nome: 'calendari',
        etichetta: t.calendari,
        tipo: 'checkbox',
        valore: false,
        aiuto: t.aiutoCalendari,
      }),
      quanto(letto.calendari.length === 0
        ? t.nessunCalendario
        : `${letto.calendari.join(', ')} · ${t.regole(letto.regole)}`),
    ),
  )
}

/**
 * La finestra dell'import: da quale registro (fra i recenti che rispondono, o
 * col dialogo), che cosa c'è, che cosa portare. Ogni scelta si rilegge e le
 * caselle seguono quel che c'è davvero.
 */
export function moduloImportaRegistro (): void {
  const recenti = stato.documenti.elenco.filter((d) => !d.aperto && !d.mancante)
  /** L'origine scelta adesso: una risposta che arriva per un'altra è vecchia. */
  let scelto = recenti[0]?.percorso ?? ''
  /** Quel che se ne è letto; null finché non c'è. */
  let letto: RegistroAltrove | null = null
  const t = testi()

  const titolo = h('p', { class: 'campo__aiuto' })
  const caselle = h('div')
  const campoOrigine = campo({
    nome: 'percorso',
    etichetta: t.daQualeRegistro,
    tipo: 'select',
    valore: scelto,
    opzioni: recenti.length === 0
      ? [{ valore: '', testo: t.nessunRecente }]
      : recenti.map((d) => ({
          valore: d.percorso,
          testo: d.etichetta ? `${d.etichetta} — ${d.nome}` : d.nome,
        })),
    al: (valore) => {
      scelto = valore
      void leggi()
    },
    azione: pulsante({
      testo: parole().sfoglia,
      simbolo: 'cartella',
      al: () => sfoglia(),
    }),
  })
  const tendina = campoOrigine.querySelector('select') as HTMLSelectElement
  let contesto: ContestoModale | null = null

  /** Rilegge l'origine scelta e ridisegna le caselle. */
  async function leggi (): Promise<void> {
    const percorso = scelto
    letto = null
    caselle.replaceChildren()
    if (!percorso) {
      titolo.textContent = t.sceglineUno(parole().sfoglia)
      return
    }
    titolo.textContent = t.lettura
    contesto?.occupato(true)
    const esito = await chiedi<RegistroAltrove>('registro.altrove', { percorso })
    // Nel frattempo se n'è scelto un altro: questa risposta è vecchia.
    if (percorso !== scelto) return
    contesto?.occupato(false)
    if (!esito.ok || !esito.dati) {
      titolo.textContent = ''
      contesto?.mostraErrori(esito.errori.length ? esito.errori : [t.nonSiLegge])
      return
    }
    contesto?.mostraErrori([])
    letto = esito.dati
    titolo.textContent = t.annoLetto(letto.anno)
    caselle.replaceChildren(blocchi(letto))
  }

  /** Un registro che fra i recenti non c'è, scelto col dialogo del sistema. */
  async function sfoglia (): Promise<void> {
    const esito = await chiedi<{ percorso: string | null }>('registro.sfoglia')
    const percorso = esito.dati?.percorso
    if (!esito.ok || !percorso) return
    if (![...tendina.options].some((o) => o.value === percorso)) {
      // La riga «nessun altro registro» non serve più, adesso che uno c'è.
      if (tendina.options.length === 1 && tendina.options[0].value === '') tendina.replaceChildren()
      tendina.append(h('option', { value: percorso }, percorso.split(/[\\/]/).pop() ?? percorso))
    }
    tendina.value = percorso
    scelto = percorso
    await leggi()
  }

  contesto = apriModale({
    titolo: t.titolo,
    larghezza: 'media',
    aiuto: t.aiuto,
    corpo: () => h('div', { class: 'modulo' }, campoOrigine, titolo, caselle),
    testoSalva: parole().importa,
    alSalva: async (valori, modale) => {
      const percorso = String(valori.percorso ?? '') || scelto
      if (!percorso || !letto) {
        modale.mostraErrori([t.primaScegli])
        return
      }
      const classi = valori.classi === true
        ? letto.classi
            .filter((c) => valori[`${CASELLA_CLASSE}${c.id}`] === true)
            .map((c) => ({
              classeId: c.id,
              anagrafica: valori.anagrafica === true,
              corsi: valori.corsi === true,
            }))
        : []
      const impostazioni = valori.impostazioni === true
      const materie = valori.materie === true
      const piani = valori.piani === true
      const calendari = valori.calendari === true
      if (!impostazioni && !materie && classi.length === 0 && !calendari) {
        modale.mostraErrori([t.nienteSpuntato])
        return
      }
      const risposta = await inviaDalModulo(modale, {
        tipo: 'registro.importa',
        percorso,
        impostazioni,
        materie,
        classi,
        piani,
        calendari,
      })
      if (!risposta) return
      // L'esito lo mostra `invia`, come per ogni risposta.
      modale.chiudi()
      if (classi.length > 0) aggiorna({ vista: 'classi' })
    },
  })
  void leggi()
}
