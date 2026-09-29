# Il fascicolo di classe: quel che si consegna a chi subentra.
#
# Vale per l'anno intero e non per un semestre: recapiti, documenti raccolti e
# comunicazioni non si azzerano a gennaio.

titolo: {{titolo}}
estende: _base

[corpo]
usa: apertura | titolo={{titolo}} — {{classe}}; sottotitolo={{frase.quanti-pif}} · {{periodo}}
campi: {{frase.corsi}}={{corsi}}

sezione: {{frase.persone-in-formazione}}
tabella: allievi
galleria: allievi | colonne 4 | altezza 32

sezione: {{frase.richieste-documenti}}
tabella: richiesteDocumenti
tabella: documenti

sezione: {{frase.comunicazioni}}
tabella: comunicazioni

sezione: {{frase.periodi-di-assenze}}
tabella: assenze
tabella: dettaglioAssenze

sezione: {{frase.pendenze}}
tabella: pendenze

sezione: {{frase.check}}
tabella: check
