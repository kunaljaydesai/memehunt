var express = require('express');
var http = require('http');
var router = express.Router();
var Twitter = require('twitter');
var request = require('request');
var querystring = require('querystring');
var https = require('https');

var mysql = require('mysql');
var doublie = require('../functions/doublie')
var redditHostURL = "www.reddit.com";
var twitterHostURL = "www.twitter.com";
var tumblrHostURL = "www.tumblr.com";
var YTHostURL = "www.youtube.com";

var twitterConsumerKey = "MgRKTOFaHsq0TH0rAgg8SHjYY";
var twitterConsumerSecret = "t5v5PtBHEHIMHK24HNETyK8V2TdSllyahfPaUAmJCb2oGa2cdf";
var twitterAccessKey = "28214625-FYnM9fZ8vwOx0hC6tdOnkZb8ksUQ3T1Kb6PowrJWY";
var twitterAccessSecret = "uwgFEFqcfqSZpMkXKa9r4vwdT9CMlnCs53f7zmQcnwGDi";
var YTAPIKey = 'AIzaSyD0qSQKX8PFmx_YhxJPBG0SAEaTEjUrPUY';
var tumblrAPIKey = 'cBDEUn9ZmYR58SXGtNhwvEkiyssKVzxqpRWAwb1r9bt6T3yJNQ';

var lightAccessToken = '0a2606e847fd4d4f9b093afa14a86acf';
var errorRes = "Please enter a valid URL."

/* GET upload page. */
router.get('/', function(req, res, next) {
  res.render('upload');
});

router.post('/', function(req, res, next){
	console.log(req.body.url);
	console.log(req.body.title);
	var title = req.body.title.toString();
	if (title == ''){
		res.render('upload', {"error" : "Please enter a title" });
	}
	var connection = mysql.createConnection({
		host : 'memehunt.cmdahnuhfmvm.us-west-2.rds.amazonaws.com',
		user : 'memehunt',
		password : '4zwpFhGbE7WTH2jwa3',
		port : 3306,
		database : 'memehunt'
	});
	connection.connect();
	var url = req.body.url.toString();
	console.log(url);
	var host = URLHost(url);
	console.log(host);
	var path = URLPath(url, host);
	if (host == redditHostURL){
		var redditResponse = redditAPIGet(host, path, function(data){
			//console.log(redditResponse);
			if (data != 'media' && data != 'time' && data != 'error'){
				var redditQuery = "INSERT INTO posts (url, title, time, author, network, snippet) VALUES ('" + url + "', '" + title + "', '" + data.time.toString() + "', '" + data.author.toString() + "', '" + data.networkName.toString() + "', '" + data.snippet.toString() + "');";
				connection.query(redditQuery, function(err, rows, fields){
					if (err) throw err;
					connection.end(function(err){
					console.log(err);
					});
					res.redirect('/index');
				});
			}
			else{
				res.render('upload', {"error" : errorRes });
			}
			
		});
	}
	else if(host == twitterHostURL){
		var twitterObj = twitterAPIGet(url, function(data){
			data.time = (parseTwitterDate(data.time))/1000;
			if (data != "time"){
				var twitterQuery = "INSERT INTO posts (url, title, time, author, network, snippet) VALUES ('" + url + "', '" + title + "', '" + data.time.toString() + "', '" + data.author.toString() + "', '" + data.networkName.toString() + "', '" + data.snippet.toString() + "');";
				connection.query(twitterQuery, function(err, rows, fields){
					if(err) throw err;
					connection.end(function(err){
						console.log(err);
					});
					res.redirect('/index');
				});
			}
			else {
				res.render('upload', {"error" : errorRes });
			}
		});		
			
			
		
		
		//res.render('upload', {title: 'Succesfully Uploaded, upload another?'});
	}
	else if(host == tumblrHostURL){
		var postID = getTumblrPostID(url);
		url = removeHTTP(url);
		url = removeWWW(url);
		var blogName = tumblrBlogName(url);
		//console.log(postID);
		//console.log(blogName);
		//console.log(tumblrURLAPI(blogName, postID));
		var endpointHost = "http://api.tumblr.com/"
		var endpointPath = tumblrURLPath(blogName, postID);
		var options = {
			host : endpointHost,
			path : endpointPath
		};
		tumblrAPIGet(endpointHost, endpointPath, function(data){
			if (data != 'time' && data != 'error'){
				var tumblrQuery = "INSERT INTO posts (url, title, time, author, network, snippet) VALUES ('http://" + url + "/', '" + title + "', '" + data.time.toString() + "', '" + data.author.toString() + "', '" + data.networkName.toString() + "', '" + data.snippet.toString() + "');";
				connection.query(tumblrQuery, function(err, rows, fields){
					if(err) throw err;
					connection.end(function(err){
						console.log(err);
					});
					res.redirect('/index');
				});
			}
			else{
				res.render('upload', {"error" : errorRes });
			}
		});
		
		
		
	}
	else if(host == YTHostURL){
		var YTID = getYTID(url);
		console.log("YT ID: " + YTID);
		YTAPIGet(YTID, function(YTres){
			var data = YTres.items[0].statistics;
			res.redirect('/index');
			//res.json({'view' : data.viewCount, 'like' : data.likeCount, 'dislike' : data.dislikeCount, 'comment' : data.commentCount });
		});
	}
	else {
		res.render('upload', {"error" : errorRes });
	}
	
});

