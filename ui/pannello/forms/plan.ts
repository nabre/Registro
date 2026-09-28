// Il piano di una lezione: la scaletta delle attività e i materiali. Vive più a
// lungo dell'ora (si riassegna, si copia per l'anno dopo), per questo le
// risorse stanno con lui. L'editor delle attività è in `planActivity.ts`.

import {
  contaUd,
  minutiDiAttivita,
  minutiEffettivi,
} from '../../../core/dominio/calculations.js'
import { attivitaValutata } from '../../../core/dominio/activities.js'
import { formattaData, formattaDurata, formattaUd } from '../../../core/dominio/dates.js'
import { creaPiano } from '../../../core/dominio/factories.js'
import { generaAttivitaStandard, generaObiettiviStandard } from '../../../core/dominio/plans.js'
import type {
  Attivita,
  Lezione,
  PianoLezione,
  Risorsa,
} from '../../../core/dominio/models.js'
import {
  avviso,
  campo,
  conAttesa,
  pastiglia,
  pulsante,
  quieto,
  riga,
  sezioneModulo,
  statoVuoto,
  valoriModulo,
} from '../components/base.js'
import { apriModale, type ContestoModale } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { gestisci, h, rimpiazza } from '../dom.js'
import { azione, invia } from '../bridge.js'
import {
  classeDelCorsoId,
  corsiDi,
  nomeCorso,
  nomeDiPiano,
  pianiPerCorso,
  postoCorrente,
  stato,
  vai,
} from '../state.js'

/**
 * Sceglie un piano, o nessuno, senza lasciare la pagina: in quella dei piani
 * diventa quel che si guarda (senza, si torna al corso); altrove resta solo
 * nel contesto.
 */
function scegliPiano (pianoId: string | null): void {
  const qui = postoCorrente()
  if (qui.pagina !== 'pagina.corso.piani') {
    vai(qui, { contesto: { pianoId }, elementoChiesto: false })
    return
  }
  const corsoId = stato.contesto.corsoId
  vai(
    pianoId
      ? { pagina: qui.pagina, soggetto: { tipo: 'piano', id: pianoId } }
      : corsoId
        ? { pagina: qui.pagina, soggetto: { tipo: 'corso', id: corsoId } }
        : { pagina: qui.pagina },
    { contesto: { pianoId }, elementoChiesto: pianoId !== null },
  )
}
import { Uno } from '../../../core/dominio/lexicon.js'
import { lessico } from '../../../core/dominio/lexicon.testi.js'
import { parole } from '../../../core/dominio/words.testi.js'
import { titoloComando } from '../../../contract/manifesto.js'

import { testi } from './plan.testi.js'
import { bloccoRisorse } from './resources.js'
import {
  salva,
  tastoDuplica,
  tastoElimina,
  testo,
} from './common.js'
import { campoCorso } from './course.js'
import { editorAttivita, voceFerma, type GestoreRisorse } from './planActivity.js'

/**
 * Gli stati particolari di un piano, detti aprendo la modifica: il corso, le
 * ore che lo usano, le spunte, i voti nati dalle tappe. Quel che si cambia qui
 * si sente altrove. Prima vengono quelli che impediscono il salvataggio.
 */
function statiDelPiano (base: PianoLezione): Array<{ testo: string, blocca: boolean }> {
  const t = testi()
  const avvisi: Array<{ testo: string, blocca: boolean }> = []
  const corsi = stato.registro.corsi
  const suo = base.corsoId ? corsi.find((c) => c.id === base.corsoId) ?? null : null

  if (corsi.length === 0) {
    avvisi.push({ testo: t.nessunCorso, blocca: true })
  } else if (!base.corsoId) {
    avvisi.push({ testo: t.senzaCorso, blocca: true })
  } else if (!suo) {
    avvisi.push({ testo: t.corsoSparito, blocca: true })
  }

  const usi = stato.registro.lezioni.filter((l) => l.pianoId === base.id)
  if (usi.length > 1) {
    avvisi.push({ testo: t.piuOre(usi.length), blocca: false })
  }

  // Togliere una tappa toglie la sua spunta, che era il consuntivo di un'ora fatta.
  const conSpunte = usi.filter((l) => l.avanzamento.some((a) => a.stato !== 'da-fare'))
  if (conSpunte.length > 0) {
    avvisi.push({ testo: t.oreConSpunte(conSpunte.length), blocca: false })
  }

  // I voti restano, ma il momento perde la riga di scaletta da cui era nato.
  const daTappe = stato.registro.valutazioni.filter(
    (v) => v.pianoId === base.id && Boolean(v.attivitaId),
  )
  if (daTappe.length > 0) {
    const voti = daTappe.reduce(
      (somma, m) => somma + m.voti.filter((x) => x.valore !== null).length,
      0,
    )
    avvisi.push({ testo: t.momentiDalleTappe(daTappe.length, voti), blocca: false })
  }

  return avvisi
}

