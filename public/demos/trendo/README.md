# Lapszabászati megrendelő – bemutató

[Megnyitás](https://ottbenjamin.hu/demos/trendo/)

A Trendo nyilvános megrendelőlapjának mezőire épülő, telefonról is kitölthető próba. Fejlesztő: Ott Benjámin.

- Megrendelőadatok és szabászati tételek kitöltése.
- Tételek másolása, törlése, méretek és élzárások ellenőrzése.
- Darabszám, kész felület és élzárási hossz összesítése.
- XLSX-letöltés a nyilvános rendelőlap oszlopsorrendjével.

A demó nem a Trendo hivatalos rendelési felülete. Nem küld vagy tárol szerveren rendelést. Az adatok az oldal frissítésekor elvesznek. Kizárólag kitöltési mintával érdemes bemutatni.

Az eredeti XLS és a létrehozott XLSX gyártási feldolgozásának egyezését, az élzárási szabályokat és a szükséges tűréseket a céggel még ellenőrizni kell. Nincs automatikus árazás, szabásoptimalizálás vagy gyártási jóváhagyás.

## Fájlok

Az oldal önálló HTML, CSS és JavaScript. A `public` könyvtárból a portfólió meglévő Vite buildje változatlanul másolja a GitHub Pages kimenetébe. A relatív eszközhivatkozások miatt alkönyvtárban is működik.

Az Excel-export a mellékelt JSZip csomagot használja. Licence: `JSZip-LICENSE.txt`.

Forrás: https://www.trendo-butor.hu/ajanlatkeres/