function URLPath(url, host){
	url = JSON.stringify(url);
	if (host == redditHostURL){
		var postID = getRedditPostID(url);
		var startIndex = url.indexOf("/r/");
		var endIndex = url.indexOf("comments/") + 9;
		var path = url.substring(startIndex, endIndex);
		path = path + postID + "/info/.json";
		return path;
	}
	else if(host == twitterHostURL){
		return null
	}
}

//Identify Medium
function URLHost(url){
	console.log("URL HOST: " + url)
	if(url.indexOf("reddit.com") >= 0){
		return redditHostURL
	}
	else if(url.indexOf("twitter.com") >= 0){
		return twitterHostURL
	}
	else if(url.indexOf("tumblr.com") >= 0){
		return tumblrHostURL
	}
	else if(url.indexOf("youtube.com") >= 0){
		return YTHostURL
	}
}


//Get Reddit ID from URL
function getRedditPostID(redditUrl){
	var startIndex = redditUrl.indexOf("comments/") + 9;
	var endIndex = redditUrl.indexOf("comments/") + 15; 
	var redditID = redditUrl.substring(startIndex, endIndex);
	return redditID;
}

//Get Twitter ID from URL
function getTwitterID(twitterURL){
	var startIndex = twitterURL.indexOf("/status/") + 8;
	var endIndex = startIndex + 18;
	var twitterID = twitterURL.substring(startIndex, endIndex);
	return twitterID
}
function getYTID(url){
	var startIndex = url.indexOf('v=');
	return url.substring(startIndex + 2, url.length)
}
//Get Tumblr ID from URL
function getTumblrPostID(tumblrURL){
	var startIndex = tumblrURL.indexOf("/post/") + 6;
	var endIndex = startIndex + 12;
	var tumblrID = tumblrURL.substring(startIndex, endIndex);
	return tumblrID
}
//remote HTTP(s) from url + check
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
//remove WWWW from url + check
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

function tumblrURLPath(blogName, postID){
	return "v2/blog/" + blogName + "/posts?api_key=" + tumblrAPIKey + "&id=" + postID;
}
function parseTwitterDate(dateString){
	return Date.parse(dateString)
}
function parseTumblrDate(dateString){
	return Date.parse(dateString)
}
function getCurrentUTCDate(){
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1; //January is 0!
	var yyyy = today.getFullYear();

	if(dd<10) {
    	dd='0'+dd
	}	 

	if(mm<10) {
    	mm='0'+mm
	} 

	today = mm+'/'+dd+'/'+yyyy;
	return Date.parse(today);
}

function sameDate(currentDate, postedDate){
	if(parseFloat(postedDate) - parseFloat(currentDate) > 0){
		return true
	}
	else{
		return false
	}
}

