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

  var users = app.get('db').collection('user');

  return {
    create: function (req, res) {
      var user = validateKeys(req.body, Object.keys(UserSchema.properties));
      var errors = v.validate(user, UserSchema).errors;
      if (errors.length > 0) {
        return res.json(200, {errors: errors});
      }
      encrypt(user.password, function (e, hash) {
        if (e) {
          logError(e);
          return res.json(500);
        }
        user.password = hash;
        users.insert(user, function (e) {
          if (e) {
            logError(e);
            res.json(500);
          }
          delete user.password;
          req.session.user = user;
          return res.json(200, {user: user});
        });
      });
    },
    login: function (req, res) {
      credentials = req.body;
      if (req.param('username') === undefined || req.param('password') === undefined) {
        return res.json(400, {errors: ['Missing email and/or password']});
      }
      encrypt(credentials.password, function (e, hash) {
        credentials.password = hash;
        users.findOne(credentials, {password: 0}, function (e, user) {
          if (e) {
            logError(e);
            return res.json(500);
          }
          if (user) {
            req.session.user = user;
            res.json(200, {user: user});
          }
          res.json(404, {errors: ['Wrong username/password']});
        });
      });
    },
    logout: function (req, res) {
      delete req.session.user;
      req.session.destroy();
      res.json(200);
    }
  };
};
