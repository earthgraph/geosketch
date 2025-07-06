# Geosketch

Collaborative sharing of geospatial snippets via Qgis WKT copy-paste

A quick and (not too) dirty way to share geospatial snippets. I can work (as long as it works...) anywhere. This is reachable at:

https://geosketch.io

It works with multiple features, but it might break if they are too many. It works with a single field (`note`, by default).

The intended use is for quick exchange and brainstorming over few tens of features. It has been tested to work for ~500kb of vector WKT text, but this is very likely to break any email or IM sharing. A ~15Mb clipboard WKT paste has been tested to break - expectedly - the URL creation, while still working acceptably on the web map. This is not advised use.

URLs are **not** permalinks, they are just simply related to map content, they change with any variations of it (features, notes, anything).

## Main use case

You are working on some sort of mapping and need to quickly iterate with colleagues, e.g. on a dubious geologic contact, or a feature. You don't want to send around (and corrupt..) shapefiles or geopackages, and exporting a geojson might be too many clicks. You can select one or more features (if features are too many you might just kill your browser... Be parsimonious) copy --> and paste in the dialog of the page above. This can be shared, looked at, modified, re-created, shared back via unique URL. Simple editing can also be performed in place.

**Caveat:** multiple toppologies can be shared via URL but QGIS won't like them, thus, before pasting back onto a new geopackage for quick inspection, please be mindful of filtering only the topology of choice. Geojson download can keep mixed topologies and they should work upon loading onto QGIS.

## Planetary use case (rough)
This is still very rough. But, if one sets the QGIS CRS to planetary geographic e.g. see on https://voparis-vespa-crs.obspm.fr/web/mars.html **AND**, more importantly, sets the projections of the temporary scratch layer to the same, it can work in a similar fashion:

* https://geosketch.io/mars/
* https://geosketch.io/moon/

If your QGIS project is messy and with "unknown CRS" and go-figure metric coordinates, no.

## Privacy & Data Handling

**Data stays in the browser** - this tool is 100% client-side with no server storage.

**However, when sharing unencrypted URLs:**
- Sketch data is encoded in the URL itself
- URLs may contain location information and project notes
- Consider what you're sharing before sending URLs to others
- URLs may be logged by browsers, chat apps, or URL shorteners

**Best practice:**
- Use generic notes for sensitive projects
- Share URLs only with intended collaborators  
- Use private channels (not public chat) for sensitive sketches
- Clear browser history if working with confidential locations

## Client-Side Encryption

Geosketch offers optional client-side encryption:

**🔒 Share Encrypted** button provides password-protected sharing using industry-standard encryption:

**Technical Implementation:**
- **Encryption**: AES-GCM with 256-bit keys
- **Key Derivation**: PBKDF2 with 100,000 iterations + random salt
- **Compression**: Gzip compression before encryption to reduce URL length (still, be parsimonious with features...)
- **URL Format**: `#encrypted=...` (vs standard `#data=...`)
- **Processing**: All encryption/decryption happens in your browser - no server involvement

**How it works:**
1. Create your sketch → Click "🔒 Share Encrypted"
2. Enter password → Get encrypted URL
3. Share URL → Recipient enters password → Map loads

**Security benefits:**
- Data encrypted before URL encoding
- Password never transmitted or stored anywhere
- URLs can be safely shared through less secure channels
- Even if URLs are intercepted/logged, data remains protected

The approach is suitable for non-public research. Please note that, despite not having any server-side processing, it is as secure as the browser/machine used is, and the libraries used.

## Quick Start
0. In QGIS: Make sure the vectors are in EPSG:4326. If not, please reproject layer before sharing/brainistorming
1. In QGIS: Select features → Copy (Ctrl+C)
2. Paste into the text area → Click "Render"
3. Use filter to select geometry type → "Copy WKT"
4. Share URL with colleagues for collaboration

## Test WKT

Pasting this on Geosketch (of course not meaningful on Mars, or on the Moon), and pressing "render" will show test vectors.

