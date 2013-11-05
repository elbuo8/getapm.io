var bcrypt = require('bcrypt');

module.exports = function(app) {
  return {
    logError: function (e) {
      app.get('logger').error(e);
    }
  };
};

exports.Auth = function (req, res, next) {
  if (req.session.user) {
    next();
  }
  res.json({status: 401, errors: 'Not authenticated'});
};

exports.encrypt = function (password, cb) {
  bcrypt.hash(password, 10, function (e, hash) {
    return cb(e, hash);
  });
};

exports.validateKeys = function (instance, keys) {
  var validInstance = {};
  for (var i = 0; i < keys.length; i++) {
    if (instance.hasOwnProperty(keys[i])) {
      validInstance[keys[i]] = instance[keys[i]];
    }
  }
  return validInstance;
};