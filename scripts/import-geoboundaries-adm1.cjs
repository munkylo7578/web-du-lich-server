// Dry-run by default. No database connection is opened when required by tests.
const { cli, reportError } = require('./geo-adm1-db.cjs');
if (require.main === module) cli('import').catch(reportError);
