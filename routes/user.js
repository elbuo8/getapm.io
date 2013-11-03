

module.exports = function (app) {
  var controller = require('./../controllers/user.js')(app);

  app.post('/user/create', controller.create);
  app.post('/user/login', controller.login);
  //app.get('/logout')
};