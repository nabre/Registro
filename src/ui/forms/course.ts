// Il corso — una materia a una classe — con le sue ore fisse, e l'avvio guidato
// che li mette insieme la prima volta.
//
// L'orario sta qui e non a parte perché è la ragione per cui un corso esiste:
// senza le ore in cui lo si fa, il corso è una riga che non produce niente.

import { oggi } from '../../domain/dates.js'
import type { Corso } from '../../domain/models.js'
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
import { titoloCorso } from '../../domain/courses.js'

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
import { moduloAvvio } from './startup.js'
import { editorRicorrenze } from './timetable.js'
import { moduloMateria } from './subject.js'

/**
 * L’editor delle ricorrenze: le ore fisse di un corso in settimana.
 *
 * Come per gli slot, le righe si costruiscono una volta sola e restano: si
 * ridisegnava a ogni tasto, e chi scriveva l’orario di sei fasce perdeva il
 * campo sotto le dita a ogni cifra.
 *
 * La giornata è un seguito, non un elenco di ore sparse: la seconda fascia del
 * mercoledì comincia quando finisce la prima, e per questo di ogni giorno si
 * dichiara una sola ora — quella con cui si entra. Le altre le eredita il
 * registro e il campo resta spento, perché ribatterle a mano è soltanto il
 * modo di farle scivolare di cinque minuti senza accorgersene. Quel che si
 * decide è l’ordine dentro la giornata, e lo si decide trascinando la riga per
 * la presa; trascinata su un altro giorno, la fascia si sposta lì.
 */


