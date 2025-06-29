// GeoSketch - Shared JavaScript functionality
// This file contains all the common functionality for Earth, Mars, and Moon versions

class GeoSketch {
  constructor(config) {
    this.config = config;
    this.features = [];
    this.allLayers = [];
    this.currentDrawnLayer = null;
    this.basemaps = config.basemaps || {};
    this.currentBasemap = null;
    this.init();
  }

  init() {
    // Initialize map
    this.map = L.map('map').setView([0, 0], 2);
    
    // Add the specified tile layer or use basemaps
    if (this.config.tileUrl) {
      this.currentBasemap = L.tileLayer(this.config.tileUrl, {
        attribution: this.config.attribution,
        tms: this.config.tms || false
      }).addTo(this.map);
    } else if (Object.keys(this.basemaps).length > 0) {
      // Add first basemap as default
      const firstKey = Object.keys(this.basemaps)[0];
      this.currentBasemap = this.basemaps[firstKey].addTo(this.map);
    }
    
    this.layerGroup = L.featureGroup().addTo(this.map);
    
    // Initialize drawing controls
    this.initDrawControls();
    
    // Bind event handlers
    this.bindEvents();
    
    // Load shared data if present in URL
    this.loadSharedData();
  }

  initDrawControls() {
    this.drawControl = new L.Control.Draw({
      draw: {
        polyline: true,
        polygon: true,
        marker: true,
        circle: false,
        rectangle: false,
        circlemarker: false
      },
      edit: {
        featureGroup: this.layerGroup
      }
    });
    this.map.addControl(this.drawControl);
  }

