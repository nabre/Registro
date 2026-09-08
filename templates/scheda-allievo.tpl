# La scheda di un allievo: profitto, presenze e annotazioni del semestre.
#
# Di un corso solo: mettere due materie nella stessa tabella delle medie dà un
# numero che non è la media di niente.
#
# Le sezioni vuote spariscono da sé: chi non ha annotazioni non si porta a
# casa un titolo seguito dal nulla.

titolo: Scheda dell'allievo
estende: _base

[corpo]
# Chi è, di che classe, di che materia e di che periodo si parla — il nome
# grande, il resto nella riga sotto. La scheda è di un corso solo, e le medie e
# le prove che stanno più sotto sono di quella materia: dirlo solo in testata,
# in corpo piccolo accanto al logo, vuol dire un foglio che si legge come se
# parlasse di tutto.
#
# La classe e non il titolo del corso: «CP — DIC4a» ripeterebbe la classe due
# righe sotto il suo nome, e chi legge cerca la materia, non come si chiama il
# corso nel registro.
#
# Senza corso — una classe che non ne ha nessuno — la materia non c'è, e la
# riga si scrive senza: un separatore appeso al nulla si legge come un dato
# che manca.
se: {{materia}}
usa: apertura | titolo={{allievo}}; sottotitolo={{classe}} · {{materia}} · {{periodo}}
altrimenti:
usa: apertura | titolo={{allievo}}; sottotitolo={{classe}} · {{periodo}}
fine:

# Il ritratto e l'anagrafica alla stessa altezza: da una parte la faccia,
# dall'altra come si raggiunge la persona. È la disposizione di una scheda —
# quello che si guarda insieme, si mette insieme — e «accanto» è quel che dice
# alla foto di tenersi il fianco invece della sua fascia di foglio: senza,
# tre centimetri di ritratto lasciavano tre centimetri di bianco a sinistra.
#
# Senza foto le righe restano dove sono e prendono tutta la larghezza: la
# scheda comincia dai recapiti, come ha sempre fatto.
se: {{foto}}
immagine: {{foto}} | altezza 34 | destra | accanto
fine:

# Tutti in una riga sola di modello, su una colonna sola di foglio: accanto
# alla foto la larghezza è poca, e un indirizzo spezzato in due colonne esce
# troncato. Insieme e non uno per riga perché le etichette si incolonnano fra
# loro — «Datore di lavoro:» decide dove cominciano tutti i valori — e sei
# righe separate non si sarebbero mai viste l'una con l'altra.
#
# Chi non ha un recapito non porta la sua riga: «Azienda: » non dice niente più
# che non scriverlo.
campi: Data di nascita={{nascita}}; Indirizzo={{indirizzo}}; E-mail={{email}}; Telefono={{telefono}}; Tutore={{tutore}}; Azienda={{azienda}}; Indirizzo dell'azienda={{indirizzoDatore}}; Datore di lavoro={{datore}}; Telefono del datore={{telefonoDatore}} | colonne 1

# Il filo chiude l'anagrafica e riporta la riga intera: quel che segue non è
# più di fianco al ritratto, e le tabelle vogliono tutta la larghezza.
filo:

# Le materie subito dopo chi è: è la risposta a «come va?», ed è il motivo per
# cui questo foglio si stampa. Prima stava sotto i conti delle presenze, e per
# leggere la media bisognava scavalcare sette percentuali.
#
# La nota di fine semestre in un riquadro suo: è il numero per cui la scheda si
# stampa, e in una riga di tabella insieme a media e conteggio si leggeva come
# uno dei tre. Media e prove non stanno più qui: sono il totale in fondo alle
# prove, cioè sotto i voti da cui vengono.
#
# Con più corsi la nota non è una sola e il riquadro non ha un numero da
# mostrare: torna la tabella, una riga per corso. «Profitto» e non «Medie per
# corso» perché con un corso solo la colonna del corso non c'è, e un titolo che
# la promette non torna.
sezione: Profitto
se: {{notaSemestre}}
riquadro: Nota di fine semestre={{notaSemestre}}
altrimenti:
tabella: medie
fine:

sezione: Le prove
tabella: prove

# Le presenze dopo il profitto, con i loro conti in testa alla sezione invece
# che sciolti in cima al foglio: quei numeri sono di questa sezione, e da soli
# sotto l'anagrafica sembravano parte dei recapiti.
sezione: Presenze
# Su una colonna, come l'anagrafica: due colonne vogliono dire due tabulatori
# sulla stessa pagina — i valori di destra allineati fra loro e non con quelli
# di sinistra — e su un foglio che si legge dall'alto in basso si vede subito.
campi: UD previste={{udPreviste}}; UD seguite={{udSeguite}}; UD di assenza={{udAssenza}};Ritardi={{ritardi}};  Presenza={{presenza}};Assenza={{assenza}};  Appello fatto su={{appello}}
# L'avviso quando l'assenza supera la soglia della scuola, in un riquadro che
# non si salta leggendo in diagonale: è la ragione per cui questa scheda finisce
# su una scrivania invece che in una cartella. La soglia si cambia nelle
# impostazioni del registro, e a zero l'avviso non esce mai.
se: {{avvisoAssenza}}
avviso: {{avvisoAssenza}}
fine:

paragrafo: {{nota}}

# La stessa griglia dell'appello, riga per ora e colonna per UD: le sigle sono
# quelle che si compilano a schermo. Un elenco delle sole ore storte non
# distingueva l'ora regolare da quella di cui nessuno aveva fatto l'appello, e
# un'assenza di mezza mattina si leggeva come una di tutto il giorno.
sezione: Dettaglio griglia delle presenze
usa: griglia-appello

sezione: Annotazioni
tabella: annotazioni
