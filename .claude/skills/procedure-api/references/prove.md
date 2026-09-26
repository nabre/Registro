# Provare una procedura

Le prove dell'API stanno in `tests/api/` e girano sul bundle `dist-tests/api.mjs`
— l'archivio vero sotto, in un grafo solo (vedi `tests/helpers/api.ts`, dove c'è il
perché). `npm run pretest` lo ricostruisce; `npm test` lo fa da sé.

## Indice

- [I file, e a che cosa servono](#i-file-e-a-che-cosa-servono)
- [Dove va la tua prova](#dove-va-la-tua-prova)
- [Che cosa deve provare](#che-cosa-deve-provare)
- [Le prove che leggono il sorgente](#le-prove-che-leggono-il-sorgente)
- [I conti scritti a mano](#i-conti-scritti-a-mano)
- [Quel che non si prova qui](#quel-che-non-si-prova-qui)

## I file, e a che cosa servono

Quelli che una procedura nuova tocca più spesso; in `tests/api/` ce ne sono
altri, uno per argomento, e il loro nome dice che cosa difendono.

| File | Difende |
| --- | --- |
| `schemas.test.mjs` | la convalida da sola: il percorso dell'errore, `opzionale` contro `nullabile` |
| `core.test.mjs` | «si convalida prima di toccare l'archivio»: il giornale, i codici, la busta |
| `bridge.test.mjs` | che innestare una procedura non cambi il comportamento di un'azione |
| `coverage.test.mjs` | che nessuno schema perda un campo dell'azione che prende in carico |
| `procedures.test.mjs` | gli elenchi di valori: che restino quelli del dominio |
| `reads.test.mjs` | che le letture non tocchino niente, e che tornino il conto già fatto |
| `writes.test.mjs` | che un ingresso storto sia rifiutato **prima** di toccare l'archivio |
| `permissions.test.mjs` | il cancello del condotto: `permessoMancante` |
| `assistant.test.mjs` | il cancello del modello: `usaAttrezzo` non esegue una scrittura |
| `tools.test.mjs` | che `resources/tools.json` non sia rimasto indietro |

## Dove va la tua prova

- **una lettura** → `reads.test.mjs`, anche in `leTutte()` e nel conto delle letture
- **una scrittura** → `writes.test.mjs`
- **un elenco di valori nuovo** (`STATI_*`, `GENERI_*`) → anche
  `procedures.test.mjs`
- **un'azione nuova** → il conto in `coverage.test.mjs`
- **un codice d'errore nuovo** → `core.test.mjs`

Non serve un file per procedura: `writes.test.mjs` prova sei scritture scelte
in sei aree diverse, perché la copertura campo per campo la fa già
`coverage.test.mjs` leggendo il protocollo. Quel che manca, e che si aggiunge, è
il caso che quella procedura ha di suo.

## Che cosa deve provare

Quattro cose, in quest'ordine di importanza:

1. **L'ingresso storto non scrive.** Non basta che torni `ok: false`: va
   guardato il contatore dell'archivio.
   ```js
   const prima = archivio.revisione
   const esito = await api.chiama(archivio, 'ore.appello.casella', storto)
   assert.equal(esito.ok, false)
   assert.equal(archivio.revisione, prima)   // non ha scritto niente, nemmeno a metà
   ```
   Una procedura che scrivesse e poi tornasse indietro muoverebbe comunque la
   revisione — l'archivio conta le modifiche, non i risultati — e qui si
   vedrebbe.

2. **Il codice giusto, non solo il rifiuto.** «Non c'è più» e «non si può» si
   ritentano in modo diverso, ed è l'unica cosa che chi chiama da fuori possa
   leggere per decidere.
   ```js
   assert.equal(esito.codice, 'non-trovato')
   assert.equal(esito.campo, 'lezioneId')   // quando il campo è uno solo
   ```

3. **L'ingresso buono passa e scrive davvero.** La revisione sale, e — se la
   procedura crea qualcosa — `esito.dati.creato.id` c'è.

4. **La guardia che hai scritto fa il suo mestiere.** Se hai messo `esigiUd`,
   una `ud` oltre la fine dell'ora deve essere rifiutata: è il caso che nessuna
   prova generica copre, ed è l'unico motivo per cui stai scrivendo una prova
   nuova invece di fidarti di quelle che ci sono.

Per una **lettura**, in più: che non tocchi niente (`archivio.revisione`
invariata) e che la forma dell'uscita sia quella dichiarata — il nucleo la
convalida già, ma una prova che guarda i numeri è quel che dice se il conto è
giusto e non solo ben formato.

## Le prove che leggono il sorgente

Tre prove non guardano il comportamento ma **il testo dei file**, e vanno capite
prima di toccarle:

- `coverage.test.mjs` legge l'unione `Azione` da `src/protocol.ts`, contando
  le graffe — le varianti sono scritte in due stili e un'espressione regolare
  sarebbe più fragile di un contatore.
- `bridge.test.mjs` e `writes.test.mjs` leggono la guardia di
  `rispondiDomanda()` da `src/panels/panel.ts` e la applicano a tutte le
  procedure.

Sono fatte così apposta: verificare che ogni procedura *dichiari* un genere non
prova che il pannello lo *guardi*. Una rifattorizzazione che spostasse la guardia
due righe più giù lascerebbe verde una prova sul solo elenco, e il registro
scoperto. Se una di queste fallisce dopo una tua modifica, leggi il messaggio:
quasi sempre ti sta dicendo che hai spostato qualcosa che quella prova cercava
per nome.

## I conti scritti a mano

```js
assert.equal(AZIONI.size, 163, `azioni trovate: ${AZIONI.size}`)   // coverage.test.mjs
```

Quel numero è scritto a mano **apposta**: se cambia, è cambiato il protocollo, e
va visto. Non è un fastidio da mettere a tacere: è il punto in cui qualcuno si
accorge che è nata un'azione. Quando aggiungi o togli un'azione, aggiorna il
numero **e** il commento che spiega perché è cambiato — quel commento è la
memoria di come si è arrivati fin lì.

Lo stesso vale per il conto delle letture in `reads.test.mjs`
(`dichiarate.length`), accanto a `leTutte()`: una lettura nuova va in tutti e
due. `bridge.test.mjs` invece non tiene un conto: controlla solo che il
protocollo si legga (`> 100` tipi trovati).

## Quel che non si prova qui

- **Le procedure che aprono dialoghi di sistema** (`smistamento.pdf.carica`,
  `documento.apri` senza percorso; l'elenco intero sta in `docs/API.md`, § 7) e **quelle che escono in rete** (`posta.*`, `mappa.geocodifica`):
  si fermerebbero ad aspettare una persona o una risposta. Se la tua è di
  queste, prova la guardia e non il giro intero.
- **Il lavoro del gestore**: è già provato altrove — la logica nel dominio
  (`tests/domain/`), i gestori nelle prove dell'API (`tests/api/`). Una procedura che
  passa la palla con `daGestore` non ha bisogno di riprovare quel che il gestore
  fa; ha bisogno di provare quel che la procedura aggiunge — lo schema e le
  guardie.
