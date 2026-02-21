/* global L, Papa */

const OLHOVIVO_URL = 'https://olhovivo.sptrans.com.br/#sp?cat=Parada&PID=';
const MAX_STOPS_RADIUS_KM = 1.5;
const MAX_MARKERS = 200;
const EARTH_RADIUS_KM = 6371;
const DEFAULT_CENTER = [-23.5505, -46.6333];
const DEFAULT_ZOOM = 14;
const STOPS_DATA_URL = 'data/stops.txt';

let map;
let userMarker;
let stopsLayer;
let allStops = [];
let userLatLng = null;
let stopIcon;

// ─── Utility ─────────────────────────────────────────────────────────────────

function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function showError(msg) {
  const toast = document.getElementById('error-toast');
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 4000);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setLoading(visible, message) {
  const overlay = document.getElementById('loading-overlay');
  if (visible) {
    overlay.querySelector('p').textContent = message || 'Carregando…';
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

// ─── Map ─────────────────────────────────────────────────────────────────────

function initMap() {
  map = L.map('map', {
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  stopsLayer = L.layerGroup().addTo(map);

  stopIcon = L.divIcon({
    className: '',
    html: '<div style="width:10px;height:10px;background:#F44336;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

  // Default view on São Paulo
  map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
}

// ─── User Location ────────────────────────────────────────────────────────────

function locateUser() {
  if (!navigator.geolocation) {
    showError('Geolocalização não suportada pelo seu navegador.');
    return;
  }
  setLoading(true, 'Obtendo sua localização…');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setLoading(false);
      const { latitude, longitude } = pos.coords;
      userLatLng = L.latLng(latitude, longitude);

      if (userMarker) {
        userMarker.setLatLng(userLatLng);
      } else {
        const icon = L.divIcon({
          className: '',
          html: '<div style="width:16px;height:16px;background:#1565C0;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        userMarker = L.marker(userLatLng, { icon, zIndexOffset: 1000 }).addTo(map);
        userMarker.bindPopup('<b>Você está aqui</b>').openPopup();
      }

      map.setView(userLatLng, 16);
      renderNearbyStops();
    },
    (err) => {
      setLoading(false);
      if (err.code === err.PERMISSION_DENIED) {
        showError('Permissão de localização negada.');
      } else {
        showError('Não foi possível obter sua localização.');
      }
    },
    { timeout: 10000, maximumAge: 30000 }
  );
}

// ─── Stops Rendering ─────────────────────────────────────────────────────────

function renderNearbyStops() {
  stopsLayer.clearLayers();

  if (allStops.length === 0) return;

  let filtered;

  if (userLatLng) {
    filtered = allStops
      .map((s) => ({
        ...s,
        dist: haversineKm(userLatLng.lat, userLatLng.lng, s.lat, s.lon),
      }))
      .filter((s) => s.dist <= MAX_STOPS_RADIUS_KM)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, MAX_MARKERS);
  } else {
    // No user location: show stops in current map bounds (up to MAX_MARKERS)
    const bounds = map.getBounds();
    filtered = allStops
      .filter((s) => bounds.contains([s.lat, s.lon]))
      .slice(0, MAX_MARKERS);
  }

  filtered.forEach((stop) => {
    const marker = L.marker([stop.lat, stop.lon], { icon: stopIcon });
    const popup = `
      <div class="stop-popup">
        <div class="stop-name">${escapeHtml(stop.name)}</div>
        <div class="stop-id">ID: ${escapeHtml(stop.id)}</div>
        <a class="olhovivo-link" href="${OLHOVIVO_URL}${encodeURIComponent(stop.id)}" target="_blank" rel="noopener noreferrer">
          abrir no olho vivo
        </a>
      </div>`;
    marker.bindPopup(popup, { maxWidth: 280 });
    stopsLayer.addLayer(marker);
  });

  const count = stopsLayer.getLayers().length;
  document.getElementById('stops-count').textContent =
    userLatLng
      ? `${count} paradas em ${MAX_STOPS_RADIUS_KM} km`
      : `${count} paradas visíveis`;
}

// ─── Stops Data Loading ───────────────────────────────────────────────────────

async function loadStopsCSV() {
  setLoading(true, 'Carregando paradas…');
  try {
    const response = await fetch(STOPS_DATA_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const csvText = await response.text();

    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const rows = parsed.data;

    if (!rows.length) {
      throw new Error('Nenhuma parada encontrada em stops.txt.');
    }

    // Standard GTFS column names (spec: stop_id, stop_name, stop_lat, stop_lon)
    const sample = rows[0];
    if (!sample['stop_id'] || sample['stop_lat'] === undefined) {
      throw new Error('Formato de stops.txt inválido.');
    }

    allStops = rows
      .map((r) => ({
        id: String(r['stop_id']).trim(),
        name: String(r['stop_name'] || '').trim() || `Parada ${r['stop_id']}`,
        lat: parseFloat(r['stop_lat']),
        lon: parseFloat(r['stop_lon']),
      }))
      .filter((s) => !isNaN(s.lat) && !isNaN(s.lon));

    setLoading(false);
    document.getElementById('stops-count').textContent =
      `${allStops.length} paradas carregadas`;

    locateUser();
  } catch (err) {
    setLoading(false);
    showError(`Erro ao carregar paradas: ${err.message}`);
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initMap();

  document.getElementById('btn-locate').addEventListener('click', locateUser);

  // Re-render stops when map moves (if no user location)
  map.on('moveend', () => {
    if (!userLatLng) renderNearbyStops();
  });

  loadStopsCSV();
});