```
note	wkt_geom
Majella	POLYGON((14.080192 42.246834, 14.144729 42.214285, 14.191414 42.156266, 14.201026 42.074746, 14.15434 42.007413, 14.120013 41.989037, 14.087058 42.012516, 14.062342 42.105328, 14.047238 42.13997, 14.007418 42.167467, 13.978583 42.202075, 14.007418 42.243783, 14.051357 42.254969, 14.080192 42.246834))
Gran Sasso	POLYGON((13.379902 42.482277, 13.485631 42.501522, 13.579002 42.49342, 13.6353 42.486329, 13.725925 42.472145, 13.787714 42.45289, 13.813804 42.405235, 13.828908 42.359573, 13.838519 42.298639, 13.841266 42.265101, 13.833027 42.234596, 13.809684 42.280348, 13.775357 42.328098, 13.747894 42.353482, 13.706701 42.387989, 13.640792 42.398134, 13.569391 42.416391, 13.521332 42.434643, 13.469154 42.450863, 13.426587 42.459985, 13.379902 42.482277))
Fucino	POLYGON((13.487725 42.062539, 13.445845 42.048259, 13.421129 42.029895, 13.416323 42.009484, 13.429368 41.988556, 13.449964 41.975792, 13.471934 41.963025, 13.511754 41.962514, 13.544022 41.955874, 13.579723 41.947701, 13.634647 41.945658, 13.662109 41.951277, 13.669662 41.970685, 13.651125 41.998766, 13.651125 42.020201, 13.633274 42.041118, 13.551566 42.065615, 13.495955 42.063065, 13.487725 42.062539))
Tremiti	POINT(15.496201 42.11898)
Rome	POINT(12.492376 41.890173)
Coastline	LINESTRING(14.107743 42.568235, 14.145503 42.532309, 14.185323 42.495857, 14.246426 42.452288, 14.310276 42.410718, 14.391976 42.370643, 14.417378 42.355925)
```

