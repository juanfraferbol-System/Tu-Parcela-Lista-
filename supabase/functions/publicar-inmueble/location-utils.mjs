export function coordinateOrNull(value, minimum, maximum) {
  if (value === null || value === undefined || value === '') return null;
  const coordinate = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(coordinate)
    && coordinate >= minimum
    && coordinate <= maximum
    ? coordinate
    : null;
}

export function publicLocation(location = {}) {
  const latitude = coordinateOrNull(location.lat, -90, 90);
  const longitude = coordinateOrNull(location.lng, -180, 180);
  if (latitude === null || longitude === null) {
    return {
      latitude: null,
      longitude: null,
      precision: null,
      consent: false
    };
  }

  const approximate = location.publica_aproximada !== false;
  return {
    latitude: approximate ? Number(latitude.toFixed(3)) : latitude,
    longitude: approximate ? Number(longitude.toFixed(3)) : longitude,
    precision: approximate ? 'aproximada' : 'exacta',
    consent: true
  };
}
