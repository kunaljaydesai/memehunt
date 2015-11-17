var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');


var doublieUpload = require('./routes/upload');
var doublieOembed = require('./routes/oembed');

var doublieThumbnail = require('./routes/thumbnail');
var doublieIndex = require('./routes/index');
var doublieLike = require('./routes/like');
var doublieUnlike = require('./routes/unlike');
var doublieRank = require('./routes/rank');
var doubliePageCreation = require('./routes/pageCreation');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/upload', doublieUpload);
app.use('/oembed', doublieOembed);
app.use('/rank', doublieRank);
app.use('/thumbnail', doublieThumbnail);
app.use('/index', doublieIndex);
app.use('/like', doublieLike);
app.use('/unlike', doublieUnlike);
app.use('/pageCreation', doubliePageCreation);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
