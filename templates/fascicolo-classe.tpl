# Il fascicolo di classe: quel che si consegna a chi subentra.
#
# Vale per l'anno intero e non per un semestre: recapiti, documenti raccolti e
# comunicazioni non si azzerano a gennaio.

titolo: Fascicolo di classe
estende: _base

[corpo]
usa: apertura | titolo={{titolo}} — {{classe}}; sottotitolo={{allievi}} allievi · {{periodo}}
campi: Corsi={{corsi}}

sezione: Allievi
tabella: allievi

sezione: Documenti raccolti
tabella: documenti

sezione: Periodi di assenze
tabella: assenze
