var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var doublie = require('../functions/doublie');

router.get('/', function(req, res, next){
	var connection = mysql.createConnection({
		host: 'memehunt.cmdahnuhfmvm.us-west-2.rds.amazonaws.com',
		user: 'memehunt',
		password: '4zwpFhGbE7WTH2jwa3',
		database: 'memehunt',
		port: 3306
	});
	var ip = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
    connection.connect();
	var today = doublie.getCurrentUTCDate()/1000;
	console.log(today);
	var yesterday = today - 86400;
	console.log(yesterday);
	var todayposts = [];
	var querystring = "SELECT * FROM posts";
	connection.query(querystring, function(err, rows, fields){
		if (err) throw err;
		console.log('check');
		var likeString = "select * from likes;";
		//console.log("rows #1: " + JSON.stringify(rows));
		connection.query(likeString, function(err, row, fields){
			console.log("second query");
			console.log("ERR: " + err);
			console.log("ROWS" + JSON.stringify(row));
			//if(err) throw err;
			
			for (var test = 0; test < rows.length; test++){
				rows[test].likes = 0;
			}
			for (var post = 0; post < rows.length; post++){
				for(var liked = 0; liked < row.length; liked++){
					if (rows[post].url == row[liked].postid){
						if(rows[post].hasOwnProperty('likes')){
							rows[post].likes = parseFloat(rows[post].likes) + 1;
							console.log('post likes: ' + rows[post].likes);
						}
						else{
							rows[post].likes = 1;
						}	
					}
				}
			}
			var swapped;
			do {
				swapped = false;
				for(var n = 0; n < rows.length -1; n++){
					if (rows[n].likes < rows[n+1].likes){
						var temp = rows[n];
						rows[n] = rows[n+1];
						rows[n+1] = temp;
						swapped = true;
					}
				} 
			} while(swapped);
			
			//console.log("prints rows: " + rows[1].id);
			doublie.checkIfLiked(ip, function(data){
				
				for(var i in rows){
					//console.log(data);
					if (data.indexOf(rows[i].url) == -1){

						rows[i].liked = false;
						todayposts.push(rows[i]);
						//console.log('not liked: ' + rows[i].id);
					}
					else{
						rows[i].liked = true;
						todayposts.push(rows[i]);
						//console.log('liked: ' + rows[i].id);
					}
					//console.log(rows[i].url);
				}
				res.render('index', {'todayposts' : todayposts});
			});
		});
		
	connection.end();
		
		/*var yesterdaystring = "SELECT * FROM posts WHERE time<" + parseFloat(today)+ " AND time>" + parseFloat(yesterday)+ ";";
		connection.query(yesterdaystring, function(err, rows, fields){
			if(err) throw err;
			var yesterdayposts =[];
			for (var k in rows){
				yesterdayposts.push(rows[k]);
			}
			res.render('doublie/index', {'todayposts' : todayposts, 'yesterdayposts' : yesterdayposts});
			connection.end();
		})*/
		
	});
	//console.log('test');
	//console.log(today);
	
	
	
	
});

module.exports = router;