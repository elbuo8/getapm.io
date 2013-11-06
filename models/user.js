'use strict';
var v = new (require('jsonschema').Validator)();

module.exports = function (app) {

  var helpers = require('../helpers')(app);

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

  var users = app.get('db').collection('user');

  return {
    collection: users,
    sanitize: function (keys) {
      return helpers.validateKeys(keys, Object.keys(UserSchema.properties));
    },
    validate: function (user) {
      return v.validate(user, UserSchema).errors;
    },
    createUser: function (user, cb) {
      helpers.encrypt(user.password, function (e, hash) {
        if (e) {
          helpers.logError(e);
          return cb(e, null);
        }
        user.password = hash;
        users.insert(user, function (e) {
          if (e) {
            helpers.logError(e);
            return cb(e, null);
          }
          delete user.password;
          cb(null, user);
        });
      });
    },
    authUser: function (credentials, cb) {
      users.findOne({username: credentials.username}, function (e, user) {
        if (e) {
          helpers.logError(e);
        }
        helpers.compare(credentials.password, user.password, function (e, isAuth) {
          if (e) {
            helpers.logError(e);
          }
          if (isAuth) {
            return cb(e, user);
          }
          return cb(e, null);
        });
      });
    },
    addPlaybook: function (_id, name, cb) {
      users.update({_id: _id}, {$addToSet: {playbooks: name}}, function (e) {
        if (e) {
          helpers.logError(e);
        }
        return cb(e);
      });
    },
    findUserByUsername: function (username, cb) {
      users.findOne({username: username}, function (e, user) {
        if (e) {
          helpers.logError(e);
        }
        return cb(e, user);
      });
    },
    findUserByEmail: function (email, cb) {
      users.findOne({email: email}, function (e, user) {
        if (e) {
          helpers.logError(e);
        }
        return cb(e, user);
      });
    }
  };

};