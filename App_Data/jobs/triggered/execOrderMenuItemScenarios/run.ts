/**
 * 注文シナリオリクエストを実行する
 */
import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as createDebug from 'debug';
import * as json2csv from 'json2csv';
import * as moment from 'moment';
import * as request from 'request-promise-native';
import { setInterval } from 'timers';

import * as processOrderMenuItem from '../../../../controller/scenarios/processOrderMenuItem';

const debug = createDebug('kwskfs-monitoring-jobs');

interface IConfigurations {
    /**
     * 注文取引シナリオ数
     */
    numberOfTrials: number;
    /**
     * 各シナリオのリクエスト感覚
     */
    intervals: number;
    /**
     * APIエンドポイント
     */
    apiEndpoint: string;
    /**
     * 最小購入セッション時間
     */
    minDurationInSeconds: number;
    /**
     * 最大購入セッション時間
     */
    maxDurationInSeconds: number;
}

interface IResult {
    processNumber: number;
    transactionId: string;
    startDate: string;
    errorMessage: string;
    errorStack: string;
    errorName: string;
    errorCode: string;
    orderNumber: string;
    orderDate: string;
    paymentMethod: string;
    paymentMethodId: string;
    price: string;
}

startScenarios({
    // tslint:disable-next-line:no-magic-numbers
    numberOfTrials: (process.argv[2] !== undefined) ? parseInt(process.argv[2], 10) : 10,
    // tslint:disable-next-line:no-magic-numbers
    intervals: (process.argv[3] !== undefined) ? parseInt(process.argv[3], 10) : 1000,
    apiEndpoint: <string>process.env.KWSKFS_API_ENDPOINT,
    // tslint:disable-next-line:no-magic-numbers
    minDurationInSeconds: (process.argv[4] !== undefined) ? parseInt(process.argv[4], 10) : 60,
    // tslint:disable-next-line:no-magic-numbers
    maxDurationInSeconds: (process.argv[5] !== undefined) ? parseInt(process.argv[5], 10) : 180
});

