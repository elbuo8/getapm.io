var v = new (require('jsonschema').Validator)();
var Grid = require('gridfs-stream');
var fs = require('fs');
var mongodb = require('mongodb');
var bcrypt = require('bcrypt');


module.exports = function (app) {

  var gfs = Grid(app.get('db'), mongodb);

  var PlaybookSchema = {
    id: '/PlaybookSchema',
    type: 'object',
    properties: {
      name: {type: 'string', required: true},
      author: {type: 'string', required: true},
      description: {type: 'string', required: true},
      git: {type: 'string'},
      version: {type: 'string', required: true}
    }
  };

  var playbooks = app.get('db').collection('playbook');
  var users = app.get('db').collection('user');

  var logError = function (e) {
    app.get('logger').error(e);
  };

  var validateKeys = function (instance, keys) {
    var validInstance = {};
    for (var i = 0; i < keys.length; i++) {
      if (instance.hasOwnProperty(keys[i])) {
        validInstance[keys[i]] = instance[keys[i]];
      }
    }
    return validInstance;
  };

  var encrypt = function (password, cb) {
    bcrypt.hash(password, 10, function (e, hash) {
      cb(e, hash);
    });
  };


  return {
    savePlaybook: function (req, res) {
      if (req.param('username') === undefined || req.param('password') === undefined) {
        return res.json(400, {errors: ['Missing email and/or password']});
      }
      var credentials = {
        username: req.param('username'),
        password: req.param('password')
      };
      encrypt(credentials.password, function (e, hash) {
        if (e) {
          logError(e);
          return res.json(500);
        }
        credentials.password = hash;
        users.findOne(credentials, function (e, user) {
          if (e) {
            logError(e);
            return res.json(500);
          }
          if (!user) {
            return res.json(404, {errors: ['No user found']});
          }
          var playbook = validateKeys(req.body, Object.keys(PlaybookSchema.properties));
          var errors = v.validate(playbook, PlaybookSchema).errors;
          if (errors.length > 0) {
            return res.json(400, {errors: errors});
          }
          if (req.files === undefined || req.files.playbook === undefined) {
            return res.json(400, {errors: 'Missing playbook'});
          }
          playbooks.findOne({name: playbook.name}, function (e, existingPlay) {
            if (e) {
              logError(e);
              return res.json(500);
            }
            if (existingPlay && existingPlay.author !== playbook.author) {
              return res.json(401, {errors: ['You don\'t manage this playbook']});
            }
            var version = {version: playbook.version, _id: new mongodb.ObjectID()};
            delete playbook.version;
            var writeStream = gfs.createWriteStream({filename: playbook.name + '@' + version.version});
            var readStream = fs.createReadStream(req.files.playbook.path);
            readStream.pipe(writeStream);
            writeStream.on('error',  function (e) {
              logError(e);
              return res.json(401, {errors: ['Duplicate playbook']});
            });
            writeStream.on('close', function (file) {
              playbooks.update(playbook, {$push: {versions: version}}, {upsert: true}, function (e) {
                if (e) {
                  logError(e);
                  return res.json(500, {errors: ['Please contact admin']});
                }
                users.update({_id: user._id}, {$addToSet: {playbooks: playbook.name}}, function (e) {
                  if (e) {
                    logError(e);
                    return res.json(500, {errors: ['Please contact admin']});
                  }
                  return res.json(201);
                });
              });
            });
          });
        });
      });
    },
    getPlaybook: function (req, res) {
      playbooks.findOne({name: req.param('name')}, function (e, playbook) {
        if (e) {
          logError(e);
          return res.json(500);
        }
        if (playbook) {
          return res.json(200, playbook);
        }
        return res.json(404, {errors: ['No such playbook']});
      });
    },
    downloadPlaybook: function (req, res) {
      playbooks.findOne({name: req.param('name')}, {versions: 1}, function (e, playbook) {
        if (e) {
          logError(e);
          return res.json({status: 500});
        }
        if (!playbook) {
          return res.json({status: 404, errors: ['No such playbook']});
        }
        var _id = playbook.versions[0]._id;
        if (req.param('version') !== undefined) {
          for (var i = 0; i < playbook.versions.length; i++) {
            if (playbook.versions[i].version === req.param('version')) {
              _id = playbook.versions[i]._id;
              break;
            }
          }
        }
        gfs.createReadStream({_id: _id}).pipe(res);
      });
    },
    searchPlaybook: function (req, res) {
      //this method NEEDS A SHIT TON OF WORK.
      playbooks.find(req.body, function (e, playbooks) {
        if (e) {
          logError(e);
          return res.json(500);
        }
        return res.json(200, playbooks);
      });
    }
  };
};