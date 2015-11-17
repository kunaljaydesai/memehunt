var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var https = require('https');
var http = require('http');
var async = require('async');
var twitter = require('twitter');

//api keys
var YTAPIKey = 'AIzaSyD0qSQKX8PFmx_YhxJPBG0SAEaTEjUrPUY';
var twitterConsumerKey = "MgRKTOFaHsq0TH0rAgg8SHjYY";
var twitterConsumerSecret = "t5v5PtBHEHIMHK24HNETyK8V2TdSllyahfPaUAmJCb2oGa2cdf";
var twitterAccessKey = "28214625-FYnM9fZ8vwOx0hC6tdOnkZb8ksUQ3T1Kb6PowrJWY";
var twitterAccessSecret = "uwgFEFqcfqSZpMkXKa9r4vwdT9CMlnCs53f7zmQcnwGDi";
var INSTA_CLIENT_ID = "d2d14808e6494c83b54ca8908a877840";

router.get('/', function(req, res, next){
	res.render('pageCreation');
});

router.post('/', function(req, res, next){
	deleteFailed();
	var urls = req.body.urls;
	urls = urls.replace(')', ' ');
	urls = urls.replace(']', ' ');
	urls = urls.replace(';', ' ');
	var urlArr = separateURLS(urls);
	
	var lb = [];
	var failed = [];
	var iterate = function(item, done){
		if(item.network == "youtube"){
			YTAPIGet(item.url, item.postid, 'pageCreation', 'null', function(status, json, url){
				if(status){
					if(typeof json.items[0] != 'undefined'){

						var stats = json.items[0].statistics;
						var title = json.items[0].snippet.title;
						var snippet = json.items[0].snippet.thumbnails.default.url;
						var likes = parseInt(stats.likeCount);
						var description = json.items[0].snippet.description;
						var tags = json.items[0].snippet.tags;
						var views = parseInt(stats.viewCount);
						var dislikes = parseInt(stats.dislikeCount);
						var comments = parseInt(stats.commentCount);
						var time = json.items[0].snippet.publishedAt;
						lb.push({
							url: url,
							user: {
								channelId: json.items[0].snippet.channelId
							},
							statistics: {
								likes: likes,
								views: views,
								dislikes: dislikes,
								comments: comments
							},
							thumbnail: snippet,
							//user: item.userId,
							title: title,
							network: item.network,
							description: description,
							tags: tags,
							timePublished: time,
							timeAccessed: Date.now()
						});
						return done(null);
					}
					else{
						failed.push({
							url: url
						});
						return done(null);
					}
				}
			});
		}
		else if(item.network == "twitter"){
			twitterAPIGet(item.url, 'pageCreation', item.postid, function(status, twitterInfo, url){
				if(status && typeof item.url != 'undefined'){
					//console.log("PUSHED TO LB");
					var snippet = twitterInfo.snippet;
					var likes = parseInt(twitterInfo.fav);
					lb.push({
						url: url,
						user: {
							screen_name: twitterInfo.author,
							user_name: twitterInfo.username
						},
						statistics: {
							retweets: likes
						},	
						thumbnail: snippet,
						//user: item.userId,
						title: twitterInfo.text,
						network: item.network,
						tags: twitterInfo.hashtags,
						timePublished: twitterInfo.time, 
						timeAccessed: Date.now()
					});
					return done(null);
				}
				else{
					failed.push({
						url: url,
						error: twitterInfo
					});
					return done(null);
				}
			});
		}
		else if(item.network == "instagram"){
			instaAPIGet(item.url, item.postid, 'pageCreation', 'null', function(status, json){
				if(status && json.meta.code == 200){
					var likes = json.data.likes.count;
					var thumbnail = json.data.user.profile_picture;
					if(json.data.caption != null && typeof json.data.caption != 'undefined'){
						var title = json.data.caption.text
					}
					else{
						var title = '';
					}
					if(json.data.tags != null && typeof json.data.caption != 'undefined'){
						var tags = json.data.tags;
					}
					else{
						var tags = '';
					}
					lb.push({
						url: item.url,
						user: {
							username: json.data.user.username,
							full_name: json.data.user.full_name
						},
						statistics: {
							likes: likes,
							comments: json.data.comments.count || 0
						},
						thumbnail: thumbnail,
						title: title,
						network: item.network,
						tags: tags,
						timePublished: parseInt(json.data.created_time) * 1000,
						timeAccessed: Date.now()

					});
					return done(null);
				}
				else{
					failed.push({
						url: item.url,
						error: json
					});
					return done(null);
				}
			});
		}
		else{
			return done(null);
		}
	}
	async.each(urlArr, iterate, function(err){
		res.json({'urls': lb, 'failed' : failed});
	})
	
});