/** I campi di un piano, staccati dalla finestra che li contiene. */
export interface EditorPiano {
  /** Il corpo dei campi: si appende a una modale o dentro una pagina. */
  corpo: HTMLElement
  /** Il piano com'è adesso nei campi, pronto da mandare al registro. */
  componi: () => PianoLezione
  /** Quello da cui è partito: l'id e tutto ciò che i campi non toccano. */
  base: PianoLezione
}

/**
 * L'editor di un piano senza la finestra intorno: lo stesso corpo nella modale
 * e nella pagina «Piani lezione».
 */
export function editorPiano (opzioni: {
  piano?: PianoLezione
  /** Il corso da proporre a un piano nuovo: chi apre l'editor di solito lo sa. */
  corsoDaProporre?: string | null
  /** L'ora per cui lo si prepara: la scaletta si posa sulle sue UD. */
  lezione?: Lezione | null
  /**
   * Chiamata a ogni modifica confermata (campo lasciato, tappa spostata,
   * allegato), per chi salva da sé campo per campo come nella pagina; nella
   * modale salva il suo pulsante.
   */
  allaModifica?: () => void
  /**
   * Il corso lo detta la selezione di fuori (l'ora scelta nella pagina dei
   * piani), quindi resta una riga e non una tendina che sposterebbe il piano per
   * sbaglio. Senza corso (eliminato), la tendina resta: è l'unico posto per
   * riagganciarlo.
   */
  corsoDettato?: boolean
}): EditorPiano {
  const t = testi()
  const L = lessico()
  const piano = opzioni.piano
  const lezione = opzioni.lezione
  const modifica = Boolean(piano)
  // Il piano nasce sul corso indicato, o su quello della classe filtrata se è
  // uno solo; resta cambiabile.
  const corsiDelFiltro = stato.filtroClasseId ? corsiDi(stato.filtroClasseId) : []
  const iniziale =
    piano ??
    creaPiano(
      opzioni.corsoDaProporre ?? (corsiDelFiltro.length === 1 ? corsiDelFiltro[0].id : null),
    )

  const minutiUd = stato.registro.impostazioni.minutiUd
  const udDellOra = (): number => (lezione ? Math.max(1, contaUd(lezione, minutiUd)) : 1)
  // Un piano vuoto parte da obiettivi e scaletta proposti, scritti su una copia:
  // il piano di `stato.registro` resta com'è finché non si salva, e «Annulla»
  // non lascia niente.
  const autoGenerato = iniziale.attivita.length === 0 && iniziale.obiettivi.length === 0
  const base: PianoLezione = autoGenerato
    ? {
        ...iniziale,
        obiettivi: generaObiettiviStandard(),
        attivita: generaAttivitaStandard(
          udDellOra(),
          '',
          classeDelCorsoId(iniziale.corsoId)?.docenteDiClasse ?? false,
          minutiUd,
        ),
      }
    : iniziale

  // La tendina del corso resta dove c'è un corso da scegliere.
  const corsoFermo = Boolean(opzioni.corsoDettato && base.corsoId)
  // Copia profonda di quel che l'editor tocca: con `parametri` e `valutazione`
  // condivisi con `stato.registro`, «Annulla» non ripristinerebbe niente.
  let attivita: Attivita[] = base.attivita.map((a) => ({
    ...a,
    valutazione: a.valutazione ? { ...a.valutazione } : a.valutazione,
    parametri: a.parametri ? { ...a.parametri } : a.parametri,
    risorse: [...a.risorse],
  }))
  // Le risorse del piano non passano dai campi (le scrive l'host copiando un
  // file): si rileggono dal registro, se no si cancellerebbe l'allegato appena messo.
  let risorsePiano: Risorsa[] = base.risorse

  /** Il piano com'è adesso nel modulo, pronto da mandare. */
  const componiPiano = (valori: Record<string, string | number | boolean>): PianoLezione => ({
    ...base,
    corsoId: corsoFermo ? base.corsoId : testo(valori.corsoId) || null,
    obiettivi: String(valori.obiettivi ?? '')
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean),
    prerequisiti: testo(valori.prerequisiti),
    note: testo(valori.note),
    tag: valori.tag !== undefined
      ? String(valori.tag)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : (base.tag ?? []),
    risorse: risorsePiano,
    attivita,
  })

  /**
   * Il piano salvato prima di allegarci qualcosa: l'host deve sapere di quale
   * piano e tappa è il file. Per questo allegare a un piano nuovo lo fa esistere.
   */
  const salvaAdesso = async (): Promise<boolean> => {
    const risposta = await invia({
      tipo: 'piano.salva',
      piano: componiPiano(valoriModulo(corpoModulo)),
    })
    if (!risposta.ok) {
      notifica((risposta.errori ?? [t.nonSalvato]).join(' '), 'avviso')
      return false
    }
    return true
  }

  /** Le risorse come stanno adesso nel registro: del piano, o di una sua tappa. */
  const rilette = (attivitaId: string | null): Risorsa[] | null => {
    const salvato = stato.registro.piani.find((p) => p.id === base.id)
    if (!salvato) return null
    if (!attivitaId) return salvato.risorse
    return salvato.attivita.find((a) => a.id === attivitaId)?.risorse ?? null
  }

  // Chi disegna risorse si registra qui, e un giro solo li rinfresca tutti.
  const rinfrescatori: Array<() => void> = []
  const rinfrescaTutto = () => {
    for (const rinfresca of rinfrescatori) rinfresca()
  }
  const gestoreRisorse: GestoreRisorse = {
    pianoId: base.id,
    prima: salvaAdesso,
    rilette,
    registra: (rinfresca) => rinfrescatori.push(rinfresca),
    rinfrescaTutto,
  }

  const zonaRisorsePiano = h('div')
  const disegnaRisorsePiano = (): void => {
    rimpiazza(
      zonaRisorsePiano,
      bloccoRisorse({
        pianoId: base.id,
        attivitaId: null,
        risorse: risorsePiano,
        prima: salvaAdesso,
        dopo: rinfrescaTutto,
      }),
    )
  }
  rinfrescatori.push(() => {
    const fresche = rilette(null)
    if (fresche) risorsePiano = fresche
    disegnaRisorsePiano()
  })

  /**
   * Il modulo, `null` finché la costruzione non è finita: dentro c'è chi lo
   * rilegge (la tendina dei tipi guarda il corso scelto).
   */
  let modulo: HTMLElement | null = null

  const zonaAttivita = h('div')
  const disegnaAttivita = (): void => {
    rimpiazza(
      zonaAttivita,
      editorAttivita(
        attivita,
        (nuove) => {
          attivita = nuove
          opzioni.allaModifica?.()
        },
        lezione,
        gestoreRisorse,
        () => {
          const scelto = modulo?.querySelector<HTMLSelectElement>('[name="corsoId"]')?.value
          return classeDelCorsoId(scelto || base.corsoId)?.docenteDiClasse ?? false
        },
        base.corsoId,
      ),
    )
  }
  disegnaAttivita()

  const particolari = modifica ? statiDelPiano(base) : []

  const corpoModulo: HTMLElement = h(
    'div',
    { class: 'modulo' },
    // Quel che c'è da sapere prima di toccare: corso mancante, ore che usano la
    // scaletta, spunte e voti già usciti.
    particolari.length > 0
      ? avviso(
          h(
            'ul',
            { class: 'elenco-avviso' },
            ...particolari.map((v) => h('li', null, v.testo)),
          ),
          particolari.some((v) => v.blocca) ? 'attenzione' : 'informativo',
        )
      : null,
    // Nessun titolo: il nome si compone dal corso. Tre sezioni, nell'ordine in cui
    // si prepara: di che cosa parla l'ora (obiettivi, etichette, note: quel che la
    // rende ritrovabile), come la si spende, che cosa serve.
    sezioneModulo(
      t.diCheCosaParla,
      riga(
        corsoFermo
          ? voceFerma(Uno(L.corso), nomeCorso(base.corsoId), t.aiutoCorsoDettato)
          : campoCorso({
              valore: base.corsoId ?? '',
              richiesto: true,
              aiuto: t.aiutoCorso,
            }),
      ),
      riga(
        campo({
          nome: 'obiettivi',
          etichetta: t.obiettivi,
          tipo: 'textarea',
          righe: 4,
          valore: base.obiettivi.join('\n'),
          aiuto: t.aiutoObiettivi,
          larghezza: 'meta',
        }),
        campo({
          nome: 'prerequisiti',
          etichetta: t.prerequisiti,
          tipo: 'textarea',
          righe: 4,
          valore: base.prerequisiti ?? '',
          aiuto: t.aiutoPrerequisiti,
          larghezza: 'meta',
        }),
      ),
      riga(
        campo({
          nome: 'note',
          etichetta: parole().note,
          tipo: 'textarea',
          righe: 2,
          valore: base.note ?? '',
          aiuto: t.aiutoNote,
        }),
      ),
    ),
    // La spiegazione dietro la «i»; che allegare salva il piano resta in vista.
    sezioneModulo(
      { testo: Uno(L.scaletta), aiuto: t.aiutoScaletta },
      h(
        'div',
        { class: 'riga-azioni-scaletta' },
        h('p', { class: 'testo-quieto' }, t.allegareSalva),
        pulsante({
          testo: t.rigeneraAttivita,
          variante: 'sottile',
          simbolo: 'bacchetta',
          al: () => {
            const scelto = modulo?.querySelector<HTMLSelectElement>('[name="corsoId"]')?.value
            const corsoIdScelto = scelto || base.corsoId
            const isDoc = classeDelCorsoId(corsoIdScelto)?.docenteDiClasse ?? false
            attivita = generaAttivitaStandard(udDellOra(), '', isDoc, minutiUd)
            disegnaAttivita()
            // Nella modale salva il suo pulsante: «Annulla» deve poter rinunciare.
            opzioni.allaModifica?.()
          },
        }),
      ),
      zonaAttivita,
    ),
    // Il materiale di tutta l'ora, non di una tappa (la dispensa, il video d'apertura).
    sezioneModulo(
      { testo: t.risorseDelPiano, aiuto: t.aiutoRisorse },
      zonaRisorsePiano,
    ),
  )

  modulo = corpoModulo
  disegnaRisorsePiano()

  // Nella pagina, che salva campo per campo, la proposta si scrive subito (dopo
  // che chi ha aperto l'editor lo tiene in mano); nella modale la salva solo il
  // pulsante, così «Annulla» non lascia un piano orfano.
  if (autoGenerato && opzioni.allaModifica) {
    const allaModifica = opzioni.allaModifica
    setTimeout(() => allaModifica(), 0)
  }

  // Ogni `change` dei campi è una modifica confermata; gli `input` no, per non
  // salvare a ogni lettera. Le tappe hanno il loro `allaModifica`.
  if (opzioni.allaModifica) {
    gestisci(corpoModulo, 'change', () => opzioni.allaModifica?.())
  }

  return {
    corpo: corpoModulo,
    componi: () => componiPiano(valoriModulo(corpoModulo)),
    base,
  }
}

