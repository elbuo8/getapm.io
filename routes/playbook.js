
var Auth = require('./../helpers').Auth;

module.exports = function (app) {
  var controller = require('./../controllers/playbook.js')(app);

  app.post('/playbook', controller.savePlaybook);
  app.put('/playbook', controller.savePlaybook);
  app.get('/playbook/:name', controller.getPlaybook);


  app.get('/playbook/download/:name/version?/:version', controller.downloadPlaybook);
  //app.post('/playbook/search/:query', controller.searchPlaybook);
};