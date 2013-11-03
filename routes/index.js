
module.exports = function (app) {
  var controller = require('./../controllers/index.js')(app);

  app.get('/', controller.home);
};