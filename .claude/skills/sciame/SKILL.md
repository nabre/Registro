---
name: sciame
description: >
  Come si conduce un «giro di sciame» su Regiclass — il modo di lavorare
  che la decisione D1 di `docs/CANTIERE.md` ha reso il modo di lavorare del
  progetto: si esplora in parallelo su dimensioni disgiunte, si verifica in modo
  avversariale, si applica su perimetri di file che non si sovrappongono, e si
  lasciano le pendenze nel cantiere. Da usare quando si chiede di cercare difetti su
  tutto il progetto, di migliorare un'area larga, di «usare degli agenti» o uno
  sciame, di fare un giro di revisione, di riordinare qualcosa che tocca molti
  file — e ogni volta che un lavoro è più grande di quel che una lettura sola
  tiene in testa.
---

# Un giro di sciame

I giri già fatti stanno nella storia di git (`git log -i --grep=giro`, e i
commit che toccano `docs/CANTIERE.md`).
Leggili prima di cominciarne un altro: dicono che cosa ha reso e che cosa no.

Il giro ha tre tempi, e l'ordine non è negoziabile — è D1: **si esplora in
parallelo, si verifica in modo avversariale, si applica in sequenza.**

## Tempo zero: la linea di partenza

Prima di lanciare qualunque agente, l'albero dev'essere verde e tu devi saperlo.
Il rituale sta nella skill `verifica`; qui basta il risultato: `tsc` pulito,
`eslint` senza errori, `npm test` verde, i sei controlli statici a posto, e
`npm run ui-tests` se si toccherà il pannello.

**Salva i numeri.** Quante prove passano oggi. Quali avvisi ci sono già. Alla
fine del giro dovrai distinguere quel che hai rotto tu da quel che era rotto
prima — e con cinque agenti che scrivono insieme, quella distinzione non si
ricostruisce a memoria.

## Primo tempo: esplorare

**Una dimensione per agente, in sola lettura.** La dimensione non è una cartella:
è una domanda. «Gli scaricamenti dei componenti esterni» è una dimensione;
«`src/data/`» non lo è, perché non dice che cosa cercare.

Nel prompt di ogni esploratore vanno sempre queste cose:

1. **Il contesto del progetto in quattro righe** — Electron, TypeScript, nomi
   italiani, i cinque strati, il documento `.regi`. Un agente che non sa
   dov'è non sa che cosa sia strano.
2. **I file da cui partire, con il percorso.** Non «guarda l'area dei modelli»:
   l'elenco dei file. Risparmia il 30% del lavoro e migliora quel che trova.
3. **Le piste, in ordine di resa attesa.** Sei o sette, concrete. «Cerca i bug»
   non è una pista; «valori ricordati fra un avvio e l'altro che possono puntare
   a entità sparite dopo un cambio di documento» lo è.
4. **Il formato della risposta**, con il tetto di righe. Una tabella
   `file:riga | severità | che cosa succede | correzione | fiducia`, e per ogni
   reperto alto il codice che lo dimostra.
5. **La regola dello scettico**: *prima di scrivere un reperto, cerca il codice
   che lo smentisce*. Una guardia, una riconvalida, un `disabled`. Il tasso di
   falsi positivi conta più del numero di reperti.
6. **Le ipotesi cadute**, chieste esplicitamente. Sono la metà del valore del
   rapporto: dicono che cosa non serve più guardare, e il giro dopo parte da lì.
   Nel giro 2 quattro dimensioni su otto hanno reso **zero reperti**, ed è stato
   un risultato.
7. **Uno scenario concreto per ogni reperto.** «Può esserci una gara» non è un
   reperto; «due clic sulla stessa casella entro il giro di IPC scrivono
   *presente* due volte» lo è, e infatti era vero.

Nel giro 1 c'era uno **scettico avversariale per dimensione**, che rileggeva i
reperti del cacciatore: 42 reperti, 39 confermati, 3 confutati. Con un tasso di
confutazione così basso, dal giro 2 lo scettico è stato sostituito dalla regola
6 dentro il prompt del cacciatore, più la rilettura a mano dei soli «alto».
Se una dimensione è delicata — sicurezza, soldi, dati di minorenni — lo scettico
separato torna a valere il suo costo.

## Secondo tempo: leggere, e riverificare a mano

**I reperti «alto» si riverificano uno per uno prima di toccarli.** Non è
sfiducia: è che un reperto descritto con precisione e sbagliato nel merito costa
più di un reperto mancato. Nel giro 1 tutti e dieci gli alti hanno retto; nel
giro 3 il più grave — un deposito che cancellava l'intero file delle
impostazioni — è stato riprodotto a mano prima di scrivere una riga di
correzione.

Quel che non si corregge subito **va scritto nel cantiere**, con il file e la
riga. Un reperto che resta in una conversazione è un reperto perso.

## Terzo tempo: applicare

Qui si sbaglia, e si sbaglia in un modo solo: **due agenti che scrivono nello
stesso file.** La regola è una riga:

> A ogni applicatore si dà un **perimetro di file esplicito**, e i perimetri non
> si toccano.

E siccome gli altri stanno scrivendo mentre lui verifica, nel prompt va anche
questo:

> `tsc`, `eslint` e `npm test` possono segnalare cose **fuori dal tuo
> perimetro**: non sono tue. Verifica che il file non sia tuo, tira dritto, e
> scrivilo nel rapporto. Non correggere i file altrui.

Quando un applicatore trova una correzione che cade fuori dal suo perimetro —
succede sempre — **non la fa**: la scrive nel rapporto, per intero e pronta da
incollare, e la raccoglie chi conduce il giro. È il pezzo che fa funzionare la
divisione: senza, ogni agente sconfina «solo per una riga».

**Che cosa va tenuto per ultimo, da solo:** i cambiamenti al cuore — `chiama()`,
`dom.ts`, il protocollo, l'archivio. Un cambiamento che tocca tutto va verificato
su un albero fermo, o non si sa che cosa ha rotto.

**Ogni difetto grave corretto vuole una prova che sarebbe stata rossa prima.**
È la cosa che il cantiere ha chiesto per due giri di fila senza ottenerla; se
non si riesce a provarlo, si scrive perché, invece di aggiungere una prova che
non prova niente.

## Il conto alla fine

1. Il rituale di verifica per intero (skill `verifica`), confrontato con la linea
   di partenza del tempo zero.
2. Il resoconto del giro — quante dimensioni, quanti reperti, quanti alti, che
   cosa **non** era un difetto — va nel messaggio di commit, non nei documenti.
   In `docs/CANTIERE.md` vanno solo le pendenze, nell'area che le riguarda.
   Quando una voce è chiusa **si cancella**: il file è un tavolo da lavoro, non
   un archivio.
3. Quel che ha cambiato una decisione strutturale migra in `docs/DECISIONI.md`.
4. I conteggi nelle docs si **ricontano**, non si ricordano: `npm run procedures`
   li stampa e legge il testo senza compilare.

## Quanto costa

Per taratura: il giro 1 sono stati 20 agenti, 3,6 milioni di token e 19 minuti
per 42 reperti. Il giro 3 — sei esploratori e sei applicatori — ha reso 96
reperti e 16 alti. Un esploratore su una dimensione ben scritta costa circa
200 000 token e dieci-quindici minuti.

Non è il modo giusto per una correzione che si sa già fare: per quella si apre
il file e si corregge.
