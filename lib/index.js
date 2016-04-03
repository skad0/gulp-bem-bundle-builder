'use strict';

const merge = require('merge2');
const thru = require('through2');
const src = require('gulp-bem-src');

module.exports = function(opts) {
    // opts: function(): {techs: Object<name: String, {extensions: String[], transform: <Stream.Transform>}>}

    // Run transformation for each bundle
    return thru.obj((data, enc, cb) => {
        // data: {bemjson: ?String|File, bemdecl: ?String|File, levels: String[], data: ?Object}
        var conf = opts(bundle);

        var _techs = conf.techs.map(tech, name => {
            return src(Object.assign({tech: name, extensions: tech.extensions}, data))
                .pipe(tech.transform);
        });

        merge.apply(null, _techs)
            .on('data', obj => cb(null, obj))
            .on('error', cb)
            .on('end', cb);
    });
};
