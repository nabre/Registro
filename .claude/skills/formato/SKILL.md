---
name: formato
description: >
  Come si cambia la forma dei dati che Regiclass scrive nei
  documenti `.regi`, senza lasciare indietro quelli già scritti: il numero
  `VERSIONE_DATI` in `src/domain/models.ts`, il passo del formato in
  `src/domain/upgrades.ts` (`PASSI_DEL_FORMATO`, `porta`), la normalizzazione
  che mette i predefiniti, il documento campione di ogni versione in
  `tests/samples/formato/` (`npm run sample`), l'impronta dei campi
  (`AGGIORNA_IMPRONTA=1 npm test`), e che cosa succede aprendo un documento
  vecchio — copia in `versioni-precedenti/`, riscrittura intera, avviso. Da
  usare ogni volta che si aggiunge, toglie, rinomina o sposta un campo di
  `models.ts` che finisce su disco (Registro, Impostazioni, Lezione, Corso,
  Classe, Piano, …), quando si parla di migrazioni, retrocompatibilità,
  versione del file, «documento vecchio», «formato», compatibilità fra due
  registri sulla stessa cartella OneDrive, o quando una prova dice «alza
  VERSIONE_DATI» o «manca tests/samples/formato».
---

# La forma dei dati, e i documenti di ieri

Un documento `.regi` vive più a lungo del registro che l'ha scritto: si
apre a giugno quello di settembre, un anno chiuso si rilegge dopo tre anni, e
sulla stessa cartella OneDrive possono lavorare due computer con due versioni
del programma. La forma dei dati quindi **non si cambia mai da sola**: si
cambia insieme al numero che la dichiara, al passo che porta i documenti
vecchi alla forma nuova, e al campione che prova che il passo funziona.

## I due versi della compatibilità

| Chi apre | Che cosa succede | Dove |
| --- | --- | --- |
| Un registro **più nuovo** del documento | Lo porta alla forma di oggi un passo alla volta, ne mette da parte una copia com'era, lo riscrive intero con il numero nuovo e lo dice | `aggiornaFormato` in `src/domain/upgrades.ts`; `portaAlFormato` e `copiaPrimaDelFormato` in `src/data/archive.ts` |
| Un registro **più vecchio** del documento | Lo rifiuta con la finestra «viene da un registro più recente»: aprirlo vorrebbe dire scartare i campi che non conosce e cancellarli alla prima scrittura | `fraseVersionePiuRecente` / `versionePiuRecente` in `upgrades.ts`; `prendiPacchetto` in `archive.ts`; la finestra in `src/environment/dialogs.ts` |

Il secondo verso è il motivo per cui **anche un campo solo aggiunto alza il
numero**: senza, il registro di ieri aprirebbe il documento di oggi e se lo
mangerebbe.

**L'estensione non è il formato.** `VERSIONE_DATI` descrive il contenuto e
non il suffisso `.regi`; anche il `FORMATO` del manifesto
(`registro-docenti/anno`) è indipendente dall'estensione.

## Il giro, per ogni cambiamento della forma

1. **Il modello.** Il campo in `src/domain/models.ts`, con il commento che
   dice che cosa vuol dire e perché sta nel documento.
2. **La lettura.** La normalizzazione in `src/domain/normalization.ts` gli dà
   il valore di serie quando manca e raddrizza quel che non torna: è la rete
   per i file scritti a mano e per quelli vecchi.
3. **Il numero.** `VERSIONE_DATI` sale di uno, e nel commento sopra di lui
   si aggiunge il capitolo `N-1 → N`: che cosa arriva, e perché il numero sale.
