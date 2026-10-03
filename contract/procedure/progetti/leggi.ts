// I progetti dell'anno, e con un corso «a che punto è il progetto con quella
// classe?». Senza corso: la testata e i corsi in cui è integrato, con lo
// stato. Con il corso: fase per fase le tappe nelle ore e quanto è fatto, le
// presenze, chi ha cominciato e chi ha finito ogni compito, le lezioni e le
// prove che ci lavorano, giudizi e matrice. Fasi, quota e presenze vengono da
// `quadroDelProgetto`. Tutto viene dal dominio: le lezioni dai piani, il punto
// di ognuno da `statoCompitoPerAllievo`, il giorno di una voce dalla sua ora.

import { nomeCompleto } from '#core/dominio/calculations.js'
import { oggi } from '#core/dominio/dates.js'
import { classeDelCorso, materiaDelCorso, titoloCorso } from '#core/dominio/courses.js'
import type {
  Allievo,
  IntegrazioneProgetto,
  Progetto,
  ProgettoNelCorso,
  Registro,
} from '#core/dominio/models.js'
import {
  fineDelCompito,
  fineEffettiva,
  giornoDellaVoce,
  lezioniDelProgetto,
  momentiDelProgetto,
  progettiDelCorso,
  progettiPerTitolo,
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
import { esigiIntegrazione, esigiProgetto } from './common.js'
import { testi } from './progetti.testi.js'

const t = () => testi().leggi
const p = () => t().presentazione

/** Le persone della classe del corso, ritirati compresi: i nomi delle voci. */
function personeDelProgetto (registro: Registro, progetto: ProgettoNelCorso): Allievo[] {
  const corso = registro.corsi.find((c) => c.id === progetto.corsoId)
  const classe = corso ? classeDelCorso(registro, corso) : null
  return classe?.allievi ?? []
}

/** «I MEC A — Matematica»: il nome del corso, vuoto se non c'è più. */
function nomeDelCorso (registro: Registro, corsoId: string): string {
  const corso = registro.corsi.find((c) => c.id === corsoId)
  return corso ? titoloCorso(classeDelCorso(registro, corso), materiaDelCorso(registro, corso)) : ''
}

/** Quel che il progetto è per tutto l'anno, da qualunque corso lo si guardi. */
function testata (
  registro: Registro,
  progetto: Omit<Progetto, 'integrazioni'>,
  integrazioni: readonly IntegrazioneProgetto[],
) {
  const corsi = integrazioni.map((i) => ({
    corsoId: i.corsoId,
    corso: nomeDelCorso(registro, i.corsoId),
    stato: i.stato,
  }))
  return {
    id: progetto.id,
    titolo: progetto.titolo,
    descrizione: progetto.descrizione ?? '',
    obiettivi: progetto.obiettivi,
    corsi: corsi.map((i) => i.corso).join(', '),
    integrazioni: corsi,
    criteri: progetto.criteri.map((c) => ({ id: c.id, titolo: c.titolo })),
    livelli: progetto.livelli.map((l) => ({ valore: l.valore, testo: l.testo, descrizione: l.descrizione ?? null })),
  }
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
      titolo: testo(),
      descrizione: testo(),
      obiettivi: elenco(testo()),
      corsi: testo({ aiuto: () => t().corsi }),
      integrazioni: elenco(oggetto({
        corsoId: testo(),
        corso: testo({ aiuto: () => t().corso }),
        stato: testo({ aiuto: () => t().stato }),
      }), { aiuto: () => t().integrazioni }),
      criteri: elenco(oggetto({ id: testo(), titolo: testo() })),
      livelli: elenco(oggetto({ valore: testo(), testo: testo(), descrizione: nullabile(testo()) })),
      // Le fasi ci sono sempre; periodo, quota e tappe solo viste da un corso.
      fasi: elenco(oggetto({
        id: testo(),
        titolo: testo(),
        descrizione: testo(),
        inizio: opzionale(nullabile(iso({ aiuto: () => t().inizioFase }))),
        fine: opzionale(nullabile(iso({ aiuto: () => t().fineFase }))),
        quota: opzionale(numero({ minimo: 0, massimo: 1, aiuto: () => t().quota })),
        tappe: opzionale(elenco(oggetto({
          lezioneId: testo(),
          data: iso(),
          attivitaId: testo(),
          titolo: testo(),
          stato: testo({ aiuto: () => t().statoTappa }),
        }))),
      }), { aiuto: () => t().fasi }),
      // Da qui in giù solo con `corsoId`: il lavoro con la classe di quel corso.
      corsoId: opzionale(testo()),
      corso: opzionale(testo({ aiuto: () => t().corso })),
      stato: opzionale(testo({ aiuto: () => t().stato })),
      // Ricavati dalle lezioni con fasi del progetto: null finché non ce ne sono.
      inizio: opzionale(nullabile(iso({ aiuto: () => t().inizioProgetto }))),
      fine: opzionale(nullabile(iso({ aiuto: () => t().fineProgetto }))),
      quota: opzionale(numero({ minimo: 0, massimo: 1, aiuto: () => t().quota })),
      presenze: opzionale(elenco(oggetto({
        allievoId: testo(),
        nome: testo(),
        udTotali: numero(),
        udAssenza: numero(),
        ritardi: numero({ intero: true }),
      }), { aiuto: () => t().presenze })),
      lezioni: opzionale(elenco(oggetto({
        lezioneId: testo(),
        data: iso(),
        tappe: elenco(testo()),
      }), { aiuto: () => t().lezioni })),
      momenti: opzionale(elenco(oggetto({
        valutazioneId: testo(),
        titolo: testo(),
        data: iso(),
      }), { aiuto: () => t().momenti })),
      compiti: opzionale(elenco(oggetto({
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
      }), { aiuto: () => t().compiti })),
      giudizi: opzionale(elenco(oggetto({
        id: testo(),
        allievoId: nullabile(testo()),
        nome: nullabile(testo()),
        data: iso(),
        testo: testo(),
      }), { aiuto: () => t().giudizi })),
      matrice: opzionale(elenco(oggetto({
        allievoId: testo(),
        nome: testo(),
        criterioId: testo(),
        data: iso(),
        livello: nullabile(testo()),
        nota: testo(),
      }), { aiuto: () => t().matrice })),
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
          { campo: 'corsi', testo: () => p().corsi },
          { campo: 'stato', testo: () => parole().stato },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const { corsoId } = ingresso
    if (!corsoId) {
      const scelti = ingresso.progettoId ? [esigiProgetto(ambito, ingresso.progettoId)] : progettiPerTitolo(r)
      return {
        progetti: scelti.map((progetto) => ({
          ...testata(r, progetto, progetto.integrazioni),
          fasi: progetto.fasi.map((f) => ({ id: f.id, titolo: f.titolo, descrizione: f.descrizione ?? '' })),
        })),
      }
    }
    esigiCorso(ambito, corsoId)
    const viste = ingresso.progettoId
      ? [esigiIntegrazione(ambito, { progettoId: ingresso.progettoId, corsoId })]
      : progettiDelCorso(r, corsoId)

    return {
      progetti: viste.map((vista) => {
        const integrazioni = r.progetti.find((x) => x.id === vista.id)?.integrazioni ?? []
        const persone = personeDelProgetto(r, vista)
        const nome = new Map(persone.map((a) => [a.id, nomeCompleto(a)]))
        const quadro = quadroDelProgetto(r, vista)
        return {
          ...testata(r, vista, integrazioni),
          corsoId: vista.corsoId,
          corso: nomeDelCorso(r, vista.corsoId),
          stato: vista.stato,
          inizio: quadro.periodo?.inizio ?? null,
          fine: quadro.periodo?.fine ?? null,
          quota: quadro.quota,
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
          lezioni: lezioniDelProgetto(r, vista).map(({ lezione, attivita }) => ({
            lezioneId: lezione.id,
            data: lezione.data,
            tappe: attivita.map((a) => a.titolo),
          })),
          momenti: momentiDelProgetto(r, vista).map((m) => ({
            valutazioneId: m.id,
            titolo: m.titolo,
            data: m.data,
          })),
          compiti: vista.compiti.map((compito) => ({
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
          giudizi: vista.giudizi.map((g) => ({
            id: g.id,
            allievoId: g.allievoId,
            nome: g.allievoId ? nome.get(g.allievoId) ?? null : null,
            data: giornoDellaVoce(r, g),
            testo: g.testo,
          })),
          matrice: vista.matrice.map((c) => ({
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
