# Create – maskinoversikt

Nettside som hentar data frå `data/create_maskiner.json` med `fetch()` og viser dei som kort
med søk, filtrering (kategori, mod, drivkraft), sortering og favorittar.

## Filer
- `index.html` – struktur (semantisk HTML, skjema med label/for/id)
- `styles.css` – design i Create-stil, mørkt og lyst tema, responsivt
- `script.js` – henting av JSON, filter, sortering og teikning av kort
- `data/create_maskiner.json` – dataa (array med objekt: id, namn, mod, kategori, drivkraft, skildring, bilete, alt)
- `img/` – bilete. Legg eigne skjermbilete her med filnamn som i feltet `bilete` i JSON-fila.
  Manglar eit bilete, blir `img/placeholder.svg` vist i staden.

## Køyre lokalt
`fetch()` fungerer ikkje når sida blir opna rett frå mappa (file://). Bruk «Live Server» i VS Code,
eller kjør `python3 -m http.server` i mappa og opne <http://localhost:8000>.
Sida kan òg publiserast med GitHub Pages.
