/**
 * ストック測定データを報告する
 */
import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as createDebug from 'debug';
import * as moment from 'moment';

import mongooseConnectionOptions from '../mongooseConnectionOptions';
import * as GoogleChart from './googleChart';

const debug = createDebug('kwskfs-monitoring-jobs');
const defaultParams = {
    chco: 'DAA8F5',
    chf: 'bg,s,283037',
    chof: 'png',
    cht: 'ls',
    chds: 'a',
    chdls: 'a1a6a9,12',
    chls: '1,0,0|1,0,0|1,0,0',
    chxs: '0,a1a6a9,12|1,a1a6a9,12|2,a1a6a9,12'
};

type IGlobalStockTelemetry = kwskfs.service.report.telemetry.IGlobalStockTelemetry;
type ISellerStockTelemetry = kwskfs.service.report.telemetry.ISellerStockTelemetry;

// tslint:disable-next-line:max-func-body-length
export async function main() {
    debug('connecting mongodb...');
    kwskfs.mongoose.connect(<string>process.env.MONGOLAB_URI, mongooseConnectionOptions);

    // 集計単位数分の集計を行う
    const telemetryUnitTimeInSeconds = 60; // 集計単位時間(秒)
    const numberOfAggregationUnit = 720; // 集計単位数
    // tslint:disable-next-line:no-magic-numbers
    const dateNow = moment();
    const dateNowByUnitTime = moment.unix(dateNow.unix() - (dateNow.unix() % telemetryUnitTimeInSeconds));

    // 基本的に、集計は別のジョブでやっておいて、この報告ジョブでは取得して表示するだけのイメージ
    // tslint:disable-next-line:no-magic-numbers
    const measuredFrom = moment(dateNowByUnitTime).add(numberOfAggregationUnit * -telemetryUnitTimeInSeconds, 'seconds');

    debug('reporting telemetries measuredFrom - dateTo...', measuredFrom, dateNowByUnitTime);
    const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
    const telemetryRepo = new kwskfs.repository.Telemetry(kwskfs.mongoose.connection);

    const restaurants = await organizationRepo.search({
        typeOf: kwskfs.factory.organizationType.Restaurant,
        identifiers: [],
        limit: 100
    });

    const globalTelemetries = await kwskfs.service.report.telemetry.searchGlobalStock({
        measuredFrom: measuredFrom.toDate(),
        measuredThrough: dateNowByUnitTime.toDate()
    })({ telemetry: telemetryRepo });
    debug('globalTelemetries length:', globalTelemetries.length);

    const sellerTelemetries = await kwskfs.service.report.telemetry.searchSellerStock({
        measuredFrom: measuredFrom.toDate(),
        measuredThrough: dateNowByUnitTime.toDate()
    })({ telemetry: telemetryRepo });
    debug('sellerTelemetries length:', sellerTelemetries.length);

    debug('diconnecting mongo...');
    await kwskfs.mongoose.disconnect();

    await reportNumberOfTasksUnexecuted(globalTelemetries);

    // 販売者ごとにレポート送信
    await Promise.all(restaurants.map(async (restaurant) => {
        debug('reporting...seller:', restaurant.id);
        const telemetriesBySellerId = sellerTelemetries.filter((telemetry) => telemetry.object.sellerId === restaurant.id);
        await reportNumberOfTransactionsUnderway(restaurant.name.ja, telemetriesBySellerId);
    }));
}

/**
 * 進行中取引数を報告する
 */
async function reportNumberOfTransactionsUnderway(sellerName: string, telemetries: ISellerStockTelemetry[]) {
    const params = {
        ...defaultParams, ...{
            chco: 'DAA8F5',
            chxt: 'x,y',
            chd: 't:',
            chxl: '0:|12時間前|9時間前|6時間前|3時間前|0時間前',
            chdl: '進行取引',
            chs: '750x250'
        }
    };
    params.chd += telemetries.map((telemetry) => telemetry.result.transactions.numberOfUnderway).join(',');
    const imageFullsize = await GoogleChart.publishUrl(params);

    await kwskfs.service.notification.report2developers(
        `${sellerName}\n時点での進行中取引数`,
        '',
        imageFullsize,
        imageFullsize
    )();
}

/**
 * 未実行タスク数を報告する
 */
async function reportNumberOfTasksUnexecuted(telemetries: IGlobalStockTelemetry[]) {
    const params = {
        ...defaultParams, ...{
            chco: 'DAA8F5',
            chxt: 'x,y',
            chd: 't:',
            chxl: '0:|12時間前|9時間前|6時間前|3時間前|0時間前',
            chdl: 'タスク',
            chs: '750x250'
        }
    };
    params.chd += telemetries.map(
        (telemetry) => (telemetry.result.tasks !== undefined) ? telemetry.result.tasks.numberOfUnexecuted : 0
    ).join(',');
    const imageFullsize = await GoogleChart.publishUrl(params);

    await kwskfs.service.notification.report2developers(
        '時点でのタスク数',
        '',
        imageFullsize,
        imageFullsize
    )();
}
