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
      helpers.encrypt(credentials.password, function (e, hash) {
        if (e) {
          helpers.logError(e);
          return cb(e, null);
        }
        credentials.password = hash;
        users.findOne(credentials, {password: 0}, function (e, user) {
          if (e) {
            helpers.logError(e);
          }
          return cb(e, user);
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
    }
  };

};