/**
 * Un corso: questa materia, a questa classe — e le ore in cui la si fa.
 *
 * È l'unico posto in cui un corso nasce, cambia nome, prende un orario e ne fa
 * lezioni vere. Sta tutto in una finestra perché è un gesto solo: si dice che
 * cosa si insegna a chi, si dichiara quando, e le ore vanno sul calendario.
 * Classe e materia si creano da qui: chi apre questo modulo sta preparando
 * l'anno, e mandarlo in altre due viste a cercare i pezzi è il modo migliore
 * per fargli perdere il filo.
 *
 * Su un corso che c'è già, classe e materia non si toccano più: cambiarle
 * porterebbe lezioni, presenze e voti addosso a un'altra classe senza che
 * nessuno se ne accorga. Si toglie il corso e se ne fa un altro, che è quel che
 * si intendeva davvero.
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
  const anno = richiedeAnno(moduloAvvio)
  if (!anno) return

  const corso = opzioni.corso ?? null
  const modifica = Boolean(corso)
  let orario = (corso?.orario ?? []).map((r) => ({ ...r }))
  let classeScelta = corso?.classeId ?? opzioni.classeId ?? stato.filtroClasseId ?? ''
  let materiaScelta = corso?.materiaId ?? opzioni.materiaId ?? ''

  // La generazione parte da oggi se l'anno è già cominciato: rimettere sul
  // calendario le ore di settembre a marzo non serve a nessuno.
  const dalPredefinito = oggi() > anno.inizio ? oggi() : anno.inizio

  // Il titolo si scrive da solo — 'Matematica — I MEC A' è come lo si chiama
  // parlando — finché non lo si tocca a mano: da lì in poi comanda chi scrive.
  let campoTitolo: HTMLInputElement | null = null
  const proponiTitolo = () => {
    if (!campoTitolo || campoTitolo.dataset.tocco === 'si') return
    campoTitolo.value =
      classeScelta && materiaScelta
        ? titoloCorso(classePerId(classeScelta), materiaPerId(materiaScelta))
        : ''
  }

  const corpoModulo = h(
    'div',
    { class: 'modulo' },
    riga(
      modifica
        ? campo({
            nome: 'classeFissa',
            etichetta: 'Classe',
            valore: classePerId(classeScelta)?.nome ?? 'classe sparita',
            disabilitato: true,
            larghezza: 'meta',
            aiuto: 'Non si cambia: lezioni e voti sono di questa classe.',
          })
        : campoCollegato({
            nome: 'classeId',
            etichetta: 'Classe',
            valore: classeScelta,
            vuoto: '— scegli la classe —',
            voci: () => classiVisibili().map((c) => ({ valore: c.id, testo: c.nome })),
            titoloNuovo: 'Nuova classe',
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
            etichetta: 'Materia',
            valore: materiaPerId(materiaScelta)?.nome ?? 'materia sparita',
            disabilitato: true,
            larghezza: 'meta',
            aiuto: 'Non si cambia: i piani lezione seguono la materia.',
          })
        : campoCollegato({
            nome: 'materiaId',
            etichetta: 'Materia',
            valore: materiaScelta,
            vuoto: '— scegli la materia —',
            voci: () => opzioniMaterie(),
            titoloNuovo: 'Nuova materia',
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
      etichetta: 'Come si chiama',
      valore: corso?.titolo ?? '',
      segnaposto: 'Matematica — I MEC A',
      aiuto: 'Lasciandolo stare si scrive da solo con la materia e la classe.',
      al: (_valore, evento) => {
        ;(evento.target as HTMLInputElement).dataset.tocco = 'si'
      },
    }),
    sezioneModulo(
      'Ore fisse in settimana',
      editorRicorrenze(orario, (nuove) => {
        orario = nuove
      }),
    ),
    sezioneModulo(
      'Lezioni sul calendario',
      h(
        'p',
        { class: 'testo-quieto' },
        'Mette sul calendario le ore che mancano, saltando le sospensioni dell’anno. ' +
          'Quel che c’è già non viene toccato, quindi si può rilanciare a ogni cambio d’orario.',
      ),
      riga(
        campo({ nome: 'dal', etichetta: 'Dal', tipo: 'date', valore: dalPredefinito, larghezza: 'meta' }),
        campo({ nome: 'al', etichetta: 'Al', tipo: 'date', valore: anno.fine, larghezza: 'meta' }),
      ),
      modifica
        ? pulsante({
            testo: 'Genera le lezioni',
            simbolo: 'calendario',
            variante: 'sottile',
            al: async (evento: MouseEvent) => {
              const modulo = (evento.target as HTMLElement).closest<HTMLElement>('.modulo')
              const dal = (modulo && campoDi(modulo, 'dal')?.value) ?? ''
              const al = (modulo && campoDi(modulo, 'al')?.value) ?? ''
              // L'orario appena scritto vale solo se salvato prima: generare da
              // uno stampo che sta ancora nel modulo darebbe lezioni che non
              // corrispondono a niente. A differenza di `applicaOrario`, qui va
              // salvato anche un orario svuotato: il corso ne aveva già uno, e
              // «Genera» deve rispecchiare quello che l'editor mostra adesso.
              const salvato = await azione({ tipo: 'orario.imposta', corsoId: corso!.id, orario })
              if (!salvato.ok) return
              // Quante ne sono nate, quante c'erano gia', quante vanno addosso
              // a un'altra classe: lo dice l'host, ed e' molto piu' di
              // «Lezioni generate». Qui non si ripete niente.
              await azione({ tipo: 'orario.genera', corsoId: corso!.id, dal, al })
            },
          })
        : campo({
            nome: 'genera',
            tipo: 'checkbox',
            etichetta: 'Genera le lezioni appena creato il corso',
            valore: true,
          }),
    ),
    campo({ nome: 'note', etichetta: 'Note', tipo: 'textarea', righe: 2, valore: corso?.note ?? '' }),
  )

  campoTitolo = campoDi(corpoModulo, 'titolo')
  if (!modifica) proponiTitolo()

  apriModale({
    titolo: modifica ? `Corso — ${corso!.titolo}` : 'Nuovo corso',
    sottotitolo: 'una materia a una classe: il perno a cui si agganciano lezioni e valutazioni',
    larghezza: 'media',
    testoSalva: modifica ? 'Salva' : 'Crea il corso',
    corpo: () => corpoModulo,
    alSalva: async (valori, contesto) => {
      if (modifica) {
        // Com'è adesso: le lezioni generate nel frattempo non stanno qui, ma
        // un corso tolto altrove non deve rinascere al Salva.
        const vivo = baseViva(
          contesto,
          modifica,
          corso!,
          corsoPerId(corso!.id),
          'Non c’è più: è stato tolto altrove.',
        )
        if (!vivo) return
        await salva(
          contesto,
          {
            tipo: 'corso.salva',
            corso: {
              ...vivo,
              titolo: testo(valori.titolo) || vivo.titolo,
              note: testo(valori.note),
              orario,
            },
          },
          'Corso aggiornato.',
          () => opzioni.dopo?.(corso!.id),
        )
        return
      }

      const classeId = testo(valori.classeId)
      const materiaId = testo(valori.materiaId)
      if (!classeId || !materiaId) {
        contesto.mostraErrori(['Servono una classe e una materia: il corso è la loro coppia.'])
        return
      }

      // Tre azioni in fila invece di una sola: ognuna è valida per conto suo, e
      // se una non passa quel che è già stato fatto resta buono — un corso
      // senza orario è un corso, e l'orario si rimette da qui.
      contesto.occupato(true)
      const creato = await invia({
        tipo: 'corso.crea',
        classeId,
        materiaId,
        titolo: testo(valori.titolo),
      })
      if (!creato.ok || !creato.creato) {
        contesto.occupato(false)
        contesto.mostraErrori(creato.errori ?? ['Corso non creato.'])
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
      // «Con le sue ore» solo se le ore sono state davvero messe. Senza la
      // spunta si salva l'orario ricorrente e basta: il calendario resta
      // vuoto, e annunciarlo pieno manda a cercare delle lezioni che non ci
      // sono.
      notifica(
        orario.length === 0
          ? 'Corso creato.'
          : !esitoOrario.ok
              ? 'Corso creato, ma l’orario non si è salvato: riprova dal corso.'
              : valori.genera
                ? 'Corso creato, con le sue ore sul calendario.'
                : 'Corso creato con il suo orario. Le ore si mettono sul calendario ' +
                'dal corso, con «Lezioni sul calendario».',
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
            fatto: 'Corso tolto.',
            poi: () => aggiorna({ corsoId: null }),
          })
        : null,
  })
}


/**
 * Il campo «Corso» con dentro il tasto per crearne uno.
 *
 * Sta qui e non in `common.ts` perche' apre `moduloCorso`, che e' in questo
 * file: di la' l'import chiudeva un cerchio —
 * `comune -> corso -> comune` — e con lui tre dei quattro cicli di
 * `moduli/`. L'aiuto generico, `campoCollegato`, resta in fondo alla pila
 * dov'era; qui ci sta il campo che sa quale finestra aprire.
 */
export function campoCorso (opzioni: {
  valore: string
  vuoto?: string
  richiesto?: boolean
  aiuto?: string
  larghezza?: OpzioniCampo['larghezza']
  al?: (valore: string) => void
  riferimento?: (rinfresca: (scelto?: string) => void) => void
}): HTMLElement {
  return campoCollegato({
    nome: 'corsoId',
    etichetta: 'Corso',
    valore: opzioni.valore,
    vuoto: opzioni.vuoto ?? '— scegli il corso —',
    voci: () => opzioniCorsi(),
    titoloNuovo: 'Nuovo corso: una materia a una classe',
    apriNuovo: (fatto) => moduloCorso({ dopo: fatto }),
    richiesto: opzioni.richiesto,
    aiuto: opzioni.aiuto,
    larghezza: opzioni.larghezza ?? 'meta',
    al: opzioni.al,
    riferimento: opzioni.riferimento,
  })
}
