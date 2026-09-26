// Il corso (una materia a una classe) con le sue ore fisse: senza orario un
// corso non produce lezioni.

import { oggi } from '../../domain/dates.js'
import { Uno } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import type { Corso } from '../../domain/models.js'
import { parole } from '../../domain/words.testi.js'
import { campo, pulsante, riga, sezioneModulo, type OpzioniCampo } from '../components/base.js'
import { apriModale } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h } from '../dom.js'
import { azione, invia } from '../bridge.js'
import {
  aggiorna,
  classePerId,
  classiVisibili,
  corsoPerId,
  materiaPerId,
  stato,
} from '../state.js'
import { coloreDelCorso, titoloCorso } from '../../domain/courses.js'

import { moduloClasse } from './class.js'
import {
  applicaOrario,
  baseViva,
  campoCollegato,
  campoDi,
  opzioniCorsi,
  opzioniMaterie,
  richiedeAnno,
  salva,
  tastoElimina,
  testo,
} from './common.js'
import { moduloAnno } from './year.js'
import { editorRicorrenze } from './timetable.js'
import { moduloMateria } from './subject.js'
import { testi } from './course.testi.js'

/**
 * Un corso: questa materia a questa classe, e le ore in cui la si fa. È l'unico
 * posto in cui un corso nasce, prende un orario e ne fa lezioni; classe e
 * materia si creano da qui. Su un corso esistente classe e materia non si
 * toccano: porterebbero lezioni e voti addosso a un'altra classe.
 */
export interface OpzioniModuloCorso {
  corso?: Corso
  /** La classe da proporre a un corso nuovo. */
  classeId?: string
  /** La materia da proporre a un corso nuovo. */
  materiaId?: string
  dopo?: (corsoId: string) => void
}

