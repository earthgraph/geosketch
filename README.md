# geosketch

Collaborative sharing of geospatial snippets via Qgis WKT copy-paste

A quick and dirty way to share geospatial snippets. I can work (as long as it works...) anywhere. This is on GH Pages at:

https://geosketch.io

It works with multiple features, but it might break if they are too many... Working with a single field so far.

## Main use case

You are working on some sort of mapping and need to quickly iterate with colleagues, e.g. on a dubious geologic contact, or a feature. You don't want to send around (and corrupt..) shapefiles or geopackages, and exporting a geojson might be too many clicks. You can select one or more features (if features are too many you might just kill your browser... Be parsimonious) copy --> and paste in the dialog of the page above. This can be shared, looked at, modified, re-created, shared back via unique URL. Simple editing can also be performed in place.

**Caveat:** multiple toppologies can be shared via URL but QGIS won't like them, thus, before pasting back onto a new geopackage for quick inspection, please be mindful of filtering only the topology of choice. Geojson download can keep mixed topologies and they should work upon loading onto QGIS.

## Planetary use case (rough)
This is still very rough. But, if one sets the QGIS CRS to planetary geographic e.g. see on https://voparis-vespa-crs.obspm.fr/web/mars.html **AND** sets the projections of the temporary scratch layer to the same, it can work in a similar fashion:

* https://geosketch.io/mars/
* https://geosketch.io/moon/

If your QGIS project is messy and with "unknown CRS" and go-figure metric coordinates, no.

## Privacy & Data Handling

**Your data stays in your browser** - this tool is 100% client-side with no server storage.

**However, when sharing URLs:**
- Sketch data is encoded in the URL itself
- URLs may contain location information and project notes
- Consider what you're sharing before sending URLs to others
- URLs may be logged by browsers, chat apps, or URL shorteners

**Best practices:**
- Use generic notes for sensitive projects
- Share URLs only with intended collaborators  
- Use private channels (not public chat) for sensitive sketches
- Clear browser history if working with confidential locations

## Quick Start
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
