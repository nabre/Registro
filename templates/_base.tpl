# Intestazione e piè di pagina comuni a tutti i rapporti.
#
# Ogni altro modello scrive «estende: _base» e li eredita: cambiando questo
# file cambiano tutti i rapporti insieme, che è il motivo per cui esiste.
#
# Sotto c'è _stile.tpl, con le misure del foglio e dei caratteri. Sono due file
# e non uno perché si toccano per motivi diversi: qui si cambia che cosa c'è
# scritto in testata — il nome della scuola, la sede — là quanto è grande.
# Estendendo _base si eredita anche _stile, e non c'è niente da dichiarare.
# Un modello che dichiara un'intestazione sua tiene la sua, e questa non lo
# tocca — così un rapporto particolare non obbliga a complicare la regola
# comune.
#
# In testata c'è che documento è. Un foglio esce dalla sua cartella di
# continuo — lo si allega a una mail, lo si stampa, lo si mette in una pila
# sulla scrivania — e senza il nome del documento in cima si riconosce solo
# leggendolo. Vale anche per la seconda pagina, che di solito è quella che si
# ritrova staccata dalle altre.
#
# Segnaposto sempre disponibili:
#   {{titolo}}   come si chiama il rapporto
#   {{anno}}     l'anno scolastico in corso
#   {{periodo}}  il semestre di cui parla, o «anno intero»
#   {{classe}}   la classe di cui parla, se ne ha una
#   {{materia}}  la materia, se ne ha una
#   {{corso}}    classe e materia insieme: nel registro il corso è la coppia
#   {{generato}} la data in cui è stato composto
#   {{pagina}} {{pagine}}  disponibili solo in intestazione e piede

titolo: Rapporto
estende: _stile
orientamento: verticale

[intestazione]
# Il logo della sede, in alto a destra. Il file sta in «templates/», PNG o
# JPEG. Si dichiara la sola altezza, in millimetri: la larghezza viene da sé
# dalle proporzioni del file, e dichiararle tutte e due vorrebbe dire poterle
# sbagliare — un logo schiacciato su un foglio che va in segreteria si nota.
# La banda cresce per contenerlo, e le righe qui sotto si stringono per non
# finirgli sotto: toglierlo rimette tutto com'era, senza toccare altro.
immagine: logo.jpg | altezza 14 | destra

# Tre righe a destra e due a sinistra, come su un foglio intestato: a destra
# il contesto — dove, che cosa, a chi — e a sinistra, in fondo, che cos'è il
# foglio: «Registro scolastico» e sotto che documento è. Chi ritrova un foglio
# staccato dagli altri legge da sinistra da dove viene e come si chiama, e a
# destra trova tutto il resto senza doverlo cercare nel corpo.
#
# Le righe si impilano nell'ordine in cui sono scritte, la prima in alto, e
# quelle di sinistra stanno sulle ultime due perché è lì che i due blocchi si
# allineano: un titolo a mezz'aria accanto a tre righe è un titolo che sembra
# appartenere alla riga sbagliata.
#
# «{{frase.sede}}» viene da _testi.tpl: è il nome del reparto o della scuola,
# si scrive una volta là e vale per tutti i rapporti. Vuoto, la riga sparisce
# da sé e ne restano due.
#
# Una cella scritta fra «**» esce in grassetto. Serve al nome del documento:
# è quel che si cerca per primo su un foglio staccato dagli altri, e in mezzo a
# righe tutte dello stesso peso non si trova. Vale per la cella intera, non per
# pezzi di frase.
riga: | | {{frase.sede}}
riga: Registro scolastico | | {{materia}}
riga: **{{titolo}}** | | {{classe}} · {{anno}} · {{periodo}}

[piede]
# Chi firma a sinistra, quando è stato composto in mezzo, dove si è nel
# documento a destra. «{{frase.docente}}» sta in _testi.tpl accanto alla sede:
# è il nome che va sotto ogni foglio che esce, e non cambia da un rapporto
# all'altro.
riga: {{frase.docente}} | {{generato}} | pagina {{pagina}} di {{pagine}}
