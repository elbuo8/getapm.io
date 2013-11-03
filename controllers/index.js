
module.exports = function (app) {
  return {
    home: function (req, res) {
      res.render('home');
    }
  };
};