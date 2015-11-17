var express = require('express');
var http = require('http');
var router = express.Router();
var https = require('https');
var Twitter = require('twitter');

var twitterConsumerKey = "MgRKTOFaHsq0TH0rAgg8SHjYY";
var twitterConsumerSecret = "t5v5PtBHEHIMHK24HNETyK8V2TdSllyahfPaUAmJCb2oGa2cdf";
var twitterAccessKey = "28214625-FYnM9fZ8vwOx0hC6tdOnkZb8ksUQ3T1Kb6PowrJWY";
var twitterAccessSecret = "uwgFEFqcfqSZpMkXKa9r4vwdT9CMlnCs53f7zmQcnwGDi";

router.get('/', function(req, res, next){
	res.render('oembed', {title: 'oembed'});
});
router.post('/', function(req, res, next){
	var url = req.body.url.toString();
	console.log(url);
	//tumblr
	if (url.indexOf('tumblr.com') >= 0){
		console.log("tumblr");
		var tumblrHost = "https://www.tumblr.com";
		var tumblrPath = "/oembed/1.0?url=" + url;
		tumblrCallback = function(tumblrResponse){
			var tumblrJSON = '';
			tumblrResponse.on('data', function(tumblrChunk){
				tumblrJSON += tumblrChunk;
			});
			tumblrResponse.on('error', function(e){
				res.json({"Success" : "no"});
			});
			tumblrResponse.on('end', function(){
				tumblrJSON = JSON.parse(tumblrJSON);
				console.log(tumblrJSON);
				res.json({"Success": "yes", "oembed" : String(tumblrJSON.html)});
				console.log(tumblrJSON.html);
			});
		}
		var tumblrRequest = https.request(tumblrHost + tumblrPath, tumblrCallback).end();
	}
	//twitter
	else if (url.indexOf('twitter.com') >= 0){
		var twitterID = getTwitterID(url);
		var twitterParams = {
			id: twitterID
		};
		var client = new Twitter({
			consumer_key: twitterConsumerKey,
			consumer_secret: twitterConsumerSecret,
			access_token_key: twitterAccessKey,
			access_token_secret: twitterAccessSecret
		});
		client.get('https://api.twitter.com/1.1/statuses/oembed.json', twitterParams, function(error, tweets, response){
			if(error) throw err;
			var twitterResponse = '<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>' + String(tweets.html);
			console.log(twitterResponse);
			res.json({"Success" : "yes", "oembed" : twitterResponse, "width" : tweets.width});
		});
	}
	//reddit
	else if (url.indexOf('reddit.com') >= 0){
		var redditPathURL = redditPath(url);
		var redditOptions =  {
			host : "www.reddit.com",
			path : redditPathURL
		};
		redditCallback = function(redditResponse){
			var redditJSON = '';
			redditResponse.on('data', function(redditChunk){
				redditJSON += redditChunk;
			});
			redditResponse.on('error', function(e){
				res.json({"Success" : "no", "oembed" : "Click the title to see the post"});
			});
			redditResponse.on('end', function(){
				redditJSON = JSON.parse(redditJSON);
				console.log(redditJSON);
				if(redditJSON[0].data.children[0].data.hasOwnProperty('preview')){
					var redditOembedResponse = String(redditJSON[0].data.children[0].data.preview.images[0].source.url);
					redditOembedResponse = "<img class='thumbnailimg' width='500' style='height=auto; max-width: 100%;' src='" + redditOembedResponse + "'>";
					res.json({"Success": "yes", "oembed": redditOembedResponse, "title" : redditJSON[0].data.children[0].data.title});
				}
			});
		}
		var redditRequest = http.request(redditOptions, redditCallback).end();
		//res.json({"oembed" : "didn't work"});
	}
	//instagram
	else if(url.indexOf('instagram.com') >= 0 ){
		var host = "api.instagram.com";
		var path = instaPath(url);
		var instaOptions ={
			host: host,
			path: path
		};
		var instaCallback = function(instaResponse){
			var instaJSON = '';
			instaResponse.on('data', function(chunk){
				instaJSON += chunk;
			});
			instaResponse.on('e', function(e){
				res.json({"Success" : "no", "oembed": "Click the title to see the post"});
			});
			instaResponse.on('end', function(){
				instaJSON = JSON.parse(instaJSON);
				var instaOembed = '<script async defer src="//platform.instagram.com/en_US/embeds.js"></script>' + String(instaJSON.html);
				res.json({"Success" : "yes", "oembed" : instaOembed, "width" : instaJSON.width});
			});
		}
		var instaRequest = https.get(instaOptions, instaCallback).end();
	}
	else if(url.indexOf('youtube.com') >= 0){
		var host = "www.youtube.com";
		var path = YTPath(url);
		var YTOptions = {
			host: host,
			path: path
		};
		console.log("YOUTUBE URL: " + host + path);
		var YTCallback = function(ytresponse){
			var ytJSON = '';
			ytresponse.on('data', function(chunk){
				ytJSON += chunk;
			});
			ytresponse.on('e', function(e){
				res.json({"Success" : "no", "oembed": "Click the title to see the post"});
			});
			ytresponse.on('end', function(){
				console.log(ytJSON);
				ytJSON = JSON.parse(ytJSON);
				var ytOembed = String(ytJSON.html);
				res.json({"Success" : "yes", "oembed" : ytOembed, "width" : ytJSON.width});
			});
		}
		var ytRequest = https.request(YTOptions, YTCallback).end();
	}
	else {
		res.json({"Success" : "no", "oembed" : "didnt work"});
	}
});
function YTPath(url){
	return "/oembed?url=" + url + "&format=json";
}
function instaPath(url){
	return "/publicapi/oembed/?url=" + url;
}
function getTwitterID(twitterURL){
	var startIndex = twitterURL.indexOf("/status/") + 8;
	var endIndex = startIndex + 18;
	var twitterID = twitterURL.substring(startIndex, endIndex);
	return twitterID
}

function getRedditPostID(redditUrl){
	var startIndex = redditUrl.indexOf("comments/") + 9;
	var endIndex = redditUrl.indexOf("comments/") + 15; 
	var redditID = redditUrl.substring(startIndex, endIndex);
	return redditID;
}

function redditPath(url){
	var postID = getRedditPostID(url);
	var startIndex = url.indexOf("/r/");
	var endIndex = url.indexOf("comments/") + 9;
	var path = url.substring(startIndex, endIndex);
	path = path + postID + "/info/.json";
	return path;
}

module.exports = router;
