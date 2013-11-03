var v = new (require('jsonschema').Validator)();
var bcrypt = require('bcrypt');

module.exports = function (app) {

  var UserSchema = {
    id: '/UserSchema',
    type: 'object',
    properties: {
      username: {type: 'string', required: true},
      password: {type: 'string', required: true},
      email: {type: 'string', required: true},
      playbooks: {type: 'array', items: {
        type: 'object',
        properties: {
          name: {type: 'string'}
        }
      }}
    }
  };

  var logError = function (e) {
    app.get('logger').error(e);
  };

  return {
    create: function (req, res) {
      var user = validateKeys(req.body, Object.keys(UserSchema.properties));
      var errors = v.validate(user, UserSchema).errors;
      if (errors.length > 0) {
        res.json({status: 200, errors: errors});
      }
      encrypt(user.password, function (e, hash) {
        if (e) {
          logError(e);
          res.json({status: 500});
        }
        user.password = hash;
        app.get('db').collection('user', function (e, collection) {
          if (e) {
            logError(e);
            res.json({status: 500});
          }
          collection.insert(user, function (e) {
            if (e) {
              logError(e);
              res.json({status: 500});
            }
            delete user.password;
            req.session.user = user;
            res.json({status: 200});
          });
        });
      });
    },
    login: function (req, res) {
      credentials = req.body;
      if (!credentials.hasOwnProperty('username') || !credentials.hasOwnProperty('password')) {
        res.json({status: 400, errors: 'Missing email and/or password'});
      }
      encrypt(credentials.password, function (e, hash) {
        credentials.password = hash;
        app.get('db').collection('user', function (e, collection) {
          if (e) {
            logError(e);
            res.json({status: 500});
          }
          collection.findOne(credentials, {password: 0}, function (e, user) {
            if (e) {
              logError(e);
              res.json({status: 500});
            }
            if (user) {
              req.session.user = user;
              res.json({status: 200});
            }
            res.json({status: 400, errors: 'Wrong username/password'});
          });
        });
      });
    },
    logout: function (req, res) {
      delete req.session.user;
      req.session.destroy();
      res.json({status: 200});
    }
  };
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

