# La griglia dei voti di un corso: quella che si guarda in conferenza.
#
# Di un corso e non di una classe: la media in fondo alla griglia è la sua, e
# mescolare le prove di due materie darebbe un numero che non è la media di
# niente. Una classe con quattro corsi fa quattro fogli.
#
# In orizzontale perché le colonne sono una per prova, e verticale non ci stanno.

titolo: {{titolo}}
estende: _base
orientamento: orizzontale
margini: 18 14 16 14

[corpo]
usa: apertura | titolo={{titolo}} — {{classe}}; sottotitolo={{materia}} · {{periodo}} · {{frase.quanti-momenti}}

sezione: {{frase.voti-e-medie}}
tabella: voti

# La stessa griglia, con le date al posto dei voti: quando ognuno ha fatto la
# prova — il giorno del recupero, per chi l'ha rifatta — e quando se l'è
# riavuta. Sono le due domande che arrivano dopo il voto, e prima stavano
# sparse fra le tre tabelle qui sotto.
sezione: {{frase.esecuzione-e-riconsegna}}
paragrafo: {{frase.esecuzione-riconsegna}}
tabella: esecuzioni

sezione: {{frase.i-momenti}}
tabella: momenti

# Le caselle vuote della griglia hanno una spiegazione, e sta qui: chi non
# c'era, quando rifà la prova, che voto ne è uscito. Senza, un buco sembra una
# dimenticanza — ed è la prima domanda che arriva in conferenza.
sezione: {{frase.recuperi}}
tabella: recuperi

# Chi non ha ancora riavuto il suo compito: la classe l'ha riavuto il giorno in
# cui lo si è ridistribuito, chi mancava no.
sezione: {{frase.da-ridare}}
tabella: daRidare