4. **Il passo.** In `PASSI_DEL_FORMATO` (`src/domain/upgrades.ts`) il passo
   `passo(N, porta?)`, e la frase che dice che cosa cambia nel catalogo
   `src/domain/upgrades.testi.ts`, chiave `passi[N]`, in tutte e quattro le
   lingue (ADR-38, skill `testi`): chi apre un documento vecchio la legge
   nella lingua del registro, e un passo senza frase in una lingua non compila.
   - Campo **nuovo** con un predefinito: basta così, senza `porta` — lo mette
     la normalizzazione.
   - Campo **rinominato**, **spostato** fra collezioni, **unità cambiata**,
     dato **ricavato** da altri: serve `porta`, che riceve i dati grezzi
     (`registro` per l'intestazione, e una voce per collezione: `classi`,
     `lezioni`, …) in una copia sua e li torna nella forma nuova. Pura, senza
     disco, senza orologio. Una prova sua in `tests/domain/upgrades.test.mjs`
     con i dati di prima e quelli attesi.
   - Campo **tolto**: il numero non serve (il registro vecchio lo rimette
     vuoto senza perdere niente), ma se il dato va salvato altrove è un passo
     con `porta`.
5. **Il campione.** `npm run sample` fissa in `tests/samples/formato/` il
   documento della versione nuova (`v1.regi` è quello della 1) se non c'è: è un documento vero, scritto dall'archivio vero. Se il campo
   nuovo va provato fino in fondo, prima si mette nel campione in
   `tools/sample.mjs` (come le pause e `minutiUd`), poi si lancia. **I campioni
   non si riscrivono mai**: sono la storia, e servono proprio perché li ha
   scritti il codice di allora.
6. **L'impronta.** `AGGIORNA_IMPRONTA=1 npm test` riscrive
   `tests/domain/migrationImpronta.json` con i campi e il numero nuovo.
7. **Le prove** che fanno la guardia, tutte in `npm test`:
   - `tests/domain/migrationVersion.test.mjs` — campo nuovo con lo stesso
     numero è rosso;
   - `tests/domain/upgrades.test.mjs` — l'elenco dei passi arriva a
     `VERSIONE_DATI` senza buchi, e ogni passo dice che cosa cambia;
   - `tests/data/formatUpgrade.test.mjs` — c'è il campione della versione di
     oggi, e ogni campione si apre intero, si porta avanti con copia e avviso,
     si riscrive con il numero nuovo e riaperto non ha più niente da portare.
8. **I documenti.** `docs/MODELLO-DATI.md` §8.2 (il capitolo della versione),
   il campo nella tabella della sua entità, e `docs/CATALOGO.md` se è
   un'impostazione del documento. Poi il rituale della skill `verifica`.

## Che cosa vede chi apre un documento vecchio

- Una finestra, una volta: «X.regi è stato scritto da un registro più
  vecchio, e l'ho portato dal formato N al successivo: … La copia com'era sta in …».
  Il testo lo compone `raccontaAggiornamento` con le frasi `cambia` dei
  passi: **scrivile per chi insegna**, non per chi programma.
- La copia sta nella cartella gemella, `‹nome›/versioni-precedenti/‹nome›.formato-N.regi`:
  si riapre con il registro di allora. Non si rifà se c'è già — la prima è
  quella com'era davvero.
- Se la copia non si riesce a fare, il documento **non** si riscrive
  all'apertura: resta al suo formato finché qualcuno non lo modifica, e si
  dice anche questo.

## Gli errori da non fare

- **Alzare il numero senza il passo, o il passo senza il campione.** Le prove
  lo dicono, ma il perché è questo: il passo racconta a chi apre che cosa è
  cambiato, il campione prova che un documento di prima si apre ancora.
- **Rigenerare un campione vecchio** perché una prova è rossa. La domanda
  giusta è «che cosa succede ai documenti già scritti?»: un campione
  riscritto dal codice di oggi non prova più niente sul passato.
- **Mettere la migrazione nella normalizzazione quando è uno spostamento.**
  La normalizzazione raddrizza e riempie; non sa da che versione viene un
  dato. Un campo che cambia nome letto in normalizzazione «da una parte o
  dall'altra» resta lì per sempre: in un passo si fa una volta, e il file
  riscritto non lo porta più.
- **Toccare i dati letti dentro `porta`** pensando che siano i propri: sono
  una copia, ma la copia è una sola per tutto il giro — un passo lascia i
  dati al successivo.
- **Confondere i due numeri.** `VERSIONE_DATI` è la forma del JSON;
  `VERSIONE_PACCHETTO` (`src/data/package.ts`) è il contenitore ZIP, con il
  suo manifesto. Cambia il secondo solo chi cambia com'è fatto l'archivio.
