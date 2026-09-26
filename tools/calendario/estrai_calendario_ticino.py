#!/usr/bin/env python3
"""
estrai_calendario_ticino.py
---------------------------
Scarica (o legge in locale) il PDF ufficiale del calendario scolastico del
Cantone Ticino pubblicato dal DECS, ne estrae il testo e ne ricava in modo
automatico gli intervalli di vacanza e i giorni festivi.

Fonte dei PDF:
  https://www4.ti.ch/fileadmin/DECS/calendario_scolastico/Calendario_scolastico_<ANNI>.pdf
  (es. Calendario_scolastico_2026_2027.pdf, Calendario_scolastico_2027-2028.pdf)

Uso:
  python3 tools/calendario/estrai_calendario_ticino.py https://www4.ti.ch/.../Calendario_scolastico_2026_2027.pdf
  python3 tools/calendario/estrai_calendario_ticino.py calendario.pdf
  python3 tools/calendario/estrai_calendario_ticino.py testo_gia_estratto.txt
  python3 tools/calendario/estrai_calendario_ticino.py *.pdf --json calendario.json --ics calendario.ics

Dipendenze: nessuna obbligatoria.
  - per i PDF serve `pdftotext` (poppler-utils) oppure `pip install pdfplumber`
  - il download usa urllib della libreria standard
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
import urllib.request
from datetime import date, timedelta
from pathlib import Path

MESI = {
    "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4, "maggio": 5, "giugno": 6,
    "luglio": 7, "agosto": 8, "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12,
}

# "vacanze autunnali", "vacanze di Natale", ...
RE_PERIODO = re.compile(
    r"vacanze\s+(?P<nome>autunnali|estive|di\s+Natale|di\s+Carnevale|di\s+Pasqua)\s*:?\s*"
    r"dal\s+(?P<g1>\d{1,2})(?:°)?\s*(?P<m1>[a-z]+)?\s*(?P<a1>\d{4})?\s*"
    r"all?['’\s]\s*(?P<g2>\d{1,2})(?:°)?\s+(?P<m2>[a-z]+)\s+(?P<a2>\d{4})",
    re.IGNORECASE,
)

GIORNI_SETT = r"luned[ìi]|marted[ìi]|mercoled[ìi]|gioved[ìi]|venerd[ìi]|sabato|domenica"

# "Martedì 8 dicembre 2026: Immacolata"
RE_FESTIVO = re.compile(
    rf"(?:{GIORNI_SETT})\s+(?P<g>\d{{1,2}})(?:°)?\s+(?P<m>[a-z]+)\s+(?P<a>\d{{4}})\s*[:\-–]\s*(?P<nome>[^\n•\-–]+)",
    re.IGNORECASE,
)

# "È inoltre giorno di vacanza venerdì 7 maggio 2027."
# "Sono inoltre giorni di vacanza venerdì 7 gennaio 2028 e venerdì 26 maggio 2028."
RE_EXTRA_BLOCCO = re.compile(
    r"(?:è|e'|sono)\s+inoltre\s+giorn[oi]\s+di\s+vacanza(?P<coda>.*?)(?:\.|\n\n|$)",
    re.IGNORECASE | re.DOTALL,
)
RE_EXTRA_DATA = re.compile(
    rf"(?:{GIORNI_SETT})?\s*(?P<g>\d{{1,2}})(?:°)?\s+(?P<m>[a-z]+)\s+(?P<a>\d{{4}})",
    re.IGNORECASE,
)

RE_INIZIO = re.compile(
    rf"lezioni\s+cominciano\s+(?:{GIORNI_SETT})?\s*(?P<g>\d{{1,2}})(?:°)?\s+(?P<m>[a-z]+)\s+(?P<a>\d{{4}})",
    re.IGNORECASE,
)
RE_FINE = re.compile(
    rf"lezioni\s+terminano\s+(?:{GIORNI_SETT})?\s*(?P<g>\d{{1,2}})(?:°)?\s+(?P<m>[a-z]+)\s+(?P<a>\d{{4}})",
    re.IGNORECASE,
)


# ----------------------------------------------------------------- utilità ---

def _norm(t: str) -> str:
    """Normalizza spazi, apostrofi tipografici e legature del PDF."""
    t = unicodedata.normalize("NFC", t)
    t = t.replace("’", "'").replace(" ", " ").replace("‑", "-")
    t = re.sub(r"[ \t]+", " ", t)
    return t


def _data(g, m, a) -> date:
    mese = MESI.get(str(m).lower().strip())
    if not mese:
        raise ValueError(f"mese sconosciuto: {m!r}")
    return date(int(a), mese, int(g))


def _slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


# --------------------------------------------------------- estrazione testo ---

def scarica(url: str, destinazione: Path) -> Path:
    req = urllib.request.Request(url, headers={"User-Agent": "calendario-ticino/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(destinazione, "wb") as f:
        shutil.copyfileobj(r, f)
    return destinazione


def testo_da_pdf(percorso: Path) -> str:
    """Estrae il testo con pdftotext; ripiega su pdfplumber se assente."""
    if shutil.which("pdftotext"):
        out = subprocess.run(
            ["pdftotext", "-layout", "-enc", "UTF-8", str(percorso), "-"],
            # UTF-8 esplicito: `text=True` da solo decodifica con la codifica
            # del sistema, che su Windows è cp1252, e «lunedì» non si riconosce più.
            capture_output=True, text=True, encoding="utf-8", check=True,
        )
        if out.stdout.strip():
            return out.stdout
    try:
        import pdfplumber  # type: ignore
    except ImportError:
        raise RuntimeError(
            "Serve `pdftotext` (poppler-utils) oppure `pip install pdfplumber`."
        )
    with pdfplumber.open(str(percorso)) as pdf:
        return "\n".join(p.extract_text() or "" for p in pdf.pages)


def testo_da_sorgente(sorgente: str) -> tuple[str, str]:
    """Ritorna (testo, etichetta_fonte). Accetta URL, PDF locale o .txt."""
    if sorgente.startswith(("http://", "https://")):
        with tempfile.TemporaryDirectory() as tmp:
            pdf = scarica(sorgente, Path(tmp) / "calendario.pdf")
            return testo_da_pdf(pdf), sorgente
    p = Path(sorgente)
    if p.suffix.lower() == ".pdf":
        return testo_da_pdf(p), p.name
    return p.read_text(encoding="utf-8"), p.name


# ------------------------------------------------------------- estrazione ----

def estrai(testo: str, fonte: str = "") -> dict:
    t = _norm(testo)
    voci: list[dict] = []
    viste: set[tuple] = set()

    def aggiungi(nome, inizio, fine, tipo):
        chiave = (inizio, fine)
        if chiave in viste:
            return
        viste.add(chiave)
        voci.append({
            "id": f"{inizio}-{_slug(nome)}",
            "nome": nome,
            "tipo": tipo,
            "inizio": inizio.isoformat(),
            "fine": fine.isoformat(),
        })

    # 1. intervalli di vacanza
    for m in RE_PERIODO.finditer(t):
        fine = _data(m["g2"], m["m2"], m["a2"])
        mese1 = m["m1"] or m["m2"]
        anno1 = m["a1"] or m["a2"]
        inizio = _data(m["g1"], mese1, anno1)
        if inizio > fine:  # intervallo a cavallo di capodanno
            inizio = date(int(anno1) - 1, inizio.month, inizio.day)
        etichetta = re.sub(r"\s+", " ", m["nome"]).strip().lower()
        for proprio in ("natale", "carnevale", "pasqua"):
            etichetta = etichetta.replace(proprio, proprio.capitalize())
        aggiungi("Vacanze " + etichetta, inizio, fine, "vacanza")

    # 2. giorni festivi nominati
    for m in RE_FESTIVO.finditer(t):
        g = _data(m["g"], m["m"], m["a"])
        nome = re.sub(r"\s+", " ", m["nome"]).strip(" .;")
        if nome:
            aggiungi(nome, g, g, "festivo")

    # 3. giorni di vacanza supplementari
    for blocco in RE_EXTRA_BLOCCO.finditer(t):
        for m in RE_EXTRA_DATA.finditer(blocco["coda"]):
            g = _data(m["g"], m["m"], m["a"])
            aggiungi("Giorno di vacanza", g, g, "giorno_di_vacanza")

    voci.sort(key=lambda v: v["inizio"])

    mi, mf = RE_INIZIO.search(t), RE_FINE.search(t)
    inizio_anno = _data(mi["g"], mi["m"], mi["a"]) if mi else None
    fine_anno = _data(mf["g"], mf["m"], mf["a"]) if mf else None

    anno_scolastico = None
    if inizio_anno and fine_anno:
        anno_scolastico = f"{inizio_anno.year}/{fine_anno.year}"

    return {
        "annoScolastico": anno_scolastico,
        "inizioAnno": inizio_anno.isoformat() if inizio_anno else None,
        "fineAnno": fine_anno.isoformat() if fine_anno else None,
        "fonte": fonte,
        "periodi": voci,
    }


def aggiungi_vacanze_estive(anni: list[dict]) -> list[dict]:
    """Ricava le vacanze estive fra la fine di un anno e l'inizio del successivo."""
    anni = sorted(anni, key=lambda a: a["inizioAnno"] or "")
    for corrente, successivo in zip(anni, anni[1:]):
        if not (corrente["fineAnno"] and successivo["inizioAnno"]):
            continue
        da = date.fromisoformat(corrente["fineAnno"]) + timedelta(days=1)
        a = date.fromisoformat(successivo["inizioAnno"]) - timedelta(days=1)
        corrente["periodi"].append({
            "id": f"{da.isoformat()}-vacanze-estive",
            "nome": "Vacanze estive",
            "tipo": "vacanza",
            "inizio": da.isoformat(),
            "fine": a.isoformat(),
            "derivato": True,
        })
        corrente["periodi"].sort(key=lambda v: v["inizio"])
    return anni


