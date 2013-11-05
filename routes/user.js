

module.exports = function (app) {
  var controller = require('./../controllers/user.js')(app);

  //Rest this shit
  app.post('/user', controller.create);


  app.post('/user/login', controller.login);
  app.get('/user/logout', controller.logout);
};