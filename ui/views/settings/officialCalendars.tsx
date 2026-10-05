// I calendari scolastici ufficiali che il registro porta con sé, in sola
// lettura: per ogni anno quel che un anno nuovo importerebbe (inizio, fine,
// chiusure) e il PDF da cui è stato letto. Mostra le stesse voci che importa
// `bozzaDaAnnoUfficiale`, cioè `periodiImportabili`: quel che si vede qui è
// quel che arriva nel documento.

import { useLayoutEffect, useRef, useState, type ReactElement } from 'react'

import { Pastiglia, Quieto, Scheda, Selettore } from '#ui/components/base.js'
import { Tabella } from '#ui/components/table.js'
import { etichettaAnno, formattaData, oggi } from '#core/dominio/dates.js'
import {
  CALENDARI_UFFICIALI,
  periodiImportabili,
  type AnnoUfficiale,
  type CalendarioUfficiale,
} from '#core/dominio/schoolCalendar.js'
import { testi as testiCalendario } from '#core/dominio/schoolCalendar.testi.js'
import { parole } from '#core/dominio/words.testi.js'
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
function fontePdf (fonte: string): ReactElement {
  const t = testi()
  const web = /^https?:\/\//i.test(fonte)
  return (
    <p className="calendari-ufficiali__fonte">
      <span className="calendari-ufficiali__etichetta">{t.pdf}</span>
      {web
        ? (
            <a
              className="calendari-ufficiali__pdf"
              href={fonte}
              target="_blank"
              rel="noopener noreferrer"
              title={`${t.pdfAiuto}\n${fonte}`}
            >
              {nomeDelPdf(fonte)}
            </a>
          )
        : <span>{fonte}</span>}
    </p>
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
): ReactElement {
  const t = testi()
  const c = testiCalendario()
  const p = parole()
  const importate = periodiImportabili(calendario, anno)
  const ricavate = anno.periodi.filter((periodo) => periodo.derivato)

  return (
    <div className="calendari-ufficiali__anno" role="group" aria-label={anno.annoScolastico}>
      <div className="calendari-ufficiali__testa">
        <dl className="calendari-ufficiali__date">
          <div><dt>{c.inizioLezioni}</dt><dd>{data(anno.inizioAnno)}</dd></div>
          <div><dt>{c.fineLezioni}</dt><dd>{data(anno.fineAnno)}</dd></div>
        </dl>
        {anno.annoScolastico === corrente ? <Pastiglia testo={t.inCorso} tono="informativo" /> : null}
      </div>
      {importate.length > 0
        ? (
            <Tabella
              variante="calendario-ufficiale"
              etichetta={`${anno.annoScolastico} · ${t.chiusure(importate.length)}`}
              intestazione={(
                <>
                  <th>{t.chiusura}</th>
                  <th>{p.tipo}</th>
                  <th>{p.dal}</th>
                  <th>{p.al}</th>
                </>
              )}
              righe={importate.map((periodo) => (
                <tr key={`${periodo.nome}:${periodo.inizio}`}>
                  <td>{periodo.nome}</td>
                  <td>{t.tipi[periodo.tipo]}</td>
                  <td>{formattaData(periodo.inizio)}</td>
                  <td>{formattaData(periodo.fine)}</td>
                </tr>
              ))}
            />
          )
        : <Quieto>{t.nessunaChiusura}</Quieto>}
      {ricavate.length > 0
        ? (
            <Quieto>
              {t.nonImportate(
                ricavate.map((periodo) => `${periodo.nome} (${dalAl(periodo.inizio, periodo.fine)})`).join(', '),
              )}
            </Quieto>
          )
        : null}
      {fontePdf(anno.fonte)}
    </div>
  )
}

/**
 * L'anno guardato, per cantone: sopravvive anche lasciando la pagina, che
 * altrimenti riporterebbe sempre all'anno in corso.
 */
const annoGuardato = new Map<string, string>()

/** Di serie l'anno in corso; se il calendario non lo porta, il primo che viene. */
function annoDiServizio (anni: AnnoUfficiale[], corrente: string): string {
  return (anni.find((anno) => anno.annoScolastico >= corrente) ?? anni[anni.length - 1])?.annoScolastico ?? ''
}

function SchedaCalendario ({ calendario }: { calendario: CalendarioUfficiale }): ReactElement {
  const t = testi()
  const corrente = etichettaAnno(oggi())
  const anni = [...calendario.anni].sort((a, b) => a.annoScolastico.localeCompare(b.annoScolastico))
  // La scelta è della scheda sola: si rifà lei, non la pagina.
  const [ricordato, ricorda] = useState(() => annoGuardato.get(calendario.cantone))
  const corpo = useRef<HTMLDivElement | null>(null)
  const daFocalizzare = useRef(false)
  const guardato = anni.some((a) => a.annoScolastico === ricordato) && ricordato
    ? ricordato
    : annoDiServizio(anni, corrente)
  const anno = anni.find((a) => a.annoScolastico === guardato)

  // Dopo una scelta il fuoco va sulla voce accesa, dove le frecce lo aspettano.
  useLayoutEffect(() => {
    if (!daFocalizzare.current) return
    daFocalizzare.current = false
    corpo.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
  })

  return (
    <Scheda
      titolo={t.titolo(calendario.cantoneNome)}
      sottotitolo={t.fonteLetta(calendario.fonte, formattaData(calendario.estrattoIl, 'lungo'))}
      aiuto={t.aiuto}
      classe="calendari-ufficiali"
    >
      <div ref={corpo} className="calendari-ufficiali__corpo">
        <Selettore
          valore={guardato}
          voci={anni.map((a) => ({ valore: a.annoScolastico, testo: a.annoScolastico }))}
          al={(valore) => {
            annoGuardato.set(calendario.cantone, valore)
            daFocalizzare.current = true
            ricorda(valore)
          }}
          etichetta={t.anni}
        />
        {anno ? annoDelCalendario(calendario, anno, corrente) : null}
      </div>
    </Scheda>
  )
}

/** I «Calendari ufficiali», in fondo alla sezione Chiusure: una scheda per cantone. */
export function schedeCalendariUfficiali (): ReactElement {
  return <>{CALENDARI_UFFICIALI.map((calendario) => <SchedaCalendario key={calendario.cantone} calendario={calendario} />)}</>
}
