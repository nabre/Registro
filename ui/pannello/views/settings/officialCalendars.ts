// I calendari scolastici ufficiali che il registro porta con sé, in sola
// lettura: per ogni anno quel che un anno nuovo importerebbe (inizio, fine,
// chiusure) e il PDF da cui è stato letto. Mostra le stesse voci che importa
// `bozzaDaAnnoUfficiale`, cioè `periodiImportabili`: quel che si vede qui è
// quel che arriva nel documento.

import { pastiglia, quieto, scheda, selettore } from '../../components/base.js'
import { tabella } from '../../components/table.js'
import { h } from '../../dom.js'
import { etichettaAnno, formattaData, oggi } from '../../../../core/dominio/dates.js'
import {
  CALENDARI_UFFICIALI,
  periodiImportabili,
  type AnnoUfficiale,
  type CalendarioUfficiale,
} from '../../../../core/dominio/schoolCalendar.js'
import { testi as testiCalendario } from '../../../../core/dominio/schoolCalendar.testi.js'
import { parole } from '../../../../core/dominio/words.testi.js'
import { testi } from './officialCalendars.testi.js'

/** Il nome del file del PDF, per il collegamento: l'indirizzo intero sta nel titolo. */
function nomeDelPdf (indirizzo: string): string {
  try {
    return decodeURIComponent(new URL(indirizzo).pathname.split('/').pop() ?? '') || indirizzo
  } catch {
    return indirizzo
  }
}

/**
 * Il PDF di riferimento. La guardia delle finestre manda il `target="_blank"` al
 * browser di sistema (`desktop/apparato/navigation.ts`); una fonte che non è un
 * indirizzo web resta testo.
 */
function fontePdf (fonte: string): HTMLElement {
  const t = testi()
  const web = /^https?:\/\//i.test(fonte)
  return h(
    'p',
    { class: 'calendari-ufficiali__fonte' },
    h('span', { class: 'calendari-ufficiali__etichetta' }, t.pdf),
    web
      ? h(
          'a',
          {
            class: 'calendari-ufficiali__pdf',
            attr: {
              href: fonte,
              target: '_blank',
              rel: 'noopener noreferrer',
              title: `${t.pdfAiuto}\n${fonte}`,
            },
          },
          nomeDelPdf(fonte),
        )
      : h('span', null, fonte),
  )
}

/** Inizio o fine delle lezioni, o il segno che il PDF non la dice. */
function data (iso: string | null): string {
  return iso ? formattaData(iso, 'lungo') : testi().nonScritta
}

/** Due date brevi, dalla prima alla seconda. */
function dalAl (inizio: string, fine: string): string {
  return `${formattaData(inizio)} – ${formattaData(fine)}`
}

/** Un anno del calendario: date delle lezioni, chiusure e PDF. */
function annoDelCalendario (
  calendario: CalendarioUfficiale,
  anno: AnnoUfficiale,
  corrente: string,
): HTMLElement {
  const t = testi()
  const c = testiCalendario()
  const p = parole()
  const importate = periodiImportabili(calendario, anno)
  const ricavate = anno.periodi.filter((periodo) => periodo.derivato)

  return h(
    'div',
    { class: 'calendari-ufficiali__anno', attr: { role: 'group', 'aria-label': anno.annoScolastico } },
    h(
      'div',
      { class: 'calendari-ufficiali__testa' },
      h(
        'dl',
        { class: 'calendari-ufficiali__date' },
        h('div', null, h('dt', null, c.inizioLezioni), h('dd', null, data(anno.inizioAnno))),
        h('div', null, h('dt', null, c.fineLezioni), h('dd', null, data(anno.fineAnno))),
      ),
      anno.annoScolastico === corrente ? pastiglia(t.inCorso, 'informativo') : null,
    ),
    importate.length > 0
      ? tabella({
          variante: 'calendario-ufficiale',
          etichetta: `${anno.annoScolastico} · ${t.chiusure(importate.length)}`,
          intestazione: [
            h('th', null, t.chiusura),
            h('th', null, p.tipo),
            h('th', null, p.dal),
            h('th', null, p.al),
          ],
          righe: importate.map((periodo) =>
            h(
              'tr',
              null,
              h('td', null, periodo.nome),
              h('td', null, t.tipi[periodo.tipo]),
              h('td', null, formattaData(periodo.inizio)),
              h('td', null, formattaData(periodo.fine)),
            ),
          ),
        })
      : quieto(t.nessunaChiusura),
    ricavate.length > 0
      ? quieto(t.nonImportate(
          ricavate.map((periodo) => `${periodo.nome} (${dalAl(periodo.inizio, periodo.fine)})`).join(', '),
        ))
      : null,
    fontePdf(anno.fonte),
  )
}

/**
 * L'anno guardato, per cantone: sopravvive ai ridisegni della pagina, che
 * altrimenti riporterebbero sempre all'anno in corso.
 */
const annoGuardato = new Map<string, string>()

/** Di serie l'anno in corso; se il calendario non lo porta, il primo che viene. */
function annoDiServizio (anni: AnnoUfficiale[], corrente: string): string {
  return (anni.find((anno) => anno.annoScolastico >= corrente) ?? anni[anni.length - 1])?.annoScolastico ?? ''
}

function schedaCalendario (calendario: CalendarioUfficiale): HTMLElement {
  const t = testi()
  const corrente = etichettaAnno(oggi())
  const anni = [...calendario.anni].sort((a, b) => a.annoScolastico.localeCompare(b.annoScolastico))
  const contenuto = h('div', { class: 'calendari-ufficiali__corpo' })

  // Il selettore chiede un ridisegno a ogni scelta: qui è della scheda sola, e
  // il fuoco torna sulla voce accesa, dove le frecce lo aspettano.
  const disegna = (fuoco: boolean): void => {
    const ricordato = annoGuardato.get(calendario.cantone)
    const guardato = anni.some((a) => a.annoScolastico === ricordato) && ricordato
      ? ricordato
      : annoDiServizio(anni, corrente)
    const anno = anni.find((a) => a.annoScolastico === guardato)
    const scelta = selettore(
      guardato,
      anni.map((a) => ({ valore: a.annoScolastico, testo: a.annoScolastico })),
      (valore) => {
        annoGuardato.set(calendario.cantone, valore)
        disegna(true)
      },
      t.anni,
    )
    contenuto.replaceChildren(scelta, ...(anno ? [annoDelCalendario(calendario, anno, corrente)] : []))
    if (fuoco) scelta.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
  }
  disegna(false)

  return scheda({
    titolo: t.titolo(calendario.cantoneNome),
    sottotitolo: t.fonteLetta(calendario.fonte, formattaData(calendario.estrattoIl, 'lungo')),
    aiuto: t.aiuto,
    classe: 'calendari-ufficiali',
    contenuto,
  })
}

/** I «Calendari ufficiali», in fondo alla sezione Chiusure: una scheda per cantone. */
export function schedeCalendariUfficiali (): HTMLElement[] {
  return CALENDARI_UFFICIALI.map(schedaCalendario)
}
