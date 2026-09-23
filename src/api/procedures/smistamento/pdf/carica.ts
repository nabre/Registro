import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, nullabile, oggetto, opzionale } from '../../../schemas.js'
import { comeDivisione, divisione } from '../common.js'

/**
 * I PDF scelti dal disco.
 *
 * Non è idempotente e non lo sarà mai: apre un dialogo, e due chiamate di fila
 * sono due dialoghi e — se chi guarda sceglie di nuovo — due copie dello stesso
 * PDF in quarantena. Vale la pena dirlo anche per un altro motivo: chiamata da
 * fuori dal pannello questa procedura **si ferma ad aspettare una persona**.
 * Da una riga di comando o da un condotto si vuole `smistamento.pdf.deposita`,
 * che i byte se li porta dietro.
 *
 * `classeId` non si controlla: una classe che non c'è più oggi lascia comunque
 * entrare il file — resta senza classe, visibile nella pagina «Da smistare» —
 * e rifiutarlo qui vorrebbe dire perdere un PDF arrivato dalla cartella
 * osservata per un id invecchiato.
 */
export const procedura = definisci({
  nome: 'smistamento.pdf.carica',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Sceglie dei PDF dal disco e li porta in quarantena',
  azione: 'smistamento.carica',
  idempotente: false,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    consegnaId: nullabile(identificatore({ aiuto: 'La richiesta a cui appartengono, se la si sa' })),
    classeId: opzionale(nullabile(identificatore({ aiuto: 'La classe da cui si sta caricando' }))),
    divisione: opzionale(divisione()),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => daGestore(smistamento['smistamento.carica'], (i: typeof ingresso) => ({
    tipo: 'smistamento.carica' as const, ...i, divisione: comeDivisione(i.divisione),
  }))(ambito, ingresso),
})