function checkForExtension(url){
	
	if (url.indexOf(".jpg") >= 0){
		return true
	}
	else if (url.indexOf(".jpeg") >= 0){
		return true
	}
	else if (url.indexOf(".png") >= 0){
		return true
	}
	else if (url.indexOf(".mp4") >= 0){
		return true
	}
	else {
		return false
	}
}

function extType(url){
	if (url.indexOf(".jpg") >= 0){
		return "jpg"
	}
	else if (url.indexOf(".jpeg") >= 0){
		return "jpeg"
	}
	else if (url.indexOf(".png") >= 0){
		return "png"
	}
	else if (url.indexOf(".mp4") >= 0){
		return "mp4"
	}
	else {
		return null
	}
}

function redditData(body){
	var imageDomain = body[0].data.children[0].data.domain;
	var subreddit = body[0].data.children[0].data.subreddit;
	var id = body[0].data.children[0].data.id;
	var time = body[0].data.children[0].data.created_utc;
	var author = body[0].data.children[0].data.author;
	var title = body[0].data.children[0].data.title;
	var ups = body[0].data.children[0].data.ups;
	var upvoteRatio = body[0].data.children[0].data.upvote_ratio;
	var numComments = body[0].data.children[0].data.num_comments;
	var snippet = body[0].data.children[0].data.thumbnail;
	/*console.log("REDDIT");
	console.log("Image Domain: " + imageDomain);
	console.log("Subreddit: " + subreddit);
	console.log("id: " + id);
	
	console.log("Title: " + body[0].data.children[0].data.title);
	console.log("Ups: " + body[0].data.children[0].data.ups);
	console.log("Upvote Ratio: " + body[0].data.children[0].data.upvote_ratio);
	console.log("Number of comments: " + body[0].data.children[0].data.num_comments);
	console.log("Created UTC: " + parseFloat(body[0].data.children[0].data.created_utc));*/
	var redditInfo = {
		"imageDomain" : imageDomain,
		"subreddit" : subreddit,
		"id" : id,
		"time" : time,
		"author" : author,
		"title" : title,
		"ups" : ups,
		"upvoteRatio" : upvoteRatio,
		"numComments" : numComments,
		"snippet" : snippet
	};
	if(body[0].data.children[0].data.hasOwnProperty('preview')){
		var previewURL = body[0].data.children[0].data.preview.images[0].source.url;
		console.log("Preview: " + previewURL);
		redditInfo.previewURL = previewURL;
		redditInfo.validPreviewExtension = checkForExtension(previewURL);
		if (redditInfo.validPreviewExtension){
			redditInfo.previewExt = extType(previewURL);
		}
		
	}
	console.log("Time Created: " + time);
	console.log("Author: " + author);
	if (body[0].data.children[0].data.hasOwnProperty('thumbnail')){
		var thumbnailURL = body[0].data.children[0].data.thumbnail;
		console.log("Thumbnail: " + thumbnailURL);
		redditInfo.thumbnailURL = thumbnailURL;
		redditInfo.validThumbnailExtension = checkForExtension(thumbnailURL);
		if (redditInfo.validThumbnailExtension){
			redditInfo.thumbnailExt = extType(thumbnailURL);
		}	
	}
	console.log("REDDITINFO " + redditInfo);
	redditInfo.networkName = "reddit";
	return redditInfo;
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
		var twitterInfo = {
			"previewExt" : extType(userAvi),
			"previewURL" : userAvi,
			"networkName" : "twitter",
			"id" : id,
			"time" : time,
			"author" : screenName,
			"snippet" : userAvi
			};
		console.log(id);
		console.log(screenName);
		console.log("2: " + time);
		return twitterInfo;
	}

}

function tumblrData(body){
	var blogTitle = body.response.blog.title;
	var blogName = body.response.blog.name;
	var blogURL = body.response.blog.url;
	var blogDescription = body.response.blog.description;
	var postID = body.response.posts[0].id;
	var postURL = body.response.posts[0].post_url;
	var postDate = body.response.posts[0].date;
	var postTimestamp = body.response.posts[0].timestamp;
	var postNotes = body.response.posts[0].note_count;
	var postCaption = body.response.posts[0].caption;
	//var snippet = body.response.avatar_url;
	var tumblrInfo = {
		"previewExt" : "png",
		"previewURL" : "http://40.media.tumblr.com/4c1ca0bb4a625994c737fd5e99e5c721/tumblr_nrafozZUQz1saypz5o1_1280.png",
		"networkName" : "tumblr",
		"id" : postID,
		"time" : postTimestamp,
		"author" : blogName,
		"url" : blogURL
	};
	return tumblrInfo;
}

