# Le misure con cui i rapporti vengono disegnati.
#
# È lo strato sotto _base: là stanno intestazione e piede, cioè che cosa si
# scrive; qui quanto è grande il foglio e quanto è grande la scrittura. Tutti i
# modelli lo ereditano passando da _base, e cambiando un numero qui cambiano
# tutti i rapporti insieme.
#
# Stava dentro il codice, in costanti che si potevano toccare solo
# ricompilando — e quindi non si toccavano. Ma «esce troppo piccolo per
# leggerlo», «questa tabella non ci sta in larghezza», «in sede si stampa in
# A3» sono cose che si scoprono usando i rapporti, cioè quando ricompilare non
# è un'opzione.
#
# Un singolo modello può ritoccare queste stesse righe in testa al suo file, e
# vale solo per lui: valutazioni-classe.tpl lo fa già con l'orientamento.
# Una riga che non si capisce viene saltata e vale quella di qui sotto: un
# refuso non fa uscire un rapporto su un foglio di due centimetri.

[stile]

# Il foglio, in millimetri e da diritto: a3 a4 a5 letter legal, oppure le due
# misure scritte a mano — «formato: 210x297». A girarlo ci pensa
# «orientamento:», che resta una cosa del singolo modello.
formato: a4

# I margini del foglio, in millimetri: alto destra basso sinistra.
margini: 20 18 18 18

# I corpi del testo, in punti tipografici. Cinque misure per tutto quel che un
# rapporto contiene: pochi e distanti, perché una scala fitta non si vede.
#   titolo       il titolo grande in cima
#   sottotitolo  la riga sotto, in grigio
#   sezione      le intestazioni di sezione
#   testo        paragrafi, righe, campi, elenchi
#   piccolo      tabelle e grafici
#   banda        intestazione e piede
# «banda» è suo e non «piccolo» come una volta: le due misure si erano trovate
# uguali per caso, ma una testata di tre righe e la griglia dei voti si guardano
# da distanze diverse. Rimpicciolire una tabella perché non ci sta in larghezza
# non deve rimpicciolire il nome della scuola in cima al foglio.
corpo: titolo=17; sottotitolo=11; sezione=12; testo=9.5; piccolo=8; banda=8.5

# Moltiplica tutti i corpi insieme. È la manopola da toccare per prima: «tutto
# un po' più grande» è la richiesta vera, e ritoccare cinque numeri a mano
# tenendo i rapporti fra loro è un lavoro che sbaglia chiunque. 1.15 è una
# stampa che si legge a braccio teso; 0.9 fa stare una lista lunga in una
# pagina sola.
scala: 1

# Quanto è alta una riga di tabella, in multipli del suo corpo. Sotto 1.6 le
# righe si toccano, sopra 2.4 la tabella diventa un elenco.
interlinea: 1.9

# Come si spartisce la larghezza fra le colonne di una tabella.
#   adatta   ognuna prende quel che le serve, misurando quel che c'è dentro,
#            e l'avanzo va a chi pesa di più
#   uguali   tutte larghe uguale, o proporzionali ai pesi dichiarati
# «adatta» è quel che si vuole quasi sempre: con «uguali», la colonna della
# data prende lo stesso spazio di quella dei nomi, e i nomi escono troncati.
colonne: adatta

# Fin dove il testo di una tabella può rimpicciolire pur di non farsi troncare.
# Una griglia con venti prove non ci sta in larghezza a nessun corpo; ma fra
# scrivere «Ros...» e scrivere «Rossi Anna» mezzo punto più piccola, la seconda
# è quella che lascia il foglio leggibile. 0 spegne il rimpicciolimento.
corpo-minimo-tabella: 6
