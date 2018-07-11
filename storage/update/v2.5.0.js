const Fs = require('fs');
const Pg = require('pg');
const Async = require('async');

Fs.readFile('./config', 'utf8', function (error, data) {
    if (error) {
        process.stderr.write(error.message.toString());
        process.stderr.write('\n');
        process.exit(1);
    }

    let config = {};
    data.split('\n').filter((v) => v.match(/^\s*[^/].+:/)).forEach((v) => config[v.split(':')[0].trim()] = v.split(/:(.+)/)[1].trim());

    const Client = new Pg.Client({connectionString: config.database});

    Async.series([
        (callback) => Client.connect(callback),
        (callback) => Client.query('BEGIN', callback),
        (callback) => Client.query('SAVEPOINT "update_v2.5.0"', callback),
        (callback) => Client.query(`ALTER TABLE cdl_settings DROP isconst`, callback),
        (callback) => Client.query(`INSERT INTO cdl_settings VALUES ('project_to_register_user', ' ') ON CONFLICT (name) DO NOTHING`, callback),
        (callback) => Client.query(`INSERT INTO cdl_settings VALUES ('gitlab_access_token', ' ') ON CONFLICT (name) DO NOTHING`, callback),
    ], function (error) {
        if (error)
            return Client.query('ROLLBACK', function () {
                Client.end();

                process.stderr.write(error.message.toString());
                process.stderr.write('\n');
                process.exit(1);
            });

        Client.query('COMMIT', function (error) {
            Client.end();

            if (error) {
                process.stderr.write(error.message.toString());
                process.stderr.write('\n');
                process.exit(1);
            }

            process.exit();
        });
    });
});