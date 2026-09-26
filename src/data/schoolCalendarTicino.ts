// Il calendario scolastico ufficiale del Cantone Ticino, come il registro lo
// porta con sé: inizio e fine delle lezioni, vacanze e festivi, anno per anno.
//
// Generato da `resources/calendario-scolastico-ticino.json` con
// `npm run calendario`, a ogni versione: non si scrive a mano. Che i due siano
// d'accordo lo controlla `npm test`. Il confronto con l'anno del registro sta
// in `domain/schoolCalendar.ts`.

import type { CalendarioUfficiale } from '../domain/schoolCalendar.js'

export const CALENDARIO_TICINO: CalendarioUfficiale = {
  "cantone": "TI",
  "cantoneNome": "Ticino",
  "fonte": "PDF ufficiali DECS - Dipartimento dell'educazione, della cultura e dello sport, Repubblica e Cantone del Ticino",
  "estrattoIl": "2026-09-25",
  "anni": [
    {
      "annoScolastico": "2026/2027",
      "inizioAnno": "2026-08-31",
      "fineAnno": "2027-06-16",
      "fonte": "https://www4.ti.ch/fileadmin/DECS/calendario_scolastico/Calendario_scolastico_2026_2027.pdf",
      "periodi": [
        {
          "id": "2026-10-31-vacanze-autunnali",
          "nome": "Vacanze autunnali",
          "tipo": "vacanza",
          "inizio": "2026-10-31",
          "fine": "2026-11-08"
        },
        {
          "id": "2026-12-08-immacolata",
          "nome": "Immacolata",
          "tipo": "festivo",
          "inizio": "2026-12-08",
          "fine": "2026-12-08"
        },
        {
          "id": "2026-12-24-vacanze-di-natale",
          "nome": "Vacanze di Natale",
          "tipo": "vacanza",
          "inizio": "2026-12-24",
          "fine": "2027-01-06"
        },
        {
          "id": "2027-02-06-vacanze-di-carnevale",
          "nome": "Vacanze di Carnevale",
          "tipo": "vacanza",
          "inizio": "2027-02-06",
          "fine": "2027-02-14"
        },
        {
          "id": "2027-03-19-san-giuseppe",
          "nome": "San Giuseppe",
          "tipo": "festivo",
          "inizio": "2027-03-19",
          "fine": "2027-03-19"
        },
        {
          "id": "2027-03-26-vacanze-di-pasqua",
          "nome": "Vacanze di Pasqua",
          "tipo": "vacanza",
          "inizio": "2027-03-26",
          "fine": "2027-04-04"
        },
        {
          "id": "2027-05-06-festa-dell-ascensione",
          "nome": "Festa dell'Ascensione",
          "tipo": "festivo",
          "inizio": "2027-05-06",
          "fine": "2027-05-06"
        },
        {
          "id": "2027-05-07-giorno-di-vacanza",
          "nome": "Giorno di vacanza",
          "tipo": "giorno_di_vacanza",
          "inizio": "2027-05-07",
          "fine": "2027-05-07"
        },
        {
          "id": "2027-05-17-lunedi-di-pentecoste",
          "nome": "Lunedì di Pentecoste",
          "tipo": "festivo",
          "inizio": "2027-05-17",
          "fine": "2027-05-17"
        },
        {
          "id": "2027-05-27-corpus-domini",
          "nome": "Corpus Domini",
          "tipo": "festivo",
          "inizio": "2027-05-27",
          "fine": "2027-05-27"
        },
        {
          "id": "2027-06-17-vacanze-estive",
          "nome": "Vacanze estive",
          "tipo": "vacanza",
          "inizio": "2027-06-17",
          "fine": "2027-08-29",
          "derivato": true
        }
      ]
    },
    {
      "annoScolastico": "2027/2028",
      "inizioAnno": "2027-08-30",
      "fineAnno": "2028-06-14",
      "fonte": "https://www4.ti.ch/fileadmin/DECS/calendario_scolastico/Calendario_scolastico_2027-2028.pdf",
      "periodi": [
        {
          "id": "2027-10-30-vacanze-autunnali",
          "nome": "Vacanze autunnali",
          "tipo": "vacanza",
          "inizio": "2027-10-30",
          "fine": "2027-11-07"
        },
        {
          "id": "2027-12-08-immacolata",
          "nome": "Immacolata",
          "tipo": "festivo",
          "inizio": "2027-12-08",
          "fine": "2027-12-08"
        },
        {
          "id": "2027-12-24-vacanze-di-natale",
          "nome": "Vacanze di Natale",
          "tipo": "vacanza",
          "inizio": "2027-12-24",
          "fine": "2028-01-09"
        },
        {
          "id": "2028-01-07-giorno-di-vacanza",
          "nome": "Giorno di vacanza",
          "tipo": "giorno_di_vacanza",
          "inizio": "2028-01-07",
          "fine": "2028-01-07"
        },
        {
          "id": "2028-02-26-vacanze-di-carnevale",
          "nome": "Vacanze di Carnevale",
          "tipo": "vacanza",
          "inizio": "2028-02-26",
          "fine": "2028-03-05"
        },
        {
          "id": "2028-04-14-vacanze-di-pasqua",
          "nome": "Vacanze di Pasqua",
          "tipo": "vacanza",
          "inizio": "2028-04-14",
          "fine": "2028-04-23"
        },
        {
          "id": "2028-05-01-festa-del-lavoro",
          "nome": "Festa del Lavoro",
          "tipo": "festivo",
          "inizio": "2028-05-01",
          "fine": "2028-05-01"
        },
        {
          "id": "2028-05-25-festa-dell-ascensione",
          "nome": "Festa dell'Ascensione",
          "tipo": "festivo",
          "inizio": "2028-05-25",
          "fine": "2028-05-25"
        },
        {
          "id": "2028-05-26-giorno-di-vacanza",
          "nome": "Giorno di vacanza",
          "tipo": "giorno_di_vacanza",
          "inizio": "2028-05-26",
          "fine": "2028-05-26"
        },
        {
          "id": "2028-06-05-lunedi-di-pentecoste",
          "nome": "Lunedì di Pentecoste",
          "tipo": "festivo",
          "inizio": "2028-06-05",
          "fine": "2028-06-05"
        },
        {
          "id": "2028-06-15-vacanze-estive",
          "nome": "Vacanze estive",
          "tipo": "vacanza",
          "inizio": "2028-06-15",
          "fine": "2028-08-29",
          "derivato": true
        }
      ]
    },
    {
      "annoScolastico": "2028/2029",
      "inizioAnno": "2028-08-30",
      "fineAnno": "2029-06-15",
      "fonte": "https://www4.ti.ch/fileadmin/DECS/calendario_scolastico/Calendario_scolastico_2028-2029.pdf",
      "periodi": [
        {
          "id": "2028-10-28-vacanze-autunnali",
          "nome": "Vacanze autunnali",
          "tipo": "vacanza",
          "inizio": "2028-10-28",
          "fine": "2028-11-05"
        },
        {
          "id": "2028-12-08-immacolata",
          "nome": "Immacolata",
          "tipo": "festivo",
          "inizio": "2028-12-08",
          "fine": "2028-12-08"
        },
        {
          "id": "2028-12-23-vacanze-di-natale",
          "nome": "Vacanze di Natale",
          "tipo": "vacanza",
          "inizio": "2028-12-23",
          "fine": "2029-01-07"
        },
        {
          "id": "2029-02-10-vacanze-di-carnevale",
          "nome": "Vacanze di Carnevale",
          "tipo": "vacanza",
          "inizio": "2029-02-10",
          "fine": "2029-02-18"
        },
        {
          "id": "2029-03-19-festa-di-san-giuseppe",
          "nome": "Festa di San Giuseppe",
          "tipo": "festivo",
          "inizio": "2029-03-19",
          "fine": "2029-03-19"
        },
        {
          "id": "2029-03-30-vacanze-di-pasqua",
          "nome": "Vacanze di Pasqua",
          "tipo": "vacanza",
          "inizio": "2029-03-30",
          "fine": "2029-04-06"
        },
        {
          "id": "2029-05-01-festa-del-lavoro",
          "nome": "Festa del Lavoro",
          "tipo": "festivo",
          "inizio": "2029-05-01",
          "fine": "2029-05-01"
        },
        {
          "id": "2029-05-10-festa-dell-ascensione",
          "nome": "Festa dell'Ascensione",
          "tipo": "festivo",
          "inizio": "2029-05-10",
          "fine": "2029-05-10"
        },
        {
          "id": "2029-05-21-lunedi-di-pentecoste",
          "nome": "Lunedì di Pentecoste",
          "tipo": "festivo",
          "inizio": "2029-05-21",
          "fine": "2029-05-21"
        },
        {
          "id": "2029-05-31-corpus-domini",
          "nome": "Corpus Domini",
          "tipo": "festivo",
          "inizio": "2029-05-31",
          "fine": "2029-05-31"
        },
        {
          "id": "2029-06-16-vacanze-estive",
          "nome": "Vacanze estive",
          "tipo": "vacanza",
          "inizio": "2029-06-16",
          "fine": "2029-09-02",
          "derivato": true
        }
      ]
    },
    {
      "annoScolastico": "2029/2030",
      "inizioAnno": "2029-09-03",
      "fineAnno": "2030-06-19",
      "fonte": "https://www4.ti.ch/fileadmin/DECS/calendario_scolastico/Calendario_scolastico_2029-2030.pdf",
      "periodi": [
        {
          "id": "2029-10-27-vacanze-autunnali",
          "nome": "Vacanze autunnali",
          "tipo": "vacanza",
          "inizio": "2029-10-27",
          "fine": "2029-11-04"
        },
        {
          "id": "2029-12-22-vacanze-di-natale",
          "nome": "Vacanze di Natale",
          "tipo": "vacanza",
          "inizio": "2029-12-22",
          "fine": "2030-01-06"
        },
        {
          "id": "2030-03-02-vacanze-di-carnevale",
          "nome": "Vacanze di Carnevale",
          "tipo": "vacanza",
          "inizio": "2030-03-02",
          "fine": "2030-03-10"
        },
        {
          "id": "2030-03-19-festa-di-san-giuseppe",
          "nome": "Festa di San Giuseppe",
          "tipo": "festivo",
          "inizio": "2030-03-19",
          "fine": "2030-03-19"
        },
        {
          "id": "2030-04-19-vacanze-di-pasqua",
          "nome": "Vacanze di Pasqua",
          "tipo": "vacanza",
          "inizio": "2030-04-19",
          "fine": "2030-04-28"
        },
        {
          "id": "2030-05-01-festa-del-lavoro",
          "nome": "Festa del Lavoro",
          "tipo": "festivo",
          "inizio": "2030-05-01",
          "fine": "2030-05-01"
        },
        {
          "id": "2030-05-30-festa-dell-ascensione",
          "nome": "Festa dell'Ascensione",
          "tipo": "festivo",
          "inizio": "2030-05-30",
          "fine": "2030-05-30"
        },
        {
          "id": "2030-05-31-giorno-di-vacanza",
          "nome": "Giorno di vacanza",
          "tipo": "giorno_di_vacanza",
          "inizio": "2030-05-31",
          "fine": "2030-05-31"
        },
        {
          "id": "2030-06-10-lunedi-di-pentecoste",
          "nome": "Lunedì di Pentecoste",
          "tipo": "festivo",
          "inizio": "2030-06-10",
          "fine": "2030-06-10"
        }
      ]
    }
  ]
}
