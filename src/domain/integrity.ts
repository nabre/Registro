// I riferimenti rimasti appesi (un file corretto a mano, una cancellazione
// fatta fuori dal registro): non bloccano l'apertura, l'interfaccia li segnala.

import { nomePiano } from './calculations.js'
import type { Registro, Corso } from './models.js'
import { CHI_INSEGNA } from './models.js'
import { testi } from './integrity.testi.js'

// ------------------------------------------------------------------ integrità

/**
 * Riferimenti appesi e regole del modello che nessun tipo esprime: un corso per
 * coppia, voti solo degli iscritti, il piano della materia giusta, la data
 * dentro l'anno.
 */
export function riferimentiRotti (registro: Registro): string[] {
  const t = testi()
  const problemi: string[] = []
  const anni = new Map(registro.anni.map((a) => [a.id, a]))
  const classi = new Map(registro.classi.map((c) => [c.id, c]))
  const materie = new Set(registro.materie.map((m) => m.id))
  const corsi = new Map(registro.corsi.map((c) => [c.id, c]))
  const piani = new Map(registro.piani.map((p) => [p.id, p]))
  const lezioni = new Map(registro.lezioni.map((l) => [l.id, l]))

  const annoDi = (corso: Corso | undefined) => {
    const classe = corso ? classi.get(corso.classeId) : undefined
    return classe ? anni.get(classe.annoId) : undefined
  }

  for (const classe of registro.classi) {
    if (!anni.has(classe.annoId)) {
      problemi.push(t.classeSenzaAnno(classe.nome))
    }
  }

  const coppie = new Set<string>()
  for (const corso of registro.corsi) {
    if (!classi.has(corso.classeId) || !materie.has(corso.materiaId)) {
      problemi.push(t.corsoSenzaClasse(corso.titolo))
      continue
    }
    const coppia = `${corso.classeId} ${corso.materiaId}`
    if (coppie.has(coppia)) {
      problemi.push(t.corsiDoppi(corso.titolo))
    }
    coppie.add(coppia)
  }

  const corsiEsistenti = new Set(registro.corsi.map((c) => c.id))
  for (const piano of registro.piani) {
    // Il nome solo se serve: `nomePiano` filtra e ordina tutte le lezioni, e
    // farlo per ogni piano sano a ogni spinta di stato costerebbe piani × lezioni.
    const suo = () => nomePiano(piano, {
      corso: corsi.get(piano.corsoId ?? '')?.titolo ?? null,
      lezioni: registro.lezioni,
    })
    if (piano.corsoId && !corsiEsistenti.has(piano.corsoId)) {
      problemi.push(t.pianoSenzaCorso(suo()))
    }
    // Una risorsa senza indirizzo né file non porta da nessuna parte.
    const vuote = [piano.risorse, ...piano.attivita.map((a) => a.risorse)]
      .flat()
      .filter((r) => !r.url && !r.file)
    if (vuote.length > 0) {
      problemi.push(t.risorseVuote(suo(), vuote.length))
    }
  }

  for (const lezione of registro.lezioni) {
    const corso = corsi.get(lezione.corsoId)
    if (!corso) {
      problemi.push(t.lezioneSenzaCorso(lezione.data, lezione.corsoId))
      continue
    }
    const anno = annoDi(corso)
    if (anno && (lezione.data < anno.inizio || lezione.data > anno.fine)) {
      problemi.push(t.lezioneFuoriAnno(lezione.data, anno.etichetta, corso.titolo))
    }
    if (!lezione.pianoId) continue
    const piano = piani.get(lezione.pianoId)
    if (!piano) {
      problemi.push(t.lezionePianoSparito(lezione.data))
    } else if (piano.corsoId && piano.corsoId !== corso.id) {
      problemi.push(t.lezionePianoAltroCorso(lezione.data))
    }
  }

  for (const momento of registro.valutazioni) {
    const corso = corsi.get(momento.corsoId)
    if (!corso) {
      problemi.push(t.valutazioneSenzaCorso(momento.titolo))
      continue
    }
    const anno = annoDi(corso)
    if (anno && !anno.semestri.some((s) => momento.data >= s.inizio && momento.data <= s.fine)) {
      problemi.push(t.valutazioneFuoriSemestre(momento.titolo, momento.data))
    }
    const classe = classi.get(corso.classeId)
    if (classe) {
      const iscritti = new Set(classe.allievi.map((a) => a.id))
      const estranei = momento.voti.filter((v) => !iscritti.has(v.allievoId)).length
      if (estranei > 0) {
        problemi.push(t.votiEstranei(momento.titolo, estranei, classe.nome))
      }
    }
    if (momento.pianoId && !piani.has(momento.pianoId)) {
      problemi.push(t.valutazionePianoSparito(momento.titolo))
    }
    if (!momento.lezioneId) continue
    const lezione = lezioni.get(momento.lezioneId)
    if (!lezione) {
      problemi.push(t.valutazioneLezioneSparita(momento.titolo))
      continue
    }
    if (lezione.corsoId !== momento.corsoId) {
      problemi.push(t.valutazioneLezioneAltroCorso(momento.titolo))
    }
    // Il triangolo momento–lezione–piano: due lati liberi, il terzo no.
    if (momento.pianoId && lezione.pianoId && momento.pianoId !== lezione.pianoId) {
      problemi.push(t.valutazionePianoDiverso(momento.titolo))
    }
  }

  for (const fascicolo of registro.fascicoli) {
    if (!classi.has(fascicolo.classeId)) {
      problemi.push(t.fascicoloSenzaClasse)
    }
  }

  for (const consegna of registro.consegne) {
    const corso = corsi.get(consegna.corsoId)
    if (!corso) {
      problemi.push(t.consegnaSenzaCorso(consegna.testo))
      continue
    }
    for (const rimando of [consegna.dataLezioneId, consegna.scadenzaLezioneId]) {
      if (rimando && !lezioni.has(rimando)) {
        problemi.push(t.consegnaLezioneSparita(consegna.testo))
        break
      }
    }
    const classe = classi.get(corso.classeId)
    if (!classe) continue
    const iscritti = new Set(classe.allievi.map((a) => a.id))
    const estranei = [
      ...consegna.allieviIds,
      ...consegna.fatte.map((f) => f.chi).filter((chi) => chi !== CHI_INSEGNA),
    ].filter((id) => !iscritti.has(id))
    if (estranei.length > 0) {
      problemi.push(t.consegnaEstranei(consegna.testo, estranei.length, classe.nome))
    }
  }

  // Il check come le consegne: è di un corso, le spunte in un'ora rimandano a
  // quell'ora, e sono di chi sta nella classe.
  for (const check of registro.check) {
    const corso = corsi.get(check.corsoId)
    if (!corso) {
      problemi.push(t.checkSenzaCorso)
      continue
    }
    const appese = check.spunte.filter((s) => s.lezioneId && !lezioni.has(s.lezioneId)).length
    if (appese > 0) {
      problemi.push(t.spunteAppese(corso.titolo, appese))
    }
    const classe = classi.get(corso.classeId)
    if (!classe) continue
    const iscritti = new Set(classe.allievi.map((a) => a.id))
    const estranei = new Set(
      check.spunte.map((s) => s.allievoId).filter((id) => !iscritti.has(id)),
    ).size
    if (estranei > 0) {
      problemi.push(t.spunteEstranee(corso.titolo, estranei, classe.nome))
    }
  }

  return problemi
}
