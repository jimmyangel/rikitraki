// Create a new track directory
require('shelljs/global');
var fs = require('fs');



var trackId = process.argv[2];

var geoTags = {};

geoTags['geoTags'] = {
	trackId: trackId,
	trackPhotos: []
}

cd(trackId + '/photos');

var photofiles = ls('*.jpg');
for (var i=0; i<photofiles.length; i++) {
	geoTags['geoTags'].trackPhotos.push({picName: photofiles[i], picThumb: 'thumb'+ photofiles[i], picLatLng: [], picCaption: photofiles[i]});
}

exec('for i in *.jpg; do cp $i thumb$i; done', {silent:true});
exec('sips --resampleWidth 200 thumb*.jpg', {silent:true})

var gpxfiles = ls('../gpx/*.GPX');

exec('exiftool -geotag="' + gpxfiles[0] + '" -geosync=+660:00 ./*.jpg', {silent:true});
// exec('exiftool -geotag="' + gpxfiles[0] + '" ./*.jpg', {silent:true});

rm('*original');

var r = exec('exiftool -c "%+.6f" thumb*.jpg | grep "GPS Position"', {silent:true}).output;

var r1 = (r.replace(/GPS Position                    :/g, '')).split('\n');
for (i=0; i<r1.length-1; i++) {
	r2 = r1[i].split(',');
	geoTags['geoTags'].trackPhotos[i].picLatLng[0] = Number(r2[0]);
	geoTags['geoTags'].trackPhotos[i].picLatLng[1] = Number(r2[1]);
}

console.log(JSON.stringify(geoTags, null, '\t'))

cd('../..');
