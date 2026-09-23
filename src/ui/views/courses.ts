// I corsi: che cosa si insegna, a chi, e quando.
//
// Il corso è il perno del registro — lezioni, valutazioni e piani si agganciano
// lì — ma finora non aveva un posto suo: nasceva da una tendina dentro il
// modulo della classe, e per vederlo bisognava aprire la classe. Questa vista è
// quel posto: si sceglie un corso dalla tendina in alto e si vede tutto quel
// che lo riguarda — com'è fatto, a che punto è, e come sta andando persona per
// allievo. Da qui si dichiara l'orario, si generano le ore, si aggiunge una
// lezione o una verifica.
//
// Un corso alla volta e non l'elenco di tutti. L'elenco rispondeva a «quali
// corsi sono pronti?», che è una domanda di settembre e si fa una volta;
// «come va questo corso?» ci si torna ogni settimana, e con le schede in fila
// il corso aperto scivolava sotto le altre insieme alla sua tabella. La
// tendina costa un clic e restituisce lo schermo intero a quel che si sta
// guardando.
//
// Non possiede niente: tutto quel che mostra sta nelle lezioni, nelle
// valutazioni e nei piani. Li mette insieme perché il momento in cui servono
// insieme è uno solo — quando si guarda come procede l'insegnamento.

import {
  allieviAttivi,
  formattaVoto,
  momentoLezione,
  nomeCompleto,
  ordinaAllievi,
  prossimaLezione,
} from '../../domain/calculations.js'
import { matriceCorso } from '../../domain/courseMatrix.js'
import { bilancioSegni, celleDiAllievo } from '../../domain/observations.js'
import { descriviRicorrenza, udPrevisteDaOrario } from '../../domain/timetable.js'
import { PIF, Molti, Uno, corto } from '../../domain/lexicon.js'
import { formattaData, formattaDurata, udDaMinuti } from '../../domain/dates.js'
import type { Corso } from '../../domain/models.js'
import {
  pastiglia,
  pulsante,
  puntoColore,
  scheda,
  statoVuoto,
  testataVista,
  tonoPresenza,
} from '../components/base.js'
import { eseguiOAvvisa, sintesiIncassata, statoVuotoAnno } from '../components/filters.js'
import { corsoDelContesto } from '../context.js'
import { h, type Figlio } from '../dom.js'
import { tabella } from '../components/table.js'
import {
  chiediEliminazione,
  moduloAvvio,
  moduloCorso,
  moduloLezione,
} from '../forms.js'
import {
  aggiorna,
  annoCorrente,
  classePerId,
  corsiDellAnnoAperto,
  materiaPerId,
  nelSemestreScelto,
  nomeSemestreScelto,
  pianiPerCorso,
  semestreScelto,
  stato,
} from '../state.js'

/**
 * Tutto quel che si sa di un corso, calcolato una volta sola.
 *
 * Una volta sola perché la scheda in alto e la tabella qui sotto guardano le
 * stesse ore e gli stessi voti: contarli due volte vorrebbe dire poterli
 * contare in due modi, e la somma sopra smetterebbe di tornare con le righe
 * sotto senza che nessuno se ne accorga.
 *
 * I conti si fermano al semestre scelto, come dappertutto: «34 lezioni» detto
 * senza dire di quale metà non serve a niente, e a gennaio si vuole sapere a
 * che punto si è nel secondo, non da settembre.
 */