  bindEvents() {
    // Drawing events
    this.map.on(L.Draw.Event.CREATED, (e) => {
      this.currentDrawnLayer = e.layer;
      this.showNoteModal();
    });

    // Edit events
    this.map.on(L.Draw.Event.EDITED, (e) => {
      var layers = e.layers;
      layers.eachLayer((layer) => {
        const geoJson = layer.toGeoJSON();
        const index = this.features.findIndex(f => 
          f.properties && layer.getPopup() && 
          layer.getPopup().getContent().includes(Object.values(f.properties)[0])
        );
        if (index !== -1) {
          this.features[index].geometry = geoJson.geometry;
        }
        
        const layerIndex = this.allLayers.findIndex(item => item.layer === layer);
        if (layerIndex !== -1) {
          this.allLayers[layerIndex].feature.geometry = geoJson.geometry;
        }
      });
      this.updateURL();
    });

    // Delete events
    this.map.on(L.Draw.Event.DELETED, (e) => {
      var layers = e.layers;
      layers.eachLayer((layer) => {
        const layerIndex = this.allLayers.findIndex(item => item.layer === layer);
        if (layerIndex !== -1) {
          const feature = this.allLayers[layerIndex].feature;
          this.features = this.features.filter(f => f !== feature);
          this.allLayers.splice(layerIndex, 1);
        }
      });
      this.updateURL();
    });

    // Keyboard events
    document.getElementById('noteInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveNote();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelNote();
      }
    });
  }

  showNoteModal() {
    document.getElementById('modalOverlay').style.display = 'block';
    document.getElementById('noteModal').style.display = 'block';
    document.getElementById('noteInput').focus();
  }

  saveNote() {
    const note = document.getElementById('noteInput').value || 'No note';
    
    if (this.currentDrawnLayer) {
      this.layerGroup.addLayer(this.currentDrawnLayer);
      
      const geoJsonFeature = this.currentDrawnLayer.toGeoJSON();
      geoJsonFeature.properties = { note: note };
      
      this.currentDrawnLayer.bindPopup(`<b>Note:</b> ${note}`);
      
      this.features.push(geoJsonFeature);
      
      this.allLayers.push({
        layer: this.currentDrawnLayer,
        feature: geoJsonFeature
      });
      
      this.currentDrawnLayer = null;
    }
    
    this.hideNoteModal();
    document.getElementById('noteInput').value = '';
    this.updateURL();
  }

  cancelNote() {
    this.currentDrawnLayer = null;
    this.hideNoteModal();
    document.getElementById('noteInput').value = '';
  }

  hideNoteModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('noteModal').style.display = 'none';
  }

  parseInput() {
    const text = document.getElementById('wktinput').value.trim();
    const lines = text.split('\n');
    const headers = lines[0].split('\t');
    const geomCol = headers.findIndex(h => h.toLowerCase().includes("wkt") || h.toLowerCase().includes("geom"));
    if (geomCol === -1) return alert("No geometry column found.");
    
    this.features = [];
    this.allLayers = [];
    this.layerGroup.clearLayers();
    
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split('\t');
      const wkt = cells[geomCol];
      const geom = wellknown.parse(wkt);
      if (!geom) continue;
      
      const props = {};
      headers.forEach((h, j) => { if (j !== geomCol) props[h] = cells[j]; });
      
      const feature = { type: "Feature", geometry: geom, properties: props };
      
      const geoJsonLayer = L.geoJSON(feature, {
        onEachFeature: function(feature, layer) {
          layer.bindPopup(Object.entries(props).map(([k,v]) => `<b>${k}</b>: ${v}`).join('<br/>'));
        }
      });
      
      geoJsonLayer.addTo(this.layerGroup);
      
      this.features.push(feature);
      
      const actualLayer = geoJsonLayer.getLayers()[0];
      this.allLayers.push({
        layer: actualLayer,
        feature: feature
      });
    }
    
    if (this.features.length > 0) {
      this.map.fitBounds(this.layerGroup.getBounds(), { padding: [20, 20] });
    }
    
    this.filterGeometry();
  }

  filterGeometry() {
    const selectedFilter = document.querySelector('input[name="geomFilter"]:checked').value;
    
    this.layerGroup.clearLayers();
    
    const geomMap = {
      'points': ['Point', 'MultiPoint'],
      'lines': ['LineString', 'MultiLineString'], 
      'polygons': ['Polygon', 'MultiPolygon']
    };
    
    this.allLayers.forEach(item => {
      const geomType = item.feature.geometry.type;
      let shouldShow = false;
      
      if (selectedFilter === 'all') {
        shouldShow = true;
      } else if (geomMap[selectedFilter] && geomMap[selectedFilter].includes(geomType)) {
        shouldShow = true;
      }
      
      if (shouldShow) {
        this.layerGroup.addLayer(item.layer);
      }
    });
    
    const visibleLayers = this.layerGroup.getLayers();
    if (visibleLayers.length > 0) {
      try {
        this.map.fitBounds(this.layerGroup.getBounds(), { padding: [20, 20] });
      } catch (e) {
        console.log("Could not fit bounds:", e);
      }
    }
    
    this.updateTextareaDisplay(selectedFilter);
  }

  updateTextareaDisplay(filter = 'all') {
    if (this.features.length === 0) return;
    
    let filteredFeatures = this.features;
    if (filter !== 'all') {
      const geomMap = {
        'points': ['Point', 'MultiPoint'],
        'lines': ['LineString', 'MultiLineString'], 
        'polygons': ['Polygon', 'MultiPolygon']
      };
      filteredFeatures = this.features.filter(f => geomMap[filter].includes(f.geometry.type));
    }
    
    if (filteredFeatures.length === 0) {
      document.getElementById('wktinput').value = `No ${filter} found`;
      return;
    }
    
    const keys = new Set();
    filteredFeatures.forEach(f => Object.keys(f.properties).forEach(k => keys.add(k)));
    const fields = Array.from(keys);
    const lines = [ [...fields, 'wkt_geom'].join('\t') ];
    
    filteredFeatures.forEach(f => {
      const values = fields.map(k => f.properties[k] || "");
      const wkt = this.toWKT(f.geometry);
      lines.push([...values, wkt].join('\t'));
    });
    
    document.getElementById('wktinput').value = lines.join('\n');
  }

  updateURL() {
    const selectedFilter = document.querySelector('input[name="geomFilter"]:checked').value;
    this.updateTextareaDisplay(selectedFilter);
  }

  copyWKT() {
    const selectedFilter = document.querySelector('input[name="geomFilter"]:checked').value;
    let exportFeatures = this.features;
    
    if (selectedFilter !== 'all') {
      const geomMap = {
        'points': ['Point', 'MultiPoint'],
        'lines': ['LineString', 'MultiLineString'], 
        'polygons': ['Polygon', 'MultiPolygon']
      };
      exportFeatures = this.features.filter(f => geomMap[selectedFilter].includes(f.geometry.type));
    }
    
    if (!exportFeatures.length) {
      alert(`No ${selectedFilter} to copy`);
      return;
    }
    
    const keys = new Set();
    exportFeatures.forEach(f => Object.keys(f.properties).forEach(k => keys.add(k)));
    const fields = Array.from(keys);
    const lines = [ [...fields, 'wkt_geom'].join('\t') ];
    
    exportFeatures.forEach(f => {
      const values = fields.map(k => f.properties[k] || "");
      const wkt = this.toWKT(f.geometry);
      lines.push([...values, wkt].join('\t'));
    });
    
    const wktData = lines.join('\n');
    navigator.clipboard.writeText(wktData);
    alert(`${selectedFilter} WKT copied to clipboard!`);
  }

  exportGeoJSON() {
    const selectedFilter = document.querySelector('input[name="geomFilter"]:checked').value;
    let exportFeatures = this.features;
    
    if (selectedFilter !== 'all') {
      const geomMap = {
        'points': ['Point', 'MultiPoint'],
        'lines': ['LineString', 'MultiLineString'], 
        'polygons': ['Polygon', 'MultiPolygon']
      };
      exportFeatures = this.features.filter(f => geomMap[selectedFilter].includes(f.geometry.type));
    }
    
    const data = {
      type: "FeatureCollection",
      features: exportFeatures
    };
    this.downloadFile(JSON.stringify(data, null, 2), `sketch-${this.config.name.toLowerCase()}.geojson`, "application/json");
  }

  exportCSV() {
    const selectedFilter = document.querySelector('input[name="geomFilter"]:checked').value;
    let exportFeatures = this.features;
    
    if (selectedFilter !== 'all') {
      const geomMap = {
        'points': ['Point', 'MultiPoint'],
        'lines': ['LineString', 'MultiLineString'], 
        'polygons': ['Polygon', 'MultiPolygon']
      };
      exportFeatures = this.features.filter(f => geomMap[selectedFilter].includes(f.geometry.type));
    }
    
    if (!exportFeatures.length) return alert(`No ${selectedFilter} to export`);
    
    const keys = new Set();
    exportFeatures.forEach(f => Object.keys(f.properties).forEach(k => keys.add(k)));
    const fields = Array.from(keys);
    const lines = [ [...fields, 'WKT'].join('\t') ];
    exportFeatures.forEach(f => {
      const values = fields.map(k => f.properties[k] || "");
      const wkt = this.toWKT(f.geometry);
      lines.push([...values, wkt].join('\t'));
    });
    this.downloadFile(lines.join('\n'), `sketch-${this.config.name.toLowerCase()}.csv`, "text/tab-separated-values");
  }

  toWKT(geom) {
    switch (geom.type) {
      case 'Point': return `POINT(${geom.coordinates.join(' ')})`;
      case 'LineString': return `LINESTRING(${geom.coordinates.map(c => c.join(' ')).join(', ')})`;
      case 'Polygon':
        return `POLYGON((${geom.coordinates[0].map(c => c.join(' ')).join(', ')}))`;
      default: return 'GEOMETRY';
    }
  }

  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  shareURL() {
    this.updateURL();
    const input = document.getElementById('wktinput').value;
    const encoded = encodeURIComponent(btoa(input));
    const url = `${location.origin}${location.pathname}#data=${encoded}`;
    navigator.clipboard.writeText(url);
    alert("URL copied to clipboard!");
  }

  loadSharedData() {
    window.addEventListener("load", () => {
      const hash = location.hash;
      if (hash.startsWith("#data=")) {
        try {
          const decoded = atob(decodeURIComponent(hash.slice(6)));
          document.getElementById('wktinput').value = decoded;
          this.parseInput();
        } catch (e) {
          console.error("Error decoding shared data:", e);
        }
      }
    });
  }

  switchBasemap() {
    const selectedBasemap = document.querySelector('input[name="basemapChoice"]:checked').value;
    
    if (this.basemaps[selectedBasemap] && this.currentBasemap !== this.basemaps[selectedBasemap]) {
      // Remove current basemap
      if (this.currentBasemap) {
        this.map.removeLayer(this.currentBasemap);
      }
      
      // Add new basemap
      this.currentBasemap = this.basemaps[selectedBasemap].addTo(this.map);
    }
  }

  // Simple custom tile layer for testing different coordinate formats
  createPlanetaryWMTS(url, options) {
    return L.tileLayer(url, options);
  }
}

// Global functions that the HTML buttons call
let geoSketch = null;

function parseInput() { geoSketch.parseInput(); }
function copyWKT() { geoSketch.copyWKT(); }
function exportGeoJSON() { geoSketch.exportGeoJSON(); }
function exportCSV() { geoSketch.exportCSV(); }
function shareURL() { geoSketch.shareURL(); }
function filterGeometry() { geoSketch.filterGeometry(); }
function saveNote() { geoSketch.saveNote(); }
function cancelNote() { geoSketch.cancelNote(); }
function switchBasemap() { geoSketch.switchBasemap(); }
function createPlanetaryWMTS(url, options) { return geoSketch.createPlanetaryWMTS(url, options); }