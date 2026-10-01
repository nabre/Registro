// I progetti dei corsi, per «a che punto è il progetto?»: fase per fase le
// tappe nelle ore e quanto è fatto, le presenze, chi ha cominciato e chi ha
// finito ogni compito, le lezioni e le prove che ci lavorano, giudizi e
// matrice. Fasi, quota e presenze vengono da `quadroDelProgetto`. Tutto viene dal dominio: le lezioni dai piani, il punto di ognuno
// da `statoCompitoPerAllievo`, il giorno di una voce dalla sua ora.

import { nomeCompleto } from '#core/dominio/calculations.js'
import { oggi } from '#core/dominio/dates.js'
import { classeDelCorso, materiaDelCorso, titoloCorso } from '#core/dominio/courses.js'
import type { Allievo, Progetto, Registro } from '#core/dominio/models.js'
import {
  fineDelCompito,
  fineEffettiva,
  giornoDellaVoce,
  lezioniDelProgetto,
  momentiDelProgetto,
  quadroDelProgetto,
  statoCompitoPerAllievo,
} from '#core/dominio/projects.js'
import { definisci } from '#contract/contract.js'
import {
  booleano,
  elenco,
  identificatore,
  iso,
  nullabile,
  numero,
  oggetto,
  opzionale,
  testo,
} from '#contract/schemas.js'
import { parole } from '#core/dominio/words.testi.js'
import { esigiCorso } from '#contract/procedure/common/register.js'
import { esigiProgetto } from './common.js'
import { testi } from './progetti.testi.js'

const t = () => testi().leggi
const p = () => t().presentazione

/** Le persone della classe del corso, ritirati compresi: i nomi delle voci. */
function personeDelProgetto (registro: Registro, progetto: Progetto): Allievo[] {
  const corso = registro.corsi.find((c) => c.id === progetto.corsoId)
  const classe = corso ? classeDelCorso(registro, corso) : null
  return classe?.allievi ?? []
}