function separateURLS(urlString){
	var arr = [];
	var cutString = urlString;
	while(cutString.indexOf('http') >= 0){
		var startIndex = cutString.indexOf('http');
		if(cutString.indexOf('http', startIndex + 1) != -1){
			var endIndex = cutString.indexOf('http', cutString.indexOf('http', startIndex + 1));
		}
		else{
			var endIndex = cutString.length;
		}
		
		var substring = cutString.substring(startIndex, endIndex);
		arr.push(substring);
		//console.log(substring);
		cutString = cutString.substring(endIndex);
		

	}
	var lb = [];
	var urlArr = arr;
	for(var i = 0; i < urlArr.length; i++){
		
		if (urlArr[i].indexOf('youtube.com') >= 0){
	
			if(getYTPostId(urlArr[i]) != null){
				lb.push({
					url: urlArr[i],
					postid: getYTPostId(urlArr[i]),
					network: 'youtube'
				});
			}	
		}
		else if(urlArr[i].indexOf('twitter.com') >= 0){
			lb.push({
				url: urlArr[i],
				postid: getTwitterID(urlArr[i]),
				network: 'twitter'
			});
		}
		else if(urlArr[i].indexOf('instagram.com') >= 0){
			lb.push({
				url: urlArr[i],
				postid: getInstagramShortCode(urlArr[i]),
				network: 'instagram'
			});
		}
	}
	return lb;
}

//gets youtube postid
function getYTPostId(url){
	var startIndex = url.indexOf('/embed/');
	if(startIndex == -1){
		return null;
	}
	return url.substring(startIndex + 7, startIndex+18);
}
//takes in url, spits out short code
function getInstagramShortCode(url){
	var startIndex = url.indexOf("/p/") + 3;
	var endIndex = startIndex + 10;
	return url.substring(startIndex, endIndex);

}

//takes in url, spits out tweet id
function getTwitterID(twitterURL){
	var startIndex = twitterURL.indexOf("/status/") + 8;
	var endIndex = startIndex + 18;
	var twitterID = twitterURL.substring(startIndex, endIndex);
	return twitterID
}

//takes json and turns into twitter data obj
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
		var hashtags = body.hashtags;
		var twitterInfo = {
			"previewExt" : userAvi,
			"previewURL" : userAvi,
			"networkName" : "twitter",
			"id" : id,
			"time" : time,
			"author" : screenName,
			"snippet" : userAvi,
			"fav" : rtCount,
			"text" : text,
			"username" : userName,
			"hashtags": hashtags
			};
		
		return twitterInfo;
	}

}

//returns instagram media data from API
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
			if(json.meta.code == 200){
				var networkName = "instagram";
				if(json.data.caption != null && typeof json.data.caption != 'undefined'){
					var title = json.data.caption.text
				}
				else{
					var title = '';
				}
				var queryString = "INSERT INTO posts (url, title, time, author, network, snippet, room, sourceid, medialikes, user, statistics, tags, timeAccessed) VALUES ('" + url.toString() + "', '" + title.replace(/'/g, "").replace(/"/g, "") + "', '" + json.data.created_time.toString() + "', '" + json.data.user.username.toString() + "', '" + networkName.toString() + "', '" + json.data.images.thumbnail.url.toString() + "', '" + room.toString() + "', '" + itemid.toString() + "', '"+ json.data.likes.count.toString() + "', '{username: " + json.data.user.username.toString() + ", full_name:" + json.data.user.full_name.toString()  + "}', '{ likes: " + json.data.likes.count.toString() + ", comments: " + json.data.comments.count  + "}', '" + json.data.tags.toString() + "', '" + Date.now().toString() +  "') on duplicate key update medialikes=values(medialikes), statistics=values(statistics), timeAccessed=values(timeAccessed);";
				postToDB(queryString);
				//var queryString = "INSERT INTO posts (url, title, time, author, network, snippet, room, sourceid, medialikes) VALUES ('" + url.toString() + "', '" + json.data.caption.text.toString().replace(/'/g, "").replace(/"/g, "") + "', '" + json.data.created_time.toString() + "', '" + json.data.user.username.toString() + "', '" + networkName.toString() + "', '" + json.data.images.thumbnail.url.toString() + "', '" + room.toString() + "', '" + itemid.toString() + "', '"+ json.data.likes.count.toString() + "') on duplicate key update medialikes=values(medialikes);";
				//postToDB(queryString);

				cb(true, json);
			}
			else{
				var query = "INSERT INTO failed (url) VALUES('" + url + "');";
				postToDB(query);
				cb(false, json);
			}
		});
	}
	var request = https.get(options, callback).end();
}

