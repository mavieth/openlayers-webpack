import View from 'ol/View'
import Map from 'ol/Map'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import * as two_rectangles from './two-rectangles.geo.json';
import {buffer, feature, featureCollection, toMercator} from '@turf/turf'
import Fill from "ol/style/Fill";
import Style from "ol/style/Style";
import Draw from "ol/interaction/Draw";

const coords = [-105.3369140625, 39.863371338285305];

const log = function (item) {
    window.console.log(item);
};

const inputJson = two_rectangles;

class Thresholder {

    constructor() {
        this._vectorSource = new VectorSource({
            format: new GeoJSON(),
        });
        this._vectorLayer = new VectorLayer({
            source: this._vectorSource,
            opacity: 0.5,
            style: new Style({
                fill: new Fill({
                    color: '#d40000',
                })
            })
        });
        this._turfFeatureCollection = [];
    }

    getVectorLayer() {
        return this._vectorLayer;
    }

    setVectorLayer(vectorLayer) {
        this._vectorLayer = vectorLayer;
        return this;
    }

    getVectorSource() {
        return this._vectorSource;
    }

    setVectorSource(vectorSource) {
        this._vectorSource = vectorSource;
        return this;
    }


    parse() {
        this._turfFeatureCollection.features.forEach(ft => {
            const olFeature = new GeoJSON({
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            }).readFeature(ft);
            log(buffer(feature(olFeature), 5))
            this._vectorSource.addFeature(olFeature);
        });
        return this;
    }

    setFeatureCollection(input) {
        this._turfFeatureCollection = featureCollection(input.features);
        return this;
    }
}

window.onload = () => {
    const target = document.getElementById('map');
    let draw;
    let thresholder = new Thresholder(inputJson);
    thresholder.setFeatureCollection(inputJson);
    thresholder.parse();


    const drawSource = new VectorSource({
        format: new GeoJSON(),
    });


    const drawLayer = new VectorLayer({
        source: drawSource,
        opacity: 0.5,
        style: new Style({
            fill: new Fill({
                color: '#002bd4',
            })
        })
    });


    let map = new Map({
        target,
        view: new View({
            center: toMercator(coords),
            zoom: 8,
        }),
        layers: [
            new TileLayer({source: new OSM(),}), drawLayer, thresholder.getVectorLayer()
        ]
    });

    function addInteraction() {
        map.removeInteraction(draw);
        draw = new Draw({
            source: drawSource,
            type: 'LineString',
            freehand: true
        });
        map.addInteraction(draw);
    }

    addInteraction();

    const pointerMoveHandler = function (evt) {
        if (evt.dragging) {
            log("Dragging");
        }
        else {
            log("not dragging");

        }
    };
    map.on('pointermove', pointerMoveHandler);
    window.map = map;

};