export function moduloPiano (
  piano?: PianoLezione,
  /**
   * Che cosa fare col piano appena creato. Può essere asincrona (chi apre da una
   * lezione ci assegna subito il piano): `salva` la aspetta.
   */
  dopo?: (pianoId: string) => void | Promise<void>,
  /** Il corso da proporre a un piano nuovo: chi apre il modulo di solito lo sa. */
  corsoDaProporre?: string | null,
  /** L'ora per cui lo si prepara: la scaletta si posa sulle sue UD. */
  lezione?: Lezione | null,
): void {
  const t = testi()
  const modifica = Boolean(piano)
  const editor = editorPiano({ piano, corsoDaProporre, lezione })

  apriModale({
    titolo: modifica ? t.modificaPiano : titoloComando('registroDocenti.nuovoPiano'),
    larghezza: 'larga',
    corpo: () => editor.corpo,
    alSalva: async (_valori, contesto) => {
      const aggiornato = editor.componi()
      await salva(
        contesto,
        { tipo: 'piano.salva', piano: aggiornato },
        modifica ? t.aggiornato : t.creato,
        async (idCreato) => {
          const pianoId = idCreato ?? aggiornato.id
          if (dopo) {
            await dopo(pianoId)
            return
          }
          vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: pianoId } })
        },
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? [
            tastoDuplica({
              contesto,
              azione: { tipo: 'piano.duplica', pianoId: editor.base.id },
              fatto: t.duplicato,
              poi: (idCreato) => scegliPiano(idCreato),
            }),
            tastoElimina({
              contesto,
              chiedi: { genere: 'piano', id: editor.base.id },
              azione: { tipo: 'piano.elimina', pianoId: editor.base.id },
              fatto: t.eliminato,
              poi: () => scegliPiano(null),
            }),
          ]
        : null,
  })
}


