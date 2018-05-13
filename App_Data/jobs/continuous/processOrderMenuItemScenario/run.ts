/**
 * 注文シナリオをランダムに実行し続ける
 */
import * as createDebug from 'debug';

import * as processOrderMenuItem from '../../../../controller/scenarios/processOrderMenuItem';

const debug = createDebug('kwskfs-monitoring-jobs');

if (process.env.CONTINUOUS_SCENARIOS_STOPPED === '1') {
    process.exit(0);
}

debug('start executing scenarios...');

// tslint:disable-next-line:no-magic-numbers
const INTERVAL = parseInt(<string>process.env.CONTINUOUS_SCENARIOS_INTERVAL_IN_SECONDS, 10) * 1000;

setInterval(
    () => {
        // 0-{INTERVAL}の間でランダムにインターバルを置いてシナリオを実行する
        // tslint:disable-next-line:insecure-random no-magic-numbers
        const executesAfter = Math.floor(INTERVAL * Math.random());

        setTimeout(
            async () => {
                try {
                    // tslint:disable-next-line:insecure-random no-magic-numbers
                    const duration = Math.floor(Math.random() * 180000 + 120000);
                    const result = await processOrderMenuItem.main(duration);
                    debug('result:', result);
                } catch (error) {
                    console.error(error);
                }
            },
            executesAfter
        );
    },
    INTERVAL
);
