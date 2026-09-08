# I pezzi di corpo che più rapporti si scrivevano uguali.
#
# Il quarto strato. _base dice che cosa c'è in testata, _stile quanto è grande,
# _testi come si chiamano le cose, e qui stanno i pezzi interi: un rapporto ne
# richiama uno con «usa: nome» e quel che c'è dentro prende il posto della riga.
#
# Serve a quel che si copiava. L'apertura — titolo, sottotitolo, lo stacco — era
# scritta uguale in tutti e sette i modelli; la griglia dell'appello con la sua
# legenda in due. Due copie della stessa cosa sono due occasioni di dire cose
# diverse, e la seconda si dimentica sempre: cambiando lo stacco da 6 a 8 se ne
# aggiustavano sei e si scordava il settimo.
#
# Non si estende e non si dichiara: vale per tutti i rapporti, come _stile e
# _testi. Un «usa:» che nomina un blocco che non c'è salta quella riga e basta.
#
# Dentro un blocco si scrive tutto quel che si scrive in un corpo, «se:» e
# «ripeti:» compresi. Un blocco che richiama sé stesso, o due che si richiamano
# a vicenda, si fermano al secondo giro invece di girare per sempre.

[blocco: apertura]
# L'inizio di ogni foglio: il titolo grande, la riga grigia sotto, lo stacco
# prima del contenuto. I due parametri si passano così:
#
#   usa: apertura | titolo={{titolo}} — {{classe}}; sottotitolo={{materia}} · {{periodo}}
#
# Sono già riempiti quando arrivano qui: chi chiama scrive i segnaposto del suo
# rapporto e qui dentro c'è già il testo. Un parametro lasciato vuoto non c'è, e
# la sua riga sparisce da sé — un rapporto senza sottotitolo non stampa una riga
# grigia vuota.
titolo: {{titolo}}
sottotitolo: {{sottotitolo}}
spazio: 6

[blocco: riepilogo-appello]
# Come è andato l'appello di un'ora, in due righe. La seconda compare solo se
# ci sono caselle non impostate: un appello a metà si dichiara, ma «zero caselle
# non impostate» è una riga che non dice niente a nessuno.
testo: {{frase.riepilogo-presenze}}
se: {{udSenzaAppello}}
testo: {{frase.appello-incompleto}}
fine:

[blocco: griglia-appello]
# La griglia delle presenze con la sua legenda sotto: una riga per allievo, una
# colonna per unità didattica, le stesse sigle che si compilano a schermo.
#
# La legenda va con la griglia e non dopo, sempre: un foglio che esce dal
# registro finisce in mano a chi quella griglia sullo schermo non l'ha mai
# vista, e la legenda lasciata indietro una volta è una griglia illeggibile.
tabella: presenze
testo: {{frase.legenda-presenze}}