function postToAPI(dataObj){
	var blobData = {
		"access_token" : lightAccessToken,
		"fileType" : dataObj.previewExt,
		"url" : dataObj.previewURL
	};
	var blobOptions = {
		host : "api-unstable.getlight.co",
		path : "/blobs?app_version=2.5",
		//&fileType=jpg&url=" + preview,
		headers: {
				'Content-Type': 'application/json'
				},
		method : 'POST',
		port : '443'
	};

	blobCallback = function(blobResponse){
		var blobInfo = '';
		blobResponse.on('data', function(blobChunk){
			blobInfo += blobChunk;
		});

		blobResponse.on('error', function(e){
			console.log(e);
		});

		blobResponse.on('end', function(){
			blobInfo = JSON.parse(blobInfo);
			console.log(blobInfo);
			var id = blobInfo.result;
			console.log(id);
			var momentData = {
				"access_token" : lightAccessToken,
				"overlayedBlobId" : id,
				"networkInformation" : {
					"network" : dataObj.networkName,
					"itemId" : dataObj.id,
					"createdAt" : dataObj.time,
					"userId" : dataObj.author
				}
			};
			var momentOptions ={
				host: "api-unstable.getlight.co",
				path: "/moments?app_version=2.5",
				headers: {
					'Content-Type' : 'application/json'
				},
				method: 'POST',
				port: '443'
				};
			momentCallback = function(momentResponse){
				var momentInfo = '';

				momentResponse.on('data', function(momentChunk){
					momentInfo += momentChunk;
				});

				momentResponse.on('error', function(e){
					console.log(e);
				});

				momentResponse.on('end', function(){
					console.log(momentInfo);
				});

			};

			var MomentRequest = https.request(momentOptions, momentCallback);
			MomentRequest.write(JSON.stringify(momentData));
			MomentRequest.end();

			
		});
	};



	var APIRequest = https.request(blobOptions, blobCallback);
	APIRequest.write(JSON.stringify(blobData));
	APIRequest.end();

}

function embedTweetPreview(dataObj, client){
	var params = dataObj.id;
	client.get('https://api.twitter.com/1.1/statuses/oembed.json', params, function(error, tweets, response){
		if (error) throw error;
		return '<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>' + tweets.html;
		
	});
}
function embedTumblrPreview(blogURL){
	var url = "https://www.tumblr.com/oembed/1.0?url=";
	return url + blogURL
}

function redditAPIGet(host, path, dbCallback){
	var options = {
			host : host,
			path : path
		};
		console.log(host + path);
		callback = function(response){
			var body = '';
			response.on('data', function(chunk){
				body += chunk;
			});

			response.on('error', function(e){
				dbCallback("error");
			});

			response.on('end', function(){
				body = JSON.parse(body);
				
				var redditAPI = redditData(body);
				
				if (body[0].data.children[0].data.hasOwnProperty('preview') && redditAPI.validPreviewExtension){
					//postToAPI(redditAPI);
					
					//if (sameDate(getCurrentUTCDate(), parseFloat(body[0].data.children[0].data.created_utc) *  1000 + 28800000)){
						dbCallback(redditAPI);
						//res.json({"Success":"yes", "author": redditAPI.author});
						//console.log("success");
					//}

					//else {
						dbCallback("time");
						/*res.json({"Success":"time"});
						console.log("fail");
						console.log(getCurrentUTCDate());
						console.log(parseFloat(body[0].data.children[0].data.created_utc) * 1000);
						*/
					//}
						
				}

				else {
					dbCallback("media");
				}
				
			});
		};
		var request = http.request(options, callback).end();
}
function YTAPIGet(postId, renderCallback){
	var options = {
		host : 'www.googleapis.com',
		path : '/youtube/v3/videos?part=id,statistics&id=' + postId + '&key=' + YTAPIKey
	}
	console.log("Options: " + options);
	callback = function(response){
		var json = '';
		response.on('data', function(chunk){
			json += chunk;
		});
		response.on('e', function(e){
			renderCallback(e);
		});
		response.on('end', function(){
			renderCallback(JSON.parse(json));
		})
	}
	//renderCallback('lol');
	var request = https.get(options, callback).end();
}

