var semver = require('semver');

module.exports = function (app) {

  var userModel = require('../models/user.js')(app);
  var playbookModel = require('../models/playbook.js')(app);

  return {
    savePlaybook: function (req, res) {
      if (req.param('username') === undefined || req.param('password') === undefined) {
        return res.json(400, {errors: ['Missing username and/or password']});
      }
      if (req.files === undefined || req.files.playbook === undefined) {
        return res.json(400, {errors: ['Missing playbook']});
      }
      var playbook = playbookModel.sanitize(req.body);
      var errors = playbookModel.validate(playbook);
      if (errors.length > 0) {
        return res.json(400, {errors: errors});
      }
      if(semver.valid(req.param('version')) === null) {
        return res.json(400, {errors: ['Invalid version format']});
      }
      var credentials = {
        username: req.param('username'),
        password: req.param('password')
      };
      userModel.authUser(credentials, function (e, user) {
        if (e) {
          return res.json(500);
        }
        if (!user) {
          return res.json(404, {errors: ['No user found']});
        }
        playbookModel.findPlaybookByName(playbook.name, function (e, existingPlay) {
          if (e) {
            return res.json(500);
          }

          if (existingPlay && existingPlay.versions !== undefined) {
            var currentVersion = existingPlay.versions[existingPlay.versions.length - 1].version;
            if (semver.gt(currentVersion, playbook.version)) {
              return res.json(401, {errors: ['Version needs to be higher than:' + currentVersion]});
            }
          }
          if (existingPlay && existingPlay.author !== playbook.author) {
            return res.json(401, {errors: ['You don\'t manage this playbook']});
          }
          playbookModel.newPlaybookFile(playbook.name, playbook.version, req.files.playbook.path, function (e, file) {
            if (e) {
              return res.json(401, {errors: ['Duplicate playbook']});
            }
            var version = {
              _id: file._id,
              version: playbook.version
            };
            delete playbook.version;
            playbookModel.newPlaybook(playbook, version, function (e) {
              if (e) {
                return res.json(500);
              }
              if (user.playbooks.indexOf(playbook.name) === -1) {
                userModel.addPlaybook(user._id, playbook.name, function (e) {
                  if (e) {
                    return res.json(500);
                  }
                  return res.json(200);
                });
              }
              return res.json(200);
            });
          });
        });
      });
    },
    getPlaybook: function (req, res) {
      if (req.param('name') === undefined) {
        return res.json(400, {errors: ['No name specified']});
      }
      playbookModel.findPlaybookByName(req.param('name'), function (e, playbook) {
        if (e) {
          return res.json(500);
        }
        if (playbook) {
          return res.json(200, playbook);
        }
        return res.json(404, {errors: ['No such playbook']});
      });
    },
    downloadPlaybook: function (req, res) {
      if (req.param('name') === undefined) {
        return res.json(400, {errors: ['No name specified']});
      }
      playbookModel.findPlaybookByName(req.param('name'), function (e, playbook) {
        if (e) {
          return res.json(500);
        }
        if (!playbook) {
          return res.json(404, {errors: ['No such playbook']});
        }
        var _id = playbook.versions[playbook.versions.length - 1]._id;
        if (req.param('version') !== undefined) {
          for (var i = 0; i < playbook.versions.length; i++) {
            if (playbook.versions[i].version === req.param('version')) {
              _id = playbook.versions[i]._id;
              break;
            }
          }
        }
        return playbookModel.playbookDownload(_id).pipe(res);
      });
    },
    searchPlaybooks: function (req, res) {
      playbookModel.searchPlaybooks(req.param('query'), function (e, playbooks) {
        if (e) {
          logError(e);
          return res.json(500);
        }
        return res.json(200, playbooks);
      });
    }
  };
};