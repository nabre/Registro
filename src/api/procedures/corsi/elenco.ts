import { allieviAttivi } from '../../../domain/calculations.js'
import { classeDelCorsoId, corsiDellAnno, materiaDelCorso } from '../../../domain/courses.js'
import { definisci } from '../../contract.js'
import { elenco, identificatore, nullabile, numero, oggetto, opzionale, testo } from '../../schemas.js'
import { filtroTesto, ricerca } from '../common/filters.js'
import { esigiAnno } from '../common/register.js'

export const procedura = definisci({
  nome: 'corsi.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: 'I corsi dell’anno: classe, materia, quante ore a calendario',
  idempotente: true,
  ingresso: oggetto({
    annoId: opzionale(identificatore({ aiuto: 'Senza, l’anno in uso' })),
    classeId: opzionale(identificatore({ aiuto: 'Solo i corsi di questa classe' })),
    materiaId: opzionale(identificatore({ aiuto: 'Solo i corsi di questa materia' })),
    ...ricerca('titolo, classe o materia', 'matematica'),
  }),
  uscita: oggetto({
    // L'anno su cui si è risposto, sempre: l'ingresso lo lascia omettere — «senza,
    // l'anno in uso» — e una busta che non dice quale sia costringe chi legge a
    // fidarsi di aver indovinato. È la stessa scelta di `corso.presenze`, che
    // rimanda `dal` e `al` anche quando non gliel'hanno passati.
    annoId: nullabile(identificatore({ aiuto: 'L’anno di cui sono i corsi' })),
    anno: testo({ aiuto: 'Come si chiama: «2026/2027». Vuoto se non c’è nessun anno' }),
    cerca: testo({ aiuto: 'Il filtro di testo applicato. Vuoto quando non se n’è chiesto' }),
    corsi: elenco(oggetto({
      id: testo(),
      titolo: testo(),
      classe: testo(),
      classeId: testo(),
      materia: testo(),
      allievi: numero({ intero: true, aiuto: 'Quante persone frequentano' }),
      lezioni: numero({ intero: true }),
      fasce: numero({ intero: true, aiuto: 'Le fasce orarie fisse dichiarate' }),
    })),
  }),
  // Quel che la pagina dell'assistente disegna da sé: il modello non ricopia
  // più tre colonne per corso. Vedi `api/presentation.ts`.
  presentazione: {
    titolo: 'I corsi dell’anno',
    blocchi: [
      { tipo: 'valori', campi: [{ campo: 'anno', etichetta: 'Anno scolastico' }] },
      {
        tipo: 'tabella',
        da: 'corsi',
        colonne: [
          { campo: 'classe', testo: 'Classe' },
          { campo: 'materia', testo: 'Materia' },
          { campo: 'allievi', testo: 'Persone', formato: 'numero' },
          { campo: 'lezioni', testo: 'Ore', formato: 'numero' },
          { campo: 'fasce', testo: 'Fasce', formato: 'numero' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    // Un anno nominato si esige. Gli anni caricati sono uno solo — quello del
    // documento aperto — e senza questa guardia l'id di un altro anno tornava
    // un elenco vuoto: «quel corso non c'è» detto quando la risposta vera è
    // «quel documento non è aperto», che è lo sbaglio che il § delle letture
    // in `docs/API.md` chiama per nome.
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
