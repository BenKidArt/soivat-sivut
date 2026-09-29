# BIITTIPAD 🎛️

Selaimessa toimiva launchpad ja ministudio, jolla tehdään ja tallennetaan **phonkia, technoa, housea, trappia, drum & bassia ja lo-fia**
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

**PADS**
- **Silmukkaruudukko 6 × 4:** DRUMS, HATS, BASS, SYNTH, LEAD ja VOX. Yksi silmukka per sarake.
  Uusi silmukka alkaa seuraavan tahdin alusta, ja kaikki pysyy samassa tahdissa ja sävellajissa.
- **One-shot-rivi:** pitkä painallus tekee rullan, ja sormella voi liukua napilta toiselle.
- **XY-kosketuspinta (FILTER):** vasemmalle alipäästö, oikealle ylipäästö, ylös resonanssi.
- **GATE, ECHO ja BREAK:** toimivat niin kauan kuin nappia pidetään pohjassa.
- **🎲 JAM** arpoo biitin, ja **⏹** pysäyttää kaiken.

**STUDIO**
- **Mikseri:** 7 kanavaa ja master.
  - **Kanavanauha:** häivytin (vedä, tuplanapautus palauttaa), tasomittari, PAN, REV- ja DLY-lähetys sekä Mute/Solo.
  - **Master:** stereomittari ja CLIP-valo.
- **TEMPO:** − ja +, pitkä painallus toistaa, ja TAP tempo.
- **SÄVELLAJI:** transponointi ±12 puolisävelaskelta.
- **SWING, DRIVE ja REVERB:** DRIVE on masterin saturaatio, ja reverbin tyyppi on ROOM, HALL tai PLATE.
- Mikseriasetukset säilyvät laitteella.

**● REC ja TALLENTEET**
- REC tallentaa masterlähdön limitterin jälkeen häviöttömäksi **WAV**-tiedostoksi (stereo, 16-bit).
- **Taustatallennus:** tallennus jatkuu, vaikka sovellus olisi taustalla.
- **Tallenteet** säilyvät laitteella. Niitä voi kuunnella ja ladata, jakaa puhelimen jakovalikosta ja poistaa.

**Ohjaimet**
- **MIDI-ohjain** (esim. Launchpad tai koskettimisto):
  - nuotit 36–59 ovat silmukat
  - 60–65 ovat one-shotit (velocity vaikuttaa)
  - CC1 ja CC74 ohjaavat suodinta
- **Näppäimistö:**
  - rivit `Q–Y`, `A–H`, `Z–N` ja `7 8 9 0 + '` ovat silmukat
  - `1–6` ovat one-shotit
  - `I O P` ovat GATE, ECHO ja BREAK
  - `Enter` on REC, välilyönti JAM ja `Esc` stop

## Äänentoisto ja miksaus

- **Stereo:** kaikki kulkee stereona. Kanavat panoroidaan, syntikoissa on stereoleveys,
  piano panoroituu sävelkorkeuden mukaan, ja Rhodesissa on auto-pan.
- **Masterketju:** DJ-suotimet → gate → EQ → glue-kompressori → soft clip → master → limitteri.
- **Reverb:** stereoimpulssivaste, jossa on esiviive, varhaiset heijastukset ja taajuusriippuvainen vaimeneminen.
- **Ping-pong-kaiku:** tempoon synkattu (pisteellinen kahdeksasosa).
- **Sidechain-pumppaus:** musiikkikanavat väistävät basaria.
- **Open hi-hat:** katkeaa closed hatiin.

## Äänisynteesi

- **Rummut:**
  - **Basarit:** kerroksellisia (sweep, punch ja klikki).
  - **Virvelit:** kaksi kalvon värähtelymuotoa ja kohina.
  - **Taputukset:** neljä purskahdusta stereona.
  - **Hi-hatit:** 808-tyyliset metalliset hatit sekä ilma.
- **Bassot:**
  - **808:** liu'ut edellisestä sävelestä.
  - **Acid:** resonanssisuodin, aksentit ja liu'ut.
  - **Reese:** stereo.
  - **Muut:** urkubasso, sub ja lo-fi-basso.
- **Syntikat:**
  - **Supersaw-padit ja lead** sekä **hoover** ja **dub-stab**.
  - **Kuoro** formanteilla ja **Rhodes** (FM).
  - **Piano:** fysikaalinen malli.
  - **Kellot, kitara** (Karplus–Strong) ja **huilu**.
  - **Pitchattu 808-lehmänkello**.
- **Vokaalit:** "HEY", "YEAH", "AY", "UH", "WOO", "OH" ja "OOH" formanttisynteesillä, sekä melodiset vokaalipätkät.

## Rakenne

| Tiedosto | Sisältö |
|---|---|
| `index.html`, `style.css` | näkymä ja neonteema |
| `js/engine.js` | äänimoottori: stereoketju, mikserikanavat, reverb, kaiku ja masterointi |
| `js/audio.js` | syntikat, rummut ja tehosteet |
| `js/recorder.js`, `js/rec-worklet.js` | WAV-tallennus (AudioWorklet) ja tallenteet (IndexedDB) |
| `js/studio.js` | mikseri, tempo, sävellaji, swing, drive ja reverb |
| `js/vox.js` | vokaalipätkät |
| `js/genres.js` | tyylit, soinnut ja kaikki silmukat |
| `js/sequencer.js` | tahdissa pysyvä sekvensseri, swing, rullat, sidechain ja FX |
| `js/visuals.js` | psykedeelinen tausta ja kipinät |
| `js/app.js` | käyttöliittymä, XY-pinta ja spektrinäyttö |

Ilmainen ja kevyt: ei kirjastoja, ei build-vaihetta eikä palvelinta. Toimii offline-tilassa (PWA).

Paikallisesti: `npx http-server .`. Kun julkaiset muutoksia, vaihda `sw.js`-tiedoston `CACHE`-versionumeroa.

iPhonessa ääni ei kuulu, jos äänettömyyskytkin on päällä. Puhelimen kaiuttimet eivät toista syvintä bassoa,
joten 808 ja sub kuulostavat parhaimmilta kuulokkeilla.
