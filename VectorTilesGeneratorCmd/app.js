
var tilelive = require("tilelive");
var util = require('util');


require('tilelive-bridge').registerProtocols(tilelive);
require('tilelive-file').registerProtocols(tilelive);

//Show Info
tilelive.info('bridge://c:/mynxtmapbox.tm2source/data.xml', function (err, data, handler) {
    console.log(data);
});


//Generate pbf tiles
tilelive.copy('bridge://c:/mynxtmapbox.tm2source/data.xml', 'file://c:/mynxtmapbox.tm2source/tiles?filetype=pbf', {
    minzoom: 10,
    maxzoom: 14,
    bounds: [9.1587107540, 54.7129498723, 10.4126123555, 55.2777777776],
    progress : report,
}, function (err) {
    console.log(err);
});

////Generate mbtiles
//tilelive.copy('bridge://c:/mynxtmapbox.tm2source/data.xml', 'mbtiles://c:/mynxtmapbox.tm2source/data.mbtiles', {
//    minzoom: 3,
//    maxzoom: 10,
//    bounds: [9.1587107540, 54.7129498723, 10.4126123555, 55.2777777776],
//    progress : report,
//}, function (err) {
//    console.log(err);
//});


//Status reporting
function report(stats, p) {
    util.print(util.format('\r\033[K[%s] %s%% %s/%s @ %s/s | ✓ %s □ %s | %s left',
        pad(formatDuration(process.uptime()), 4, true),
        pad((p.percentage).toFixed(4), 8, true),
        pad(formatNumber(p.transferred),6,true),
        pad(formatNumber(p.length),6,true),
        pad(formatNumber(p.speed),4,true),
        formatNumber(stats.done - stats.skipped),
        formatNumber(stats.skipped),
        formatDuration(p.eta)
    ));
}

function formatDuration(duration) {
    var seconds = duration % 60;
    duration -= seconds;
    var minutes = (duration % 3600) / 60;
    duration -= minutes * 60;
    var hours = (duration % 86400) / 3600;
    duration -= hours * 3600;
    var days = duration / 86400;

    return (days > 0 ? days + 'd ' : '') +
        (hours > 0 || days > 0 ? hours + 'h ' : '') +
        (minutes > 0 || hours > 0 || days > 0 ? minutes + 'm ' : '') +
        seconds + 's';
}

function pad(str, len, r) {
    while (str.length < len) str = r ? ' ' + str : str + ' ';
    return str;
}

function formatNumber(num) {
    num = num || 0;
    if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'm';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(1) + 'k';
    } else {
        return num.toFixed(0);
    }
    return num.join('.');
}

function timeRemaining(progress) {
    return Math.floor(
        (process.uptime()) * (1 / progress) -
        (process.uptime())
    );
}

return;

//var get = tilelive.createReadStream(sourceA);
//var put = tilelive.createWriteStream(sourceB);
//get.pipe(put);
//put.on('finish', function () {
//    console.log('done!');
//});
tilelive.load('bridge://c:/mynxtmapbox.tm2source/data.xml', function (err, source) {
    if (err) throw err;
    
    // Interface is in XYZ/Google coordinates.
    // Use `y = (1 << z) - 1 - y` to flip TMS coordinates.
    var z = 5;
    for (var x = 0; x < (1 << z); x++)
        for (var y = 0; y < (1 << z); y++) {
            
            
            source.getTile(z, x, y, function (err, tile, headers) {
                // `err` is an error object when generation failed, otherwise null.
                // `tile` contains the compressed image file as a Buffer
                // `headers` is a hash with HTTP headers for the image.
                if (typeof (tile) === "undefined") {
                 //   console.log(err);
                } else {
                    console.log(headers);

                }
            });
        }


    // The `.getGrid` is implemented accordingly.
});
