

module.exports.Auth = function (req, res, next) {
  if (req.session.user) {
    next();
  }
  res.json({status: 400, errors: 'Not authenticated'});
};