/**
 * Created by pooya on 5/15/18.
 */

/**
 * ------------------------------------------------------------
 * Node module
 * ------------------------------------------------------------
 */

const Fs      = require('fs');
const Path    = require('path');
const Async   = require('async');
const Execute = require('child_process').exec;

/**
 * ------------------------------------------------------------
 * Library module
 * ------------------------------------------------------------
 */

const PackageInfo = require('../package');

/**
 * ------------------------------------------------------------
 * Global variable
 * ------------------------------------------------------------
 */

const FILE_NAME      = Path.basename(__filename);
const FILE_ROOT_PATH = __filename.split('/').reverse()[1];
const ROOT_PATH      = process.argv[1].split('/').reverse().map((v) => v !== FILE_NAME && v !== FILE_ROOT_PATH ? v : '').reverse().join('/').slice(0, -2);

/**
 * ------------------------------------------------------------
 * Code structure
 * ------------------------------------------------------------
 */

const NODE_ENV = process.env.NODE_ENV || 'default';

Async.waterfall([

    // Delete error file before execute
    (callback) => Async.every([
        `./storage/temp/init_error.log`,
        `./storage/temp/update_error.log`
    ], (file, callback) => Fs.unlink(file, callback), () => callback(null)),

    // Check update is exist
    (callback) => Async.parallel({
        // Read update file on find environment value and split base on ":"
        updated: (callback) => Fs.readFile(`./storage/temp/update`, 'utf8', (error, data) =>
            error ?
                Fs.writeFile(`./storage/temp/update`, '', (error) => callback(error)) :
                callback(null, data.split('\n').filter((v) => v.match(new RegExp(`${NODE_ENV}:v.+`))).map((v) => v.split(':')))),

        // Read update dir and find file like semantic version
        update: (callback) => Fs.readdir('./storage/update', (error, data) =>
            error ?
                callback(error) :
                callback(null, data.filter((v) => v.match(/^v[0-9]+\.[0-9]+\.[0-9]+/))))
    }, (error, data) => {
        if (error)
            return callback(error);

        let updateList;

        if (data.updated.length) {
            let map = {};

            // Convert current version to x * 10 ^ 2 + y * 10 ^ 1 + z * 10 ^ 0
            let currentVersion = PackageInfo.version.split('.').reverse().map((v, i) => Number(v) * Math.pow(10, i)).reverse().reduce((n, m) => n + m);
            // Convert array of updated version version to x * 10 ^ 2 + y * 10 ^ 1 + z * 10 ^ 0
            let updated = data.updated.map((v) => {
                let version = v[1].substr(1).split('.').reverse().map((v, i) => Number(v) * Math.pow(10, i)).reverse().reduce((n, m) => n + m);
                map[version] = v;

                return version;
            }).sort();
            // Convert queue of update version to x * 10 ^ 2 + y * 10 ^ 1 + z * 10 ^ 0
            let update = data.update.map((v) => {
                let version = v.substr(1).slice(0, -3).split('.').reverse().map((v, i) => Number(v) * Math.pow(10, i)).reverse().reduce((n, m) => n + m);
                map[version] = v;

                return version;
            }).filter((v) => v <= currentVersion).sort();

            updateList = update.filter((v) => !updated.includes(v)).map((v) => map[v].slice(0, -3));

            if (!updateList.length)
                return callback(null);
        } else
            updateList = data.update.map((v) => v.slice(0, -3));

        // Run every update code
        Async.everySeries(updateList, (version, callback) => Execute(`NODE_ENV=${NODE_ENV} node ${ROOT_PATH}/storage/update/${version}.js`, (stderr) =>
                stderr ?
                    callback(stderr) : Fs.appendFile(`./storage/temp/update`, `${NODE_ENV}:${version}\n`, 'utf8', (error) => callback(error, !error))),
            (error) => callback(error));
    })

], (error) => {
    if (error) {
        if (error.hasOwnProperty('cmd')) {
            let [, ...errors] = error.message.toString().split('\n');

            if (error.cmd.match('init.js')) {
                try {
                    Fs.writeFileSync('./storage/temp/init_error.log', errors.join('\n'));
                } catch (e) {
                }

                process.stderr.write('Have error in process update!');
            }

            if (error.cmd.match('/update/')) {
                try {
                    Fs.writeFileSync('./storage/temp/update_error.log', errors.join('\n'));
                } catch (e) {
                }

                process.stderr.write('Have error in process update!');
            }
        }
        else
            process.stderr.write(error.message.toString());

        process.stderr.write('\n');
        process.exit(1);
    }

    process.exit();
});