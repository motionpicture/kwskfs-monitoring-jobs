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
 * 注文シナリオをランダムに実行し続ける
 */
const createDebug = require("debug");
const processOrderMenuItem = require("../../../../controller/scenarios/processOrderMenuItem");
const debug = createDebug('kwskfs-monitoring-jobs');
if (process.env.CONTINUOUS_SCENARIOS_STOPPED === '1') {
    process.exit(0);
}
debug('start executing scenarios...');
// tslint:disable-next-line:no-magic-numbers
const INTERVAL = parseInt(process.env.CONTINUOUS_SCENARIOS_INTERVAL_IN_SECONDS, 10) * 1000;
setInterval(() => {
    // 0-{INTERVAL}の間でランダムにインターバルを置いてシナリオを実行する
    // tslint:disable-next-line:insecure-random no-magic-numbers
    const executesAfter = Math.floor(INTERVAL * Math.random());
    setTimeout(() => __awaiter(this, void 0, void 0, function* () {
        try {
            // tslint:disable-next-line:insecure-random no-magic-numbers
            const duration = Math.floor(Math.random() * 180000 + 120000);
            const result = yield processOrderMenuItem.main(duration);
            debug('result:', result);
        }
        catch (error) {
            console.error(error);
        }
    }), executesAfter);
}, INTERVAL);