function datiCorso (corso: Corso) {
  const classe = classePerId(corso.classeId)
  const allievi = classe ? ordinaAllievi(allieviAttivi(classe)) : []

  const lezioni = nelSemestreScelto(
    stato.registro.lezioni.filter((l) => l.corsoId === corso.id),
  )
  // Le annullate restano fuori dai conti di presenza: non sono ore in cui
  // qualcuno poteva esserci.
  const tenute = lezioni.filter((l) => l.stato !== 'annullata')
  const momenti = nelSemestreScelto(
    stato.registro.valutazioni.filter((v) => v.corsoId === corso.id),
  ).sort((a, b) => a.data.localeCompare(b.data))

  // Passata sull'orologio dello stato, non su `oggi()`: quello resta fermo
  // alla data e non sa che un'ora di stamattina è già finita.
  const svolte = tenute.filter(
    (l) =>
      l.stato === 'svolta' ||
      momentoLezione(l, stato.adessoData, stato.adessoOra) === 'passata',
  ).length

  return {
    classe,
    allievi,
    lezioni: lezioni.length,
    tenute,
    momenti,
    svolte,
    daFare: tenute.length - svolte,
    annullate: lezioni.length - tenute.length,
    piani: pianiPerCorso(corso.id).length,
    prossima: prossimaLezione(lezioni, stato.adessoData, stato.adessoOra),
    settimanali: corso.orario.reduce((somma, r) => somma + r.durataMin, 0),
    // Il cento per cento sono le ore che l'orario prevede nel periodo, non
    // quelle già a calendario: è lo stesso riferimento del rapporto stampato,
    // e due numeri diversi per la stessa domanda — uno a schermo, uno sul
    // foglio — sono peggio di nessuno.
    matrice: matriceCorso(
      allievi,
      tenute,
      momenti,
      stato.registro.impostazioni,
      udPrevisteDaOrario(
        annoCorrente(),
        corso,
        semestreScelto()?.inizio ?? annoCorrente()?.inizio ?? '',
        semestreScelto()?.fine ?? annoCorrente()?.fine ?? '',
      ),
    ),
  }
}

type DatiCorso = ReturnType<typeof datiCorso>

/** Come sta andando il corso, in una fila di numeri sopra tutto il resto. */
function numeriDelCorso (dati: DatiCorso): HTMLElement {
  const { matrice } = dati
  const presenza = matrice.classe.presenza
  const media = matrice.classe.media
  const scala = stato.registro.impostazioni.scala

  return sintesiIncassata(
    { etichetta: corto(PIF), valore: String(dati.allievi.length) },
    { etichetta: 'ore svolte', valore: `${dati.svolte}/${dati.tenute.length}` },
    { etichetta: 'UD previste', valore: String(matrice.udPreviste) },
    { etichetta: 'UD a calendario', valore: String(matrice.ud) },
    // Solo quando ce ne sono: una riga «0 annullate» è rumore in tutti i corsi
    // tranne quelli in cui è successo.
    dati.annullate > 0 && { etichetta: 'annullate', valore: String(dati.annullate) },
    {
      // «presenza» senza altro diceva due numeri diversi nella stessa pagina:
      // questo riquadro sta sulle ore con l'appello fatto (meno gli esoneri),
      // la colonna «Presenza» della tabella qui sotto sta sulle UD che l'orario
      // prevede. Due denominatori, lo stesso nome e — peggio — gli stessi
      // colori, a cinque centimetri di distanza. Un docente che confronta il
      // riquadro con la tabella trovava due cifre e non sapeva quale mettere
      // sulla certificazione di frequenza. Il nome adesso dice su che cosa.
      etichetta: 'presenza (ore con appello)',
      valore: presenza === null ? '—' : `${Math.round(presenza * 100)}%`,
      tono: tonoPresenza(presenza),
    },
    matrice.classe.udAssenza > 0 && {
      // Quanto si è perso di quel che era in programma: è la cifra che va nel
      // rapporto, e vederla qui prima di stamparlo evita la sorpresa.
      etichetta: `UD di assenza su ${matrice.udPreviste}`,
      valore: `${matrice.classe.udAssenza}${
        matrice.classe.assenza === null ? '' : ` · ${Math.round(matrice.classe.assenza * 100)}%`
      }`,
    },
    { etichetta: 'valutazioni', valore: String(dati.momenti.length) },
    {
      // Su quanti è fatta si dice nell'etichetta: una media di classe che
      // riguarda tre allievi su dodici è un numero vero che risponde a
      // un'altra domanda, e senza dirlo si legge come se fosse la classe.
      etichetta:
        media === null || matrice.classe.conVoto === dati.allievi.length
          ? 'media di classe'
          : `media di ${matrice.classe.conVoto} su ${dati.allievi.length}`,
      valore: media === null ? '—' : formattaVoto(media),
      tono: media === null ? undefined : media >= scala.sufficienza ? 'positivo' : 'negativo',
    },
    { etichetta: 'piani', valore: String(dati.piani), tono: dati.piani === 0 ? 'quiete' : undefined },
  )
}

