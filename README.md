# Soivat Sivut 🎶

Värikäs musiikkikirja pienille lapsille, vähän kuin eläinten ääniä soittavat kirjat, mutta soittimilla.
Kirjan jokaisella sivulla on yksi soitin. Lapsi painaa soitinta, ja se soittaa tutun kappaleen, sanoo
äänensä ("Pling plong!", "Töö-töö-töö!") ja saa taustan pyörimään ja kipinät lentämään.

## Mitä MVP sisältää

- **10 soitinta:** piano, rummut, trumpetti, kitara, viulu, huilu, saksofoni, harmonikka, kellopeli ja ksylofoni.
- **Ison soittimen painaminen** soittaa lyhyen kappaleen (Tuiki tuiki tähtönen, Jaakko kulta, Ukko Nooa,
  Kulkuset, fanfaari, blues-riffi, humppa…) ja näyttää ääntä kuvaavan puhekuplan.
- **Värinapit** (do re mi so la do): pentatoninen asteikko, joten kaikki yhdistelmät kuulostavat kivoilta.
  Nappeja voi painaa monella sormella yhtä aikaa ja niiden yli voi liu'uttaa sormea. Rumpusivulla
  napit ovat BUM, TSAK, TSS, TUM ja PLÄS. Kun kappale soi, sen säveliä vastaavat napit välähtävät.
- **Visuaalit:** jatkuvasti pyörivä aurinkosädetausta (kiihtyy jokaisesta sävelestä), pyörivät renkaat,
  leijuvat nuotit, tähdet ja sydämet, kipinäpurskeet ja ääniaallot sekä hyppivät ja keinuvat soittimet.
  Jokaisella sivulla on oma väriteemansa.
- **Arvauspeli "Mikä soitin soi?":** sovellus soittaa kappaleen ja lapsi valitsee kolmesta soittimesta oikean.
  - **Oikein:** fanfaari, "Jee!"-huudahdukset ja aplodit, tähtisade, ilotulitus ja kysymysmerkin
    tilalle pyörähtävä oikea soitin. Yläreunaan syttyy tähti.
  - **Väärin:** pehmeä "hups", kannustavat taputukset ja nouseva melodia sekä teksti ja puhe
    "Kokeile vielä kerran!". Väärä vaihtoehto himmenee, ja kappale soi uudestaan.
  - **Viisi tähteä:** iso juhla pokaalin kera, ja tähdet alkavat alusta.
  - Suoralinkki `index.html#peli`, näppäimet 1–3 ja välilyönti (kuuntele uudestaan).
- **Selaaminen:** nuolinapit, pyyhkäisy tai näppäimistö (← →, välilyönti, 1–6, Esc).
- **Puhe:** jos laitteessa on suomenkielinen puheääni, sovellus sanoo soittimen nimen (voi kytkeä pois 🗣️).
- **Mykistys** 🔊 ja **suoralinkit** sivuille (esim. `index.html#drums` avaa suoraan rumpusivun).
- **Toimii offline-tilassa** ja on asennettavissa kotinäytölle (PWA).
- Kunnioittaa käyttöjärjestelmän *vähennä liikettä* -asetusta.

## Miksi se on ilmainen

- Ei äänitiedostoja: kaikki äänet syntetisoidaan selaimessa Web Audio API:lla (kitara käyttää
  Karplus–Strong-kielimallia, kellopeli epäharmonisia osasävelmiä ja niin edelleen).
- Ei kirjastoja, ei build-vaihetta, ei palvelinta, ei mainoksia eikä seurantaa. Pelkkä `index.html`.
- Kappaleet ovat kansanlauluja tai itse tehtyjä, joten tekijänoikeusongelmia ei ole.
- Kuvina ovat järjestelmän emojit, ja huilu ja ksylofoni on piirretty SVG:nä.

## Käyttö

Paikallisesti (service worker vaatii http:n; pelkkä tiedoston avaaminen toimii myös, mutta ilman offline-tukea):

```bash
npx http-server .
```

**Ilmainen julkaisu GitHub Pagesissa:** julkaise sovellus **omassa repossaan** (esim. `soivat-sivut`),
jossa nämä tiedostot ovat juuressa. Valitse siinä repossa *Settings → Pages → Deploy from a branch → main / (root)*.
Sovellus löytyy sen jälkeen osoitteesta `https://<käyttäjä>.github.io/soivat-sivut/`.

> ⚠️ Älä muuta Pages-asetusta repossa, jossa on jo toinen Pages-sovellus (esim. `PDE`-repon
> sienisovellus). Yhdellä repolla voi olla vain yksi Pages-sivusto, joten asetuksen vaihtaminen
> korvaisi aiemman sovelluksen.

Sama kansio toimii sellaisenaan myös Netlifyssä, Cloudflare Pagesissa tai Vercelissä.

Kun julkaiset muutoksia, vaihda `sw.js`-tiedoston `CACHE`-versionumeroa.

## Tunnetut rajoitukset

- iPhonessa Web Audio on hiljaa, jos sivukytkin on äänettömällä.
- Puhe riippuu laitteen puheäänistä. Jos suomenkielistä ääntä ei ole, puhenappi piilotetaan.
- Emojien ulkoasu vaihtelee käyttöjärjestelmän mukaan.

## Jatkoideoita

- Arvauspeliin vaikeustasot (esim. 4–6 vaihtoehtoa tai pelkät sävelet)
- Lisää sivuja: laulu, tuuba, kantele, rumpukone ja eläinorkesteri
- Nappien pitkä painallus: sävel soi niin kauan kuin sormi on napilla
- Äänityksiä oikeista soittimista (esim. vapaasti lisensoiduista näytteistä)
- Vanhemman lukko ja ajastin