The above results in [this geosketch link](https://geosketch.io/#data=bm90ZQl3a3RfZ2VvbQpNYWplbGxhCVBPTFlHT04oKDE0LjA4MDE5MiA0Mi4yNDY4MzQsIDE0LjE0NDcyOSA0Mi4yMTQyODUsIDE0LjE5MTQxNCA0Mi4xNTYyNjYsIDE0LjIwMTAyNiA0Mi4wNzQ3NDYsIDE0LjE1NDM0IDQyLjAwNzQxMywgMTQuMTIwMDEzIDQxLjk4OTAzNywgMTQuMDg3MDU4IDQyLjAxMjUxNiwgMTQuMDYyMzQyIDQyLjEwNTMyOCwgMTQuMDQ3MjM4IDQyLjEzOTk3LCAxNC4wMDc0MTggNDIuMTY3NDY3LCAxMy45Nzg1ODMgNDIuMjAyMDc1LCAxNC4wMDc0MTggNDIuMjQzNzgzLCAxNC4wNTEzNTcgNDIuMjU0OTY5LCAxNC4wODAxOTIgNDIuMjQ2ODM0KSkKR3JhbiBTYXNzbwlQT0xZR09OKCgxMy4zNzk5MDIgNDIuNDgyMjc3LCAxMy40ODU2MzEgNDIuNTAxNTIyLCAxMy41NzkwMDIgNDIuNDkzNDIsIDEzLjYzNTMgNDIuNDg2MzI5LCAxMy43MjU5MjUgNDIuNDcyMTQ1LCAxMy43ODc3MTQgNDIuNDUyODksIDEzLjgxMzgwNCA0Mi40MDUyMzUsIDEzLjgyODkwOCA0Mi4zNTk1NzMsIDEzLjgzODUxOSA0Mi4yOTg2MzksIDEzLjg0MTI2NiA0Mi4yNjUxMDEsIDEzLjgzMzAyNyA0Mi4yMzQ1OTYsIDEzLjgwOTY4NCA0Mi4yODAzNDgsIDEzLjc3NTM1NyA0Mi4zMjgwOTgsIDEzLjc0Nzg5NCA0Mi4zNTM0ODIsIDEzLjcwNjcwMSA0Mi4zODc5ODksIDEzLjY0MDc5MiA0Mi4zOTgxMzQsIDEzLjU2OTM5MSA0Mi40MTYzOTEsIDEzLjUyMTMzMiA0Mi40MzQ2NDMsIDEzLjQ2OTE1NCA0Mi40NTA4NjMsIDEzLjQyNjU4NyA0Mi40NTk5ODUsIDEzLjM3OTkwMiA0Mi40ODIyNzcpKQpGdWNpbm8JUE9MWUdPTigoMTMuNDg3NzI1IDQyLjA2MjUzOSwgMTMuNDQ1ODQ1IDQyLjA0ODI1OSwgMTMuNDIxMTI5IDQyLjAyOTg5NSwgMTMuNDE2MzIzIDQyLjAwOTQ4NCwgMTMuNDI5MzY4IDQxLjk4ODU1NiwgMTMuNDQ5OTY0IDQxLjk3NTc5MiwgMTMuNDcxOTM0IDQxLjk2MzAyNSwgMTMuNTExNzU0IDQxLjk2MjUxNCwgMTMuNTQ0MDIyIDQxLjk1NTg3NCwgMTMuNTc5NzIzIDQxLjk0NzcwMSwgMTMuNjM0NjQ3IDQxLjk0NTY1OCwgMTMuNjYyMTA5IDQxLjk1MTI3NywgMTMuNjY5NjYyIDQxLjk3MDY4NSwgMTMuNjUxMTI1IDQxLjk5ODc2NiwgMTMuNjUxMTI1IDQyLjAyMDIwMSwgMTMuNjMzMjc0IDQyLjA0MTExOCwgMTMuNTUxNTY2IDQyLjA2NTYxNSwgMTMuNDk1OTU1IDQyLjA2MzA2NSwgMTMuNDg3NzI1IDQyLjA2MjUzOSkpClRyZW1pdGkJUE9JTlQoMTUuNDk2MjAxIDQyLjExODk4KQpSb21lCVBPSU5UKDEyLjQ5MjM3NiA0MS44OTAxNzMpCkNvYXN0bGluZQlMSU5FU1RSSU5HKDE0LjEwNzc0MyA0Mi41NjgyMzUsIDE0LjE0NTUwMyA0Mi41MzIzMDksIDE0LjE4NTMyMyA0Mi40OTU4NTcsIDE0LjI0NjQyNiA0Mi40NTIyODgsIDE0LjMxMDI3NiA0Mi40MTA3MTgsIDE0LjM5MTk3NiA0Mi4zNzA2NDMsIDE0LjQxNzM3OCA0Mi4zNTU5MjUp)

## Version History

| Version | Release Date | Key Features |
|---------|-------------|--------------|
| v1.2.1  | 2025-07-06  | Initial public release: WKT support, Drawing tools, Encryption, Toponym search, Mobile optimizations |

## Key Features
- **Encrypted Geosketches** with AES-256 encryption
- **Dialog note editing** with modal interface  
- **Toponym search** across Earth, Mars (USGS Gazetteer), and Moon (USGS Gazetteer)
- **WKT ↔ Drawing tools** for quick geospatial collaboration
- **Mobile optimizations** for field work

## Issues, caveats:

- Known issue: On mobile, while editing features on the map, fast finger lifts during polyline drawing may end the line prematurely (at 2nd touch): Solution &rarr; Please use slightly longer-lasting touches when adding vertices (it might need a little practice).   
- Do not paste too many features. While the web client might be robust enough to handle this, the URL sharing most likely breaks, somwhere along the road to the recipient. 
- URLs are **not** permalinks: They are not stored anywhere but your clipboard, and if you change the content of the map, the URL deterministically changes, too. Thus, geosketches evolve with their link (i.e. 100 variations of map content &rarr; 100 URLs). The upside is that "data is always with you (it)".