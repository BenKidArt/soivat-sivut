# BIITTIPAD 🎛️

Selaimessa toimiva launchpad, jolla tehdään **phonkia, technoa, housea, trappia, drum & bassia ja lo-fia**
koskettamalla. Kaikki äänet syntetisoidaan selaimessa Web Audio API:lla, joten äänitiedostoja ei tarvita.

**Kokeile:** https://benkidart.github.io/soivat-sivut/

## Tyylit

| Tyyli | BPM | Tunnusäänet |
|---|---|---|
| 💀 PHONK | 132 | rouhea 808, lehmänkellomelodiat, Memphis-"ay", ilmatorvi, sidechain-pumppaus |
| ⚙️ TECHNO | 130 | jyräävä basari ja rumble, acid-basso, dub-stabit kaiulla, hoover |
| 🏠 HOUSE | 124 | 909-rummut, M1-urkubasso, piano-stabit, vokaalipätkät, kevyt swing |
| 🔥 TRAP | 140 | 808-liu'ut, hi-hat-rullat (trioli- ja 32-osat), trap-huilu, kellot |
| ⚡ DRUM & BASS | 174 | Amen-tyyliset breakit, reese-basso, hoover, liquid-Rhodes |
| ☕ LO-FI | 84 | vahva swing, Rhodes, huojuva piano, kitara, vinyylirätinä |

Tyyliä voi vaihtaa kesken soiton: soivat silmukat jatkuvat samoilla paikoilla uuden tyylin äänillä ja tempossa.

## Käyttö

- **Silmukkaruudukko 6 × 4:** DRUMS, HATS, BASS, SYNTH, LEAD ja VOX. Yksi silmukka per sarake.
  Uusi silmukka alkaa seuraavan tahdin alusta (vilkkuu siihen asti), ja kaikki pysyy samassa tahdissa ja sävellajissa.
- **One-shot-rivi:** ilmatorvi, huudot, riser, impact, laser, sireeni, scratch ja muut.
  **Pitkä painallus = rulla** tempon tahdissa, ja sormella voi liukua napilta toiselle.
- **XY-kosketuspinta (FILTER):** vasemmalle alipäästö, oikealle ylipäästö, ylös resonanssi.
  Kun sormi nousee, suodin palaa auki.
- **GATE** (pidä pohjassa): kuudestoistaosa-gate. **ECHO**: tempoon synkattu kaiku.
  **BREAK**: rummut pois ja riser; päästettäessä rummut palaavat seuraavalla iskulla räjähdyksen kera.
- **🎲 JAM** arpoo valmiin yhdistelmän. **⏹** pysäyttää kaiken.
- **Näppäimistö:** rivit `Q–Y`, `A–H`, `Z–N` ja `7 8 9 0 + '` ovat silmukat, `1–6` one-shotit,
  välilyönti JAM ja `Esc` pysäyttää.

## Äänisynteesi

- **Rummut:** 808/909-tyyliset basarit (pitch sweep ja särö), metalliset hi-hatit kuudesta
  neliöaallosta, virvelit, taputukset, rumble ja vinyylirätinä.
- **Bassot:**
  - **808:** liu'ut edellisestä sävelestä.
  - **Acid:** resonanssisuodin, aksentit ja liu'ut.
  - **Reese:** huojuvat sahalaidat.
  - **Muut:** urkubasso, sub ja lo-fi-basso.
- **Syntikat:**
  - **Dub-stab** ja **hoover**.
  - **Supersaw-padit**, **kuoro** (formantit) ja **Rhodes** (FM).
  - **Piano:** fysikaalinen malli.
  - **Kellot, kitara** (Karplus–Strong) ja **huilu**.
  - **Pitchattu 808-lehmänkello**.
- **Vokaalit:** "HEY", "YEAH", "AY", "UH", "WOO", "OH" ja "OOH" formanttisynteesillä, sekä melodiset vokaalipätkät.
- **Miksaus:** sidechain-pumppaus basarin tahtiin, tempoon synkattu kaiku, reverb ja limitteri.

## Rakenne

| Tiedosto | Sisältö |
|---|---|
| `index.html`, `style.css` | näkymä ja neonteema |
| `js/audio.js` | äänimoottori, DJ-efektiketju, äänet, rummut ja tehosteet |
| `js/vox.js` | vokaalipätkät |
| `js/genres.js` | tyylit, soinnut ja kaikki silmukat |
| `js/sequencer.js` | tahdissa pysyvä sekvensseri, swing, rullat, sidechain ja FX |
| `js/visuals.js` | psykedeelinen tausta ja kipinät |
| `js/app.js` | käyttöliittymä, XY-pinta ja spektrinäyttö |

Ilmainen ja kevyt: ei kirjastoja, ei build-vaihetta eikä palvelinta. Toimii offline-tilassa (PWA).

Paikallisesti: `npx http-server .`. Kun julkaiset muutoksia, vaihda `sw.js`-tiedoston `CACHE`-versionumeroa.

iPhonessa ääni ei kuulu, jos äänettömyyskytkin on päällä. Puhelimen kaiuttimet eivät toista syvintä bassoa,
joten 808 ja sub kuulostavat parhaimmilta kuulokkeilla.
