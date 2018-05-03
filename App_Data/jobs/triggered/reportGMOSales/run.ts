/**
 * GMO実売上状況を報告する
 * @ignore
 */
import * as createDebug from 'debug';
import * as Controller from '../../../../controller/reportGMOSales';

const debug = createDebug('kwskfs-monitoring-jobs');

Controller.main().then(() => {
    debug('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
