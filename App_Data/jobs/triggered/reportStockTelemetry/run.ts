/**
 * 測定データ報告
 * @ignore
 */
import * as createDebug from 'debug';
import * as Controller from '../../../../controller/reportStockTelemetry';

const debug = createDebug('kwskfs-monitoring-jobs');

Controller.main().then(() => {
    debug('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