function schedaCorso (corso: Corso, dati: DatiCorso): HTMLElement {
  const materia = materiaPerId(corso.materiaId)

  return scheda({
    classe: 'corso-scheda',
    titolo: corso.titolo,
    // Classe prima di materia, come nel titolo: le due righe si leggono
    // nello stesso ordine, e chi cerca un corso cerca prima la classe.
    sottotitolo: `${dati.classe?.nome ?? 'classe sparita'} · ${materia?.nome ?? 'materia sparita'}`,
    azioni: h(
      'div',
      { class: 'corso-scheda__comandi' },
      pulsante({
        simbolo: 'matita',
        variante: 'fantasma',
        titolo: 'Orario, nome e note del corso',
        al: () => moduloCorso({ corso }),
      }),
      pulsante({
        simbolo: 'calendario',
        variante: 'fantasma',
        titolo: 'Nuova lezione per questo corso',
        al: () => moduloLezione({ corsoId: corso.id, classeId: corso.classeId }),
      }),
      pulsante({
        simbolo: 'piano',
        variante: 'fantasma',
        // Un piano è di un'ora: da qui si va a vedere quali ore di questo
        // corso ne aspettano ancora una, invece di farne uno sciolto.
        titolo: 'Le ore di questo corso e le loro scalette',
        // Anche il corso: la pagina dei piani sceglie con `corsoDelContesto()`,
        // e con la sola classe si arrivava sulle ore di un corso diverso da
        // quello su cui si era premuto.
        al: () =>
          aggiorna({ vista: 'piani', corsoId: corso.id, filtroClasseId: corso.classeId }),
      }),
      // Da qui non esce niente: i PDF e i CSV di questo corso — presenze,
      // valutazioni, schede, verbali — stanno tutti in Documenti. Qui si tiene
      // il corso, di là lo si consegna.
      // Il corso si toglie da dove lo si guarda: la domanda dice quante ore e
      // quanti voti se ne andrebbero con lui, e sono proprio i numeri che stanno
      // qui sopra.
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: 'Elimina il corso',
        al: async () => {
          if (!(await chiediEliminazione({ genere: 'corso', id: corso.id }))) return
          const risposta = await eseguiOAvvisa({ tipo: 'corso.elimina', corsoId: corso.id }, 'Corso eliminato.')
          if (risposta.ok) aggiorna({ corsoId: null })
        },
      }),
    ),
    contenuto: h(
      'div',
      { class: 'corso-scheda__corpo' },
      numeriDelCorso(dati),
      // L'orario è la riga che dice se il corso sa generare le proprie ore.
      // Senza, il calendario resta vuoto e nessun altro avviso lo spiega.
      corso.orario.length > 0
        ? h(
            'p',
            { class: 'corso-scheda__orario' },
            ...corso.orario.map((r) => pastiglia(descriviRicorrenza(r), 'informativo', 'orologio')),
            h(
              'span',
              { class: 'testo-quieto' },
              `${udDaMinuti(dati.settimanali)} UD a settimana · ${formattaDurata(dati.settimanali)}`,
            ),
          )
        : h(
            'p',
            { class: 'testo-quieto' },
            'Nessun orario fisso: le lezioni vanno messe una per una. ',
            pulsante({
              testo: 'Dichiara l’orario',
              simbolo: 'orologio',
              variante: 'sottile',
              al: () => moduloCorso({ corso }),
            }),
          ),
      dati.prossima
        ? h(
            'p',
            { class: 'testo-quieto' },
            'Prossima ora: ',
            h(
              'button',
              {
                class: 'collegamento',
                type: 'button',
                onclick: () =>
                  aggiorna({ vista: 'lezione', lezioneId: dati.prossima?.id ?? null }),
              },
              formattaData(dati.prossima.data),
            ),
          )
        : null,
      // Il programma d'insegnamento: sta nel corso, e senza questa riga non si
      // vedeva da nessuna parte se non aprendo il modulo per modificarlo.
      corso.note ? h('p', { class: 'corso-scheda__note' }, corso.note) : null,
    ),
  })
}

