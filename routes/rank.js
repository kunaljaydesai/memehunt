
var express = require('express');
var router = express.Router();
var https = require('https');
var http = require('http');
var request = require('request');
var async = require('async');
var querystring = require('querystring');
var mysql = require('mysql');
var twitter = require('twitter');

var YTAPIKey = 'AIzaSyD0qSQKX8PFmx_YhxJPBG0SAEaTEjUrPUY';
var twitterConsumerKey = "MgRKTOFaHsq0TH0rAgg8SHjYY";
var twitterConsumerSecret = "t5v5PtBHEHIMHK24HNETyK8V2TdSllyahfPaUAmJCb2oGa2cdf";
var twitterAccessKey = "28214625-FYnM9fZ8vwOx0hC6tdOnkZb8ksUQ3T1Kb6PowrJWY";
var twitterAccessSecret = "uwgFEFqcfqSZpMkXKa9r4vwdT9CMlnCs53f7zmQcnwGDi";
var TWITTER_RT_WEIGHT = 1000;
var INSTA_CLIENT_ID = "d2d14808e6494c83b54ca8908a877840";
var INSTA_LIKE_WEIGHT = 1000;
var YOUTUBE_LIKE_WEIGHT = 0.1;

router.get('/', function(req, res, next){
	res.render('rank');
});

router.post('/', function(req, res, next){
	var roomId = req.body.roomid;
	TWITTER_RT_WEIGHT = parseInt(req.body.twitter_rt);
	INSTA_LIKE_WEIGHT = parseInt(req.body.insta_likes);
	YOUTUBE_LIKE_WEIGHT = parseInt(req.body.yt_likes);
	var net = 'all'
	if(typeof req.body.count != 'undefined'){
		var count = parseInt(req.body.count);
	}
	else{
		var count = 10;
	}
	var lb = [];
	var iterate = function(item, done){
		console.log(item);
		if(item.type == 'mp4' && item.sourceUrl.indexOf('youtube') >= 0 && (net == 'youtube' || net == 'all')){
			//console.log("ITEM ID: " + item.id);
			YTAPIGet(item.sourceUrl, getYTPostId(item.sourceUrl), roomId, 0, function(status, json, url){
				if(status){
					
					//console.log("JSON RECEIVED");
					if (typeof json.items[0] != 'undefined'){
						//console.log(JSON.stringify(json.items[0]));
						var stats = json.items[0].statistics;
						var title = json.items[0].snippet.title;
						var snippet = json.items[0].snippet.thumbnails.default.url;
						var likes = parseInt(stats.likeCount) * YOUTUBE_LIKE_WEIGHT;

						lb.push({
							url: url,
							likes: likes,
							thumbnail: snippet,
							user: item.userId,
							title: title
						});
						
						return done(null);
					}
					else{
						return done(null);
					}
				}
			});
			
		}
		else if(item.type == 'twitterEmbed' && item.sourceUrl.indexOf('twitter') >= 0 && (net == 'all' || net == 'twitter')){
			twitterAPIGet(item.sourceUrl, roomId, 0, function(status, twitterInfo, url){
				//console.log(item.sourceUrl);
				if(status && typeof item.sourceUrl != 'undefined'){
					
					var snippet = twitterInfo.snippet;
					var likes = parseInt(twitterInfo.fav) * TWITTER_RT_WEIGHT;
					lb.push({
						url: url,
						likes: likes,
						thumbnail: snippet,
						user: item.userId,
						title: twitterInfo.text
					});
					return done(null);
				}	
				else{
					return done(null);
				}
			});
		}
		else if(item.type == 'instagramEmbed' && item.sourceUrl.indexOf('instagram') >= 0 && (net == 'all' || net == 'instagram')){
			//console.log("INSTAGRAM");
			//console.log(getInstagramShortCode(item.sourceUrl));
			instaAPIGet(item.sourceUrl, getInstagramShortCode(item.sourceUrl), roomId, 0, function(status, json){
				if(status && json.meta.code == 200){
					var likes = json.data.likes.count * INSTA_LIKE_WEIGHT;
					var thumbnail = json.data.user.profile_picture;
					
					lb.push({
						url: item.sourceUrl,
						likes: likes,
						thumbnail: thumbnail,
						user: item.userId,
						title: json.data.caption.text
					});
					return done(null);
				}
				else{
					return done(null);
				}
			})
			
		}
		else{
			//console.log("ITEM SOURCE URL: " + item.sourceUrl);
			return done(null);
		}
		
	}
	getRoomURLS(roomId, req.body.time, function(status, data){
		if(status){
			console.log(JSON.stringify(data));
			async.each(data.result.items, iterate, function(err){

				
				var sorted = bubbleSort(lb);
				//console.log(sorted);
				var repeat = removeRepeats(sorted).splice(0, count);
				res.json({'data' : repeat});
			});

			
		}
	});

});