function startScenarios(configurations: IConfigurations) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Cannot start scenarios on a production environment.');
    }

    debug('starting scenarios...', configurations);

    const logs: string[] = [];
    const results: IResult[] = [];
    let numberOfProcesses = 0;

    const timer = setInterval(
        async () => {
            // プロセス数が設定に達したらタイマー終了
            if (numberOfProcesses >= configurations.numberOfTrials) {
                clearTimeout(timer);

                return;
            }

            numberOfProcesses += 1;
            const processNumber = numberOfProcesses;
            let log = '';
            let result: IResult;
            const now = new Date();

            // 販売者をランダムに選定
            // tslint:disable-next-line:insecure-random
            try {
                const durationInSeconds = Math.floor(
                    // tslint:disable-next-line:insecure-random
                    (configurations.maxDurationInSeconds - configurations.minDurationInSeconds) * Math.random()
                    + configurations.minDurationInSeconds
                );
                const { transaction, order } = await processOrderMenuItem.main(
                    // tslint:disable-next-line:no-magic-numbers
                    durationInSeconds * 1000
                );
                result = {
                    processNumber: processNumber,
                    transactionId: transaction.id,
                    startDate: now.toISOString(),
                    errorMessage: '',
                    errorStack: '',
                    errorName: '',
                    errorCode: '',
                    orderNumber: order.orderNumber,
                    orderDate: order.orderDate.toString(),
                    paymentMethod: order.paymentMethods.map((paymentMethod) => paymentMethod.name).join(','),
                    paymentMethodId: order.paymentMethods.map((paymentMethod) => paymentMethod.paymentMethodId).join(','),
                    price: `${order.price.toString()} ${order.priceCurrency}`
                };
            } catch (error) {
                result = {
                    processNumber: processNumber,
                    transactionId: '',
                    startDate: now.toISOString(),
                    errorMessage: error.message,
                    errorStack: error.stack,
                    errorName: error.name,
                    errorCode: (error.code !== undefined) ? error.code : '',
                    orderNumber: '',
                    orderDate: '',
                    paymentMethod: '',
                    paymentMethodId: '',
                    price: ''
                };
            }

            log = `
=============================== Transaction result ===============================
processNumber                    : ${result.processNumber.toString()}
transactionId                    : ${result.transactionId}
startDate                        : ${result.startDate}
errorMessage                     : ${result.errorMessage}
errorStack                       : ${result.errorStack}
errorName                        : ${result.errorName}
errorCode                        : ${result.errorCode}
orderNumber                      : ${result.orderNumber}
orderDate                        : ${result.orderDate}
paymentMethod                    : ${result.paymentMethod}
paymentMethodId                  : ${result.paymentMethodId}
price                            : ${result.price}
=============================== Transaction result ===============================`;
            debug(log);
            logs.push(log);
            results.push(result);

            // 全プロセスが終了したらレポートを送信
            if (results.length === numberOfProcesses) {
                await reportResults(configurations, results);
            }
        },
        configurations.intervals
    );
}
async function reportResults(configurations: IConfigurations, results: any[]) {
    // sort result
    const sortedResults = results.sort((a, b) => (a.processNumber > b.processNumber) ? 1 : -1);

    // csv作成
    const fields = Object.keys(sortedResults[0]);
    const fieldNames = Object.keys(sortedResults[0]);
    const csv = json2csv({
        data: sortedResults,
        fields: fields,
        fieldNames: fieldNames,
        del: ',',
        newLine: '\n',
        preserveNewLinesInValues: true
    });

    // upload csv
    const url = await kwskfs.service.util.uploadFile({
        fileName: `kwskfs-report-loadtest-placeOrderTransactions-${moment().format('YYYYMMDDhhmmss')}.csv`,
        text: csv,
        // tslint:disable-next-line:no-magic-numbers
        expiryDate: moment().add(3, 'months').toDate()
    })();

    const subject = 'Completion of KWSKFS placeOrder transaction loadtest';

    const numbersOfResult = {
        ok: sortedResults.filter((r) => r.orderNumber.length > 0).length,
        clientError: sortedResults.filter((r) => /^4\d{2}$/.test(r.errorCode)).length,
        serverError: sortedResults.filter((r) => /^5\d{2}$/.test(r.errorCode)).length,
        unknown: sortedResults.filter((r) => r.orderNumber.length === 0 && r.errorCode.length === 0).length
    };

    const HUNDRED = 100;
    const text = `## ${subject}
### Configurations
key  | value
------------- | -------------
intervals  | ${configurations.intervals}
number of trials  | ${configurations.numberOfTrials.toString()}
api endpoint  | ${configurations.apiEndpoint}
min duration  | ${configurations.minDurationInSeconds} seconds
max duration  | ${configurations.maxDurationInSeconds} seconds

### Summary
status | ratio | number of results
------------- | -------------
ok | ${Math.floor(HUNDRED * numbersOfResult.ok / sortedResults.length)}% | ${numbersOfResult.ok}/${sortedResults.length}
4xx  | ${Math.floor(HUNDRED * numbersOfResult.clientError / sortedResults.length)}% | ${numbersOfResult.clientError}/${sortedResults.length}
5xx  | ${Math.floor(HUNDRED * numbersOfResult.serverError / sortedResults.length)}% | ${numbersOfResult.serverError}/${sortedResults.length}
unknown | ${Math.floor(HUNDRED * numbersOfResult.unknown / sortedResults.length)}% | ${numbersOfResult.unknown}/${sortedResults.length}

### Reports
- Please check out the csv report [here](${url}).
        `;

    // const emailMessage = kwskfs.factory.creativeWork.message.email.create({
    //     identifier: 'identifier',
    //     sender: {
    //         name: 'KWSKFS Report',
    //         email: 'noreply@example.com'
    //     },
    //     toRecipient: {
    //         name: 'motionpicture developers',
    //         email: 'hello@motionpicture.jp'
    //     },
    //     about: subject,
    //     text: text
    // });
    // await kwskfs.service.notification.sendEmail(emailMessage)();

    // backlogへ通知
    const users = await request.get(
        {
            url: `https://m-p.backlog.jp/api/v2/projects/KWSKFS/users?apiKey=${process.env.BACKLOG_API_KEY}`,
            json: true
        }
    ).then((body: any[]) => body);

    debug('notifying', users.length, 'people on backlog...');
    await request.post(
        {
            url: `https://m-p.backlog.jp/api/v2/issues/KWSKFS-19/comments?apiKey=${process.env.BACKLOG_API_KEY}`,
            form: {
                content: text,
                notifiedUserId: users.map((user) => user.id)
            }
        }
    );

    debug('posted to backlog.');
}
