// Le materie: crearle, rinominarle, e rimettere insieme quelle nate due volte
// dallo stesso nome scritto in due modi.

import { corsiDellaMateria } from '../../domain/courses.js'
import { creaMateria } from '../../domain/factories.js'
import type { Materia } from '../../domain/models.js'
import { materieSimili, validaMateria } from '../../domain/validation.js'
import { campo, riga } from '../components/base.js'
import { apriModale, conferma } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h, rimpiazza } from '../dom.js'
import { stato } from '../state.js'

import { baseViva, salva, tastoElimina, testo } from './common.js'

/**
 * Unisce due materie in una. Serve quando la stessa materia è finita nel
 * registro due volte — un refuso, un import ripetuto — e i corsi si sono
 * divisi fra le due. Non si perde niente: corsi e piani passano alla materia
 * che resta, e se così due corsi della stessa classe diventassero uguali, si
 * fondono anche loro e le lezioni seguono.
 */
export function moduloUnisciMaterie (da: Materia): void {
  const altre = stato.registro.materie.filter((m) => m.id !== da.id)
  if (altre.length === 0) {
    notifica('Serve almeno un’altra materia con cui unirla.', 'avviso')
    return
  }

  // La regola «quali corsi usano questa materia» la sa `domain/courses.ts`, e
  // qui era riscritta a mano — due volte, con lo stesso filtro ripetuto. La
  // funzione del dominio esisteva gia' e non la chiamava nessuno: una regola
  // scritta due volte e una regola morta sono la stessa cosa vista da due lati.
  const coinvolti = corsiDellaMateria(stato.registro, da.id)
  const corsiCoinvolti = coinvolti.length
  const idCoinvolti = new Set(coinvolti.map((c) => c.id))
  const pianiCoinvolti = stato.registro.piani.filter(
    (p) => p.corsoId && idCoinvolti.has(p.corsoId),
  ).length

  apriModale({
    titolo: `Unisci «${da.nome}»`,
    larghezza: 'stretta',
    testoSalva: 'Unisci',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        h(
          'p',
          { class: 'testo-quieto' },
          `${corsiCoinvolti} cors${corsiCoinvolti === 1 ? 'o' : 'i'} e ` +
            `${pianiCoinvolti} pian${pianiCoinvolti === 1 ? 'o' : 'i'} passano alla materia scelta. ` +
            `«${da.nome}» sparisce.`,
        ),
        campo({
          nome: 'aId',
          etichetta: 'Materia che resta',
          tipo: 'select',
          valore: altre[0].id,
          opzioni: altre.map((m) => ({ valore: m.id, testo: m.nome })),
          richiesto: true,
        }),
      ),
    alSalva: async (valori, contesto) => {
      const aId = testo(valori.aId)
      const a = stato.registro.materie.find((m) => m.id === aId)
      const sicuro = await conferma({
        titolo: `Unire «${da.nome}» a «${a?.nome ?? ''}»?`,
        testo: 'Non si torna indietro, ma nessun dato va perso: cambia solo a quale materia stanno attaccati.',
        testoConferma: 'Unisci',
      })
      if (!sicuro) return
      await salva(
        contesto,
        { tipo: 'materia.unisci', daId: da.id, aId },
        `«${da.nome}» unita a «${a?.nome ?? ''}».`,
      )
    },
  })
}

/**
 * Una materia del registro. È poca roba — nome, sigla, colore — ma è l'entità
 * su cui poggiano i corsi e i piani: due grafie diverse dello stesso nome
 * creerebbero due corsi, ed è la ragione per cui non è più testo libero sulla
 * classe. Se succede lo stesso, «unisci» le rimette insieme.
 */
export function moduloMateria (materia?: Materia, dopo?: (materiaId: string) => void): void {
  const modifica = Boolean(materia)
  const base = materia ?? creaMateria('')

  // Il refuso non si può vietare — 'Storia' e 'Storia dell'arte' sono due
  // materie vere — ma si può far vedere prima di salvare, che è il momento in
  // cui costa ancora niente rimediare.
  const avvertenza = h('small', { class: 'campo__aiuto campo__aiuto--attenzione' })
  const controllaNome = (nome: string) => {
    const simili = materieSimili(nome, stato.registro.materie, base.id)
    rimpiazza(
      avvertenza,
      simili.length > 0
        ? `Assomiglia a ${simili.map((m) => `«${m.nome}»`).join(', ')}: è la stessa materia scritta due volte?`
        : null,
    )
  }

  apriModale({
    titolo: modifica ? `Materia ${base.nome}` : 'Nuova materia',
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'nome',
          etichetta: 'Nome',
          valore: base.nome,
          segnaposto: 'Matematica',
          richiesto: true,
          al: (valore) => controllaNome(valore),
        }),
        avvertenza,
        riga(
          campo({
            nome: 'sigla',
            etichetta: 'Sigla',
            valore: base.sigla ?? '',
            segnaposto: 'MAT',
            larghezza: 'meta',
          }),
          campo({
            nome: 'colore',
            etichetta: 'Colore',
            tipo: 'color',
            valore: base.colore || '#7a7a7a',
            larghezza: 'meta',
          }),
        ),
        campo({ nome: 'note', etichetta: 'Note', tipo: 'textarea', righe: 2, valore: base.note ?? '' }),
      ),
    alSalva: async (valori, contesto) => {
      const viva = baseViva(
        contesto,
        modifica,
        base,
        stato.registro.materie.find((m) => m.id === base.id),
      )
      if (!viva) return
      const aggiornata: Materia = {
        ...viva,
        nome: testo(valori.nome),
        sigla: testo(valori.sigla),
        colore: testo(valori.colore),
        note: testo(valori.note),
      }
      const esito = validaMateria(aggiornata, stato.registro.materie)
      if (!esito.valido) {
        contesto.mostraErrori(esito.errori)
        return
      }
      await salva(
        contesto,
        { tipo: 'materia.salva', materia: aggiornata },
        modifica ? 'Materia aggiornata.' : 'Materia creata.',
        (idCreato) => dopo?.(idCreato ?? aggiornata.id),
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            chiedi: { genere: 'materia', id: base.id },
            azione: { tipo: 'materia.elimina', materiaId: base.id },
            fatto: 'Materia eliminata.',
          })
        : null,
  })
}