# ------------------------------------------------------------------- output ---

NOTE = [
    "Date INCLUSIVE: 'inizio' e 'fine' sono il primo e l'ultimo giorno di chiusura.",
    "tipo: 'vacanza' = periodo di vacanza; 'festivo' = giorno festivo nominato nel PDF; "
    "'giorno_di_vacanza' = giorno supplementare concesso dal DECS.",
    "Le 'Vacanze estive' hanno derivato=true: non sono scritte nel PDF ma ricavate fra la fine "
    "di un anno scolastico e l'inizio del successivo.",
    "Sono riservate le disposizioni concernenti le scuole professionali (osservazione 1 dei PDF DECS).",
]


def intestato(anni: list[dict]) -> dict:
    """Il file intero: chi l'ha prodotto, da dove, e gli anni."""
    return {
        "cantone": "TI",
        "cantoneNome": "Ticino",
        "paese": "CH",
        "fonte": "PDF ufficiali DECS - Dipartimento dell'educazione, della cultura e dello sport, "
                 "Repubblica e Cantone del Ticino",
        "estrattoIl": date.today().isoformat(),
        "estrattoCon": "estrai_calendario_ticino.py",
        "note": NOTE,
        "anni": anni,
    }


def scrivi_ics(anni: list[dict], percorso: Path) -> int:
    righe = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Calendario scolastico Ticino//IT",
        "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
        "X-WR-CALNAME:Vacanze scolastiche Ticino", "X-WR-TIMEZONE:Europe/Zurich",
    ]
    n = 0
    for anno in anni:
        for p in anno["periodi"]:
            s = date.fromisoformat(p["inizio"])
            e = date.fromisoformat(p["fine"]) + timedelta(days=1)
            uid = hashlib.md5(p["id"].encode()).hexdigest() + "@calendario-ticino"
            righe += [
                "BEGIN:VEVENT", f"UID:{uid}", "DTSTAMP:20000101T000000Z",
                f"DTSTART;VALUE=DATE:{s:%Y%m%d}", f"DTEND;VALUE=DATE:{e:%Y%m%d}",
                f"SUMMARY:{p['nome']}", "TRANSP:TRANSPARENT",
                f"DESCRIPTION:Anno scolastico {anno['annoScolastico']} - {p['tipo']} - fonte DECS Ticino",
                "END:VEVENT",
            ]
            n += 1
    righe.append("END:VCALENDAR")
    percorso.write_text("\r\n".join(righe) + "\r\n", encoding="utf-8")
    return n


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("sorgenti", nargs="+", help="URL, file PDF o file di testo")
    ap.add_argument("--json", type=Path, help="scrivi il risultato in un file JSON")
    ap.add_argument("--ics", type=Path, help="scrivi il risultato in un file iCalendar")
    ap.add_argument("--no-estate", action="store_true", help="non derivare le vacanze estive")
    args = ap.parse_args()

    anni = []
    for s in args.sorgenti:
        try:
            testo, fonte = testo_da_sorgente(s)
            anni.append(estrai(testo, fonte))
        except Exception as e:  # noqa: BLE001
            print(f"[errore] {s}: {e}", file=sys.stderr)

    if not anni:
        return 1
    if not args.no_estate:
        anni = aggiungi_vacanze_estive(anni)

    for anno in anni:
        print(f"\n=== Anno scolastico {anno['annoScolastico']} "
              f"({anno['inizioAnno']} -> {anno['fineAnno']}) ===")
        for p in anno["periodi"]:
            durata = (date.fromisoformat(p["fine"]) - date.fromisoformat(p["inizio"])).days + 1
            marca = " *derivato" if p.get("derivato") else ""
            print(f"  {p['inizio']} -> {p['fine']}  ({durata:>2}g)  [{p['tipo']:<17}] {p['nome']}{marca}")

    if args.json:
        args.json.write_text(json.dumps(intestato(anni), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"\nJSON scritto in {args.json}", file=sys.stderr)
    if args.ics:
        n = scrivi_ics(anni, args.ics)
        print(f"ICS scritto in {args.ics} ({n} eventi)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
