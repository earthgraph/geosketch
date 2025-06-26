# geosketch

Collaborative sharing of geospatial snippets via Qgis WKT copy-paste

A quick and dirty way to share geospatial snippets. I can work (as long as it works...) anywhere. This is on GH Pages at:

https://geosketch.io

It works with multiple features, but it might break if they are too many... Working with a single field so far.

## Main use case

You are working on some sort of mapping and need to quickly iterate with colleagues, e.g. on a dubious geologic contact, or a feature. You don't want to send around (and corrupt..) shapefiles or geopackages, and exporting a geojson might be too many clicks. You can select one or more features (if features are too many you might just kill your browser... Be parsimonious) copy --> and paste in the dialog of the page above. This can be shared, looked at, modified, re-created, shared back via unique URL. Simple editing can also be performed in place.

**Caveat:** multiple toppologies can be shared via URL but QGIS won't like them, thus, before pasting back onto a new geopackage for quick inspection, please be mindful of filtering only the topology of choice.

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

