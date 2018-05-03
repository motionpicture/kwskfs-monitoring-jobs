"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 販売者向け測定データを作成する
 */
const kwskfs = require("@motionpicture/kwskfs-domain");
const createDebug = require("debug");
const moment = require("moment");
const mongooseConnectionOptions_1 = require("../../../../mongooseConnectionOptions");
const debug = createDebug('kwskfs-monitoring-jobs');
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        debug('connecting mongodb...');
        kwskfs.mongoose.connect(process.env.MONGOLAB_URI, mongooseConnectionOptions_1.default);
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
        const restaurants = yield organizationRepo.search({
            typeOf: kwskfs.factory.organizationType.Restaurant,
            identifiers: [],
            limit: 100
        });
        yield Promise.all(restaurants.map((restaurant) => __awaiter(this, void 0, void 0, function* () {
            yield kwskfs.service.report.telemetry.createFlow({
                measuredAt: measuredAt.toDate(),
                sellerId: restaurant.id
            })({
                task: taskRepo,
                telemetry: telemetryRepo,
                transaction: transactionRepo,
                action: actionRepo
            });
        })));
        yield kwskfs.service.report.telemetry.createFlow({
            measuredAt: measuredAt.toDate()
        })({
            task: taskRepo,
            telemetry: telemetryRepo,
            transaction: transactionRepo,
            action: actionRepo
        });
        debug('diconnecting mongo...');
        yield kwskfs.mongoose.disconnect();
    });
}
exports.main = main;
main().then(() => {
    debug('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
