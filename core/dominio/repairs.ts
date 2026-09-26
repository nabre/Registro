// Le rotture che il registro sa aggiustare da solo.
//
// `riferimentiRotti` dice che cosa non torna; qui c'è anche il rimedio. Si
// propone solo quel che non perde niente (staccare un collegamento appeso,
// ricreare una materia tolta a mano, togliere quel che nessuna pagina mostra).
// Quel che richiede una scelta resta un avviso. Ogni riparazione si spiega
// prima di essere applicata.

import { titoloCorso } from './courses.js'
import type { Classe, Collezione, Materia, Registro } from './models.js'
import { etichettaInContraddizione, etichettaProposta } from './phones.js'
import { confrontaNomi } from './text.js'
import { testi } from './repairs.testi.js'

interface Riparazione {
  /** Che cosa succede, detto al docente prima di farlo. */
  descrizione: string
  /** I file che la correzione tocca. */
  collezioni: Collezione[]
  /** Applica la correzione allo stato vivo. Dev'essere ripetibile senza danni. */
  applica: (registro: Registro) => void
}

/**
 * Il nome con cui ricreare una materia sparita, dal titolo del corso. Si
 * toglie il nome della classe invece di prendere una metà per posizione,
 * perché un titolo può essere 'Classe — Materia' o 'Materia — Classe'.
 */
function nomeDalTitolo (titolo: string, nomeClasse: string | null): string {
  const parti = titolo.split('—').map((pezzo) => pezzo.trim()).filter(Boolean)
  if (parti.length === 0) return testi().materiaRecuperata
  if (nomeClasse) {
    const resto = parti.filter((pezzo) => pezzo !== nomeClasse)
    if (resto.length > 0) return resto.join(' — ')
  }
  // Senza classe: l'ultima parte, dove la materia sta nel titolo di serie.
  return parti[parti.length - 1]
}