function URLHost(url){
	if (url.indexOf('youtube.com') >= 0){
		return 'youtube'
	}
}

function getYTPostId(url){
	var startIndex = url.indexOf('v=');
	return url.substring(startIndex + 2, url.length)
}
function YTAPIGet(url, postId, room, itemid, renderCallback){

	var options = {
		host : 'www.googleapis.com',
		path : '/youtube/v3/videos?part=id,statistics,snippet&id=' + postId + '&key=' + YTAPIKey
	}
	
	callback = function(response){
		var json = '';
		response.on('data', function(chunk){
			json += chunk;
		});
		response.on('e', function(e){
			renderCallback(e, url);
		});
		response.on('end', function(){
			
			//console.log("JSON: " + json);
			//console.log("YOUTUBE RESULT");
			if (typeof json == 'string'){
				json = JSON.parse(json);
			}
			if(typeof json.items[0] != 'undefined'){
					var snippet = json.items[0].snippet;
					//console.log("SNIPPET: " + json.items[0]);
					var networkName = 'youtube';
					var queryString = "INSERT INTO posts (url, title, time, author, network, snippet, room, sourceid, medialikes) VALUES ('" + url.toString() + "', '" + snippet.title.toString().replace(/'/g, "").replace(/"/g, "") + "', '" + snippet.publishedAt.toString() + "', '" + snippet.channelTitle.toString() + "', '" + networkName.toString() + "', '" + snippet.thumbnails.default.url.toString() + "', '" + room.toString() + "', '" + itemid.toString() + "', '"+ json.items[0].statistics.likeCount.toString() + "') on duplicate key update medialikes=values(medialikes);";
					
					//postToDB();
					postToDB(queryString);
			}
			if(typeof json != 'undefined' && typeof json.items != 'undefined'){
				//console.log("HITS JSON");
				renderCallback(true, json, url);
				//console.log("RENDER CALLBACK");
				
				

			}
			else{
				renderCallback(false, json, url);
			}
			
			
		})
	}
	//renderCallback('lol');
	var request = https.get(options, callback).end();
}
function instaAPIGet(url, shortcode, room, itemid, cb){
	var options = {
		host: "api.instagram.com",
		path: "/v1/media/shortcode/" + shortcode + "?client_id=" + INSTA_CLIENT_ID
	}
	var callback = function(res){
		var json = '';
		res.on('data', function(chunk){
			json += chunk;
		});
		res.on('e', function(e){
			cb(false, e);
		});
		res.on('end', function(){
			json = JSON.parse(json);
			var networkName = "instagram";
			var queryString = "INSERT INTO posts (url, title, time, author, network, snippet, room, sourceid, medialikes) VALUES ('" + url.toString() + "', '" + json.data.caption.text.toString().replace(/'/g, "").replace(/"/g, "") + "', '" + json.data.created_time.toString() + "', '" + json.data.user.username.toString() + "', '" + networkName.toString() + "', '" + json.data.images.thumbnail.url.toString() + "', '" + room.toString() + "', '" + itemid.toString() + "', '"+ json.data.likes.count.toString() + "') on duplicate key update medialikes=values(medialikes);";
			postToDB(queryString);
			cb(true, json);
		});
	}
	var request = https.get(options, callback).end();
}
function getTwitterID(twitterURL){
	var startIndex = twitterURL.indexOf("/status/") + 8;
	var endIndex = startIndex + 18;
	var twitterID = twitterURL.substring(startIndex, endIndex);
	return twitterID
}
function getInstagramShortCode(url){
	var startIndex = url.indexOf("/p/") + 3;
	var endIndex = startIndex + 10;
	return url.substring(startIndex, endIndex);

}
function twitterAPIGet(url, room, itemid, cb){
	//console.log("URL: " + url);
	//console.log("room: " + room);
	//console.log("itemid: " + itemid);

	var client = new twitter({
			consumer_key: twitterConsumerKey,
			consumer_secret: twitterConsumerSecret,
			access_token_key: twitterAccessKey,
			access_token_secret: twitterAccessSecret
	});

	var twitterID = getTwitterID(url);
	//console.log(twitterID);

	var params = {
		id: twitterID
	};

	client.get("https://api.twitter.com/1.1/statuses/show.json", params, function(error, tweets, response){
		if(error) throw error;
		var twitterInfo = twitterData(tweets, twitterID);
		
		var queryString = "INSERT INTO posts (url, title, time, author, network, snippet, room, sourceid, medialikes) VALUES ('" + url.toString() + "', '" + twitterInfo.text.toString().replace(/'/g, "").replace(/"/g, "") + "', '" + twitterInfo.time.toString() + "', '" + twitterInfo.author.toString() + "', '" + twitterInfo.networkName.toString() + "', '" + twitterInfo.snippet.toString() + "', '" + room.toString() + "', '" + itemid.toString() + "', '"+ twitterInfo.fav.toString() + "') on duplicate key update medialikes=values(medialikes);";
		//console.log("QUERYSTRING TWITTER: " + queryString);
		postToDB(queryString);
		cb(true, twitterInfo, url);
	});
}
function twitterData(body, tweetID){
	if(body == null){
		return no;
	}
	else{
		var time = body.created_at;
		var id = tweetID;
		var text = body.text;
		var userID = body.user.id;
		var userName = body.user.name;
		var userLocation = body.user.location;
		var userDescription = body.user.description;
		var userFollowers = body.user.followers_count;
		var userAvi = body.user.profile_image_url;
		var screenName = body.user.screen_name;
		var rtCount = body.retweet_count;
		var twitterInfo = {
			"previewExt" : userAvi,
			"previewURL" : userAvi,
			"networkName" : "twitter",
			"id" : id,
			"time" : time,
			"author" : screenName,
			"snippet" : userAvi,
			"fav" : rtCount,
			"text" : text
			};
		
		return twitterInfo;
	}

}
function getRoomURLS(roomId, time, cb){
	//http://mediachat-unstable.doublie.com/urls?roomId=popular
	var options = {
		host : 'mediachat-unstable.doublie.com',
		path : '/history?count=25&roomId=' + roomId
	}
	callback = function(response){
		var json = ''
		response.on('data', function(chunk){
			json += chunk;
		});
		response.on('e', function(e){
			cb(false, e);
		});
		response.on('end', function(){
			//console.log(json);
			time = parseFloat(time);
			json = JSON.parse(json);
			//console.log("START TIME: " + json.result.items[0].startTime);
			//console.log("CURRENT TIME: " + time);
			
			/*for (var i = 0; i < json.result.items.length; i++){
				if(parseFloat(json.result.items[i].startTime) > time){
					jsonTime.push(json.result.items[i]);
					//console.log("TRUE");
				}
			}*/
			//console.log("GETROOMURSL: " + JSON.stringify(json));
			//console.log(jsonTime);
			cb(true, json);
		});
	}
	var request = http.get(options, callback).end();
}
function bubbleSort(data){
	var data = data;
	var swapped;
	do {
		swapped = false;
		for(var i = 0; i < data.length-1; i++){
			if (data[i].likes < data[i+1].likes){
				var temp = data[i];
				data[i] = data[i+1];
				data[i+1] = temp;
				swapped = true;
			}
		}		
	} while(swapped);
	return data
}
function removeRepeats(lb){
	
	for (var j = 0; j < lb.length-1; j++){
		if(lb[j].url == lb[j+1].url){
			delete lb[j]
		}
	}
	lb = lb.filter(function(el){
		return (typeof el!== 'undefined');
	});
	return lb
}
function postToDB(query){
	//console.log("POST TO DB");
	//console.log(query);
	var connection = mysql.createConnection({
			host : 'memehunt.cmdahnuhfmvm.us-west-2.rds.amazonaws.com',
			user : 'memehunt',
			password : '4zwpFhGbE7WTH2jwa3',
			port : 3306,
			database : 'memehunt'
			});
	connection.query(query, function(err, rows, fields){
		//console.log("QUERIED");
	});
	connection.end(function(err){

	});
	/*checkIfExists(sourceid, url, function(status, connection){
		//console.log("CB CHECK IF EXISTS");
		if(!(status)){
			//console.log("STATUS TRUE");
			/*var connection = mysql.createConnection({
			host : 'memehunt.cmdahnuhfmvm.us-west-2.rds.amazonaws.com',
			user : 'memehunt',
			password : '4zwpFhGbE7WTH2jwa3',
			port : 3306,
			database : 'memehunt'
			});
			connection.query(query, function(err, rows, fields){
				//if (err) throw err;
				connection.end(function(err){
					//console.log(err);
				});
			});		
	
		}
	});  */
	
}

function checkIfExists(sourceid, url, cb){
	//console.log("CHECKING IF EXISTS");
	var connection = mysql.createConnection({
			host : 'memehunt.cmdahnuhfmvm.us-west-2.rds.amazonaws.com',
			user : 'memehunt',
			password : '4zwpFhGbE7WTH2jwa3',
			port : 3306,
			database : 'memehunt'
		});
	var queryString = "select * from posts where sourceid=" + sourceid.toString() + "or url='" + url + "';";
	//console.log(queryString);
	connection.query(queryString, function(err, rows, fields){

		if(typeof rows != 'undefined'){

			if(rows.length >= 1){
				cb(true);
				//console.log("EXISTS");
			}
			else{
				cb(false, connection);
			}
		}
		else{
			cb(true);
		}
	});
}
module.exports = router;
