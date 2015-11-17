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
	res.render('thumbnail');
});
router.post('/', function(req, res, next){
	var url = req.body.url.toString();
	console.log(url);
	//tumblr
	if (url.indexOf('tumblr.com') >= 0){
		var tumblrPostID = getTumblrPostID(url);
		url = removeHTTP(url);
		url = removeWWW(url);
		var blogName = tumblrBlogName(url);
		var tumblrHost = "http://api.tumblr.com/";
		var tumblrPath = tumblrURLPath(blogName, tumblrPostID);
		console.log(tumblrPath);
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
				res.json({"Success": "yes", "thumbnail" : "<img src='" + String(tumblrJSON.response.avatar_url) + "'>"});
				console.log(tumblrJSON);
			});
		}
		var tumblrRequest = http.request(tumblrHost + tumblrPath, tumblrCallback).end();
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
		client.get('https://api.twitter.com/1.1/statuses/show.json', twitterParams, function(error, tweets, response){
			if(error) throw err;
			var twitterResponse = String(tweets.user.profile_image_url);
			console.log(twitterResponse);
			res.json({"Success" : "yes", "thumbnail" : "<img src='" + twitterResponse + "'>"});
		});
	}
	//reddit
	else if(url.indexOf("reddit.com") >= 0 ){
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
				if (String(redditJSON[0].data.children[0].data.thumbnail) == "nsfw"){
					res.json({"Success" : "yes", "thumbnail" : "<img src='https://www.redditstatic.com/icon.png' height='30' width='30'>"});
				}
				else{
					res.json({"Success": "yes", "thumbnail": "<img src='" + String(redditJSON[0].data.children[0].data.thumbnail) +"'>"});
				}
				
			});
		}
		var redditRequest = http.request(redditOptions, redditCallback).end();
		//res.json({"oembed" : "didn't work"});
	}
	else{
		res.json({"Success": "yes", "thumbnail": "<img src='https://d1qb2nb5cznatu.cloudfront.net/startups/i/556878-f280b62e197af20f8634f59643245952-medium_jpg.jpg?buster=1429225491' height='30' width='30'>"});
	}
});

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
function tumblrURLPath(blogName, postID){
	return "v2/blog/" + blogName + "/avatar/30";
}
function getTumblrPostID(tumblrURL){
	var startIndex = tumblrURL.indexOf("/post/") + 6;
	var endIndex = startIndex + 12;
	var tumblrID = tumblrURL.substring(startIndex, endIndex);
	return tumblrID
}
function removeHTTP(url){
	var startIndex;
	var endIndex = url.length + 1
	if(url.indexOf("https") >= 0){
		startIndex = url.indexOf("https") + 8;
		return url.substring(startIndex, endIndex);
	}
	else if(url.indexOf("http") >= 0){
		startIndex = url.indexOf("http") + 7;
		return url.substring(startIndex, endIndex);
	}
	else{
		return url
	}
}
function removeWWW(url){
	var startIndex;
	var endIndex = url.length + 1;
	if(url.indexOf("wwww.") >= 0){
		startIndex = url.indexOf("www.") + 4;
		return url.substring(startIndex, endIndex); 
	}
	else{
		return url
	}
}
function tumblrBlogName(url){
	var endIndex = url.indexOf(".com") + 4;
	return url.substring(0, endIndex);
}
module.exports = router;