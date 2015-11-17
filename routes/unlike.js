var express = require('express');
var router = express.Router();
var doublie = require('../functions/doublie');
var mysql = require('mysql');

router.get('/', function(req, res, next){
	res.json({'unauthorized' : 'true'});
});

router.post('/', function(req, res, next){
	var ip = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
    var postID = req.body.id;
    doublie.unlikePost(ip, postID, function(data){
    	console.log('post unliked');
    	res.json({"success" : "unliked"});

    });
});

module.exports = router;