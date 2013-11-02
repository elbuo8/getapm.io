var dotenv = require('dotenv')(), cluster = require('cluster');
dotenv.load();
require('strong-agent').profile(process.env.SLOPSKEY, process.env.APPNAME);

if (cluster.isMaster) {
  // Fork workers.
  var i = 0;
  for (i; i < require('os').cpus().length; i++) {
    cluster.fork();
  }

  cluster.on('exit', function (worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {
  require('./app.js');
}