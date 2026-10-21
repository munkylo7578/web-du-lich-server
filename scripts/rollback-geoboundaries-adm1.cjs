// Roll back one recorded import only; never infer ownership from a code prefix.
const { cli, reportError } = require('./geo-adm1-db.cjs');
if (require.main === module) cli('rollback').catch(reportError);
