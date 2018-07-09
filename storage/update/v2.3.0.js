const Fs = require('fs');
const Pg = require('pg');

Fs.readFile('./config', 'utf8', function (error, data) {
    if (error) {
        process.stderr.write(error.message.toString());
        process.stderr.write('\n');
        process.exit(1);
    }

    let config = {};
    data.split('\n').filter((v) => v.match(/^\s*[^/].+:/)).forEach((v) => config[v.split(':')[0].trim()] = v.split(/:(.+)/)[1].trim());

    const Client = new Pg.Client({connectionString: config.database});
    Client.connect(function (error) {
        if (error) {
            process.stderr.write(error.message.toString());
            process.stderr.write('\n');
            process.exit(1);
        }

        Client.query('ALTER TABLE tbl_user_project ALTER COLUMN name TYPE varchar(225) USING name::varchar(225)', function (error) {
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