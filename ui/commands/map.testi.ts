// I testi dei comandi della mappa (`map.ts`). La guida cita i nomi dei pulsanti
// fra virgolette: cambiandone uno va cambiato anche là, in tutte le lingue.

import { catalogo } from '#core/i18n/index.js'

const it = {
  // La mappa.
  trovaIndirizzi: 'Trova gli indirizzi',
  trovaIndirizziAiuto:
    'Chiede a OpenStreetMap dove cadono gli indirizzi che non hanno ancora un punto. ' +
    'È l’unico gesto del registro che manda fuori un dato dell’anagrafica, ed è per questo ' +
    'che si preme a mano: la risposta resta scritta, e non si richiede più.',
  tuttiTrovati: 'Ogni indirizzo scritto ha già il suo punto sulla mappa.',
  rifaiIndirizzi: 'Rifai gli indirizzi',
  rifaiIndirizziAiuto:
    'Richiede anche quelli che un punto ce l’hanno già: serve quando un indirizzo ' +
    'incompleto è caduto nel paese sbagliato, e lo si è corretto nell’anagrafica.',
  rifareTitolo: 'Rifare tutti gli indirizzi?',
  rifareTesto:
    'Gli indirizzi delle classi in mappa tornano al geocodificatore, anche quelli ' +
    'già risolti. Ci vuole circa un secondo per indirizzo.',
  rifai: 'Rifai',
  inquadra: 'Inquadra tutto',
  inquadraAiuto:
    'Riporta la mappa sul riquadro che contiene tutti i punti accesi',
}

export const testi = catalogo(it, {
  de: {
    trovaIndirizzi: 'Adressen suchen',
    trovaIndirizziAiuto:
      'Fragt OpenStreetMap, wo die Adressen liegen, die noch keinen Punkt haben. Es ist der ' +
      'einzige Schritt des Klassenbuchs, der eine Angabe aus den Personalien nach aussen gibt, ' +
      'und deshalb löst man ihn von Hand aus: Die Antwort bleibt gespeichert und wird nicht ' +
      'erneut abgefragt.',
    tuttiTrovati: 'Jede erfasste Adresse hat schon ihren Punkt auf der Karte.',
    rifaiIndirizzi: 'Adressen neu suchen',
    rifaiIndirizziAiuto:
      'Fragt auch die ab, die schon einen Punkt haben: nützlich, wenn eine unvollständige ' +
      'Adresse im falschen Ort gelandet ist und man sie in den Personalien korrigiert hat.',
    rifareTitolo: 'Alle Adressen neu suchen?',
    rifareTesto:
      'Die Adressen der Klassen auf der Karte gehen erneut an den Geocodierer, auch die schon ' +
      'gefundenen. Das dauert etwa eine Sekunde pro Adresse.',
    rifai: 'Neu suchen',
    inquadra: 'Alles zeigen',
    inquadraAiuto:
      'Bringt die Karte auf den Ausschnitt mit allen eingeschalteten Punkten',
  },
  fr: {
    trovaIndirizzi: 'Trouver les adresses',
    trovaIndirizziAiuto:
      'Demande à OpenStreetMap où se trouvent les adresses qui n’ont pas encore de point. ' +
      'C’est le seul geste du registre qui envoie à l’extérieur une donnée personnelle, et ' +
      'c’est pourquoi on le lance à la main : la réponse reste enregistrée, et n’est plus ' +
      'redemandée.',
    tuttiTrovati: 'Chaque adresse saisie a déjà son point sur la carte.',
    rifaiIndirizzi: 'Refaire les adresses',
    rifaiIndirizziAiuto:
      'Redemande aussi celles qui ont déjà un point : utile quand une adresse incomplète est ' +
      'tombée dans la mauvaise localité, et qu’on l’a corrigée dans les données personnelles.',
    rifareTitolo: 'Refaire toutes les adresses ?',
    rifareTesto:
      'Les adresses des classes sur la carte repartent au géocodeur, même celles déjà ' +
      'trouvées. Il faut environ une seconde par adresse.',
    rifai: 'Refaire',
    inquadra: 'Tout afficher',
    inquadraAiuto:
      'Ramène la carte sur le cadre qui contient tous les points allumés',
  },
  en: {
    trovaIndirizzi: 'Find addresses',
    trovaIndirizziAiuto:
      'Asks OpenStreetMap where the addresses that have no point yet are. It is the only step in ' +
      'the register that sends personal data outside, and that is why you press it by hand: ' +
      'the answer stays saved, and is not asked for again.',
    tuttiTrovati: 'Every address entered already has its point on the map.',
    rifaiIndirizzi: 'Redo the addresses',
    rifaiIndirizziAiuto:
      'Asks again for those that already have a point too: useful when an incomplete address ' +
      'landed in the wrong town, and it has been corrected in the personal details.',
    rifareTitolo: 'Redo all the addresses?',
    rifareTesto:
      'The addresses of the classes on the map go back to the geocoder, even those already ' +
      'resolved. It takes about a second per address.',
    rifai: 'Redo',
    inquadra: 'Fit everything',
    inquadraAiuto:
      'Brings the map back to the frame that holds all the points shown',
  },
})