export function moduloCorso (opzioni: OpzioniModuloCorso = {}): void {
  const anno = richiedeAnno(() => moduloAnno())
  if (!anno) return

  const t = testi()
  const L = lessico()
  const corso = opzioni.corso ?? null
  const modifica = Boolean(corso)
  let orario = (corso?.orario ?? []).map((r) => ({ ...r }))
  let classeScelta = corso?.classeId ?? opzioni.classeId ?? stato.filtroClasseId ?? ''
  let materiaScelta = corso?.materiaId ?? opzioni.materiaId ?? ''

  // La generazione parte da oggi se l'anno è già cominciato.
  const dalPredefinito = oggi() > anno.inizio ? oggi() : anno.inizio

  // Il titolo si scrive da solo («Matematica — I MEC A») finché non lo si tocca.
  let campoTitolo: HTMLInputElement | null = null
  const proponiTitolo = () => {
    if (!campoTitolo || campoTitolo.dataset.tocco === 'si') return
    campoTitolo.value =
      classeScelta && materiaScelta
        ? titoloCorso(classePerId(classeScelta), materiaPerId(materiaScelta))
        : ''
  }

  // Il colore della regola (media fra classe e materia), mostrato accanto alla spunta.
  const coloreDiRegola = corso
    ? coloreDelCorso({}, classePerId(corso.classeId), materiaPerId(corso.materiaId))
    : null

  const corpoModulo = h(
    'div',
    { class: 'modulo' },
    riga(
      modifica
        ? campo({
            nome: 'classeFissa',
            etichetta: Uno(L.classe),
            valore: classePerId(classeScelta)?.nome ?? t.classeSparita,
            disabilitato: true,
            larghezza: 'meta',
            aiuto: t.classeFissa,
          })
        : campoCollegato({
            nome: 'classeId',
            etichetta: Uno(L.classe),
            valore: classeScelta,
            vuoto: t.scegliClasse,
            voci: () => classiVisibili().map((c) => ({ valore: c.id, testo: c.nome })),
            titoloNuovo: t.nuovaClasse,
            apriNuovo: (fatto) => moduloClasse(undefined, fatto),
            richiesto: true,
            larghezza: 'meta',
            al: (valore) => {
              classeScelta = valore
              proponiTitolo()
            },
          }),
      modifica
        ? campo({
            nome: 'materiaFissa',
            etichetta: Uno(L.materia),
            valore: materiaPerId(materiaScelta)?.nome ?? t.materiaSparita,
            disabilitato: true,
            larghezza: 'meta',
            aiuto: t.materiaFissa,
          })
        : campoCollegato({
            nome: 'materiaId',
            etichetta: Uno(L.materia),
            valore: materiaScelta,
            vuoto: t.scegliMateria,
            voci: () => opzioniMaterie(),
            titoloNuovo: t.nuovaMateria,
            apriNuovo: (fatto) => moduloMateria(undefined, fatto),
            richiesto: true,
            larghezza: 'meta',
            al: (valore) => {
              materiaScelta = valore
              proponiTitolo()
            },
          }),
    ),
    campo({
      nome: 'titolo',
      etichetta: t.comeSiChiama,
      valore: corso?.titolo ?? '',
      segnaposto: t.segnapostoTitolo,
      aiuto: t.aiutoTitolo,
      al: (_valore, evento) => {
        ;(evento.target as HTMLInputElement).dataset.tocco = 'si'
      },
    }),
    // Il colore delle sue ore: senza sceglierlo è la media fra classe e materia
    // (`coloreDelCorso`).
    coloreDiRegola
      ? riga(
          campo({
            nome: 'coloreProprio',
            tipo: 'checkbox',
            etichetta: t.coloreSuo,
            valore: Boolean(corso?.colore),
            aiuto: t.aiutoColore(coloreDiRegola),
            larghezza: 'meta',
          }),
          campo({
            nome: 'colore',
            etichetta: parole().colore,
            tipo: 'color',
            valore: corso?.colore ?? coloreDiRegola,
            larghezza: 'meta',
          }),
        )
      : null,
    sezioneModulo(
      t.oreFisse,
      editorRicorrenze(orario, (nuove) => {
        orario = nuove
      }),
    ),
    sezioneModulo(
      { testo: t.lezioniSulCalendario, aiuto: t.aiutoLezioni },
      riga(
        campo({
          nome: 'dal',
          etichetta: parole().dal,
          tipo: 'date',
          valore: dalPredefinito,
          larghezza: 'meta',
        }),
        campo({ nome: 'al', etichetta: parole().al, tipo: 'date', valore: anno.fine, larghezza: 'meta' }),
      ),
      modifica
        ? pulsante({
            testo: t.generaLezioni,
            simbolo: 'calendario',
            variante: 'sottile',
            al: async (evento: MouseEvent) => {
              const modulo = (evento.target as HTMLElement).closest<HTMLElement>('.modulo')
              const dal = (modulo && campoDi(modulo, 'dal')?.value) ?? ''
              const al = (modulo && campoDi(modulo, 'al')?.value) ?? ''
              // L'orario scritto si salva prima di generare, anche se svuotato: «Genera»
              // deve rispecchiare quel che l'editor mostra.
              const salvato = await azione({ tipo: 'orario.imposta', corsoId: corso!.id, orario })
              if (!salvato.ok) return
              // Quante sono nate, quante c'erano, quante cadono su un'altra classe lo dice l'host.
              await azione({ tipo: 'orario.genera', corsoId: corso!.id, dal, al })
            },
          })
        : campo({
            nome: 'genera',
            tipo: 'checkbox',
            etichetta: t.generaAppenaCreato,
            valore: true,
          }),
    ),
    campo({
      nome: 'note',
      etichetta: parole().note,
      tipo: 'textarea',
      righe: 2,
      valore: corso?.note ?? '',
    }),
  )

  campoTitolo = campoDi(corpoModulo, 'titolo')
  if (!modifica) proponiTitolo()

  apriModale({
    titolo: modifica ? t.titoloCorso(corso!.titolo) : t.nuovoCorso,
    sottotitolo: t.sottotitolo,
    larghezza: 'media',
    testoSalva: modifica ? parole().salva : t.creaIlCorso,
    corpo: () => corpoModulo,
    alSalva: async (valori, contesto) => {
      if (modifica) {
        // Com'è adesso: un corso tolto altrove non deve rinascere al Salva.
        const vivo = baseViva(
          contesto,
          modifica,
          corso!,
          corsoPerId(corso!.id),
          t.toltoAltrove,
        )
        if (!vivo) return
        // Senza la spunta il colore suo se ne va, e torna quello della regola.
        const { colore: _prima, ...senzaColore } = vivo
        await salva(
          contesto,
          {
            tipo: 'corso.salva',
            corso: {
              ...senzaColore,
              titolo: testo(valori.titolo) || vivo.titolo,
              note: testo(valori.note),
              orario,
              ...(valori.coloreProprio ? { colore: testo(valori.colore) } : {}),
            },
          },
          t.aggiornato,
          () => opzioni.dopo?.(corso!.id),
        )
        return
      }

      const classeId = testo(valori.classeId)
      const materiaId = testo(valori.materiaId)
      if (!classeId || !materiaId) {
        contesto.mostraErrori([t.servonoClasseMateria])
        return
      }

      // Tre azioni in fila: se una non passa, quel che è fatto resta buono (un corso
      // senza orario è un corso).
      contesto.occupato(true)
      const creato = await invia({
        tipo: 'corso.crea',
        classeId,
        materiaId,
        titolo: testo(valori.titolo),
      })
      if (!creato.ok || !creato.creato) {
        contesto.occupato(false)
        contesto.mostraErrori(creato.errori ?? [t.nonCreato])
        return
      }
      const corsoId = creato.creato.id
      const esitoOrario = await applicaOrario(
        corsoId,
        orario,
        Boolean(valori.genera),
        testo(valori.dal),
        testo(valori.al),
      )
      contesto.occupato(false)
      contesto.chiudi()
      // «Con le sue ore» solo se le ore sono state messe davvero.
      notifica(
        orario.length === 0
          ? t.creato
          : !esitoOrario.ok
              ? t.orarioNonSalvato
              : valori.genera
                ? t.creatoConOre
                : t.creatoConOrario(t.lezioniSulCalendario),
        esitoOrario.ok ? 'successo' : 'avviso',
      )
      if (opzioni.dopo) opzioni.dopo(corsoId)
      else aggiorna({ vista: 'corsi', corsoId })
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            chiedi: { genere: 'corso', id: corso!.id },
            azione: { tipo: 'corso.elimina', corsoId: corso!.id },
            fatto: t.tolto,
            poi: () => aggiorna({ corsoId: null }),
          })
        : null,
  })
}


/**
 * Il campo «Corso» col tasto per crearne uno. Sta qui e non in `common.ts`
 * perché apre `moduloCorso`: di là sarebbe un ciclo di import.
 */
export function campoCorso (opzioni: {
  valore: string
  vuoto?: string
  richiesto?: boolean
  disabilitato?: boolean
  aiuto?: string
  larghezza?: OpzioniCampo['larghezza']
  al?: (valore: string) => void
  riferimento?: (rinfresca: (scelto?: string) => void) => void
}): HTMLElement {
  const t = testi()
  return campoCollegato({
    nome: 'corsoId',
    etichetta: Uno(lessico().corso),
    valore: opzioni.valore,
    vuoto: opzioni.vuoto ?? t.scegliCorso,
    voci: () => opzioniCorsi(),
    titoloNuovo: t.nuovoCorsoPerClasse,
    apriNuovo: (fatto) => moduloCorso({ dopo: fatto }),
    richiesto: opzioni.richiesto,
    disabilitato: opzioni.disabilitato,
    aiuto: opzioni.aiuto,
    larghezza: opzioni.larghezza ?? 'meta',
    al: opzioni.al,
    riferimento: opzioni.riferimento,
  })
}