/** Sceglie quale piano assegnare a una lezione, con l'anteprima della scaletta. */
export function moduloAssegnaPiano (lezione: Lezione): void {
  const t = testi()
  // I piani della materia del corso, di qualunque anno.
  const piani = pianiPerCorso(lezione.corsoId)
  // Il cambio fra UD del piano e minuti è quello dell'ora vera.
  const udDelDocumento = stato.registro.impostazioni.minutiUd
  const udDellOra = contaUd(lezione, udDelDocumento)
  const minutiUd = udDellOra > 0 ? minutiEffettivi(lezione) / udDellOra : udDelDocumento

  /**
   * Il piano nuovo nasce già al suo posto: sul corso di questa lezione, e
   * assegnato a lei appena salvato.
   */
  const creaEAssegna = (contesto: ContestoModale) => {
    contesto.chiudi()
    moduloPiano(
      undefined,
      async (pianoId) => {
        const risposta = await azione({ tipo: 'piano.assegna', lezioneId: lezione.id, pianoId })
        if (risposta.ok) notifica(t.creatoEAssegnato, 'successo')
      },
      lezione.corsoId,
      lezione,
    )
  }

  apriModale({
    titolo: t.assegnaUnPiano,
    sottotitolo: formattaData(lezione.data, 'lungo'),
    larghezza: 'media',
    corpo: (contesto) => {
      if (piani.length === 0) {
        return statoVuoto({
          simbolo: 'piano',
          titolo: t.nessunPiano,
          testo: t.nessunPianoTesto,
          azione: pulsante({
            testo: t.creaUnPiano,
            variante: 'primario',
            simbolo: 'piu',
            al: () => creaEAssegna(contesto),
          }),
        })
      }

      const disponibili = `${formattaDurata(minutiEffettivi(lezione))} (${formattaUd(udDellOra)})`
      return h(
        'div',
        { class: 'elenco-scelta' },
        quieto(t.lezioneDi(disponibili)),
        ...piani.map((piano) => {
          const durata = piano.attivita.reduce((s, a) => s + a.durataUd, 0)
          const prove = piano.attivita.filter(attivitaValutata).length
          const scostamento = durata - udDellOra
          return h(
            'button',
            {
              class: ['voce-scelta', lezione.pianoId === piano.id && 'voce-scelta--attiva'],
              type: 'button',
              onclick: (evento: MouseEvent) =>
                void conAttesa(
                  evento.currentTarget as HTMLButtonElement,
                  (async () => {
                    const risposta = await azione({
                      tipo: 'piano.assegna',
                      lezioneId: lezione.id,
                      pianoId: piano.id,
                    })
                    if (!risposta.ok) return
                    contesto.chiudi()
                    notifica(t.assegnato, 'successo')
                  })(),
                ),
            },
            h(
              'div',
              { class: 'voce-scelta__testo' },
              h('strong', null, nomeDiPiano(piano)),
              h(
                'small',
                null,
                t.attivitaPer(
                  piano.attivita.length,
                  formattaDurata(minutiDiAttivita(durata, minutiUd)),
                ) +
                  // Se l'ora porta dei voti: cambia come si prepara la lezione.
                  (prove > 0 ? ` · ${t.prove(prove)}` : ''),
              ),
            ),
            Math.abs(scostamento) >= 0.05
              ? pastiglia(
                  scostamento > 0
                    ? t.minutiInPiu(minutiDiAttivita(scostamento, minutiUd))
                    : t.minutiInMeno(minutiDiAttivita(-scostamento, minutiUd)),
                  scostamento > 0 ? 'attenzione' : 'quiete',
                )
              : pastiglia(t.inOrario, 'positivo'),
          )
        }),
        h(
          'div',
          { class: 'elenco-scelta__piede' },
          // Nessuno va bene: se ne fa uno, già di questo corso e di questa lezione.
          pulsante({
            testo: t.nuovoPerLaLezione,
            variante: 'sottile',
            simbolo: 'piu',
            al: () => creaEAssegna(contesto),
          }),
          lezione.pianoId
            ? pulsante({
                testo: t.togliAssegnato,
                variante: 'sottile',
                simbolo: 'chiudi',
                al: async () => {
                  const risposta = await azione({
                    tipo: 'piano.assegna',
                    lezioneId: lezione.id,
                    pianoId: null,
                  })
                  if (!risposta.ok) return
                  contesto.chiudi()
                  notifica(t.rimosso, 'info')
                },
              })
            : null,
        ),
      )
    },
  })
}