export function riparazioni (registro: Registro): Riparazione[] {
  const t = testi()
  const esito: Riparazione[] = []
  const classi = new Map<string, Classe>(registro.classi.map((c) => [c.id, c]))
  const materie = new Set(registro.materie.map((m) => m.id))
  const corsi = new Map(registro.corsi.map((c) => [c.id, c]))
  const piani = new Set(registro.piani.map((p) => p.id))
  const lezioni = new Map(registro.lezioni.map((l) => [l.id, l]))

  // ------------------------------------------------- nomi di numeri al contrario
  // Numeri entrati senza etichetta hanno preso quella di serie («cellulare»
  // per una persona, «centralino» per un'azienda), anche i fissi di casa. Si
  // propone e non si corregge da sé: l'etichetta può essere voluta.
  const storti = registro.classi.flatMap((classe) =>
    classe.allievi.flatMap((allievo) =>
      (allievo.telefoni ?? []).filter(etichettaInContraddizione),
    ),
  )

  if (storti.length > 0) {
    esito.push({
      descrizione: t.numeriStorti(storti.length),
      collezioni: ['classi'],
      applica: (r) => {
        for (const classe of r.classi) {
          for (const allievo of classe.allievi) {
            for (const telefono of allievo.telefoni ?? []) {
              if (!etichettaInContraddizione(telefono)) continue
              telefono.etichetta = etichettaProposta(telefono.contatto, telefono.numero)
            }
          }
        }
      },
    })
  }

  // ---------------------------------------------------------- materie sparite
  // Una materia per identificatore perduto: i corsi che la condividevano
  // devono ritrovarsi sulla stessa.
  const perdute = new Map<string, string>()
  for (const corso of registro.corsi) {
    if (materie.has(corso.materiaId)) continue
    if (!perdute.has(corso.materiaId)) {
      perdute.set(
        corso.materiaId,
        nomeDalTitolo(corso.titolo, classi.get(corso.classeId)?.nome ?? null),
      )
    }
  }

  for (const [id, nome] of perdute) {
    const quantiCorsi = registro.corsi.filter((c) => c.materiaId === id).length
    esito.push({
      descrizione: t.materiaSparita(nome, quantiCorsi),
      collezioni: ['registro'],
      applica: (r) => {
        if (r.materie.some((m) => m.id === id)) return
        const materia: Materia = { id, nome, sigla: '', colore: '', note: '' }
        r.materie.push(materia)
        r.materie.sort((a, b) => confrontaNomi(a.nome, b.nome))
      },
    })
  }

  // ---------------------------------------------------------- piani staccati
  // Un `pianoId` che non punta a niente si toglie; il piano si riassegna a mano.
  const lezioniSenzaPiano = registro.lezioni.filter(
    (l) => l.pianoId && !piani.has(l.pianoId),
  )
  if (lezioniSenzaPiano.length > 0) {
    const ids = new Set(lezioniSenzaPiano.map((l) => l.id))
    esito.push({
      descrizione: t.pianoStaccato(lezioniSenzaPiano.length),
      collezioni: ['lezioni'],
      applica: (r) => {
        for (const lezione of r.lezioni) {
          if (
            ids.has(lezione.id) &&
            lezione.pianoId &&
            !r.piani.some((p) => p.id === lezione.pianoId)
          ) {
            lezione.pianoId = null
          }
        }
      },
    })
  }

  // ------------------------------------------------- collegamenti dei momenti
  // Si toglie solo il rinvio rotto: voti, corso e data del momento restano.
  const momentiRotti = registro.valutazioni.filter((v) => {
    const pianoRotto = Boolean(v.pianoId && !piani.has(v.pianoId))
    const lezione = v.lezioneId ? lezioni.get(v.lezioneId) : null
    const lezioneRotta = Boolean(v.lezioneId && !lezione)
    const lezioneAltrove = Boolean(lezione && lezione.corsoId !== v.corsoId && corsi.has(v.corsoId))
    return pianoRotto || lezioneRotta || lezioneAltrove
  })
  if (momentiRotti.length > 0) {
    const ids = new Set(momentiRotti.map((v) => v.id))
    esito.push({
      descrizione: t.momentiRotti(momentiRotti.length),
      collezioni: ['valutazioni'],
      applica: (r) => {
        for (const momento of r.valutazioni) {
          if (!ids.has(momento.id)) continue
          if (momento.pianoId && !r.piani.some((p) => p.id === momento.pianoId)) {
            momento.pianoId = null
          }
          const lezione = momento.lezioneId
            ? r.lezioni.find((l) => l.id === momento.lezioneId) ?? null
            : null
          if (momento.lezioneId && !lezione) momento.lezioneId = null
          if (lezione && lezione.corsoId !== momento.corsoId) momento.lezioneId = null
        }
      },
    })
  }

  // ------------------------------------------------------ piani senza corso
  // Un piano che cita un corso sparito torna fra le bozze (corso `null`).
  const pianiOrfani = registro.piani.filter((p) => p.corsoId && !corsi.has(p.corsoId))
  if (pianiOrfani.length > 0) {
    const ids = new Set(pianiOrfani.map((p) => p.id))
    esito.push({
      descrizione: t.pianiOrfani(pianiOrfani.length),
      collezioni: ['piani'],
      applica: (r) => {
        const vivi = new Set(r.corsi.map((c) => c.id))
        for (const piano of r.piani) {
          if (ids.has(piano.id) && piano.corsoId && !vivi.has(piano.corsoId)) piano.corsoId = null
        }
      },
    })
  }

  // ------------------------------------------------ consegne senza lezione
  // Una consegna legata a un'ora sparita tiene la sua data, come quando
  // l'eliminazione la stacca. Vale per i file toccati a mano.
  const consegneAppese = registro.consegne.filter(
    (c) =>
      (c.dataLezioneId && !lezioni.has(c.dataLezioneId)) ||
      (c.scadenzaLezioneId && !lezioni.has(c.scadenzaLezioneId)),
  )
  if (consegneAppese.length > 0) {
    const ids = new Set(consegneAppese.map((c) => c.id))
    esito.push({
      descrizione: t.consegneAppese(consegneAppese.length),
      collezioni: ['consegne'],
      applica: (r) => {
        const vive = new Set(r.lezioni.map((l) => l.id))
        for (const consegna of r.consegne) {
          if (!ids.has(consegna.id)) continue
          if (consegna.dataLezioneId && !vive.has(consegna.dataLezioneId)) {
            consegna.dataLezioneId = null
          }
          if (consegna.scadenzaLezioneId && !vive.has(consegna.scadenzaLezioneId)) {
            consegna.scadenzaLezioneId = null
          }
        }
      },
    })
  }

  // ------------------------------------------------- spunte senza lezione
  // Come per le consegne: una spunta di un'ora sparita resta, con la sua data.
  const spunteAppese = registro.check.reduce(
    (somma, c) => somma + c.spunte.filter((s) => s.lezioneId && !lezioni.has(s.lezioneId)).length,
    0,
  )
  if (spunteAppese > 0) {
    esito.push({
      descrizione: t.spunteAppese(spunteAppese),
      collezioni: ['check'],
      applica: (r) => {
        const vive = new Set(r.lezioni.map((l) => l.id))
        for (const lista of r.check) {
          for (const spunta of lista.spunte) {
            if (spunta.lezioneId && !vive.has(spunta.lezioneId)) spunta.lezioneId = null
          }
        }
      },
    })
  }

  // ------------------------------------------------- check senza corso
  // Una lista di controllo senza corso non ha una pagina che la mostri: si
  // toglie, come avrebbe fatto l'eliminazione del corso.
  const checkOrfani = registro.check.filter((c) => !corsi.has(c.corsoId))
  if (checkOrfani.length > 0) {
    const ids = new Set(checkOrfani.map((c) => c.id))
    esito.push({
      descrizione: t.checkOrfani(checkOrfani.length),
      collezioni: ['check'],
      applica: (r) => {
        const vivi = new Set(r.corsi.map((c) => c.id))
        r.check = r.check.filter((c) => !ids.has(c.id) || vivi.has(c.corsoId))
      },
    })
  }

  // ---------------------------------------------- spunte di chi non è iscritto
  // Spunte di chi non è iscritto alla classe del corso: la griglia non ha una
  // riga per loro. Si tolgono, come avrebbe fatto l'eliminazione dell'allievo.
  const iscrittiDelCorso = (r: Registro, corsoId: string): Set<string> | null => {
    const corso = r.corsi.find((c) => c.id === corsoId)
    const classe = corso ? r.classi.find((c) => c.id === corso.classeId) : undefined
    return classe ? new Set(classe.allievi.map((a) => a.id)) : null
  }
  const spunteEstranee = registro.check.reduce((somma, lista) => {
    const iscritti = iscrittiDelCorso(registro, lista.corsoId)
    if (!iscritti) return somma
    return somma + lista.spunte.filter((s) => !iscritti.has(s.allievoId)).length
  }, 0)
  if (spunteEstranee > 0) {
    esito.push({
      descrizione: t.spunteEstranee(spunteEstranee),
      collezioni: ['check'],
      applica: (r) => {
        for (const lista of r.check) {
          const iscritti = iscrittiDelCorso(r, lista.corsoId)
          if (!iscritti) continue
          if (lista.spunte.some((s) => !iscritti.has(s.allievoId))) {
            lista.spunte = lista.spunte.filter((s) => iscritti.has(s.allievoId))
          }
        }
      },
    })
  }

  // ------------------------------------------------- titoli con l'ordine vecchio
  // Titoli di serie nell'ordine 'Materia — Classe': in un elenco per titolo
  // finiscono mescolati agli altri. Si riscrivono solo se sono esattamente il
  // titolo di serie; un titolo scritto a mano resta.
  const titoliVecchi = registro.corsi.filter((corso) => {
    const classe = classi.get(corso.classeId) ?? null
    const materia = registro.materie.find((m) => m.id === corso.materiaId) ?? null
    if (!classe || !materia) return false
    return corso.titolo === `${materia.nome} — ${classe.nome}`
  })
  if (titoliVecchi.length > 0) {
    const ids = new Set(titoliVecchi.map((c) => c.id))
    esito.push({
      descrizione: t.titoliVecchi(titoliVecchi.length),
      collezioni: ['corsi'],
      applica: (r) => {
        for (const corso of r.corsi) {
          if (!ids.has(corso.id)) continue
          const classe = r.classi.find((c) => c.id === corso.classeId) ?? null
          const materia = r.materie.find((m) => m.id === corso.materiaId) ?? null
          if (!classe || !materia) continue
          if (corso.titolo !== `${materia.nome} — ${classe.nome}`) continue
          corso.titolo = titoloCorso(classe, materia)
        }
        r.corsi.sort((x, y) => confrontaNomi(x.titolo, y.titolo))
      },
    })
  }

  return esito
}
