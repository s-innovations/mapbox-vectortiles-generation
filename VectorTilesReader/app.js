
var zlib = require('zlib'),
    protobuf = require('protobufjs'),
    proto = protobuf.protoFromFile('./vector_tile.proto'),
    mapnikVector = proto.build('vector_tile'),
// If the pbf is compressed, this will deflate it
    deflate = function (buffer, callback) {
        zlib.unzip(buffer, function (err, newBuffer) {
            if (!err) {
                callback(newBuffer);
            }
        });
    },
// This is the routine used to read the file against the proto file
    parse = function (data, callback) {
        // Check if the file is compressed, and if so, decompress it
        if (!data || data[0].toString(16) === '7b') {
            callback(null);
        } else if(data[0].toString(16) === '1f'){// (data[0].toString(16) === '78' && (data[1].toString(16) === '01' || data[1].toString(16) === '9c' || data[1].toString(16) === 'da')) {
            // http://stackoverflow.com/questions/9050260/what-does-a-zlib-header-look-like
            // zlib magic headers
            //
            // 78 01 - No Compression/low
            // 78 9C - Default Compression
            // 78 DA - Best Compression 
            deflate(data, function (defalted) {
                parse(defalted, callback);
            });
        } else {
            console.log(data[0].toString(16));

            callback(mapnikVector.Tile.decode(data));
        }
    };


var EARTH_CIRCUMFERENCE = 6378137.0 * 2 * Math.PI;

function pixel2meter(n, x, y) {
    var resolution = EARTH_CIRCUMFERENCE / n;
    var mx = -0.5 * EARTH_CIRCUMFERENCE + x * resolution;
    var my = 0.5 * EARTH_CIRCUMFERENCE - y * resolution;
    return [mx, my];
}

function decodeSint32(encoded_value) { // decode zigzag encoding
    if (encoded_value % 2 == 0) {
        return encoded_value / 2;
    } else {
        return -(encoded_value + 1) / 2;
    }
};
function type2str(type)
{
    switch (type) {
        case 1:
            return "Point";
        case 2:
            return "LineString";
        case 3:
            return "Polygon"
        default:
            return "UNKNOWN";

    }
}
function decode(protoGeometry, type,tileX,tileY,tileZ,tileExtent) {
    
    var geometry = {
        type : type2str(type),
        coordinates : [],
    }
    
    
    var geometryCoordinates = type===3? []:geometry.coordinates;
    //var polygon = [geometryCoordinates];
    
    var i = 0;
    var previous = [0, 0];
    while (i < protoGeometry.length) {
        var instruction = protoGeometry[i];
        var command = instruction & 7;
        var frequence = instruction >>> 3;
        switch (command) {
            case 1:// MoveTo
                var next_i = i + 2 * frequence + 1;
                var coordinates = protoGeometry.slice(i + 1, next_i);
                for (j = 0; j < coordinates.length ; j += 2) {
                    var x = decodeSint32(coordinates[j]);
                    var y = decodeSint32(coordinates[j + 1]);

                    geometryCoordinates.push(pixel2meter(1 << z, tileX + (previous[0] + x) / tileExtent, tileY + (previous[1] + y) / tileExtent));

                    previous = [previous[0] + x, previous[1] + y];
                }
                i = next_i;
                break;
            case 2:// LineTo
                if (i == 0) {
                    geometryCoordinates.push(pixel2meter(1 << z,tileX, tileY));
                }
                var next_i = i + 2 * frequence + 1;
                var coordinates = protoGeometry.slice(i + 1, next_i);
                for (j = 0; j < coordinates.length ; j += 2) {
                    var x = decodeSint32(coordinates[j]);
                    var y = decodeSint32(coordinates[j + 1]);
                    
                    geometryCoordinates.push(pixel2meter(1 << z, tileX + (previous[0] + x) / tileExtent, tileY + (previous[1] + y) / tileExtent));

                    previous = [previous[0] + x, previous[1] + y];
                }
                i = next_i;
                break;
            case 7://ClosePath
                //   mapnikGeometry.closePath();
                if (type === 3) {
                    geometry.coordinates.push(geometryCoordinates);
                    geometryCoordinates = [];                   
                }
                i++;
                break;
            default:
                throw ('Error while parsing PBF: invalid Mapnik-vector-tile geometry');
        }
    }
    return geometry;
}
function getValue(value)
{
    if (value.float_value)
        return value.float_value.toNumber();
    else if (value.double_value)
        return value.double_value;
    else if (value.int_value)
        return value.int_value.toInt();
    else if (value.uint_value)
        return value.uint_value.toInt();
    else if (value.sint_value)
        return value.sint_value.toInt();
    else if (value.bool_value)
        return value.bool_value.toBool();
    else
        return value.string_value;

        
}

var z = 14;
var x = 8636;
var y = 5178;
var fs = require('fs'),
    fileName = 'C:/mynxtmapbox.tm2source/tiles/'+z+'/' + x + '/' + y + '.pbf';
fs.readFile(fileName, function (err, data) {
    if (!err) {
        parse(data, function (parsedData) {
            
            
            parsedData.layers.forEach(function (layer) {
                var features = layer.features;
                var geometries = [];

                console.log(JSON.stringify({
                    extent: layer.extent,
                    name: layer.name,
                    version: layer.version,
                    keys: layer.keys,
                }));
               // console.log(layer.extent);
                for (var k in layer)
                    console.log(k);
                
                var geometries = features.map(function (f) {
                   
                    var tileGeometry = decode(f.geometry, f.type, x, y, z, layer.extent);
                    
                    var props = {};
                    for (var i = 0; i < f.tags.length; i++) {
                   
                        var key = layer.keys[f.tags[i]];
                        var value = layer.values[f.tags[++i]];
 
                        props[key] = getValue(value);
                    }
                        
                

                    //var convertedGeometry = [];
                    //for (var i = 0; i < tileGeometry.length; i++) {
                    //    var n = 1 << z; // 2^z
                    //    var xglobal = x + tileGeometry[i][0] / layer.extent;
                    //    var yglobal = y + tileGeometry[i][1] / layer.extent;
                    //    convertedGeometry.push(pixel2meter(n, xglobal, yglobal));
                    //}
                    //if (convertedGeometry.length == 1) {
                    //    convertedGeometry = convertedGeometry[0];
                    //}
                    return {
                        type: "Feature",
                        geometry: tileGeometry,
                        properties: props
                    };

                });
                fs.writeFileSync(fileName = 'C:/mynxtmapbox.tm2source/tiles/' + z + '/' + x + '/' + y + '.geojson', JSON.stringify({
                    type: "FeatureCollection",
                    features: geometries
                })); 

            });
            

           // console.log(JSON.stringify(parsedData, null, 2));
        });
    } else {
        console.log('err', err);
    }
});