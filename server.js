var dotenv = require('dotenv')(),
  cluster = require('cluster'),
  control = require('strong-cluster-control');
dotenv.load();
require('strong-agent').profile(process.env.SLOPSKEY, process.env.APPNAME);

control.start({
  size: control.CPUS
});

if (cluster.isWorker) {
  require('./app.js');
}