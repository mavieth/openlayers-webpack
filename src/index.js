import View from 'ol/View'
import Map from 'ol/Map'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import * as overlapping_rectangles from './overlapping-rectangles';
import {
    center,
    combine,
    difference,
    featureCollection,
    flattenEach,
    squareGrid,
    intersect,
    polygon,
    envelope,
    union,
    flatten,
    hexGrid,
    multiPolygon
} from '@turf/turf';
import Fill from "ol/style/Fill";
import Style from "ol/style/Style";
import Draw, {createBox} from "ol/interaction/Draw";
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

// let inputJson = two_rectangles;
let inputJson = overlapping_rectangles;


function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


class Thresholder {

    constructor() {
        this._vectorSource = new VectorSource({
            format: new GeoJSON(),
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.9)',
                opacity: 0.2,
            })
        });
        this._vectorLayer = new VectorLayer({
            source: this._vectorSource,
            opacity: 0.5,
            style: new Style({
                color: 'orange',
                fill: new Fill({
                    color: 'orange',
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

    addFeature(ft) {
        this._vectorSource.addFeature(ft);
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
        })
    });


    const thresholdCenter = center(polygon(thresholder.getVectorSource().getFeatures()[0].getGeometry().getCoordinates()).geometry).geometry.coordinates;

    log("Threshold center: " + thresholdCenter);

    let map = new Map({
        target,
        view: new View({
            center: thresholdCenter,
            zoom: 11,
        }),
        layers: [
            // new TileLayer({source: new OSM(),}),
            thresholder.getVectorLayer(),
            drawLayer
        ]
    });


    const handleDrawEnd = function (evt) {
        const eventPolygon = polygon(evt.feature.getGeometry().getCoordinates());
        const eventFeatureExtent = fmt.readFeatureFromObject(eventPolygon).getGeometry().getExtent();
        const eventFeatureGeometry = fmt.readFeatureFromObject(eventPolygon).getGeometry();

        let eventPolygonFeature = fmt.readFeature(eventPolygon);

        eventPolygonFeature.setStyle(new Style({
            fill: new Fill({
                color: '#002eff',
            })
        }));

        if (drawSource.getFeatures() && drawLayer.getSource().getFeatures().length > 2) {
            const flattened = flatten(multiPolygon(drawLayer.getSource().getFeatures()));
            if (flattened.features) {
                // log("Total flattened features: " + flattened.features.length);
                // log(flattened.features);
                flattened.features.forEach(function (flatFeat) {
                    // log(flatFeat);
                    // const olFlatFeat = fmt.readFeatures(flatFeat);
                    // olFlatFeat.setStyle(new Style({
                    //     fill: new Fill({
                    //         color: getRandomColor(),
                    //     })
                    // }));
                    // drawSource.addFeature(olFlatFeat);
                })
            }
        }


        if (keyMappings.isDeleting) {
            drawSource.forEachFeatureIntersectingExtent(eventFeatureExtent, existingFeature => {
                if (keyMappings.isDeleting) {
                    const thisPolygon = polygon(existingFeature.getGeometry().getCoordinates());
                    const turfIntersection = intersect(thisPolygon, eventPolygon);
                    const turfDifference = difference(thisPolygon, eventPolygon);

                    if ((turfIntersection !== null) && (turfDifference !== null)) {
                        const differenceFeatureObject = fmt.readFeatures(turfDifference);
                        // log(differenceFeatureObject)
                        differenceFeatureObject.forEach(function (ftD) {
                            ftD.setStyle(new Style({
                                fill: new Fill({
                                    color: '#00ffd8',
                                })
                            }))
                        });
                    }
                }
            });
        }


        drawLayer.getSource().addFeature(eventPolygonFeature);


        //
        // const combo = combine(fmt.writeFeaturesObject(drawLayer.getSource().getFeatures()));
        // let cs = [];
        //
        // flattenEach(featureCollection(combo.features), function (currentFeature, featureIndex, multiFeatureIndex) {
        //     currentFeature.properties = {};
        //     cs.push(currentFeature)
        // });
        //
        // window.flatFeaturesCollection = featureCollection(cs);
        //
        // const comboCollection = combine(flatFeaturesCollection);
        //
        // window.comboC = comboCollection;
        //
        // const newComboLayer = fmt.readFeaturesFromObject(comboCollection);
        //
        //
        //
        // log("Combo layer");
        // log(newComboLayer);
        //
        // if (newComboLayer.length > 0)
        // {
        //     drawLayer.getSource().forEachFeature(feat => {
        //         drawSource.removeFeature(feat);
        //     });
        // }
        //
        // newComboLayer.forEach(function (ft){
        //     drawSource.addFeature(ft);
        // });
        //
        //
        // if (!keyMappings.isDeleting) {
        //     drawSource.addFeature(eventFeature);
        //     drawLayer.getSource().forEachFeature(ft => {
        //         ft.setStyle(new Style({
        //             fill: new Fill({
        //                 color: COLORS.red,
        //             })
        //         }))
        //     });
        // }

        // drawSource.addFeature(eventPolygonFeature);
        // log("isDeleting: " + keyMappings.isDeleting);
        // drawLayer.getSource().addFeature(eventFeature);
    };


    function addInteraction() {
        map.removeInteraction(draw);
        const ds = new Style({
            opacity: 0.2,
            image: new RegularShape({
                fill: new Fill({
                    color: COLORS.red,
                    opacity: 0.2,
                }),
                points: 4,
                radius1: 15,
                radius2: 1,
                opacity: 0.2,
            }),
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.9)',
                opacity: 0.2,
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
        // if (evt.dragging) {
        //     log("Dragging");
        // }
    };

    // map.on('pointermove', pointerMoveHandler);
    window.map = map;
    window.drawLayer = drawLayer;
    window.thresholder = thresholder;

    document.addEventListener('keyup', (event) => {
        log("Key up: " + event.key);
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
        if (event.key === 'x') {
            log(window.flatFeaturesCollection);
        }
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

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Shift') {
            map.removeInteraction(draw)
        }
    });
    document.addEventListener('keypress', (event) => {
        if (event.key === 'r') {
            keyMappings.isDeleting = !keyMappings.isDeleting;
            log("Is deleting: " + keyMappings.isDeleting);
        }
    });

    // log(thresholder.getVectorSource().getFeatures());
    const tfc = featureCollection(thresholder.getVectorLayer().getSource().getFeatures());


    // thresholder.forEachFeature(ft => {
    //     log(ft);
    // });
    log(tfc);

    let geoms = [];

    let envelopes = [];

    thresholder.getVectorSource().getFeatures().forEach(function (f1) {
        const p1 = polygon(f1.getGeometry().getCoordinates());
        // geoms.push(p1)
        envelopes.push(envelope(p1));


        // thresholder.getVectorSource().getFeatures().forEach(function (f2) {
        //     const p2 = f2.getGeometry().getCoordinates();
        //     const intersection = intersect(polygon(p1), polygon(p2));
        //     log('intersection...')
        //     log(intersection);
        //     const intersectionFeature = fmt.readFeatureFromObject(intersection);
        //     intersectionFeature.setStyle(new Style({
        //         opacity: 0.5,
        //         fill: new Fill({
        //             color: getRandomColor(),
        //             opacity: 0.5,
        //         })
        //     }));
        //     drawSource.addFeature(intersectionFeature)
        // });
    });
    log(geoms);
    let unions = []
    geoms.forEach(function (g) {
        log(g.geometry)
        unions.push(g.geometry)
    });

    window.geoms = geoms;
    window.unions = unions;


    log(unions);
    var bbox = thresholder.getVectorSource().getExtent();
    log("BBOX: " + bbox);
    var cellSide = 250;
    var options = {units: 'miles'};
    //
    // // var hex = hexGrid(bbox, cellSide, options);
    // var hex = squareGrid(bbox, cellSide, options);
    // log(hex);
    //
    //
    // window.hex = hex;
    //
    // // var fc = turf.featureCollection([pt1, pt2, pt3]);
    // // console.log(fc);
    // // Declare a source and directly embed the GeoJSON using the
    // // "experimental parameter "object"
    // var vectorSource = new VectorSource({
    //     features: (new GeoJSON()).readFeatures(hex, {
    //         featureProjection: 'EPSG:3857'
    //     }),
    //     projection: 'EPSG:3857'
    // });
    // log(vectorSource);
    //
    // drawLayer.getSource().addFeatures((new GeoJSON()).readFeatures(hex, {
    //     featureProjection: 'EPSG:3857'
    // }));
    //
    //
    // hex.features.forEach(function (ft) {
    //     //
    //     // const olFeature = new GeoJSON({
    //     //     dataProjection: 'EPSG:4326',
    //     //     featureProjection: 'EPSG:3857'
    //     // }).readFeature(ft);
    //     // thresholder.getVectorSource().add()
    //     // log('0000000000')
    //     // log(ft)
    //     let eventPolygonFeature = fmt.readFeature(ft);
    //     eventPolygonFeature.setStyle(new Style({
    //         fill: new Fill({
    //             color: '#002eff',
    //         })
    //     }));
    //     thresholder.addFeature(eventPolygonFeature)
    //
    // })
    //
    //
    //
    // drawLayer.getSource().getFeatures(function (ft) {
    //     ft.setStyle(new Style({
    //         opacity: 0.5,
    //         fill: new Fill({
    //             color: getRandomColor(),
    //             opacity: 0.5,
    //         })
    //     }))
    //
    // })


    //
    // const u = union(geoms);
    // log(u)


};
