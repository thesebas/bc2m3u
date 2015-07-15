var http = require('http'),
	express = require('express'),
	util = require('util')
	Q = require('q');
var request = require('request');

function uuid(){
	return (""+ (+new Date)).split("").reverse().join("")+(Math.round(Math.random()*1e3));
}

function Playlist(tracks, name){
	this.tracks = tracks;
	this.name = name?name:"default";
}

function withReadBody(fn) {
	return function (res) {
		var data = [];
		res.on('data', function (chunk) {
			data.push(chunk);
		});
		res.on('end', function () {
			res.body = data.join('');
			fn(res)
		});
	}
};
var rx = /[\r\n]+var TralbumData = ({[\r\n]+[^]*?[\r\n]+});[\r\n]+/;
function getPlaylist(url, fn) {
	request(url, function (error, res, body) {
			if(error){
				return;
			}
			var playlist;
			var matched = body.match(rx);
			if (!matched) {
				return fn(new Playlist([]));
			}
			playlist = eval(util.format("(%s)",matched[1]));//eval is EVIL!!
			var parsed = playlist.trackinfo
				.filter(function (song) {
					return song.file;
				})
				.map(function (song) {
					return {
						artist: playlist.artist,
						title: song.title,
						url: song.file["mp3-128"],
						time: song.duration
					};
				});
			fn(new Playlist(parsed));
		})
		.on('error', function (e) {
			console.error(e);
			fn(new Playlist([]));
		});
}
function makem3u(playlist) {
	var lines = [
		"#EXTM3U8"
	];
	playlist.tracks.forEach(function (song) {
		lines.push(util.format("#EXTINF:%s,%s - %s", song.time.toFixed(0), song.artist, song.title));
		lines.push(song.url);
	});
	lines.push("\r\n");
	return lines.join("\r\n");
}

var app = express();

function detectFileTypeAndName(req, res, next){
	var name = req._parsedUrl.query.match(/(.+?)\.(m3u8|pls|json)?$/);

	if(!name){
		next('invalid url');
	}
	req.fileType = name[2];
	req.fileName = name[1];
	next();
}
app.get('/item/:id', function(req, res){

});
app.get('/', [detectFileTypeAndName],  function (req, res) {

	if (req.fileName && req.fileName.match(/\/album\//)) {
		getPlaylist(req.fileName, function (playlist) {
			res.send(makem3u(playlist));
		});
	} else {
		res.send(makem3u(new Playlist([])));
	}
});

app.listen(3001);
