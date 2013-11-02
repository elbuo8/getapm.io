
/**
 * Module dependencies.
 */

var express = require('express'),
  routes = require('./routes'),
  http = require('http'),
  path = require('path'),
  app = express(),
  RedisStore = require('connect-redis')(express),
  logger = require('bunyan').createLogger({name: process.env.APPNAME});

app.configure(function () {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view cache');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.compress());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: process.env.SECRET,
    store: new RedisStore({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    })
  }));
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));

  // Logger
  app.set('logger', logger);
});

app.configure('development', function () {
  app.use(express.errorHandler());
});

//Make the db available in the app
require('mongodb').MongoClient.connect(process.env.MONGODB_URL,
  {db: {native_parser: true}}, function (e, db) {
    if (e) {
      logger.error(e, 'Failed to connect to db, exiting');
      process.exit();
    }
    app.set('db', db);
    // Initialize router
    require('fs').readdirSync(__dirname + '/routes').forEach(function (file) {
      logger.info('Initializing: ', file);
      require(__dirname + '/routes/' + file)(app);
    });
  });

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
