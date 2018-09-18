function getLayerConfig(data, geometryType) {
  // build mapboxGL layer with source, based on data type and geometry type

  let layerConfig = {
    id: 'postgis-preview',
  };

  if (data.features) { // check for geoJson
    layerConfig = {
      ...layerConfig,

      source: {
        type: 'geojson',
        data,
      },
    };
  } else { // else it's an array of MVT templates
    console.log('is vector');
    layerConfig = {
      ...layerConfig,
      source: {
        type: 'vector',
        tiles: data,
      },
      'source-layer': 'layer0',
    };
  }

  console.log('other testing');

  if (['Polygon', 'MultiPolygon'].includes(geometryType)) {
    console.log('has polygon');
    layerConfig = {
      ...layerConfig,
      type: 'fill',
      paint: {
        'fill-color': 'rgba(52, 161, 255, 1)',
        'fill-outline-color': 'white',
        'fill-opacity': 0.6,
      },
    };
  }

  if (['LineString', 'MultiLineString'].includes(geometryType)) {
    console.log('has linestring');

    layerConfig = {
      ...layerConfig,
      type: 'line',
      paint: {
        'line-color': 'blue',
        'line-width': 5,
        'line-opacity': 0.7,
        'line-gradient': [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0, 'blue',
          0.1, 'royalblue',
          0.3, 'cyan',
          0.5, 'lime',
          0.7, 'yellow',
          1, 'red',
        ],
      },
    };
    layerConfig.source.lineMetrics = true;
  }

  if (['Point', 'MultiPoint'].includes(geometryType)) {
    console.log('has multipoint');

    layerConfig = {
      ...layerConfig,
      type: 'circle',
      paint: {
        'circle-radius': 4,
        'circle-opacity': 0.6,
        // 'circle-color': 'rgba(52, 161, 255, 1)',
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'utc_timest'],
          1506866400, '#9ebcda',
          // 500000, '#EED322',
          // 750000, '#E6B71E',
          // 1000000, '#DA9C20',
          // 2500000, '#CA8323',
          // 5000000, '#B86B25',
          // 7500000, '#A25626',
          // 10000000, '#8B4225',
          1506891600, '#810f7c',
        ],
      },
    };
  }

  return layerConfig;
}

function removeLayers(map, ctx) {
  if (
    map
      .getStyle()
      .layers.map(i => i.id)
      .includes('postgis-preview')
  ) {
    map.removeLayer('postgis-preview');
    map.removeSource('postgis-preview');
  }
  ctx.setState({ zoomedToBounds: false });
}

function getBeforeLayer(geometriesAboveLabels) {
  return geometriesAboveLabels ? null : 'place_other';
}

class Map extends React.Component { // eslint-disable-line
  constructor(props) {
    super(props);

    this.state = { zoomedToBounds: false };
  }

  componentDidMount() {
    this.map = new mapboxgl.Map({
      container: 'map',
      style: '../styles/nycplanning.json',
      // style: 'https://maps.tilehosting.com/styles/darkmatter/style.json?key=2F8nWorAsHivJ6MEwNs6',
      hash: true,
      zoom: 6.73,
      center: [-73.265, 40.847],
    });

    window.map = this.map;
  }

  componentWillReceiveProps(nextProps) {
    const {
      tiles,
      geoJson,
      geometryType,
      geometriesAboveLabels: nextGeometriesAboveLabels,
    } = nextProps;

    const { geometriesAboveLabels } = this.props;
    if ((geometriesAboveLabels !== nextGeometriesAboveLabels) && (!!this.map.getLayer('postgis-preview'))) {
      this.map.moveLayer('postgis-preview', getBeforeLayer(nextGeometriesAboveLabels));
    } else {
      if (tiles) this.addTileLayer(tiles, geometryType, geometriesAboveLabels);
      if (geoJson) this.addJsonLayer(geoJson, geometryType, geometriesAboveLabels);
    }
  }

  componentDidUpdate() {
    const { zoomedToBounds } = this.state;
    const { bounds } = this.props;
    if (!zoomedToBounds && bounds && this.map) {
      this.fitBounds(bounds);
    }
  }

  fitBounds(bounds) {
    this.map.fitBounds(bounds, {
      padding: 80,
    });
    this.setState({ zoomedToBounds: true });
  }

  addJsonLayer(geoJson, geometryType, geometriesAboveLabels) {
    removeLayers(this.map, this);
    console.log('getting layer config');
    const layerConfig = getLayerConfig(geoJson, geometryType);
    this.map.addLayer(layerConfig, getBeforeLayer(geometriesAboveLabels));

    const bounds = turf.bbox(geoJson);

    this.fitBounds(bounds);
  }

  addTileLayer(tiles, geometryType, geometriesAboveLabels) {
    const { bounds } = this.props;
    const layerConfig = getLayerConfig(tiles, geometryType);
    removeLayers(this.map, this);
    this.map.addLayer(layerConfig, getBeforeLayer(geometriesAboveLabels));

    if (bounds) this.fitBounds(bounds);
  }

  render() {
    const { visible } = this.props;
    const display = visible ? '' : 'none';
    return <div id="map" style={{ display }} />;
  }
}
