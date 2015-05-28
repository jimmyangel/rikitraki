// Create a new track directory
require('shelljs/global');
var fs = require('fs');
var trackId = process.argv[2];
if (trackId && !(test('-e', trackId))) {
	mkdir (trackId);
	mkdir (trackId + '/gpx');
	mkdir (trackId + '/photos')

	var tracks = JSON.parse(fs.readFileSync('tracks.json', 'utf8'));
	tracks['tracks'][trackId]= {
		trackId: trackId,
		wikiLocId: '',
		trackLatLng: [],
		trackRegionTags: [],
		trackLevel: '',
		trackFav: false,
		trackGPX: '',
		trackName: '',
		trackDescription: '',
		hasPhotos: false
	}
}

console.log(JSON.stringify(tracks, null, '\t'));