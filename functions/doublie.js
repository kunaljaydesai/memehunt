var http = require('http');
var mysql = require('mysql');

exports.getCurrentUTCDate = function(){
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

exports.tumblrAvatar = function(blogName, size, avaCallback){
	var url = 'http://api.tumblr.com/v2/blog/' + blogName + 'avatar/' + size;
	var data = '';
	console.log(url);
	callback = function(response){
		response.on('data', function(chunk){
			data += chunk;
		});
		response.on('error', function(e){
			avaCallback("error");
		});
		response.on('end', function(){
			console.log(data);
			data = JSON.parse(data);
			console.log(data.response.avatar_url);
			console.log(String(data.response.avatar_url));
			avaCallback(String(data.response.avatar_url));
		})
	}
	var request = http.request(url, callback).end();
}

/*exports.likePost = function(ip, postid, callback){
	console.log('like Post started');
	var ipAddress = ip;
	var postID = postid;
	checkIfLiked(ipAddress, postID, function(connection, data){
		if (data > 0){
			callback("error");
		}
		else {
			var likeQuery = "INSERT INTO likes (ip, postid) VALUES('" + ip + "', '" + postid + "');";
			connection.query(likeQuery, function(err, rows, fields){
				if(err) throw err;
				callback("liked");
				connection.end();
			});
		}
	});
	
	
}*/

exports.likePost = function(ip, postid, callback){
	console.log('attempted connection')
	var connection = mysql.createConnection({
		host : 'memehunt.cmdahnuhfmvm.us-west-2.rds.amazonaws.com',
		user : 'memehunt',
		password : '4zwpFhGbE7WTH2jwa3',
		port : 3306,
		database : 'memehunt'
	});
	connection.connect();
	console.log('database connected');
	var checkQuery = "SELECT * FROM likes WHERE ip='" + ip.toString() + "' AND postid=" + postid + ";";
	console.log("CHECK QUERY: " + checkQuery);
	connection.query(checkQuery, function(err, result){
		console.log(result);
		//console.log(result.length);
		if (typeof result == 'undefined'){
			var likeQuery = "INSERT INTO likes (ip, postid) VALUES('" + ip + "', '" + postid + "');";
			connection.query(likeQuery, function(err, rows, fields){
				if(err) throw err;
				callback("liked");
				connection.end();
			});
		}
		else{
			callback('error');
		}
	});
}

exports.checkIfLiked = function(ip, callback){
	var connection = mysql.createConnection({
		host : 'memehunt.cmdahnuhfmvm.us-west-2.rds.amazonaws.com',
		user : 'memehunt',
		password : '4zwpFhGbE7WTH2jwa3',
		port : 3306,
		database : 'memehunt'
	});
	connection.connect();
	var checkQuery = "SELECT postid FROM likes WHERE ip='" + ip.toString() + "';";
	connection.query(checkQuery, function(err, rows, fields){
		var array = [];
		for (var i in rows){
			array.push(rows[i].postid);
		}
		callback(array);
		connection.end();
	});
	
}

exports.unlikePost = function(ip, postid, callback){
	var connection = mysql.createConnection({
		host : 'memehunt.cmdahnuhfmvm.us-west-2.rds.amazonaws.com',
		user : 'memehunt',
		password : '4zwpFhGbE7WTH2jwa3',
		port : 3306,
		database : 'memehunt'
	});
	connection.connect();
	var unlikeQuery = "DELETE FROM likes WHERE ip='" + ip.toString() + "' AND postid='" + postid.toString() + "';";
	connection.query(unlikeQuery, function(err, rows, fields){
		if(err) throw err;
		callback(rows);
		connection.end();
	});
}