export const procedura = definisci({
  nome: 'progetti.leggi',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    corsoId: opzionale(identificatore({ aiuto: () => t().corsoId })),
    progettoId: opzionale(identificatore({ aiuto: () => t().progettoId })),
    oggi: opzionale(iso({ aiuto: () => t().oggi })),
  }),
  uscita: oggetto({
    progetti: elenco(oggetto({
      id: testo(),
      corsoId: testo(),
      corso: testo({ aiuto: () => t().corso }),
      titolo: testo(),
      stato: testo({ aiuto: () => t().stato }),
      // Ricavati dalle lezioni con fasi del progetto: null finché non ce ne sono.
      inizio: nullabile(iso({ aiuto: () => t().inizioProgetto })),
      fine: nullabile(iso({ aiuto: () => t().fineProgetto })),
      quota: numero({ minimo: 0, massimo: 1, aiuto: () => t().quota }),
      obiettivi: elenco(testo()),
      fasi: elenco(oggetto({
        id: testo(),
        titolo: testo(),
        descrizione: testo(),
        inizio: nullabile(iso({ aiuto: () => t().inizioFase })),
        fine: nullabile(iso({ aiuto: () => t().fineFase })),
        quota: numero({ minimo: 0, massimo: 1, aiuto: () => t().quota }),
        tappe: elenco(oggetto({
          lezioneId: testo(),
          data: iso(),
          attivitaId: testo(),
          titolo: testo(),
          stato: testo({ aiuto: () => t().statoTappa }),
        })),
      }), { aiuto: () => t().fasi }),
      presenze: elenco(oggetto({
        allievoId: testo(),
        nome: testo(),
        udTotali: numero(),
        udAssenza: numero(),
        ritardi: numero({ intero: true }),
      }), { aiuto: () => t().presenze }),
      criteri: elenco(oggetto({ id: testo(), titolo: testo() })),
      livelli: elenco(oggetto({ valore: testo(), testo: testo(), descrizione: nullabile(testo()) })),
      lezioni: elenco(oggetto({
        lezioneId: testo(),
        data: iso(),
        tappe: elenco(testo()),
      }), { aiuto: () => t().lezioni }),
      momenti: elenco(oggetto({
        valutazioneId: testo(),
        titolo: testo(),
        data: iso(),
      }), { aiuto: () => t().momenti }),
      compiti: elenco(oggetto({
        id: testo(),
        titolo: testo(),
        fine: nullabile(iso({ aiuto: () => t().fineCompito })),
        fineLezioneId: nullabile(testo({ aiuto: () => t().fineLezioneId })),
        fatti: numero({ intero: true, aiuto: () => t().fatti }),
        allievi: elenco(oggetto({
          allievoId: testo(),
          nome: testo(),
          attivo: booleano(),
          stato: testo({ aiuto: () => t().statoAllievo }),
          inizio: nullabile(iso()),
          fine: nullabile(iso({ aiuto: () => t().fineAllievo })),
        })),
      }), { aiuto: () => t().compiti }),
      giudizi: elenco(oggetto({
        id: testo(),
        allievoId: nullabile(testo()),
        nome: nullabile(testo()),
        data: iso(),
        testo: testo(),
      }), { aiuto: () => t().giudizi }),
      matrice: elenco(oggetto({
        allievoId: testo(),
        nome: testo(),
        criterioId: testo(),
        data: iso(),
        livello: nullabile(testo()),
        nota: testo(),
      }), { aiuto: () => t().matrice }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'tabella',
        da: 'progetti',
        colonne: [
          { campo: 'titolo', testo: () => p().progetto },
          { campo: 'corso', testo: () => p().corso },
          { campo: 'stato', testo: () => parole().stato },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    if (ingresso.corsoId) esigiCorso(ambito, ingresso.corsoId)
    const scelti = ingresso.progettoId
      ? [esigiProgetto(ambito, ingresso.progettoId)]
      : r.progetti
    const progetti = scelti.filter((x) => !ingresso.corsoId || x.corsoId === ingresso.corsoId)

    return {
      progetti: progetti.map((progetto) => {
        const corso = r.corsi.find((c) => c.id === progetto.corsoId)
        const classe = corso ? classeDelCorso(r, corso) : null
        const persone = personeDelProgetto(r, progetto)
        const nome = new Map(persone.map((a) => [a.id, nomeCompleto(a)]))
        const quadro = quadroDelProgetto(r, progetto)
        return {
          id: progetto.id,
          corsoId: progetto.corsoId,
          corso: corso ? titoloCorso(classe, materiaDelCorso(r, corso)) : '',
          titolo: progetto.titolo,
          stato: progetto.stato,
          inizio: quadro.periodo?.inizio ?? null,
          fine: quadro.periodo?.fine ?? null,
          quota: quadro.quota,
          obiettivi: progetto.obiettivi,
          fasi: quadro.fasi.map((f) => ({
            id: f.fase.id,
            titolo: f.fase.titolo,
            descrizione: f.fase.descrizione ?? '',
            inizio: f.periodo?.inizio ?? null,
            fine: f.periodo?.fine ?? null,
            quota: f.quota,
            tappe: f.attivita.map((a) => ({
              lezioneId: a.lezioneId,
              data: a.data,
              attivitaId: a.attivitaId,
              titolo: a.titolo,
              stato: a.stato,
            })),
          })),
          presenze: quadro.presenze.map((riga) => ({
            allievoId: riga.allievoId,
            nome: nome.get(riga.allievoId) ?? '',
            udTotali: riga.udTotali,
            udAssenza: riga.udAssenza,
            ritardi: riga.ritardi,
          })),
          criteri: progetto.criteri.map((c) => ({ id: c.id, titolo: c.titolo })),
          livelli: progetto.livelli.map((l) => ({ valore: l.valore, testo: l.testo, descrizione: l.descrizione ?? null })),
          lezioni: lezioniDelProgetto(r, progetto).map(({ lezione, attivita }) => ({
            lezioneId: lezione.id,
            data: lezione.data,
            tappe: attivita.map((a) => a.titolo),
          })),
          momenti: momentiDelProgetto(r, progetto).map((m) => ({
            valutazioneId: m.id,
            titolo: m.titolo,
            data: m.data,
          })),
          compiti: progetto.compiti.map((compito) => ({
            id: compito.id,
            titolo: compito.titolo,
            fine: fineDelCompito(r, compito),
            fineLezioneId: compito.fineLezioneId,
            fatti: compito.fatti.length,
            // Chi frequenta, più i ritirati che nel compito hanno qualcosa.
            allievi: persone
              .filter((a) => a.attivo || [...compito.inizi, ...compito.fatti, ...compito.proroghe]
                .some((v) => v.allievoId === a.id))
              .map((a) => {
                const inizio = compito.inizi.find((i) => i.allievoId === a.id)
                return {
                  allievoId: a.id,
                  nome: nomeCompleto(a),
                  attivo: a.attivo,
                  stato: statoCompitoPerAllievo(r, compito, a.id, ingresso.oggi ?? oggi()),
                  inizio: inizio ? giornoDellaVoce(r, inizio) : null,
                  fine: fineEffettiva(r, compito, a.id),
                }
              }),
          })),
          giudizi: progetto.giudizi.map((g) => ({
            id: g.id,
            allievoId: g.allievoId,
            nome: g.allievoId ? nome.get(g.allievoId) ?? null : null,
            data: giornoDellaVoce(r, g),
            testo: g.testo,
          })),
          matrice: progetto.matrice.map((c) => ({
            allievoId: c.allievoId,
            nome: nome.get(c.allievoId) ?? '',
            criterioId: c.criterioId,
            data: giornoDellaVoce(r, c),
            livello: c.livello,
            nota: c.nota ?? '',
          })),
        }
      }),
    }
  },
})