//gets tweet info from twitter api
function twitterAPIGet(url, room, itemid, cb){
	var client = new twitter({
			consumer_key: twitterConsumerKey,
			consumer_secret: twitterConsumerSecret,
			access_token_key: twitterAccessKey,
			access_token_secret: twitterAccessSecret
	});

	var twitterID = getTwitterID(url);
	

	var params = {
		id: twitterID
	};

	client.get("https://api.twitter.com/1.1/statuses/show.json", params, function(error, tweets, response){
		if(error){
			var query = "INSERT INTO failed (url) VALUES('" + url + "');";
			postToDB(query);
			cb(false, error, url)

		}
		else{
			var twitterInfo = twitterData(tweets, twitterID);
			//console.log(JSON.stringify(twitterInfo));
			if(typeof twitterInfo.hashtags == 'undefined'){
				var hashtags = '';
			}
			else{
				var hashtags = twitterInfo.hashtags;
			}
			var queryString = "INSERT INTO posts (url, title, time, author, network, snippet, room, sourceid, medialikes, user, statistics, tags, timeAccessed) VALUES ('" + url.toString() + "', '" + twitterInfo.text.toString().replace(/'/g, "").replace(/"/g, "").toString() + "', '" + twitterInfo.time.toString() + "', '" + twitterInfo.author.toString() + "', '" + twitterInfo.networkName.toString() + "', '" + twitterInfo.snippet.toString() + "', '" + room.toString() + "', '" + itemid.toString() + "', '"+ twitterInfo.fav.toString() + "', '{screen_name:" + twitterInfo.author.toString() + ", user_name:" + twitterInfo.username.toString()  + "}', '" + twitterInfo.fav.toString() + "', '" + hashtags.toString() + "', '" + Date.now().toString() +  "') on duplicate key update medialikes=values(medialikes), statistics=values(statistics), timeAccessed=values(timeAccessed);";
			//var queryString = "INSERT INTO posts (url, title, time, author, network, snippet, room, sourceid, medialikes) VALUES ('" + url.toString() + "', '" + twitterInfo.text.toString().replace(/'/g, "").replace(/"/g, "") + "', '" + twitterInfo.time.toString() + "', '" + twitterInfo.author.toString() + "', '" + twitterInfo.networkName.toString() + "', '" + twitterInfo.snippet.toString() + "', '" + room.toString() + "', '" + itemid.toString() + "', '"+ twitterInfo.fav.toString() + "') on duplicate key update medialikes=values(medialikes);";
			//console.log("QUERYSTRING TWITTER: " + queryString);
			postToDB(queryString);
			cb(true, twitterInfo, url);
		}
	});
}

//gets youtube media info from api
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
					var queryString = "INSERT INTO posts (url, title, time, author, network, snippet, room, sourceid, medialikes, user, statistics, tags, timeAccessed) VALUES ('" + url.toString() + "', '" + snippet.title.toString().replace(/'/g, "").replace(/"/g, "") + "', '" + snippet.publishedAt.toString() + "', '" + snippet.channelTitle.toString() + "', '" + networkName.toString() + "', '" + snippet.thumbnails.default.url.toString() + "', '" + room.toString() + "', '" + itemid.toString() + "', '"+ json.items[0].statistics.likeCount.toString() + "', '" + json.items[0].snippet.channelId + "', '" + JSON.stringify(json.items[0].statistics) + "', '" + json.items[0].snippet.tags + "', '" + Date.now().toString() +  "') on duplicate key update medialikes=values(medialikes), statistics=values(statistics), timeAccessed=values(timeAccessed);";
					
					//postToDB();
					postToDB(queryString);
					//renderCallback(true, json, url);
			}
			if(typeof json != 'undefined' && typeof json.items != 'undefined'){
				//console.log("HITS JSON");
				//var query = "INSERT INTO failed (url) VALUES('" + url + "');";
				//postToDB(query);
				renderCallback(true, json, url);
				//console.log("RENDER CALLBACK");
				
				

			}
			else{
				var query = "INSERT INTO failed (url) VALUES('" + url + "');";
				postToDB(query);
				renderCallback(false, json, url);
			}
			
			
		})
	}
	//renderCallback('lol');
	var request = https.get(options, callback).end();
}

//posts to database
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
		console.log(err);
	});
	connection.end(function(err){

	});
	
}
function deleteFailed(){
	var connection = mysql.createConnection({
			host : 'memehunt.cmdahnuhfmvm.us-west-2.rds.amazonaws.com',
			user : 'memehunt',
			password : '4zwpFhGbE7WTH2jwa3',
			port : 3306,
			database : 'memehunt'
			});
	var query = "DELETE FROM failed;";
	connection.query(query, function(err, rows, fields){
		console.log(err);
	});
	connection.end(function(err){

	});
}

module.exports = router;