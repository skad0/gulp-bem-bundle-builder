'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const merge = require('merge2');
const thru = require('through2');
const src = require('gulp-bem-src');
const File = require('vinyl');

const isStream = require('is-stream');

var bemDeclNormalize = require('bem-decl').normalize;
var bemjsonToDeclConvert = require('bemjson-to-decl').convert;

module.exports = function(techsCb, opts) {
    // techsCb: function(): {techs: Object<name: String, {extensions: String[], transform: <Stream.Transform>}>}
    opts || (opts = {});

    // Run transformation for each bundle
    return thru.obj((data, enc, cb) => {
        // data: {bemjson: ?File, bemdecl: ?File, levels: String[], data: ?Object}
        // data: {bemjson: ?String|File, bemdecl: ?String|File, levels: String[], data: ?Object}
        // bundle: {src: function({tech}): Stream<Vinyl>, path: function(): String}
        var bundle = new Bundle(data);
        var techs = techsCb(bundle, opts);

        /*
        builder(bundle => {
            let i18n = compileI18n();
            let js = i18n().pipe(concat()).pipe(babel());
            let css = stylus().pipe(postcss());

            return { js, css, html };
        });
         */

        let _techs = Object.keys(techs).map(name => {
            let tech = techs[name];
            return isStream(tech) ? tech :
                src({
                    decl: bundle.decl(),
                    tech: name,
                    extensions: tech.extensions,
                    levels: data.levels,
                    config: opts.config
                })
                .pipe(tech.transform);
        });

        merge.apply(null, _techs)
            .on('data', obj => cb(null, obj))
            .on('error', cb)
            .on('end', cb);
    });
};

const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

/**
 * @param {{bemjson: ?File, bemdecl: ?File, levels: String[], data: ?Object}} data
 */
function Bundle(data) {
    let hasBemdecl = hasOwn(data, 'bemdecl');
    let hasBemjson = hasOwn(data, 'bemjson');
    hasBemjson && assert(File.isVinyl(data.bemjson), 'Invalid bemjson: should be a Vinyl file');
    hasBemdecl && assert(File.isVinyl(data.bemdecl), 'Invalid bemdecl: should be a Vinyl file');

    let target = data.bemjson || data.bemdecl;
    assert(target, 'Something should be passed');

    this._bemjson = data.bemjson;
    this._bemdecl = data.bemdecl;

    // todo:
    hasBemjson && (!data.bemjson.contents) && (this._bemjson.contents = new Buffer(fs.readFileSync(this._bemjson.path)));
    hasBemdecl && (!data.bemdecl.contents) && (this._bemdecl.contents = new Buffer(fs.readFileSync(this._bemdecl.path)));
    hasBemjson && (this._bemjson.data = _eval(data.bemjson.contents + ''));
    hasBemdecl && (this._bemdecl.data = _eval(data.bemdecl.contents + ''));
debugger;
    this._decl = hasBemdecl && this._bemdecl.data || bemjsonToDeclConvert(this._bemjson.data);

    this._path = data.path || path.dirname(target.path);

    this._levels = [].concat(data.levels);
}

Bundle.prototype.src = function(req) {
    return src({
        tech: req.tech,
        levels: req.levels,
    });
};

Bundle.prototype.path = function() {
    return this._path;
};

var contentStream = require('contentstream');
Bundle.prototype.bemjson = function() {
    return contentStream(this._bemjson);
};

var vm = require('vm');
function _eval(content) {
    var module = {exports: {}};
    var res = eval(content);
    return res || module.exports;
}

Bundle.prototype.decl = function() {
    return this._decl;
};
