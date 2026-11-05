/* =========================================================
   Create – maskinoversikt
   Hentar data frå data/create_maskiner.json med fetch(),
   og viser dei som kort med søk, filter og sortering.

   Oppbygging:
   1) Konstantar og tilstand
   2) Hjelpefunksjonar
   3) Henting av data (fetch)
   4) Filter, sortering og teikning
   5) Hendingar (events)
   6) Start
   ========================================================= */
"use strict";

/* ---------- 1) Konstantar og tilstand ---------- */
const DATA_URL = "data/create_maskiner.json";
const PLASSHOLDER = "img/placeholder.svg";
const FAV_NOKKEL = "create-favorittar";
const TEMA_NOKKEL = "create-tema";

// Alt som brukaren har valt i filtera, samla på ein stad
const tilstand = {
  alle: [],              // heile lista frå JSON
  sok: "",
  kategori: "alle",
  mod: "alle",
  kraft: "alle",
  sorter: "namn-asc",
  berreFavorittar: false,
  favorittar: new Set(), // id-ar til favorittane
};

// Bilete som ikkje fantest – hugsar dei så vi ikkje spør nettverket om og om igjen
const manglandeBilete = new Set();

// Snarvegar til element i HTML-en
const el = {
  skjema: document.getElementById("filter-skjema"),
  sok: document.getElementById("sok"),
  modVal: document.getElementById("mod-val"),
  kraftVal: document.getElementById("kraft-val"),
  sorterVal: document.getElementById("sorter-val"),
  kategoriKnappar: document.getElementById("kategori-knappar"),
  berreFav: document.getElementById("berre-fav"),
  nullstill: document.getElementById("nullstill"),
  liste: document.getElementById("maskinliste"),
  status: document.getElementById("resultat-status"),
  ingenTreff: document.getElementById("ingen-treff"),
  feil: document.getElementById("feilmelding"),
  statistikk: document.getElementById("statistikk"),
  temaKnapp: document.getElementById("tema-knapp"),
};

/* ---------- 2) Hjelpefunksjonar ---------- */

