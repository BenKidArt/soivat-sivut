# Soivat Sivut 🎶🐮🎛️

Värikäs musiikkisovellus pienille lapsille. Siinä on soitinkirja, eläinbileiden launchpad
ja arvauspeli. Kaikki äänet syntetisoidaan selaimessa, joten äänitiedostoja ei tarvita.

**Kokeile:** https://benkidart.github.io/soivat-sivut/

## Eläinbileet 🎛️ (launchpad)

- Viisi saraketta silmukoita: **Biitti, Basso, Soinnut, Melodia ja Eläimet**, neljä silmukkaa kussakin.
  Silmukat alkavat seuraavalla iskulla ja soivat aina samassa tahdissa ja sävellajissa, joten mikä tahansa yhdistelmä toimii.
- **POP / TEKNO**: vaihtaa tempon, sointukulun, rummut ja soittimet. Vaihdon voi tehdä kesken soiton.
- Eläimet laulavat sävelessä: lehmäbasso, eläinrummut (koira, ankka ja sammakko), kissakuoro ja aamukuoro.
- Kymmenen eläinnappia: lehmä, kissa, koira, ankka, sammakko, lintu, lammas, possu, kukko ja pöllö.
  **Pitkä painallus = DJ-rulla**, joka toistaa ääntä tahdissa niin kauan kuin sormi on napilla.
- Pyörivä levy näyttää soivat silmukat, ja kaikki napit sykkivät biitin tahdissa.
- ⏹ pysäyttää kaikki silmukat.

## Soitinkirja (14 soitinta)

Piano, rummut, trumpetti, kitara, viulu, huilu, saksofoni, harmonikka, kellopeli, ksylofoni,
syntikka, basso, kantele ja käyrätorvi.

- Ison soittimen painaminen soittaa tutun kappaleen. Jos silmukoita soi, kappale soi niiden tahdissa.
- Jokaisella sivulla on launchpad, jossa on neljä omaa silmukkaa (★ ● ▲ ♥) ja kahdeksan nuottinappia.
- **Pitkä painallus:**
  - Puhallin- ja jousisoittimet sekä syntikka soivat niin kauan kuin sormi on napilla.
  - Piano, kitara, kantele ja basso soivat, kunnes sormi nostetaan.
  - Rummut tekevät rullan.
- Sormella voi liukua napilta toiselle, ja monta nappia voi painaa yhtä aikaa.
- Silmukat jatkavat soimista, kun sivua vaihdetaan. Näin eri soittimia voi yhdistää.

## Arvauspeli ❓

| Taso | Sisältö |
|---|---|
| 🐣 Helppo | Kuka ääntelee? Eläimet, 3 vaihtoehtoa |
| 🐥 Keskitaso | Mikä soitin soi? 3 vaihtoehtoa |
| 🦉 Vaikea | Soittimet ja eläimet, 6 vaihtoehtoa |

- **Oikein:** hurraava väkijoukko (16 erilaista ääntä stereona), aplodit, fanfaari, tähtisade ja ilotulitus.
- **Väärin:** kannustava ääni ja teksti "Kokeile vielä kerran!". Väärä vaihtoehto himmenee, ja ääni soi uudestaan.
- **Viisi tähteä:** pokaalijuhla.

## Miten äänet on tehty

- **Piano:** fysikaalinen malli, jossa on kielen jäykkyyden aiheuttamat epäharmoniset osasävelet,
  kaksivaiheinen vaimeneminen, kaksi hieman eri vireistä kieltä ja vasaran isku.
- **Kellopeli ja ksylofoni:** metalli- ja puutankojen omat osasävelet, malletin isku ja resonaattori.
- **Kitara, kantele ja basso:** Karplus–Strong-kielimalli, joka on viritetty tarkasti.
- **Viulu:** kaikukopan resonanssit ja jousen kohina. **Huilu:** puhalluskohina ja voimakkuusvibrato.
  **Saksofoni:** ruokolehden särö. **Harmonikka:** kapea kieliaalto ja musette-huojunta.
  **Trumpetti ja käyrätorvi:** vaskisoittimen kirkkausverho.
- **Eläimet:** tavuja, joilla on omat sävelkorkeuskäyrät, vokaalien formantit, karheus ja
  suun avautuminen. Esimerkiksi kissan "miau" liukuu i → a → u.
- **Hurraus:** väkijoukko lasten ja aikuisten ääniä eri vokaaleilla, luonnollisella intonaatiolla ja stereona.

## Ilmainen ja kevyt

- Ei kirjastoja, ei build-vaihetta, ei palvelinta, ei mainoksia eikä seurantaa.
- Toimii offline-tilassa ja on asennettavissa kotinäytölle (PWA).
- Kunnioittaa käyttöjärjestelmän *vähennä liikettä* -asetusta.

## Rakenne

| Tiedosto | Sisältö |
|---|---|
| `index.html` | näkymien rakenne |
| `style.css` | tumma neonteema |
| `js/audio.js` | äänimoottori, soitinäänet ja hurraus |
| `js/animals.js` | eläinäänet |
| `js/music.js` | soittimet, silmukat, tyylit ja sekvensseri |
| `js/visuals.js` | tausta, tunnelirenkaat ja kipinät |
| `js/app.js` | käyttöliittymä ja arvauspeli |

Paikallisesti: `npx http-server .`

Julkaisu: GitHub Pages (*Settings → Pages → Deploy from a branch → main / (root)*).
Kun julkaiset muutoksia, vaihda `sw.js`-tiedoston `CACHE`-versionumeroa.

## Tunnetut rajoitukset

- iPhonessa Web Audio on hiljaa, jos äänettömyyskytkin on päällä.
- Puhe riippuu laitteen puheäänistä. Jos suomenkielistä ääntä ei ole, puhenappi piilotetaan.
- Emojien ulkoasu vaihtelee käyttöjärjestelmän mukaan.
