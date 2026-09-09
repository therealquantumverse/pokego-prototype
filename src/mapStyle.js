// A stylised game world, not a street map.
//
// OpenFreeMap serves OpenMapTiles-schema vector tiles with no API key, which is
// what lets us extrude buildings and paint parks and water as their own volumes.
// The previous raster style could only be a road map with a CSS invert over it.

const C = {
  ground:     '#151a2b',
  grass:      '#1d3b2a',
  park:       '#1f4430',
  wood:       '#193626',
  sand:       '#3a3524',
  water:      '#123a63',
  waterDeep:  '#0d2b4d',
  road:       '#2b3350',
  roadMinor:  '#232a42',
  path:       '#2e3552',
  rail:       '#2a3048',
  building:   '#2b3150',
  buildingTop:'#39416a',
  label:      '#9aa6c9',
  labelHalo:  '#0b0f1c',
}

export const GAME_MAP_STYLE = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    ofm: {
      type: 'vector',
      // TileJSON endpoint rather than a pinned {z}/{x}/{y} template — the tile
      // path carries a dated snapshot id that rotates.
      url: 'https://tiles.openfreemap.org/planet',
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org">OpenFreeMap</a>',
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': C.ground } },

    {
      id: 'landcover',
      type: 'fill',
      source: 'ofm',
      'source-layer': 'landcover',
      paint: {
        'fill-color': [
          'match', ['get', 'class'],
          'wood', C.wood,
          'grass', C.grass,
          'sand', C.sand,
          C.grass,
        ],
        'fill-opacity': 0.75,
      },
    },
    {
      id: 'park',
      type: 'fill',
      source: 'ofm',
      'source-layer': 'park',
      paint: { 'fill-color': C.park, 'fill-opacity': 0.8 },
    },
    {
      id: 'park-outline',
      type: 'line',
      source: 'ofm',
      'source-layer': 'park',
      paint: { 'line-color': '#2f6b48', 'line-width': 1, 'line-opacity': 0.5 },
    },

    {
      id: 'water',
      type: 'fill',
      source: 'ofm',
      'source-layer': 'water',
      paint: {
        'fill-color': ['match', ['get', 'class'], 'ocean', C.waterDeep, C.water],
      },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'ofm',
      'source-layer': 'waterway',
      paint: { 'line-color': C.water, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 18, 6] },
    },

    {
      id: 'road-minor',
      type: 'line',
      source: 'ofm',
      'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'track']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': C.roadMinor,
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.6, 18, 8],
      },
    },
    {
      id: 'road-path',
      type: 'line',
      source: 'ofm',
      'source-layer': 'transportation',
      filter: ['==', ['get', 'class'], 'path'],
      paint: {
        'line-color': C.path,
        'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.5, 18, 3],
        'line-dasharray': [2, 2],
      },
    },
    {
      id: 'road-major',
      type: 'line',
      source: 'ofm',
      'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': C.road,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 18, 16],
      },
    },
    {
      id: 'rail',
      type: 'line',
      source: 'ofm',
      'source-layer': 'transportation',
      filter: ['==', ['get', 'class'], 'rail'],
      paint: { 'line-color': C.rail, 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.5, 18, 3] },
    },

    // The thing that makes it a world rather than a map. Buildings rise out of
    // the ground at the 45° pitch the camera already uses.
    {
      id: 'building-3d',
      type: 'fill-extrusion',
      source: 'ofm',
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': [
          'interpolate', ['linear'], ['get', 'render_height'],
          0, C.building,
          40, C.buildingTop,
        ],
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
        'fill-extrusion-base':   ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.92,
        'fill-extrusion-vertical-gradient': true,
      },
    },

    {
      id: 'road-label',
      type: 'symbol',
      source: 'ofm',
      'source-layer': 'transportation_name',
      minzoom: 15,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 10,
        'symbol-placement': 'line',
      },
      paint: { 'text-color': C.label, 'text-halo-color': C.labelHalo, 'text-halo-width': 1.2 },
    },
    {
      id: 'place-label',
      type: 'symbol',
      source: 'ofm',
      'source-layer': 'place',
      filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter']]],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 12,
        'text-letter-spacing': 0.08,
      },
      paint: { 'text-color': '#c3cdea', 'text-halo-color': C.labelHalo, 'text-halo-width': 1.4 },
    },
  ],
}