// "Skjerm og verktøy" -> "skjerm-og-verktoy" (brukast til CSS-fargar)
function lagSlug(tekst) {
  return tekst
    .toLowerCase()
    .replace(/å/g, "a").replace(/ø/g, "o").replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Tel kor mange gonger kvar verdi i feltet førekjem
function tellVerdiar(liste, felt) {
  const teljar = new Map();
  for (const objekt of liste) {
    teljar.set(objekt[felt], (teljar.get(objekt[felt]) || 0) + 1);
  }
  return teljar;
}

// Lag eit element med klasse og tekst (brukar textContent, ikkje innerHTML – tryggare)
function lagEl(tag, klasse, tekst) {
  const node = document.createElement(tag);
  if (klasse) node.className = klasse;
  if (tekst !== undefined) node.textContent = tekst;
  return node;
}

// Set tekst i eit element og utheva søkeordet med <mark>
function settTekstMedTreff(node, tekst, sokeord) {
  node.textContent = "";
  const start = sokeord ? tekst.toLowerCase().indexOf(sokeord) : -1;
  if (start === -1) {
    node.textContent = tekst;
    return;
  }
  const slutt = start + sokeord.length;
  node.append(
    document.createTextNode(tekst.slice(0, start)),
    Object.assign(document.createElement("mark"), { textContent: tekst.slice(start, slutt) }),
    document.createTextNode(tekst.slice(slutt))
  );
}

// Favorittar blir lagra i nettlesaren. try/catch fordi localStorage kan vere blokkert.
function hentFavorittar() {
  try {
    const lagra = JSON.parse(localStorage.getItem(FAV_NOKKEL) || "[]");
    return new Set(Array.isArray(lagra) ? lagra : []);
  } catch (e) {
    return new Set();
  }
}
function lagreFavorittar() {
  try {
    localStorage.setItem(FAV_NOKKEL, JSON.stringify([...tilstand.favorittar]));
  } catch (e) { /* ikkje kritisk – favorittane gjeld då berre denne økta */ }
}

/* ---------- 3) Henting av data (fetch) ---------- */
async function lastData() {
  const svar = await fetch(DATA_URL);
  if (!svar.ok) {
    throw new Error(`Fekk svar ${svar.status} frå ${DATA_URL}`);
  }
  const data = await svar.json();
  if (!Array.isArray(data)) {
    throw new Error("JSON-fila skal innehalde eit array med objekt.");
  }
  return data;
}

function visFeil(feil) {
  console.error(feil);
  el.status.textContent = "Kunne ikkje laste data.";
  el.feil.hidden = false;
  el.feil.textContent = "";

  const tittel = lagEl("h3", "", "Kunne ikkje laste maskinane");
  const forklaring = lagEl("p", "", "Fila " + DATA_URL + " blei ikkje henta. Mogelege årsaker:");
  const tips = lagEl("ul");
  tips.append(
    lagEl("li", "", "Sida er opna rett frå mappa (file://). Start ein lokal server, t.d. «Live Server» i VS Code, eller bruk GitHub Pages."),
    lagEl("li", "", "Filnamnet eller mappa er feil – sjekk at data/create_maskiner.json finst."),
    lagEl("li", "", "JSON-fila har ein skrivefeil (t.d. manglande komma).")
  );
  el.feil.append(tittel, forklaring, tips);
}

/* ---------- 4) Filter, sortering og teikning ---------- */

// Fyll kategoriknappar og nedtrekkslister ut frå dataa
function byggFilter() {
  // Kategoriar (i rekkjefølgja dei kjem i fila)
  const kategoriar = tellVerdiar(tilstand.alle, "kategori");
  el.kategoriKnappar.textContent = "";
  el.kategoriKnappar.append(lagKategoriKnapp("alle", "Alle", tilstand.alle.length));
  for (const [namn, antal] of kategoriar) {
    el.kategoriKnappar.append(lagKategoriKnapp(namn, namn, antal));
  }

  fyllVal(el.modVal, "mod", "Alle modar");
  fyllVal(el.kraftVal, "drivkraft", "Alle typar");
}

function fyllVal(selectEl, felt, alleTekst) {
  const teljar = tellVerdiar(tilstand.alle, felt);
  selectEl.textContent = "";
  selectEl.append(new Option(`${alleTekst} (${tilstand.alle.length})`, "alle"));
  for (const [verdi, antal] of teljar) {
    selectEl.append(new Option(`${verdi} (${antal})`, verdi));
  }
}

function lagKategoriKnapp(verdi, tekst, antal) {
  const knapp = lagEl("button", "kategori-knapp");
  knapp.type = "button";
  knapp.dataset.verdi = verdi;
  knapp.setAttribute("aria-pressed", String(verdi === tilstand.kategori));
  knapp.append(tekst + " ", lagEl("span", "teljar", `(${antal})`));
  return knapp;
}

function oppdaterKategoriKnappar() {
  for (const knapp of el.kategoriKnappar.querySelectorAll("button")) {
    knapp.setAttribute("aria-pressed", String(knapp.dataset.verdi === tilstand.kategori));
  }
}

// Samandrag øvst: tal rekna ut frå JSON
function byggStatistikk() {
  const nokkeltal = [
    [tilstand.alle.length, "maskinar og blokker"],
    [new Set(tilstand.alle.map((m) => m.mod)).size, "modar"],
    [new Set(tilstand.alle.map((m) => m.kategori)).size, "kategoriar"],
    [new Set(tilstand.alle.map((m) => m.drivkraft)).size, "typar drivkraft"],
  ];
  el.statistikk.textContent = "";
  for (const [tal, tekst] of nokkeltal) {
    const boks = document.createElement("div");
    // dt (namn) kjem før dd (verdi) i HTML-en; CSS viser talet øvst
    boks.append(lagEl("dt", "", tekst), lagEl("dd", "", String(tal)));
    el.statistikk.append(boks);
  }
}

// Gjev lista med maskinar som passar filtera
function filtrer() {
  const sokeord = tilstand.sok.trim().toLowerCase();

  return tilstand.alle.filter((m) => {
    if (tilstand.kategori !== "alle" && m.kategori !== tilstand.kategori) return false;
    if (tilstand.mod !== "alle" && m.mod !== tilstand.mod) return false;
    if (tilstand.kraft !== "alle" && m.drivkraft !== tilstand.kraft) return false;
    if (tilstand.berreFavorittar && !tilstand.favorittar.has(m.id)) return false;
    if (sokeord) {
      const samla = `${m.namn} ${m.skildring} ${m.kategori} ${m.mod}`.toLowerCase();
      if (!samla.includes(sokeord)) return false;
    }
    return true;
  });
}

function sorter(liste) {
  const kopi = [...liste];
  const samanlikn = (a, b) => a.localeCompare(b, "nn");

  switch (tilstand.sorter) {
    case "namn-desc":
      return kopi.sort((a, b) => samanlikn(b.namn, a.namn));
    case "kategori":
      return kopi.sort((a, b) => samanlikn(a.kategori, b.kategori) || samanlikn(a.namn, b.namn));
    case "mod":
      return kopi.sort((a, b) => samanlikn(a.mod, b.mod) || samanlikn(a.namn, b.namn));
    case "id":
      return kopi.sort((a, b) => a.id - b.id);
    default: // namn-asc
      return kopi.sort((a, b) => samanlikn(a.namn, b.namn));
  }
}

// Lag eitt kort (<li>) for ei maskin
function lagKort(m, sokeord) {
  const li = lagEl("li", "kort");
  li.dataset.kat = lagSlug(m.kategori);

  // Bilete (frå JSON). Manglar fila, byter vi til tannhjul-plassholder.
  const biletBoks = lagEl("div", "bilete-boks");
  const bilete = document.createElement("img");
  bilete.loading = "lazy";
  bilete.width = 320;
  bilete.height = 200;
  if (manglandeBilete.has(m.bilete)) {
    brukPlassholder(bilete, m);
  } else {
    bilete.src = m.bilete;
    bilete.alt = m.alt;
    bilete.addEventListener("error", () => {
      manglandeBilete.add(m.bilete);
      brukPlassholder(bilete, m);
    }, { once: true });
  }

  // Favoritt-knapp. Namnet er likt heile tida; aria-pressed fortel om han er på.
  const fav = lagEl("button", "fav", "★");
  fav.type = "button";
  fav.dataset.id = m.id;
  fav.setAttribute("aria-label", "Favoritt: " + m.namn);
  fav.setAttribute("aria-pressed", String(tilstand.favorittar.has(m.id)));
  biletBoks.append(bilete, fav);

  // Tekstdel
  const innhald = lagEl("div", "kort-innhald");
  const tittel = lagEl("h3");
  settTekstMedTreff(tittel, m.namn, sokeord);

  const merke = lagEl("ul", "merke-liste");
  merke.append(
    lagEl("li", "merke merke-mod", m.mod),
    lagEl("li", "merke", m.kategori),
    lagEl("li", "merke", "Drivkraft: " + m.drivkraft)
  );

  const skildring = lagEl("p", "skildring");
  settTekstMedTreff(skildring, m.skildring, sokeord);

  innhald.append(tittel, merke, skildring);
  li.append(biletBoks, innhald);
  return li;
}

function brukPlassholder(bilete, m) {
  bilete.src = PLASSHOLDER;
  bilete.alt = `Plassholder for ${m.namn} (skjermbilete manglar)`;
  bilete.classList.add("plassholder");
}

// Hovudfunksjon: filtrer -> sorter -> teikn
function teikn() {
  const sokeord = tilstand.sok.trim().toLowerCase();
  const treff = sorter(filtrer());

  el.liste.textContent = "";
  const fragment = document.createDocumentFragment();
  for (const m of treff) fragment.append(lagKort(m, sokeord));
  el.liste.append(fragment);

  el.ingenTreff.hidden = treff.length > 0;
  el.status.textContent = `Viser ${treff.length} av ${tilstand.alle.length} maskinar`;
}

/* ---------- 5) Hendingar ---------- */
function kopleHendingar() {
  // Skjemaet skal aldri sende inn og laste sida på nytt
  el.skjema.addEventListener("submit", (e) => e.preventDefault());

  el.sok.addEventListener("input", () => {
    tilstand.sok = el.sok.value;
    teikn();
  });

  el.modVal.addEventListener("change", () => { tilstand.mod = el.modVal.value; teikn(); });
  el.kraftVal.addEventListener("change", () => { tilstand.kraft = el.kraftVal.value; teikn(); });
  el.sorterVal.addEventListener("change", () => { tilstand.sorter = el.sorterVal.value; teikn(); });
  el.berreFav.addEventListener("change", () => { tilstand.berreFavorittar = el.berreFav.checked; teikn(); });

  // Kategoriknappar – ein hendingslyttar på heile gruppa (event delegation)
  el.kategoriKnappar.addEventListener("click", (e) => {
    const knapp = e.target.closest("button[data-verdi]");
    if (!knapp) return;
    tilstand.kategori = knapp.dataset.verdi;
    oppdaterKategoriKnappar();
    teikn();
  });

  // Favorittar – same prinsipp
  el.liste.addEventListener("click", (e) => {
    const knapp = e.target.closest("button.fav");
    if (!knapp) return;
    const id = Number(knapp.dataset.id);
    if (tilstand.favorittar.has(id)) tilstand.favorittar.delete(id);
    else tilstand.favorittar.add(id);
    lagreFavorittar();

    if (tilstand.berreFavorittar) {
      teikn(); // kortet kan forsvinne frå lista
    } else {
      knapp.setAttribute("aria-pressed", String(tilstand.favorittar.has(id)));
    }
  });

  el.nullstill.addEventListener("click", () => {
    Object.assign(tilstand, { sok: "", kategori: "alle", mod: "alle", kraft: "alle", sorter: "namn-asc", berreFavorittar: false });
    el.sok.value = "";
    el.modVal.value = "alle";
    el.kraftVal.value = "alle";
    el.sorterVal.value = "namn-asc";
    el.berreFav.checked = false;
    oppdaterKategoriKnappar();
    teikn();
    el.sok.focus();
  });

  // Tema (mørkt/lyst)
  el.temaKnapp.addEventListener("click", () => {
    const naa = document.documentElement.getAttribute("data-theme");
    settTema(naa === "light" ? "dark" : "light");
  });
}

// Oppdaterer teksten på tema-knappen ut frå kva tema som er aktivt
function oppdaterTemaKnapp(tema) {
  el.temaKnapp.textContent = tema === "light" ? "Mørk modus" : "Lys modus";
}

// Byter tema og hugsar valet til neste gong
function settTema(tema) {
  document.documentElement.setAttribute("data-theme", tema);
  oppdaterTemaKnapp(tema);
  try { localStorage.setItem(TEMA_NOKKEL, tema); } catch (e) { /* ignorer */ }
}

/* ---------- 6) Start ---------- */
async function start() {
  // Temaet er allereie sett av snutten i <head>; her oppdaterer vi berre knappeteksten
  oppdaterTemaKnapp(document.documentElement.getAttribute("data-theme") || "dark");
  tilstand.favorittar = hentFavorittar();
  kopleHendingar();

  try {
    tilstand.alle = await lastData();
    byggStatistikk();
    byggFilter();
    teikn();
  } catch (feil) {
    visFeil(feil);
  }
}

start();
