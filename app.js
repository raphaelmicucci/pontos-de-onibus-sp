/* global L, Papa */

const OLHOVIVO_URL = 'https://olhovivo.sptrans.com.br/#sp?cat=Parada&PID=';
const MAX_MARKERS = 200;
const DEFAULT_CENTER = [-23.5505, -46.6333];
const DEFAULT_ZOOM = 14;
const STOPS_DATA_URL = 'data/stops.txt';

let map;
let userMarker;
let stopsLayer;
let allStops = [];
let stopIcon;

// ─── Utility ─────────────────────────────────────────────────────────────────

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
      const latLng = L.latLng(latitude, longitude);

      if (userMarker) {
        userMarker.setLatLng(latLng);
      } else {
        const icon = L.divIcon({
          className: '',
          html: '<div style="width:16px;height:16px;background:#1565C0;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        userMarker = L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(map);
        userMarker.bindPopup('<b>Você está aqui</b>').openPopup();
      }

      map.setView(latLng, 16);
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

  // Always show stops in current map bounds (up to MAX_MARKERS)
  const bounds = map.getBounds();
  const filtered = allStops
    .filter((s) => bounds.contains([s.lat, s.lon]))
    .slice(0, MAX_MARKERS);

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
  document.getElementById('stops-count').textContent = `${count} paradas visíveis`;
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

  // Re-render stops whenever the map moves
  map.on('moveend', renderNearbyStops);

  loadStopsCSV();
});

