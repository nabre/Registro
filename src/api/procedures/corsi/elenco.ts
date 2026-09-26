import { allieviAttivi } from '../../../domain/calculations.js'
import { classeDelCorsoId, corsiDellAnno, materiaDelCorso } from '../../../domain/courses.js'
import { definisci } from '../../contract.js'
import { elenco, identificatore, nullabile, numero, oggetto, opzionale, testo } from '../../schemas.js'
import { CAMPI_CERCA, filtroTesto, ricerca } from '../common/filters.js'
import { esigiAnno } from '../common/register.js'
import { testi } from './corsi.testi.js'

const t = () => testi().elenco

export const procedura = definisci({
  nome: 'corsi.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    annoId: opzionale(identificatore({ aiuto: () => t().annoId })),
    classeId: opzionale(identificatore({ aiuto: () => t().classeId })),
    materiaId: opzionale(identificatore({ aiuto: () => t().materiaId })),
    ...ricerca(() => t().dove, 'matematica'),
  }),
  uscita: oggetto({
    // L'anno su cui si è risposto, sempre, anche se l'ingresso l'ha omesso (come
    // `dal` e `al` in `corso.presenze`).
    annoId: nullabile(identificatore({ aiuto: () => t().annoIdUscita })),
    anno: testo({ aiuto: () => t().anno }),
    cerca: CAMPI_CERCA.cerca,
    corsi: elenco(oggetto({
      id: testo(),
      titolo: testo(),
      classe: testo(),
      classeId: testo(),
      materia: testo(),
      allievi: numero({ intero: true, aiuto: () => t().allievi }),
      lezioni: numero({ intero: true }),
      fasce: numero({ intero: true, aiuto: () => t().fasce }),
    })),
  }),
  // Impaginata dalla pagina dell'assistente (vedi `api/presentation.ts`).
  presentazione: {
    titolo: () => t().presentazione.titolo,
    blocchi: [
      { tipo: 'valori', campi: [{ campo: 'anno', etichetta: () => t().presentazione.anno }] },
      {
        tipo: 'tabella',
        da: 'corsi',
        colonne: [
          { campo: 'classe', testo: () => t().presentazione.classe },
          { campo: 'materia', testo: () => t().presentazione.materia },
          { campo: 'allievi', testo: () => t().presentazione.persone, formato: 'numero' },
          { campo: 'lezioni', testo: () => t().presentazione.ore, formato: 'numero' },
          { campo: 'fasce', testo: () => t().presentazione.fasce, formato: 'numero' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    // Un anno nominato si esige: c'è solo quello del documento aperto, e un altro
    // id deve dire «non è aperto», non dare un elenco vuoto (vedi le letture in
    // `docs/API.md`).
    if (ingresso.annoId) esigiAnno(ambito, ingresso.annoId)
    const annoId = ingresso.annoId ?? r.annoCorrenteId
    const anno = r.anni.find((a) => a.id === annoId) ?? null
    const { corrisponde } = filtroTesto(ingresso.cerca)

    return {
      annoId: anno?.id ?? null,
      anno: anno?.etichetta ?? '',
      cerca: ingresso.cerca ?? '',
      corsi: corsiDellAnno(r, annoId)
        .filter((corso) => !ingresso.classeId || corso.classeId === ingresso.classeId)
        .filter((corso) => !ingresso.materiaId || corso.materiaId === ingresso.materiaId)
        .filter((corso) =>
          corrisponde([
            corso.titolo,
            classeDelCorsoId(r, corso.id)?.nome ?? '',
            materiaDelCorso(r, corso)?.nome ?? '',
          ].join(' ')),
        )
        .map((corso) => {
          const classe = classeDelCorsoId(r, corso.id)
          return {
            id: corso.id,
            titolo: corso.titolo,
            classe: classe?.nome ?? '—',
            classeId: corso.classeId,
            materia: materiaDelCorso(r, corso)?.nome ?? '—',
            allievi: classe ? allieviAttivi(classe).length : 0,
            lezioni: r.lezioni.filter((l) => l.corsoId === corso.id).length,
            fasce: corso.orario.length,
          }
        }),
    }
  },
})