function twitterAPIGet(url, dbCallback){
	var client = new Twitter({
			consumer_key: twitterConsumerKey,
			consumer_secret: twitterConsumerSecret,
			access_token_key: twitterAccessKey,
			access_token_secret: twitterAccessSecret
		});

		var twitterID = getTwitterID(url);
		console.log(twitterID);

		var params = {
			id: twitterID
		};

		client.get("https://api.twitter.com/1.1/statuses/show.json", params, function(error, tweets, response){
			if(error) throw error;
			var twitterInfo = twitterData(tweets, twitterID);
			console.log(JSON.toString(twitterInfo));
			if(sameDate(getCurrentUTCDate() , parseTwitterDate(twitterInfo.time)+ 28800000)){
				console.log(twitterInfo.time);
				 
				dbCallback(twitterInfo);
			}
			else {
				dbCallback("time");
			}
		});
			//postToAPI(twitterInfo);
			/*client.get('https://api.twitter.com/1.1/statuses/oembed.json', params, function(e, tweets, previewResponse){
				if (e) throw error;
				var pre = '<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>' + String(tweets.html);
				console.log('<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>' + String(tweets.html));
				if(sameDate(getCurrentUTCDate() , parseTwitterDate(twitterInfo.createdAt)+ 28800000)){

					res.json({"Success" : "yes",
						"oembed" : '<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>' + pre,
						"author" : twitterInfo.author
				});
				}
				else {
					res.json({"Success": "time"});
				}
				//twitterInfo['preview'] = pre;
				//console.log(JSON.parse(twitterInfo));
			});*/
}
function tumblrAPIGet(host, path, dbCallback){
	callback = function(response){
			var body = '';
			response.on('data', function(chunk){
				body += chunk;
			});

			response.on('error', function(e){
				res.render('upload', {title: e});
			});

			response.on('end', function(){
				body = JSON.parse(body);
				if (body.meta.status == 200){
					var tumblrObj = tumblrData(body);
					if(sameDate(getCurrentUTCDate(), parseTwitterDate(body.response.posts[0].date) + 28800000)){
						doublie.tumblrAvatar(removeHTTP(tumblrObj.url), 50, function(ava){
							tumblrObj.snippet = ava;
							dbCallback(tumblrObj);
						});
						
					}
					else{
						dbCallback('time');
					}
					/*var oembedHost = "https://www.tumblr.com";
					var oembedPath = "/oembed/1.0?url=" + req.body.url.toString();

					var oembedTumblrOptions = {
						host: oembedHost,
						path: oembedPath
					};

					oembedTumblrCallback = function(oembedTumblrResponse){
						var oembedJSON = '';
						oembedTumblrResponse.on('data', function(oembedChunk){
							oembedJSON += oembedChunk;
						});
						oembedTumblrResponse.on('error', function(e){
							res.json({"Success": "no"});
						});	
						oembedTumblrResponse.on('end', function(){
							oembedJSON = JSON.parse(oembedJSON);
							console.log(oembedJSON);
							console.log(oembedJSON.html);
							var tumblrInfoObj = tumblrData(body);
							postToAPI(tumblrInfoObj);
							if(sameDate(getCurrentUTCDate(), parseTwitterDate(body.response.posts[0].date) + 28800000)){
								res.json({"Success":"yes",
										"oembed" : oembedJSON.html,
										"author" : tumblrInfoObj.author
								});}
							else{
								res.json({"Success": "time"});
							}
						});
					};
					var oembedTumblrRequest = https.request(oembedHost + oembedPath, oembedTumblrCallback).end();
					*/
				}
				
				else {
					dbCallback('error');
				}
				
			});
		};

		var request = http.request(host + path, callback).end();
}

module.exports = router;