/**
 * Il corso visto per allievo: ore, assenze, voti, una riga per ciascuno.
 *
 * È la domanda di metà semestre — «come sta andando questa classe in questa
 * materia?» — e prima non aveva un posto: le presenze stavano dentro l'ora, i
 * voti nella vista Valutazioni, e per rispondere bisognava aprire venti lezioni
 * e contare a mente. Sono tre elenchi che parlano degli stessi allievi, e in
 * colonna si leggono in un colpo d'occhio: chi manca troppo, chi non ha ancora
 * un voto, chi sta sotto.
 *
 * I numeri arrivano già contati da `datiCorso`: sono gli stessi che la fila
 * sopra riassume, e riprenderli invece di rifarli è quel che tiene la somma in
 * accordo con le righe.
 */
function matriceDelCorso (dati: DatiCorso): Figlio {
  const classe = dati.classe
  if (!classe) return null

  const allievi = dati.allievi
  if (allievi.length === 0) {
    return scheda({
      titolo: Molti(PIF),
      contenuto: h(
        'p',
        { class: 'testo-quieto' },
        `La classe non ha ${PIF.plurale} che frequentano: l’elenco si riempie dalla vista Classi.`,
      ),
    })
  }

  const momenti = dati.momenti
  const matrice = dati.matrice
  const scala = stato.registro.impostazioni.scala

  /**
   * Quel che si è segnato sulla matrice del comportamento, per una persona.
   *
   * Sono le stesse caselle del registro dell'ora, sommate sulle ore del
   * periodo: due cifre e non un elenco, perché qui la domanda è «di chi c'è da
   * parlare» — che cosa sia successo lo dice la scheda della persona, che è
   * dove porta il nome nella colonna di sinistra.
   */
  const segniSegnati = (allievoId: string): Figlio => {
    const conti = bilancioSegni(celleDiAllievo(dati.tenute, allievoId))
    if (conti.positivi === 0 && conti.negativi === 0 && conti.neutre === 0) {
      return h('span', { class: 'testo-quieto' }, '—')
    }
    return h(
      'span',
      { class: 'segni-contati' },
      conti.positivi > 0 ? pastiglia(`+${conti.positivi}`, 'positivo') : null,
      conti.negativi > 0 ? pastiglia(`−${conti.negativi}`, 'negativo') : null,
      // Le annotate senza segno: non sono né un bene né un male, ma qualcuno
      // ha scritto una riga, e una colonna che le nasconde fa sembrare che di
      // quella persona non si sia mai detto niente.
      conti.neutre > 0 ? h('span', { class: 'testo-quieto' }, String(conti.neutre)) : null,
    )
  }

  /**
   * Quanto ha perso di quel che era in programma, come pastiglia.
   *
   * Sulle UD che l'orario del corso prevede nel periodo, non su quelle già
   * svolte: è la cifra che finisce nel rapporto da consegnare, e vederne una
   * diversa a schermo vorrebbe dire scoprire il numero vero al momento di
   * stampare. Un'ora dimenticata dal docente resta un'ora che si doveva
   * fare.
   *
   * Sopra la soglia è un avviso, ed è il verso opposto della presenza: qui
   * grande è brutto.
   */
  const quota = (riga: (typeof matrice.righe)[number]): Figlio => {
    if (riga.assenza === null) return h('span', { class: 'testo-quieto' }, '—')
    const percento = Math.round(riga.assenza * 100)
    return pastiglia(
      `${percento}%`,
      percento <= 10 ? 'positivo' : percento <= 20 ? 'attenzione' : 'negativo',
    )
  }

  /**
   * La frequenza: cento per cento meno l'assenza.
   *
   * Il complemento esatto della colonna accanto, e non la quota sulle UD con
   * l'appello fatto: quella è un'altra cifra, che dice quanto il registro è
   * tenuto bene e non quanto si è frequentato. Qui grande è bello, ed
   * è il verso in cui la domanda arriva quando si deve certificare una
   * frequenza.
   */
  const seguito = (riga: (typeof matrice.righe)[number]): Figlio => {
    if (riga.presenzaPreviste === null) return h('span', { class: 'testo-quieto' }, '—')
    const percento = Math.round(riga.presenzaPreviste * 100)
    return pastiglia(
      `${percento}%`,
      percento >= 90 ? 'positivo' : percento >= 80 ? 'attenzione' : 'negativo',
    )
  }

  return scheda({
    titolo: Molti(PIF),
    sottotitolo:
      `${matrice.lezioni} ${matrice.lezioni === 1 ? 'ora' : 'ore'} · ` +
      `${matrice.ud} UD · ${momenti.length} ${momenti.length === 1 ? 'prova' : 'prove'} · ` +
      nomeSemestreScelto(),
    contenuto: tabella({
      variante: 'matrice',
      intestazione: [
        h('th', { class: 'tabella__nome' }, Uno(PIF)),
        h(
          'th',
          { attr: { title: `Sulle ${matrice.udPreviste} UD che l’orario prevede nel periodo` } },
          'Assenza',
        ),
        // Le due percentuali complementari, una accanto all'altra: la
        // domanda si fa nei due versi — «quanto ha perso» guardando i casi
        // difficili, «quanto ha frequentato» dovendo certificare una
        // frequenza — e chi legge non deve fare la sottrazione a mente.
        h(
          'th',
          { attr: { title: `Sulle ${matrice.udPreviste} UD che l’orario prevede nel periodo` } },
          'Presenza',
        ),
        h('th', null, 'UD di assenza'),
        h('th', null, 'UD seguite'),
        // Il denominatore, in chiaro accanto alle percentuali: senza, un
        // «92%» non si sa su che cosa sia fatto.
        h(
          'th',
          { attr: { title: 'Le UD che l’orario del corso prevede nel periodo' } },
          'UD del corso',
        ),
        h('th', null, 'Ritardi'),
        // Quel che si è segnato sulla matrice del comportamento, in due cifre:
        // sta fra i ritardi e le prove perché è dello stesso genere delle
        // colonne di sinistra — com'è andata l'ora — e non dei voti.
        h(
          'th',
          { attr: { title: 'Le caselle segnate sulla matrice del comportamento, in queste ore' } },
          'Segnato',
        ),
        h('th', null, 'Prove'),
        h('th', null, 'Media'),
        h('th', null, 'Nota'),
      ],
      righe: matrice.righe.map((riga) =>
        h(
          'tr',
          null,
          h(
            'th',
            { class: 'tabella__nome', attr: { scope: 'row' } },
            h(
              'button',
              {
                class: 'collegamento',
                type: 'button',
                // Di qui si va alla scheda personale: la riga dice che
                // qualcosa non va, la scheda dice che cosa.
                onclick: () =>
                  aggiorna({
                    vista: 'allievo',
                    classeId: classe.id,
                    allievoId: riga.allievo.id,
                  }),
              },
              nomeCompleto(riga.allievo),
            ),
          ),
          h('td', null, quota(riga)),
          h('td', null, seguito(riga)),
          h(
            'td',
            { class: riga.udAssenza > 0 ? 'tabella__cella--attenzione' : undefined },
            riga.udAssenza > 0 ? String(riga.udAssenza) : '—',
          ),
          h('td', null, String(riga.udPresenza)),
          h('td', { class: 'testo-quieto' }, String(matrice.udPreviste)),
          h('td', null, riga.ritardi > 0 ? String(riga.ritardi) : '—'),
          h('td', null, segniSegnati(riga.allievo.id)),
          h(
            'td',
            { class: riga.prove === 0 && momenti.length > 0 ? 'tabella__cella--attenzione' : undefined },
            `${riga.prove}/${momenti.length}`,
          ),
          h(
            'td',
            null,
            riga.media === null
              ? h('span', { class: 'testo-quieto' }, '—')
              : h('span', { class: 'testo-quieto' }, formattaVoto(riga.media)),
          ),
          h(
            'td',
            null,
            riga.nota === null
              ? h('span', { class: 'testo-quieto' }, '—')
              : pastiglia(
                  formattaVoto(riga.nota),
                  riga.nota >= scala.sufficienza ? 'positivo' : 'negativo',
                ),
          ),
        ),
      ),
    }),
  })
}

