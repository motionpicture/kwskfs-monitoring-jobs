/**
 * 販売者向け測定データを作成する
 */
import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as createDebug from 'debug';
import * as moment from 'moment';

import mongooseConnectionOptions from '../../../../mongooseConnectionOptions';

const debug = createDebug('kwskfs-monitoring-jobs');

export async function main() {
    debug('connecting mongodb...');
    kwskfs.mongoose.connect(<string>process.env.MONGOLAB_URI, mongooseConnectionOptions);

    const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
    const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);
    const telemetryRepo = new kwskfs.repository.Telemetry(kwskfs.mongoose.connection);
    const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
    const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
    debug('creating telemetry...');

    // 取引セッション時間に対して十分に時間を置いて計測する
    // tslint:disable-next-line:no-magic-numbers
    const dateNow = moment().add(-30, 'minutes');
    // tslint:disable-next-line:no-magic-numbers
    const measuredAt = moment.unix((dateNow.unix() - (dateNow.unix() % 60)));

    // 劇場組織ごとに販売者向け測定データを作成する
    const restaurants = await organizationRepo.search({
        typeOf: kwskfs.factory.organizationType.Restaurant,
        identifiers: [],
        limit: 100
    });
    await Promise.all(restaurants.map(async (restaurant) => {
        await kwskfs.service.report.telemetry.createFlow({
            measuredAt: measuredAt.toDate(),
            sellerId: restaurant.id
        })({
            task: taskRepo,
            telemetry: telemetryRepo,
            transaction: transactionRepo,
            action: actionRepo
        });
    }));

    await kwskfs.service.report.telemetry.createFlow({
        measuredAt: measuredAt.toDate()
    })({
        task: taskRepo,
        telemetry: telemetryRepo,
        transaction: transactionRepo,
        action: actionRepo
    });

    debug('diconnecting mongo...');
    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    debug('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
