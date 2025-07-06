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
    
    // Search functionality
    this.nomenclatureData = [];
    this.searchTimeout = null;
    this.searchMarkers = [];
    
    // Note editing functionality
    this.currentEditingFeature = null;
    
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
    
    // Initialize search functionality
    this.initSearch();
    
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

    // Keyboard events for note modal
    document.getElementById('noteInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveNote();
      }
    });
    
    // Keyboard events for password modal
    document.getElementById('passwordInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handlePasswordSubmit();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelNote();
        this.cancelEditNote();
        this.cancelPassword();
        this.hideSearchResults();
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
      geoJsonFeature.properties = { 
        id: this.generateFeatureId(),
        note: note 
      };
      
      // Use enhanced popup
      const popupContent = this.createFeaturePopup(this.currentDrawnLayer, geoJsonFeature);
      this.currentDrawnLayer.bindPopup(popupContent);
      
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

  // Enhanced note editing functionality
  generateFeatureId() {
    return 'feature_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getLayerType(layer) {
    if (layer instanceof L.Marker) return 'Point';
    if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) return 'Line';
    if (layer instanceof L.Polygon) return 'Polygon';
    if (layer instanceof L.Circle) return 'Circle';
    if (layer instanceof L.Rectangle) return 'Rectangle';
    return 'Feature';
  }

  getLayerCoordinates(layer) {
    if (layer instanceof L.Marker) {
      const latlng = layer.getLatLng();
      return `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
    }
    if (layer instanceof L.Circle) {
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      return `Center: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}, Radius: ${radius.toFixed(0)}m`;
    }
    if (layer instanceof L.Polyline) {
      const bounds = layer.getBounds();
      return `Bounds: ${bounds.toBBoxString()}`;
    }
    return 'Multiple coordinates';
  }

  createFeaturePopup(layer, feature) {
    const coords = this.getLayerCoordinates(layer);
    const note = feature.properties?.note || '';
    const featureId = feature.properties?.id || '';
    const layerType = this.getLayerType(layer);
    
    // For imported features, show all properties except id and note
    let additionalProps = '';
    if (feature.properties) {
      const otherProps = Object.entries(feature.properties)
        .filter(([k, v]) => k !== 'id' && k !== 'note' && v)
        .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`)
        .join('');
      if (otherProps) {
        additionalProps = `<div class="feature-properties">${otherProps}</div>`;
      }
    }
    
    const popupContent = `
      <div class="feature-popup">
        <div class="feature-title">
          ${layerType} Feature
        </div>
        <div class="feature-coords">
          ${coords}
        </div>
        ${additionalProps}
        <div class="feature-note ${note ? '' : 'empty'}">
          <strong>Note:</strong> ${note || 'No note added'}
        </div>
        <div class="popup-buttons">
          <button class="btn-edit" onclick="geoSketch.editFeatureNote('${featureId}')">
            📝 Edit Note
          </button>
          <button class="btn-delete" onclick="geoSketch.deleteFeature('${featureId}')">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
    
    return popupContent;
  }

  findFeatureByIdInLayers(featureId) {
    return this.allLayers.find(item => item.feature?.properties?.id === featureId);
  }

  editFeatureNote(featureId) {
    const featureItem = this.findFeatureByIdInLayers(featureId);
    if (!featureItem) {
      console.error('Feature not found:', featureId);
      return;
    }
    
    this.currentEditingFeature = featureItem;
    const currentNote = featureItem.feature.properties?.note || '';
    
    // Show edit modal
    this.showEditNoteModal(currentNote);
  }

  showEditNoteModal(currentNote) {
    const editModal = document.getElementById('editNoteModal');
    const editTextarea = document.getElementById('editNoteTextarea');
    
    if (!editModal || !editTextarea) {
      console.error('Edit modal elements not found');
      return;
    }
    
    editTextarea.value = currentNote;
    document.getElementById('modalOverlay').style.display = 'block';
    editModal.style.display = 'block';
    
    // Focus on textarea
    setTimeout(() => editTextarea.focus(), 100);
  }

  saveEditedNote() {
    if (!this.currentEditingFeature) return;
    
    const editTextarea = document.getElementById('editNoteTextarea');
    const noteText = editTextarea.value.trim();
    
    // Update feature properties
    this.currentEditingFeature.feature.properties.note = noteText;
    
    // Update popup
    const popupContent = this.createFeaturePopup(this.currentEditingFeature.layer, this.currentEditingFeature.feature);
    this.currentEditingFeature.layer.bindPopup(popupContent);
    
    // Close modal
    this.hideEditNoteModal();
    
    // Update URL/data
    this.updateURL();
    
    // Show confirmation
    this.showNotification('Note updated!');
  }

  cancelEditNote() {
    this.hideEditNoteModal();
  }

  hideEditNoteModal() {
    const editModal = document.getElementById('editNoteModal');
    const editTextarea = document.getElementById('editNoteTextarea');
    
    if (editModal) editModal.style.display = 'none';
    if (editTextarea) editTextarea.value = '';
    
    document.getElementById('modalOverlay').style.display = 'none';
    this.currentEditingFeature = null;
  }

  deleteFeature(featureId) {
    const featureItem = this.findFeatureByIdInLayers(featureId);
    if (!featureItem) return;
    
    if (!confirm('Delete this feature? This action cannot be undone.')) {
      return;
    }
    
    // Remove from map
    this.layerGroup.removeLayer(featureItem.layer);
    
    // Remove from arrays
    this.features = this.features.filter(f => f.properties?.id !== featureId);
    this.allLayers = this.allLayers.filter(item => item.feature?.properties?.id !== featureId);
    
    // Close any open popups
    this.map.closePopup();
    
    // Update URL/data
    this.updateURL();
    
    this.showNotification('Feature deleted');
  }

  showNotification(message) {
    // Simple notification using Leaflet popup
    const notification = L.popup()
      .setLatLng(this.map.getCenter())
      .setContent(`<div style="text-align: center; color: #27ae60; font-weight: bold;">✓ ${message}</div>`)
      .openOn(this.map);
      
    setTimeout(() => {
      this.map.closePopup(notification);
    }, 2000);
  }

  // Password modal functions
  showPasswordModal(type) {
    this.passwordModalType = type; // 'share' or 'load'
    document.getElementById('modalOverlay').style.display = 'block';
    document.getElementById('passwordModal').style.display = 'block';
    document.getElementById('passwordInput').focus();
    
    const title = type === 'share' ? 'Enter Password to Encrypt' : 'Enter Password to Decrypt';
    document.getElementById('passwordModalTitle').textContent = title;
  }

  handlePasswordSubmit() {
    const password = document.getElementById('passwordInput').value;
    if (!password) {
      alert('Please enter a password');
      return;
    }

    if (this.passwordModalType === 'share') {
      this.shareEncryptedURL(password);
    } else if (this.passwordModalType === 'load') {
      this.decryptAndLoadData(password);
    }
  }

  cancelPassword() {
    this.hidePasswordModal();
    document.getElementById('passwordInput').value = '';
    this.passwordModalType = null;
    this.pendingEncryptedData = null;
  }

  hidePasswordModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('passwordModal').style.display = 'none';
  }

  // Encryption helper functions
  async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const importedKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      importedKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptData(data, password) {
    const encoder = new TextEncoder();
    
    // Compress data first
    const compressed = pako.gzip(data);
    
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Derive key from password
    const key = await this.deriveKey(password, salt);
    
    // Encrypt compressed data
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      compressed
    );
    
    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return combined;
  }

  async decryptData(encryptedData, password) {
    // Extract salt, iv, and encrypted data
    const salt = encryptedData.slice(0, 16);
    const iv = encryptedData.slice(16, 28);
    const encrypted = encryptedData.slice(28);
    
    // Derive key from password
    const key = await this.deriveKey(password, salt);
    
    try {
      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );
      
      // Decompress data
      const decompressed = pako.ungzip(new Uint8Array(decrypted), { to: 'string' });
      return decompressed;
    } catch (e) {
      throw new Error('Invalid password or corrupted data');
    }
  }

  // Array buffer to base64 conversion
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Base64 to array buffer conversion
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async shareEncryptedURL(password) {
    try {
      this.updateURL();
      const input = document.getElementById('wktinput').value;
      
      if (!input.trim()) {
        alert('No data to encrypt');
        this.hidePasswordModal();
        return;
      }
      
      const encryptedData = await this.encryptData(input, password);
      const encoded = encodeURIComponent(this.arrayBufferToBase64(encryptedData));
      const url = `${location.origin}${location.pathname}#encrypted=${encoded}`;
      
      // Try modern clipboard API first, fallback for Safari
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(url);
          alert("Encrypted URL copied to clipboard!");
        } catch (e) {
          this.showUrlFallback(url, "Encrypted URL");
        }
      } else {
        // Fallback for Safari/older browsers
        this.showUrlFallback(url, "Encrypted URL");
      }
      
      this.hidePasswordModal();
      document.getElementById('passwordInput').value = '';
    } catch (e) {
      console.error('Encryption error:', e);
      alert('Encryption failed. Please try again.');
    }
  }

  showUrlFallback(url, title) {
    // Create a temporary modal with the URL for manual copying
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; padding: 20px; border-radius: 5px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3); z-index: 10001;
      max-width: 90%; word-break: break-all;
    `;
    
    modal.innerHTML = `
      <h3>${title}</h3>
      <textarea readonly style="width: 100%; height: 100px; margin: 10px 0;">${url}</textarea>
      <div>
        <button onclick="this.parentElement.parentElement.remove(); document.getElementById('modalOverlay').style.display='none'">Close</button>
      </div>
    `;
    
    document.getElementById('modalOverlay').style.display = 'block';
    document.body.appendChild(modal);
    
    // Select the URL text for easy copying
    modal.querySelector('textarea').select();
  }

  async decryptAndLoadData(password) {
    try {
      const encryptedData = this.base64ToArrayBuffer(this.pendingEncryptedData);
      const decryptedData = await this.decryptData(encryptedData, password);
      
      document.getElementById('wktinput').value = decryptedData;
      this.parseInput();
      
      this.hidePasswordModal();
      document.getElementById('passwordInput').value = '';
      this.pendingEncryptedData = null;
    } catch (e) {
      console.error('Decryption error:', e);
      alert('Wrong password or corrupted data');
      document.getElementById('passwordInput').value = '';
      document.getElementById('passwordInput').focus();
    }
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
      
      // Ensure feature has an ID and note field
      if (!props.id) {
        props.id = this.generateFeatureId();
      }
      if (!props.note) {
        props.note = '';
      }
      
      const feature = { type: "Feature", geometry: geom, properties: props };
      
      const geoJsonLayer = L.geoJSON(feature, {
        onEachFeature: (feature, layer) => {
          // Use enhanced popup instead of simple property list
          const popupContent = this.createFeaturePopup(layer, feature);
          layer.bindPopup(popupContent);
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
        // Silent fallback - bounds calculation failed
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
    
    // Try modern clipboard API first, fallback for Safari
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        alert("URL copied to clipboard!");
      }).catch(() => {
        this.showUrlFallback(url, "Shareable URL");
      });
    } else {
      this.showUrlFallback(url, "Shareable URL");
    }
  }

  shareEncrypted() {
    this.showPasswordModal('share');
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
      } else if (hash.startsWith("#encrypted=")) {
        try {
          this.pendingEncryptedData = decodeURIComponent(hash.slice(11));
          this.showPasswordModal('load');
        } catch (e) {
          console.error("Error loading encrypted data:", e);
          alert("Invalid encrypted URL");
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

  // Search functionality
  initSearch() {
    // Check if search elements exist
    const searchBox = document.getElementById('toponymSearch');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchBox || !searchResults) {
      return; // Search interface not available on this page
    }
    
    // Initialize search for the current platform
    this.loadNomenclatureData();
    
    // Setup search event handlers
    searchBox.addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        this.hideSearchResults();
        return;
      }
      
      this.searchTimeout = setTimeout(() => {
        this.performSearch(query);
      }, 300);
    });
    
    searchBox.addEventListener('focus', (e) => {
      if (e.target.value.trim().length >= 2) {
        this.showSearchResults();
      }
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        this.hideSearchResults();
      }
    });
    
    // Keyboard navigation
    searchBox.addEventListener('keydown', (e) => {
      const items = searchResults.querySelectorAll('.result-item');
      let current = searchResults.querySelector('.result-item.highlighted');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (current) {
          current.classList.remove('highlighted');
          current = current.nextElementSibling || items[0];
        } else {
          current = items[0];
        }
        if (current) current.classList.add('highlighted');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (current) {
          current.classList.remove('highlighted');
          current = current.previousElementSibling || items[items.length - 1];
        } else {
          current = items[items.length - 1];
        }
        if (current) current.classList.add('highlighted');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (current) {
          current.click();
        }
      }
    });
  }
  
  async loadNomenclatureData() {
    const targetName = this.config.name.toLowerCase();
    
    try {
      if (targetName === 'earth') {
        // For Earth, we'll use a combination of local major cities and an API
        this.nomenclatureData = await this.loadEarthPlaces();
      } else {
        // For Mars/Moon, load from JSON files
        const response = await fetch(`../data/${targetName}_nomenclature.json`);
        if (!response.ok) throw new Error(`Failed to load ${targetName} data`);
        
        const data = await response.json();
        this.nomenclatureData = data.features.map(feature => ({
          name: feature.properties.name,
          lat: feature.geometry.coordinates[1],
          lon: feature.geometry.coordinates[0],
          diameter: feature.properties.diameter,
          target: feature.properties.target,
          origin: feature.properties.origin,
          type: this.inferFeatureType(feature.properties.name)
        }));
      }
      
      // Successfully loaded nomenclature data
    } catch (error) {
      // Failed to load nomenclature data for this target
      this.nomenclatureData = [];
      
      // Try to provide fallback data for Earth
      if (targetName === 'earth') {
        // Attempting Earth fallback data
        this.nomenclatureData = [
          {name: 'London', lat: 51.5074, lon: -0.1278, country: 'United Kingdom', type: 'city', diameter: 50},
          {name: 'Paris', lat: 48.8566, lon: 2.3522, country: 'France', type: 'city', diameter: 50},
          {name: 'New York', lat: 40.7128, lon: -74.0060, country: 'United States', type: 'city', diameter: 50},
          {name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'Japan', type: 'city', diameter: 50}
        ];
        // Successfully loaded fallback data
      }
    }
  }
  
  async loadEarthPlaces() {
    // For Earth, we'll use Nominatim (OpenStreetMap) for real-time geocoding
    // Keep a fallback list for offline/API failure scenarios
    // Earth search will use Nominatim with local fallback
    
    // Fallback data in case API is unavailable
    this.earthFallbackData = [
      {name: 'London', lat: 51.5074, lon: -0.1278, country: 'United Kingdom', type: 'city', diameter: 50},
      {name: 'Paris', lat: 48.8566, lon: 2.3522, country: 'France', type: 'city', diameter: 50},
      {name: 'New York', lat: 40.7128, lon: -74.0060, country: 'United States', type: 'city', diameter: 50},
      {name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'Japan', type: 'city', diameter: 50},
      {name: 'Sydney', lat: -33.8688, lon: 151.2093, country: 'Australia', type: 'city', diameter: 50},
      {name: 'Cairo', lat: 30.0444, lon: 31.2357, country: 'Egypt', type: 'city', diameter: 50},
      {name: 'Beijing', lat: 39.9042, lon: 116.4074, country: 'China', type: 'city', diameter: 50},
      {name: 'Mumbai', lat: 19.0760, lon: 72.8777, country: 'India', type: 'city', diameter: 50},
      {name: 'São Paulo', lat: -23.5505, lon: -46.6333, country: 'Brazil', type: 'city', diameter: 50},
      {name: 'Moscow', lat: 55.7558, lon: 37.6176, country: 'Russia', type: 'city', diameter: 50},
      {name: 'Rome', lat: 41.9028, lon: 12.4964, country: 'Italy', type: 'city', diameter: 50},
      {name: 'Los Angeles', lat: 34.0522, lon: -118.2437, country: 'United States', type: 'city', diameter: 100},
      {name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729, country: 'Brazil', type: 'city', diameter: 50},
      {name: 'Istanbul', lat: 41.0082, lon: 28.9784, country: 'Turkey', type: 'city', diameter: 50},
      {name: 'Dubai', lat: 25.2048, lon: 55.2708, country: 'UAE', type: 'city', diameter: 50}
    ];
    
    // Return fallback data initially - API search will happen during performSearch
    return this.earthFallbackData;
  }
  
  inferFeatureType(name) {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('mons') || lowercaseName.includes('mount')) return 'mountain';
    if (lowercaseName.includes('vallis') || lowercaseName.includes('valley')) return 'valley';
    if (lowercaseName.includes('mare') || lowercaseName.includes('sea')) return 'mare';
    if (lowercaseName.includes('crater')) return 'crater';
    if (lowercaseName.includes('planitia') || lowercaseName.includes('plain')) return 'plain';
    return 'feature';
  }
  
  performSearch(query) {
    const searchResults = document.getElementById('searchResults');
    const queryLower = query.toLowerCase();
    
    if (!searchResults) return;
    
    searchResults.innerHTML = '<div class="loading">Searching...</div>';
    this.showSearchResults();
    
    // For Earth, use Nominatim API; for Mars/Moon, use local data
    if (this.config.name.toLowerCase() === 'earth') {
      this.performEarthSearch(query);
    } else {
      this.performLocalSearch(query);
    }
  }
  
  async performEarthSearch(query) {
    try {
      // Use Nominatim (OpenStreetMap) - free, no API key required
      const results = await this.searchNominatim(query);
      
      if (results && results.length > 0) {
        // Successfully found results from Nominatim
        this.displaySearchResults(results);
        return;
      }
    } catch (error) {
      // Nominatim unavailable, falling back to local data
    }
    
    // Fallback to local data
    this.performLocalSearch(query);
  }
  
  async searchNominatim(query) {
    // Use Nominatim (OpenStreetMap) - free, open-source, no API key required
    // Documentation: https://nominatim.org/release-docs/latest/api/Search/
    const url = `https://nominatim.openstreetmap.org/search?` + 
                `q=${encodeURIComponent(query)}&` +
                `format=json&` +
                `limit=8&` +
                `addressdetails=1&` +
                `extratags=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GeoSketch/1.2.0 (https://geosketch.io)' // Required by Nominatim
      }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    // Convert Nominatim results to our format
    return data.map(result => {
      // Estimate diameter based on place type and class
      let diameter = 50; // default
      const type = result.type;
      const cls = result.class;
      
      if (cls === 'boundary' && type === 'administrative') {
        const adminLevel = result.extratags?.admin_level;
        if (adminLevel <= 2) diameter = 1000;      // countries
        else if (adminLevel <= 4) diameter = 500;  // states/regions
        else if (adminLevel <= 6) diameter = 200;  // counties
        else diameter = 100;                       // cities
      } else if (cls === 'place') {
        if (type === 'country') diameter = 1000;
        else if (['state', 'region'].includes(type)) diameter = 500;
        else if (['city', 'town'].includes(type)) diameter = 100;
        else if (['village', 'hamlet'].includes(type)) diameter = 20;
        else if (type === 'neighbourhood') diameter = 10;
      } else if (cls === 'amenity' || cls === 'tourism') {
        diameter = 5; // venues, landmarks
      } else if (cls === 'natural') {
        diameter = 100; // natural features
      }
      
      // Build location description
      const address = result.address || {};
      const country = address.country || '';
      const state = address.state || address.region || '';
      const location = [state, country].filter(x => x).join(', ') || result.display_name;
      
      return {
        name: result.display_name.split(',')[0], // First part is usually the main name
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        country: location,
        type: `${cls}:${type}`,
        diameter: diameter,
        confidence: parseFloat(result.importance || 0.5),
        full_name: result.display_name
      };
    });
  }
  
  performLocalSearch(query) {
    const queryLower = query.toLowerCase();
    
    // Search through local nomenclature data (Mars/Moon or Earth fallback)
    const results = this.nomenclatureData.filter(feature => {
      return feature.name.toLowerCase().includes(queryLower) ||
             (feature.origin && feature.origin.toLowerCase().includes(queryLower)) ||
             (feature.country && feature.country.toLowerCase().includes(queryLower));
    }).slice(0, 8); // Limit to 8 results
    
    // Successfully found results from local data
    this.displaySearchResults(results);
  }
  
  displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="no-results">No features found</div>';
      return;
    }
    
    searchResults.innerHTML = results.map(feature => {
      const subtitle = feature.country ? feature.country : 
                      (feature.diameter ? `Diameter: ${feature.diameter}km` : feature.target);
      const coords = `${feature.lat.toFixed(2)}°, ${feature.lon.toFixed(2)}°`;
      
      return `
        <div class="result-item" onclick="geoSketch.zoomToFeature(${feature.lat}, ${feature.lon}, ${feature.diameter || 50}, '${feature.name.replace(/'/g, "\\'")}', '${subtitle.replace(/'/g, "\\'")}', '${(feature.origin || '').replace(/'/g, "\\'")}')">
          <div class="result-name">${feature.name}</div>
          <div class="result-details">
            ${subtitle}
            <div class="result-coords">${coords}</div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  showSearchResults() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
      searchResults.classList.add('show');
    }
  }
  
  hideSearchResults() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
      searchResults.classList.remove('show');
      // Clear any highlighted items
      searchResults.querySelectorAll('.result-item.highlighted').forEach(item => {
        item.classList.remove('highlighted');
      });
    }
  }
  
  zoomToFeature(lat, lon, diameter, name, subtitle, origin) {
    // Hide search results
    this.hideSearchResults();
    const searchBox = document.getElementById('toponymSearch');
    if (searchBox) searchBox.blur();
    
    // Clear any existing search markers
    this.clearSearchMarkers();
    
    // Calculate appropriate zoom level based on feature size - more conservative for large features
    let zoomLevel;
    if (diameter > 2000) zoomLevel = 2;       // Very large features (continents, major deserts)
    else if (diameter > 1000) zoomLevel = 3;  // Large features (big plains, large craters)
    else if (diameter > 500) zoomLevel = 4;   // Medium-large features
    else if (diameter > 300) zoomLevel = 5;   // Medium features
    else if (diameter > 100) zoomLevel = 6;   // Small-medium features
    else if (diameter > 50) zoomLevel = 7;    // Small features
    else if (diameter > 20) zoomLevel = 8;    // Very small features
    else if (diameter > 10) zoomLevel = 9;    // Tiny features
    else zoomLevel = 10;                      // Point features
    
    // Zoom to location
    this.map.setView([lat, lon], zoomLevel);
    
    // Add a marker with popup - just the marker, no circle
    const marker = L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'search-marker',
        html: '📍',
        iconSize: [20, 20],
        iconAnchor: [10, 20]
      })
    }).addTo(this.map);
    
    // Only show diameter for planetary features (Mars/Moon), not Earth cities
    const shouldShowDiameter = this.config.name !== 'Earth' && diameter;
    
    const popupContent = `
      <div class="popup-title">${name}</div>
      <div class="popup-details">
        <strong>Location:</strong> ${subtitle}<br>
        <strong>Coordinates:</strong> ${lat.toFixed(3)}°, ${lon.toFixed(3)}°
        ${shouldShowDiameter ? `<br><strong>Diameter:</strong> ${diameter} km` : ''}
        ${origin ? `<br><strong>Origin:</strong> ${origin.substring(0, 100)}${origin.length > 100 ? '...' : ''}` : ''}
      </div>
    `;
    
    marker.bindPopup(popupContent).openPopup();
    
    // Store marker for cleanup
    this.searchMarkers.push(marker);
    
    // No circles - just the marker/centroid as requested
  }
  
  clearSearchMarkers() {
    this.searchMarkers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.searchMarkers = [];
  }
}

// Global functions that the HTML buttons call
let geoSketch = null;

function parseInput() { geoSketch.parseInput(); }
function copyWKT() { geoSketch.copyWKT(); }
function exportGeoJSON() { geoSketch.exportGeoJSON(); }
function exportCSV() { geoSketch.exportCSV(); }
function shareURL() { geoSketch.shareURL(); }
function shareEncrypted() { geoSketch.shareEncrypted(); }
function filterGeometry() { geoSketch.filterGeometry(); }
function saveNote() { geoSketch.saveNote(); }
function cancelNote() { geoSketch.cancelNote(); }
function saveEditedNote() { geoSketch.saveEditedNote(); }
function cancelEditNote() { geoSketch.cancelEditNote(); }
function handlePasswordSubmit() { geoSketch.handlePasswordSubmit(); }
function cancelPassword() { geoSketch.cancelPassword(); }
function switchBasemap() { geoSketch.switchBasemap(); }
function createPlanetaryWMTS(url, options) { return geoSketch.createPlanetaryWMTS(url, options); }
