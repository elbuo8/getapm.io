var async = require('async');

module.exports = function (app) {

  var userModel = require('../models/user.js')(app);

  return {
    create: function (req, res) {
      var user = userModel.sanitize(req.body);
      var errors = userModel.validate(user);
      if (errors.length > 0) {
        return res.json(400, {errors: errors});
      }
      req.checkBody('email', 'valid email is required').isEmail();
      errors = req.validationErrors(true);
      if (errors.length > 0) {
        return res.json(400, {errors: errors});
      }
      async.parallel({
        username: function (cb) {
          userModel.findUserByUsername(user.username, function (e, user) {
            return cb(e, user);
          });
        },
        email: function (cb) {
          userModel.findUserByEmail(user.email, function (e, user) {
            return cb(e, user);
          });
        }
      }, function (e, exists) {
        if (e) {
          res.json(500);
        }
        var errors = [];
        if (exists.username) {
          errors.push('Username already in use');
        }
        if (exists.email) {
          errors.push('Email already in use');
        }
        if (errors.length > 0) {
          return res.json(400, {errors: errors});
        }
        userModel.createUser(user, function (e, user) {
          if (e) {
            return res.json(500);
          }
          req.session.user = user;
          return res.json(200, {user: user});
        });
      });
    },
    login: function (req, res) {
      var credentials = req.body;
      if (req.param('username') === undefined || req.param('password') === undefined) {
        return res.json(400, {errors: ['Missing email and/or password']});
      }
      userModel.authUser(credentials, function (e, user) {
        if (e) {
          return res.json(500);
        }
        if (user) {
          req.session.user = user;
          return res.json(200, {user: user});
        }
        return res.json(404, {errors: ['Wrong username/password']});
      });
    },
    logout: function (req, res) {
      delete req.session.user;
      req.session.destroy();
      return res.json(200);
    }
  };
};
