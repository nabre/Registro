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
import { parole } from '../../domain/words.testi.js'

import { baseViva, salva, tastoElimina, testo } from './common.js'
import { testi } from './subject.testi.js'

/**
 * Unisce due materie in una (un refuso, un import ripetuto). Corsi e piani
 * passano alla materia che resta; due corsi della stessa classe che diventano
 * uguali si fondono, lezioni comprese.
 */
export function moduloUnisciMaterie (da: Materia): void {
  const t = testi()
  const altre = stato.registro.materie.filter((m) => m.id !== da.id)
  if (altre.length === 0) {
    notifica(t.serveUnAltra, 'avviso')
    return
  }

  // Quali corsi usano questa materia lo sa `domain/courses.ts`.
  const coinvolti = corsiDellaMateria(stato.registro, da.id)
  const corsiCoinvolti = coinvolti.length
  const idCoinvolti = new Set(coinvolti.map((c) => c.id))
  const pianiCoinvolti = stato.registro.piani.filter(
    (p) => p.corsoId && idCoinvolti.has(p.corsoId),
  ).length

  apriModale({
    titolo: t.titoloUnisci(da.nome),
    larghezza: 'stretta',
    testoSalva: t.unisci,
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        h(
          'p',
          { class: 'testo-quieto' },
          t.passano(corsiCoinvolti, pianiCoinvolti, da.nome),
        ),
        campo({
          nome: 'aId',
          etichetta: t.materiaCheResta,
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
        titolo: t.unire(da.nome, a?.nome ?? ''),
        testo: t.nienteSiPerde,
        testoConferma: t.unisci,
      })
      if (!sicuro) return
      await salva(
        contesto,
        { tipo: 'materia.unisci', daId: da.id, aId },
        t.unita(da.nome, a?.nome ?? ''),
      )
    },
  })
}

/**
 * Una materia del registro (nome, sigla, colore): su di lei poggiano corsi e
 * piani, e due grafie dello stesso nome farebbero due corsi. Se succede,
 * «unisci» le rimette insieme.
 */
export function moduloMateria (materia?: Materia, dopo?: (materiaId: string) => void): void {
  const t = testi()
  const modifica = Boolean(materia)
  const base = materia ?? creaMateria('')

  // Il refuso non si vieta («Storia» e «Storia dell'arte» sono materie vere), ma
  // si fa vedere prima di salvare.
  const avvertenza = h('small', { class: 'campo__aiuto campo__aiuto--attenzione' })
  const controllaNome = (nome: string) => {
    const simili = materieSimili(nome, stato.registro.materie, base.id)
    rimpiazza(
      avvertenza,
      simili.length > 0
        ? t.assomiglia(simili.map((m) => m.nome))
        : null,
    )
  }

  apriModale({
    titolo: modifica ? t.titoloMateria(base.nome) : t.nuova,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'nome',
          etichetta: t.nome,
          valore: base.nome,
          segnaposto: t.segnapostoNome,
          richiesto: true,
          al: (valore) => controllaNome(valore),
        }),
        avvertenza,
        riga(
          campo({
            nome: 'sigla',
            etichetta: t.sigla,
            valore: base.sigla ?? '',
            segnaposto: 'MAT',
            larghezza: 'meta',
          }),
          campo({
            nome: 'colore',
            etichetta: parole().colore,
            tipo: 'color',
            valore: base.colore || '#7a7a7a',
            larghezza: 'meta',
          }),
        ),
        campo({
          nome: 'note',
          etichetta: parole().note,
          tipo: 'textarea',
          righe: 2,
          valore: base.note ?? '',
        }),
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
        modifica ? t.aggiornata : t.creata,
        (idCreato) => dopo?.(idCreato ?? aggiornata.id),
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            chiedi: { genere: 'materia', id: base.id },
            azione: { tipo: 'materia.elimina', materiaId: base.id },
            fatto: t.eliminata,
          })
        : null,
  })
}

