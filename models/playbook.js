var v = new (require('jsonschema').Validator)();
var Grid = require('gridfs-stream');
var fs = require('fs');
var mongodb = require('mongodb');

module.exports = function (app) {

  var helpers = require('../helpers')(app);

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
  var gfs = Grid(app.get('db'), mongodb);

  return {
    collection: playbooks,
    sanitize: function (keys) {
      return helpers.validateKeys(keys, Object.keys(PlaybookSchema.properties));
    },
    validate: function (playbook) {
      return v.validate(playbook, PlaybookSchema).errors;
    },
    findPlaybookByName: function (name, cb) {
      playbooks.findOne({name: name}, function (e, playbook) {
        if (e) {
          helpers.logError(e);
        }
        return cb(e, playbook);
      });
    },
    newPlaybookFile: function (name, version, tarfile, cb) {
      var writeStream = gfs.createWriteStream({filename: name + '@' + version});
      var readStream = fs.createReadStream(tarfile);
      readStream.pipe(writeStream);
      writeStream.on('error', function (e) {
        helpers.logError(e);
        return cb(e, null);
      });
      writeStream.on('close', function (file) {
        return cb(null, file);
      });
    },
    newPlaybook: function (playbook, version, cb) {
      playbooks.update({name: playbook.name}, {$push: {versions: version}, $set: playbook}, {upsert: true}, function (e) {
        if (e) {
          helpers.logError(e);
        }
        return cb(e);
      });
    },
    playbookDownload: function (_id) {
      return gfs.createReadStream({_id: _id});
    },
    findLastPlaybookVersion: function (name, cb) {
      playbooks.findOne({name: name}, {versions: {$slice: -1}}, function (e, version) {
        if (e) {
          helpers.logError(e);
        }
        return cb(e, version);
      });
    },
    searchPlaybooks: function (query, cb) {
      query = new RegExp(query);
      playbooks.find({$or: [{name: query}, {description: query}]}, {versions: 0}).toArray(function (e, results) {
        if (e) {
          helpers.logError(e);
        }
        return cb(e, results);
      });
    }
  };
};