var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var doublie = require('../functions/doublie');

router.get('/', function(req, res, next){
	res.json({"response" : "no information"});
});

router.post('/', function(req, res, next){

	var ip = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
     console.log(ip);
    var postID = req.body.id;
    doublie.likePost(ip, postID, function(data){
    	console.log('data response: ' + data);
    	res.json({"success" : data});
    });

     
     
});

module.exports = router;