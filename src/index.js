import View from 'ol/View'
import Map from 'ol/Map'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import * as two_rectangles from './two-rectangles.geo.json';
import {combine, featureCollection, flattenEach, toMercator} from '@turf/turf';
import Fill from "ol/style/Fill";
import Style from "ol/style/Style";
import Draw, {createBox} from "ol/interaction/Draw";
import Stroke from "ol/style/Stroke";
import RegularShape from "ol/style/RegularShape";

const coords = [-105.3369140625, 39.863371338285305];

const COLORS = {
    red: '#ff0010',
    green: '#23ff00',
    added: '#b500ff'
};

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
    // thresholder.setFeatureCollection(inputJson);
    // thresholder.parse();


    window.fmt = new GeoJSON();

    const keyMappings = {
        isDeleting: false,
        drawStyle: 'box',
    };

    const drawSource = new VectorSource({
        format: new GeoJSON(),
    });


    const drawLayer = new VectorLayer({
        source: drawSource,
        opacity: 0.5,
        style: new Style({
            opacity: 0.5,
            fill: new Fill({
                color: COLORS.red,
                opacity: 0.5,
            })
        })
    });


    let map = new Map({
        target,
        view: new View({
            center: toMercator(coords),
            zoom: 9,
        }),
        layers: [
            new TileLayer({source: new OSM(),}), drawLayer, thresholder.getVectorLayer()
        ]
    });

    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }


    const handleDrawEnd = function (evt) {
        log("Drawing ended.");
        const turfpoly = turf.polygon(evt.feature.getGeometry().getCoordinates());
        const feat = fmt.readFeatureFromObject(turfpoly);
        const featExtent = feat.getGeometry().getExtent();

        drawLayer.getSource().forEachFeature(ft => {
            ft.setStyle(new Style({
                fill: new Fill({
                    color: COLORS.red,
                })
            }))
        });


        feat.setStyle(new Style({
            fill: new Fill({
                color: COLORS.added,
            })
        }));

        log("isDeleting: " + keyMappings.isDeleting);
        drawLayer.getSource().addFeature(feat);
        const combo = combine(fmt.writeFeaturesObject(drawLayer.getSource().getFeatures()));
        let cs = [];
        flattenEach(featureCollection(combo.features), function (currentFeature, featureIndex, multiFeatureIndex) {
            currentFeature.properties = {};
            cs.push(currentFeature)
        });
        const flatFeaturesCollection = featureCollection(cs);
        window.flatFeaturesCollection = flatFeaturesCollection;
        log(flatFeaturesCollection)
    };


    function addInteraction() {
        map.removeInteraction(draw);
        const ds = new Style({
            opacity: 0.2,
            image: new RegularShape({
                fill: new Fill({
                    color: 'red',
                    opacity: 0.2,
                }),
                points: 4,
                radius1: 15,
                radius2: 1,
                opacity: 0.2,
            }),
            stroke: new Stroke({
                color: 'black',
                width: 0,
                opacity: 0.5,
            }),
            fill: new Fill({
                color: COLORS.red,
                opacity: 0.5,
            })
        });

        if (keyMappings.drawStyle === 'box') {
            draw = new Draw({
                source: drawSource,
                type: 'Circle',
                freehand: true,
                geometryFunction: createBox(),
                style: ds

            });
        }
        if (keyMappings.drawStyle === 'polygon') {
            draw = new Draw({
                source: drawSource,
                type: 'Polygon',
                freehand: true,
                style: ds
            });
        }


        draw.on('drawend', handleDrawEnd);
        map.addInteraction(draw);
    }

    addInteraction();

    const pointerMoveHandler = function (evt) {
        if (evt.dragging) {
            log("Dragging");
        }
    };

    map.on('pointermove', pointerMoveHandler);
    window.map = map;
    window.drawLayer = drawLayer;

    document.addEventListener('keyup', (event) => {
        log(event.key);
        if (event.key === 'd') {
            keyMappings.isDeleting = !keyMappings.isDeleting;
            addInteraction()
        }
        if (event.key === 'f') {
            keyMappings.drawStyle = 'polygon';
            log("Polygon style drawing");
            addInteraction()
        }
        if (event.key === 'd') {
            keyMappings.drawStyle = 'box';
            log("Box style drawing");
            addInteraction()
        }
        // TODO: copy geojson to clipboard
        // if (event.key === 'x') {
        //     log(window.flatFeaturesCollection);
        //     window.prompt("Copy to clipboard: Ctrl+C, Enter", JSON.stringify(window.flatFeaturesCollection));
        // }
        if (event.key === 'q') {
            const curZoom = map.getView().getZoom();
            const newZoom = curZoom + 1;
            map.getView().setZoom(newZoom)
        }
        if (event.key === 'w') {
            const curZoom = map.getView().getZoom();
            const newZoom = curZoom - 1;
            map.getView().setZoom(newZoom)
        }
    });
};
