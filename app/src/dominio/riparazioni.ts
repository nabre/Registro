// Le rotture che il registro sa aggiustare da solo.
//
// `riferimentiRotti` dice che cosa non torna; qui si dice anche che cosa fare.
// La regola è una: si propone solo quel che non perde niente — si stacca un
// collegamento appeso al nulla, si rimette la materia che qualcuno ha tolto dal
// file a mano. Quel che richiederebbe una scelta — a quale corso appartiene una
// lezione rimasta orfana — resta un avviso e basta: indovinare al posto del
// docente è peggio che lasciare il problema in vista.
//
// Ogni riparazione si spiega prima di essere applicata, perché il gesto è uno
// solo e chi lo preme deve sapere che cosa sta accettando.

import { titoloCorso } from './corsi.js'
import type { Classe, Collezione, Materia, Registro } from './modelli.js'
import { plurale } from './testo.js'

export interface Riparazione {
  /** Che cosa succede, detto al docente prima di farlo. */
  descrizione: string
  /** I file che la correzione tocca. */
  collezioni: Collezione[]
  /** Applica la correzione allo stato vivo. Dev'essere ripetibile senza danni. */
  applica: (registro: Registro) => void
}

/**
 * Il nome con cui ricreare una materia sparita, letto dal titolo del corso: è
 * proprio il nome che si era dato, ed è meglio di un segnaposto perché il
 * docente lo riconosce.
 *
 * Si toglie dal titolo il nome della classe e si tiene quel che resta, invece
 * di andare a prendere una metà per posizione. Il titolo di serie è
 * 'Classe — Materia', ma i registri scritti prima ce l'hanno al contrario, e
 * una regola per posizione su quelli recupererebbe come materia il nome della
 * classe. La classe la si sa da fuori: è l'unica delle due che non si è persa.
 */
function nomeDalTitolo (titolo: string, nomeClasse: string | null): string {
  const parti = titolo.split('—').map((pezzo) => pezzo.trim()).filter(Boolean)
  if (parti.length === 0) return 'Materia recuperata'
  if (nomeClasse) {
    const resto = parti.filter((pezzo) => pezzo !== nomeClasse)
    if (resto.length > 0) return resto.join(' — ')
  }
  // Senza la classe da cui distinguersi si prende l'ultima parte, che è dove
  // la materia sta nei titoli di adesso.
  return parti[parti.length - 1]
}

