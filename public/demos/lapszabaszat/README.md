# Lapszabászati megrendelő – semleges bemutató

[Megnyitás](https://ottbenjamin.hu/demos/lapszabaszat/)

Egy tipikus lapszabászati megrendelőlap mezőire épülő, telefonról is kitölthető próba, cégnév nélkül („Minta Szabászat”). Szabászatoknak szóló bemutatókhoz készült. Fejlesztő: Ott Benjámin.

- Megrendelőadatok és szabászati tételek kitöltése.
- Tételek másolása, törlése, méretek és élzárások ellenőrzése.
- Darabszám, kész felület és élzárási hossz összesítése.
- XLSX-letöltés egy általános megrendelőlap oszlopsorrendjével.

A demó nem küld és nem tárol szerveren rendelést. Az adatok az oldal frissítésekor elvesznek. Kizárólag kitöltési mintával érdemes bemutatni.

Éles bevezetésnél a szabászat saját anyaglistája, élzáró-választéka, gyártási szabályai és Excel-sablonja kerül a helyükre; a létrehozott XLSX és a szabászat feldolgozásának egyezését szabászatonként kell ellenőrizni. Nincs automatikus árazás, szabásoptimalizálás vagy gyártási jóváhagyás.

## Fájlok

Az oldal önálló HTML, CSS és JavaScript. A `public` könyvtárból a portfólió meglévő Vite buildje változatlanul másolja a GitHub Pages kimenetébe. A relatív eszközhivatkozások miatt alkönyvtárban is működik.

Az Excel-export a mellékelt JSZip csomagot használja. Licence: `JSZip-LICENSE.txt`.
