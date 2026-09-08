# La parete di ritratti di una classe: una faccia, un nome sotto.
#
# Serve alle prime settimane — venticinque nomi da imparare, e un elenco
# alfabetico non insegna a chiamare per nome chi alza la mano — e a chi
# sostituisce per un'ora: si porta il foglio in aula e sa con chi sta parlando.
#
# Vale per l'anno intero e non per un semestre: le facce non cambiano a
# gennaio.

titolo: Foto della classe
estende: _base

[corpo]
usa: apertura | titolo={{titolo}} — {{classe}}; sottotitolo={{allievi}} allievi · {{anno}}

# La griglia: quante caselle per riga, e quanto è alta la foto in millimetri.
# Quattro colonne su un A4 fanno un ritratto largo circa quattro centimetri —
# si riconosce una faccia da un braccio di distanza, che è come si guarda un
# foglio appoggiato sulla cattedra. A tre si vede meglio e si va a due pagine,
# a sei ci sta una classe intera in mezzo foglio e si riconosce solo chi si
# conosce già.
#
# Chi non ha la foto tiene la sua casella con il posto segnato: una griglia che
# salta i senza foto è una griglia in cui i nomi si spostano, e chi manca è
# proprio quello che si sta cercando.
galleria: allievi | colonne 4 | altezza 32