export function riparazioni (registro: Registro): Riparazione[] {
  const esito: Riparazione[] = []
  const classi = new Map<string, Classe>(registro.classi.map((c) => [c.id, c]))
  const materie = new Set(registro.materie.map((m) => m.id))
  const corsi = new Map(registro.corsi.map((c) => [c.id, c]))
  const piani = new Set(registro.piani.map((p) => p.id))
  const lezioni = new Map(registro.lezioni.map((l) => [l.id, l]))

  // ---------------------------------------------------------- materie sparite
  // Una sola materia per ogni identificatore perduto: due corsi che la
  // condividevano devono ritrovarsi sulla stessa, non su due copie.
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
      descrizione:
        `Rimette la materia «${nome}», che non c'è più nel registro ma è ancora usata da ` +
        `${plurale(quantiCorsi, 'corso', 'corsi')}.`,
      collezioni: ['registro'],
      applica: (r) => {
        if (r.materie.some((m) => m.id === id)) return
        const materia: Materia = { id, nome, sigla: '', colore: '', note: '' }
        r.materie.push(materia)
        r.materie.sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
      },
    })
  }

  // ---------------------------------------------------------- piani staccati
  // Un `pianoId` che non punta a niente non è una scaletta mancante: è una
  // lezione che dice di averne una e non la trova. Toglierlo la rimette in
  // pari, e il piano si riassegna con due clic.
  const lezioniSenzaPiano = registro.lezioni.filter(
    (l) => l.pianoId && !piani.has(l.pianoId),
  )
  if (lezioniSenzaPiano.length > 0) {
    const ids = new Set(lezioniSenzaPiano.map((l) => l.id))
    esito.push({
      descrizione:
        `Stacca il piano da ${plurale(lezioniSenzaPiano.length, 'lezione', 'lezioni')}: ` +
        'quello a cui puntano non esiste più.',
      collezioni: ['lezioni'],
      applica: (r) => {
        for (const lezione of r.lezioni) {
          if (ids.has(lezione.id) && lezione.pianoId && !r.piani.some((p) => p.id === lezione.pianoId)) {
            lezione.pianoId = null
          }
        }
      },
    })
  }

  // ------------------------------------------------- collegamenti dei momenti
  // I voti non si toccano: si toglie solo il rinvio rotto. Il momento resta
  // dov'è, con il suo corso, la sua data e la sua classe.
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
      descrizione:
        `Toglie il collegamento rotto a ${plurale(momentiRotti.length, 'momento', 'momenti')} ` +
        'di valutazione: la lezione o il piano citati non ci sono più, o sono di un altro corso. I voti restano.',
      collezioni: ['valutazioni'],
      applica: (r) => {
        for (const momento of r.valutazioni) {
          if (!ids.has(momento.id)) continue
          if (momento.pianoId && !r.piani.some((p) => p.id === momento.pianoId)) momento.pianoId = null
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
  // Un piano che cita un corso sparito non è un piano senza corso: è un piano
  // che dice una cosa falsa. Staccarlo lo rimette fra le bozze, da dove si
  // riaggancia o si duplica — e non si perde niente.
  const pianiOrfani = registro.piani.filter((p) => p.corsoId && !corsi.has(p.corsoId))
  if (pianiOrfani.length > 0) {
    const ids = new Set(pianiOrfani.map((p) => p.id))
    esito.push({
      descrizione:
        `Stacca ${plurale(pianiOrfani.length, 'piano lezione', 'piani lezione')} dal corso che citano: ` +
        'non esiste più. Restano fra le bozze, pronti da riagganciare.',
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
  // Una consegna legata a un'ora che non c'è più tiene la data che aveva:
  // «per la prossima volta» non deve diventare «per mai». È la stessa regola
  // con cui le eliminazioni la staccano; qui vale per i file toccati a mano.
  const consegneAppese = registro.consegne.filter(
    (c) =>
      (c.dataLezioneId && !lezioni.has(c.dataLezioneId)) ||
      (c.scadenzaLezioneId && !lezioni.has(c.scadenzaLezioneId)),
  )
  if (consegneAppese.length > 0) {
    const ids = new Set(consegneAppese.map((c) => c.id))
    esito.push({
      descrizione:
        `Stacca ${plurale(consegneAppese.length, 'consegna', 'consegne')} dalla lezione che citano: ` +
        'non esiste più. Tengono la data che avevano.',
      collezioni: ['consegne'],
      applica: (r) => {
        const vive = new Set(r.lezioni.map((l) => l.id))
        for (const consegna of r.consegne) {
          if (!ids.has(consegna.id)) continue
          if (consegna.dataLezioneId && !vive.has(consegna.dataLezioneId)) consegna.dataLezioneId = null
          if (consegna.scadenzaLezioneId && !vive.has(consegna.scadenzaLezioneId)) {
            consegna.scadenzaLezioneId = null
          }
        }
      },
    })
  }

  // ------------------------------------------------- titoli con l'ordine vecchio
  // Il titolo di serie era 'Materia — Classe' ed è diventato 'Classe —
  // Materia': i corsi scritti prima se lo portano dietro, e in un elenco
  // ordinato per titolo finiscono mescolati a quelli nuovi.
  //
  // Si riscrivono solo quelli che sono ancora esattamente il titolo di serie
  // di prima. Un titolo battuto a mano non è un errore da correggere: è quel
  // che il docente ha voluto chiamare quel corso, e va lasciato dov'è.
  const titoliVecchi = registro.corsi.filter((corso) => {
    const classe = classi.get(corso.classeId) ?? null
    const materia = registro.materie.find((m) => m.id === corso.materiaId) ?? null
    if (!classe || !materia) return false
    return corso.titolo === `${materia.nome} — ${classe.nome}`
  })
  if (titoliVecchi.length > 0) {
    const ids = new Set(titoliVecchi.map((c) => c.id))
    esito.push({
      descrizione:
        `Rimette nell'ordine di adesso — classe, poi materia — il titolo di ` +
        `${plurale(titoliVecchi.length, 'corso', 'corsi')}. I titoli scritti a mano ` +
        'restano come sono.',
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
        r.corsi.sort((x, y) => x.titolo.localeCompare(y.titolo, 'it'))
      },
    })
  }

  return esito
}