export function vistaCorsi (): Figlio {
  const anno = annoCorrente()
  if (!anno) {
    return h(
      'div',
      { class: 'vista vista--corsi' },
      statoVuotoAnno({
        simbolo: 'libro',
        testo:
          'Anno scolastico, classe, materia e ore: l’avvio guidato li mette insieme in una ' +
          'finestra sola, e le lezioni finiscono da sole sul calendario.',
        avvia: () => moduloAvvio(),
      }),
    )
  }

  // Tutti i corsi dell'anno: servono a sapere se ce n'è almeno uno, non a
  // sceglierlo. Il corso lo dice la tendina della barra in cima — una sola per
  // tutto il registro — e qui non se ne ripete una seconda.
  const corsi = corsiDellAnnoAperto()
  const scelto = corsoDelContesto()
  const dati = scelto ? datiCorso(scelto) : null

  return h(
    'div',
    { class: 'vista vista--corsi' },
    testataVista({
      titolo: 'Corsi',
      sottotitolo: `una materia a una classe · i conti sono del ${nomeSemestreScelto()}`,
      // Niente pulsanti qui: «Nuovo corso» sta nella riga delle azioni, come
      // ogni altra cosa che si fa in questa pagina, e l'esportazione di tutti i
      // corsi sta in Documenti, insieme a ogni altro foglio che esce dal
      // registro. E niente tendina del corso: è quella della barra in cima.
    }),
    corsi.length === 0
      ? statoVuoto({
          simbolo: 'libro',
          titolo: 'Nessun corso',
          testo:
            'Un corso è una materia a una classe. Finché non ce n’è uno, il calendario non ha ' +
            'niente da mostrare: le lezioni si agganciano al corso, non alla classe.',
          azione: pulsante({
            testo: 'Apri il primo corso',
            variante: 'primario',
            simbolo: 'piu',
            al: () => moduloCorso(),
          }),
        })
      : scelto && dati
        ? h(
            'div',
            { class: 'corso-dettaglio' },
            h(
              'div',
              { class: 'corso-dettaglio__testa' },
              // Il colore della classe sul bordo: è quello con cui il corso
              // compare nel calendario, e dice a colpo d'occhio di chi si sta
              // leggendo la tabella.
              puntoColore(dati.classe?.colore ?? '#888888'),
              schedaCorso(scelto, dati),
            ),
            matriceDelCorso(dati),
          )
        : null,
  )
}
