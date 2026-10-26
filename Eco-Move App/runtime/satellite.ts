import L from 'leaflet';

type Session = { session: string; expiry: string; tileWidth: number; tileHeight: number };
type SatelliteState = { status: 'idle' | 'loading' | 'ready' | 'error'; message?: string };
type Coverage = { maxZoom: number; north: number; south: number; east: number; west: number };
export function satelliteNativeZoom(rects: Coverage[], bounds: L.LatLngBounds) {
  // Coverage records overlap (including several world-sized rectangles). Use
  // the best coverage containing the viewport, not the poorest imagery record.
  const covering = rects.filter(r => Number.isFinite(r.maxZoom) && r.north >= bounds.getNorth() && r.south <= bounds.getSouth() && r.east >= bounds.getEast() && r.west <= bounds.getWest());
  return covering.length ? Math.min(22, Math.max(...covering.map(r => r.maxZoom))) : 19;
}

/** Official Google Map Tiles API, layered under the unchanged Leaflet overlays.
 * Imagery is requested only for the visible map; no offline/prefetch cache.
 * https://developers.google.com/maps/documentation/tile/satellite
 */
export function satelliteController(map: L.Map, key: string, notify: (state: SatelliteState) => void) {
  let session: Session | undefined;
  let selected = false, generation = 0;
  let lifetime: AbortController | undefined, viewportRequest: AbortController | undefined;
  let layer: L.TileLayer | undefined, attribution: L.Control | undefined;
  let sources: HTMLElement | undefined, oldSources = '';
  let baseLayers: L.TileLayer[] = [];
  let moveTimer: ReturnType<typeof setTimeout> | undefined;
  let renewalTimer: ReturnType<typeof setTimeout> | undefined;
  let viewportSequence = 0;
  const pane = map.createPane('ecoSatellite');
  pane.style.zIndex = '201';
  pane.style.pointerEvents = 'none';

  const request = async (url: string, signal: AbortSignal, body?: object) => {
    const response = await fetch(url, body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }
      : { signal });
    if (!response.ok) throw Error(`Google satellite is unavailable (${response.status}). Check Map Tiles API access or try again.`);
    return response.json();
  };
  const remove = (restoreBase = true) => {
    clearTimeout(moveTimer); clearTimeout(renewalTimer);
    lifetime?.abort(); viewportRequest?.abort(); viewportSequence++;
    layer?.off(); layer?.remove(); layer = undefined;
    attribution?.remove(); attribution = undefined; sources = undefined;
    if (restoreBase) for (const base of baseLayers) if (!map.hasLayer(base)) base.addTo(map);
    baseLayers = [];
  };
  const fail = (error: unknown, epoch: number) => {
    if (!selected || epoch !== generation || (error as Error)?.name === 'AbortError') return;
    selected = false; generation++; remove();
    notify({ status: 'error', message: (error as Error)?.message || 'Satellite imagery could not load. The previous map has been restored.' });
  };

  async function updateViewport(epoch: number, initial = false) {
    if (!session || !selected || epoch !== generation) return;
    viewportRequest?.abort(); const control = new AbortController(); viewportRequest = control;
    const sequence = ++viewportSequence;
    const b = map.getBounds();
    const params = new URLSearchParams({ key, session: session.session, zoom: String(Math.round(map.getZoom())),
      north: String(b.getNorth()), south: String(b.getSouth()), east: String(b.getEast()), west: String(b.getWest()) });
    const data = await request(`https://tile.googleapis.com/tile/v1/viewport?${params}`, control.signal);
    if (!selected || epoch !== generation || sequence !== viewportSequence) return;
    // Google legitimately returns an empty copyright string at overview zooms.
    // Its Maps attribution remains visible; do not mistake empty for missing data.
    if (typeof data.copyright !== 'string') throw Error('Satellite attribution could not load. Please try again.');
    if (sources) sources.textContent = `${data.copyright}\nRoutes and stops: Eco-Move Nagpur.`;
    oldSources = data.copyright;
    const nativeZoom = satelliteNativeZoom(data.maxZoomRects || [], b);
    if (layer && layer.options.maxNativeZoom !== nativeZoom) { layer.options.maxNativeZoom = nativeZoom; layer.redraw(); }
    if (initial) {
      const query = new URLSearchParams({ session: session.session, key });
      layer = L.tileLayer(`https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?${query}`, {
        pane: 'ecoSatellite', tileSize: session.tileWidth, maxZoom: 22, maxNativeZoom: nativeZoom,
        keepBuffer: 0, updateWhenIdle: true, updateWhenZooming: false,
      });
      layer.once('load', () => {
        if (!selected || epoch !== generation) return;
        for (const base of baseLayers) if (map.hasLayer(base)) map.removeLayer(base);
        notify({ status: 'ready' });
        moved();
      });
      layer.on('tileerror', () => fail(Error('A satellite tile could not load. The previous map has been restored; try again.'), epoch));
      layer.addTo(map);
    }
  }

  const moved = () => {
    clearTimeout(moveTimer);
    if (!selected || !layer) return;
    const epoch = generation;
    moveTimer = setTimeout(() => updateViewport(epoch).catch(error => fail(error, epoch)), 180);
  };
  map.on('moveend', moved);

  async function select(enabled: boolean, restoreBase = true) {
    if (enabled === selected) return;
    selected = enabled; const epoch = ++generation;
    remove(restoreBase);
    if (!enabled) { notify({ status: 'idle' }); return; }
    if (!key || /^(YOUR|REPLACE|PLACEHOLDER)/i.test(key)) { fail(Error('Google satellite needs the existing Google Maps API key with Map Tiles API enabled.'), epoch); return; }
    notify({ status: 'loading' });
    const control = new AbortController(); lifetime = control;
    try {
      if (!session || Number(session.expiry) * 1000 - Date.now() < 60000) {
        session = await request(`https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(key)}`, control.signal,
          { mapType: 'satellite', language: 'en-US', region: 'IN' });
      }
      if (!selected || epoch !== generation) return;
      if (!session?.session || session.tileWidth !== 256) throw Error('Satellite configuration was not accepted.');
      map.eachLayer(candidate => { if (candidate instanceof L.TileLayer) baseLayers.push(candidate); });
      const footer = new L.Control({ position: 'bottomleft' });
      footer.onAdd = () => {
        const div = L.DomUtil.create('div', 'eco-google-attribution');
        // Compact text attribution is permitted when mobile space is limited.
        const brand = L.DomUtil.create('span', 'eco-google-brand', div); brand.textContent = 'Google Maps';
        const details = document.createElement('details'); div.appendChild(details);
        const summary = document.createElement('summary'); summary.textContent = 'Data sources'; details.appendChild(summary);
        sources = document.createElement('div'); sources.className = 'eco-google-sources'; details.appendChild(sources);
        sources.textContent = oldSources;
        L.DomEvent.disableClickPropagation(div); L.DomEvent.disableScrollPropagation(div);
        return div;
      };
      attribution = footer; footer.addTo(map);
      await updateViewport(epoch, true);
      if (selected && epoch === generation) renewalTimer = setTimeout(() => {
        selected = false; void select(true);
      }, Math.max(1000, Math.min(2147483647, Number(session.expiry) * 1000 - Date.now() - 60000)));
    } catch (error) { fail(error, epoch); }
  }
  return {
    select,
    destroy() { selected = false; generation++; remove(); map.off('moveend', moved); pane.remove(); },
  };
}
