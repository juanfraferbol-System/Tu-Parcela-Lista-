(() => {
  'use strict';

  const LATITUDE_KEYS = [
    'mapLatitude',
    'latitud_publica',
    'latitudPublica',
    'latitude',
    'lat'
  ];
  const LONGITUDE_KEYS = [
    'mapLongitude',
    'longitud_publica',
    'longitudPublica',
    'longitude',
    'lng'
  ];

  function finiteCoordinate(value) {
    if (value === null || value === undefined || value === '') return null;
    const coordinate = Number(String(value).replace(',', '.'));
    return Number.isFinite(coordinate) ? coordinate : null;
  }

  function validCoordinates(latitude, longitude) {
    return latitude !== null
      && longitude !== null
      && latitude >= -90
      && latitude <= 90
      && longitude >= -180
      && longitude <= 180;
  }

  function pairFromValue(value) {
    let decoded = String(value || '').replace(/\+/g, ' ');
    try {
      decoded = decodeURIComponent(decoded);
    } catch {}
    const match = decoded.match(/(-?\d{1,2}(?:[.,]\d+)?)\s*,\s*(-?\d{1,3}(?:[.,]\d+)?)/);
    if (!match) return null;
    const latitude = finiteCoordinate(match[1]);
    const longitude = finiteCoordinate(match[2]);
    return validCoordinates(latitude, longitude) ? { latitude, longitude } : null;
  }

  function coordinatesFromUrl(rawUrl) {
    if (!rawUrl) return null;
    try {
      const url = new URL(String(rawUrl), window.location?.origin || 'https://www.parcelalista.cl');
      const directPair = pairFromValue(decodeURIComponent(url.href).match(/@([^/?#]+)/)?.[1]);
      if (directPair) return directPair;

      for (const key of ['q', 'query', 'll', 'center']) {
        const queryPair = pairFromValue(url.searchParams.get(key));
        if (queryPair) return queryPair;
      }

      return pairFromValue(decodeURIComponent(url.pathname));
    } catch {
      return pairFromValue(rawUrl);
    }
  }

  function firstCoordinate(config, keys) {
    for (const key of keys) {
      const value = finiteCoordinate(config?.[key]);
      if (value !== null) return value;
    }
    return null;
  }

  function resolveCoordinates(config = {}) {
    const latitude = firstCoordinate(config, LATITUDE_KEYS);
    const longitude = firstCoordinate(config, LONGITUDE_KEYS);
    if (validCoordinates(latitude, longitude)) {
      return {
        latitude,
        longitude,
        source: 'config',
        precision: config.mapPrecision || 'configurada'
      };
    }

    const urlCoordinates = coordinatesFromUrl(config.mapUrl);
    return urlCoordinates
      ? {
          ...urlCoordinates,
          source: 'mapUrl',
          precision: config.mapPrecision || 'informada'
        }
      : null;
  }

  function zoom(config = {}) {
    const configured = Number(config.mapZoom);
    return Number.isFinite(configured)
      ? Math.min(19, Math.max(11, Math.round(configured)))
      : 16;
  }

  function navigationUrl(coordinates, configuredUrl = '') {
    if (coordinates) {
      const query = `${coordinates.latitude},${coordinates.longitude}`;
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
    try {
      const url = new URL(String(configuredUrl || ''), window.location?.origin || 'https://www.parcelalista.cl');
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function markerIcon() {
    return window.L.divIcon({
      className: 'tpl-map-marker-shell',
      html: `
        <span class="tpl-map-marker" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path>
            <circle cx="12" cy="10" r="2.5"></circle>
          </svg>
        </span>
        <span class="tpl-map-marker-pulse" aria-hidden="true"></span>`,
      iconSize: [56, 66],
      iconAnchor: [28, 58],
      popupAnchor: [0, -54]
    });
  }

  function init(container, config = {}) {
    const coordinates = resolveCoordinates(config);
    if (!container || !coordinates || !window.L) return null;

    const center = [coordinates.latitude, coordinates.longitude];
    const map = window.L.map(container, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true
    }).setView(center, zoom(config));

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const marker = window.L.marker(center, {
      icon: markerIcon(),
      title: config.title || 'Ubicación de la propiedad',
      alt: config.title || 'Ubicación de la propiedad',
      keyboard: true
    }).addTo(map);

    const title = String(config.title || 'Ubicación de la propiedad');
    const location = String(config.location || '');
    const popup = document.createElement('div');
    const strong = document.createElement('strong');
    const text = document.createElement('span');
    popup.className = 'tpl-map-popup';
    strong.textContent = title;
    text.textContent = location;
    popup.append(strong, text);
    marker.bindPopup(popup);

    window.L.control.scale({ imperial: false, maxWidth: 110 }).addTo(map);
    window.setTimeout(() => map.invalidateSize(), 80);
    return { map, marker, coordinates };
  }

  window.TPLLandingMap = Object.freeze({
    resolveCoordinates,
    navigationUrl,
    init
  });
})();
