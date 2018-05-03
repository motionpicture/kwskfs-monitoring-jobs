"use strict";
// tslint:disable:insecure-random
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
 * メニューアイテム注文取引シナリオ
 */
const kwskfsapi = require("@motionpicture/kwskfs-api-nodejs-client");
const createDebug = require("debug");
const moment = require("moment");
const debug = createDebug('kwskfs-monitoring-jobs');
const auth = new kwskfsapi.auth.OAuth2({
    domain: process.env.KWSKFS_API_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.KWSKFS_API_CLIENT_ID,
    clientSecret: process.env.KWSKFS_API_CLIENT_SECRET,
    redirectUri: 'https://localhost/signIn',
    logoutUri: 'https://localhost/signOut'
});
auth.setCredentials({
    refresh_token: process.env.SCENARIO_REFRESH_TOKEN
});
const organizationService = new kwskfsapi.service.Organization({
    endpoint: process.env.KWSKFS_API_ENDPOINT,
    auth: auth
});
const personService = new kwskfsapi.service.Person({
    endpoint: process.env.KWSKFS_API_ENDPOINT,
    auth: auth
});
const eventService = new kwskfsapi.service.Event({
    endpoint: process.env.KWSKFS_API_ENDPOINT,
    auth: auth
});
const placeOrderTransactionService = new kwskfsapi.service.transaction.PlaceOrder({
    endpoint: process.env.KWSKFS_API_ENDPOINT,
    auth: auth
});
// tslint:disable-next-line:max-func-body-length
function main(durationInMillisecond) {
    return __awaiter(this, void 0, void 0, function* () {
        // フードイベント検索
        const foodEvents = yield eventService.search({
            eventType: kwskfsapi.factory.eventType.FoodEvent,
            identifiers: [],
            limit: 1
        });
        debug(foodEvents.length, 'foodEvents found.');
        if (foodEvents.length === 0) {
            throw new Error('foodEvents not found.');
        }
        // フードイベント確定
        const foodEvent = foodEvents[0];
        debug('foodEvent:', foodEvent);
        if (foodEvent.attendee === undefined) {
            throw new Error('event attendee undefined.');
        }
        // レストラン検索
        const restaurants = yield organizationService.search({
            organizationType: kwskfsapi.factory.organizationType.Restaurant,
            identifiers: foodEvent.attendee.map((a) => a.identifier),
            limit: 100
        });
        if (restaurants.length === 0) {
            throw new Error('restaurants not found.');
        }
        debug(restaurants.length, 'restaurants found.');
        // レストラン確定
        const selectedRestaurant = restaurants[0];
        const transaction = yield placeOrderTransactionService.start({
            // tslint:disable-next-line:no-magic-numbers
            expires: moment().add(5, 'minutes').toDate(),
            sellerId: selectedRestaurant.id
        });
        debug('transaction started.', transaction.id);
        const menuItemAuthorizations = [];
        // tslint:disable-next-line:no-magic-numbers
        yield wait(Math.floor(durationInMillisecond / 2));
        // メニュー一つ目追加
        const selectedMenuItem = selectedRestaurant.hasMenu[0].hasMenuSection[0].hasMenuItem[0];
        if (selectedMenuItem === undefined) {
            throw new Error('menu item not found.');
        }
        if (selectedMenuItem.offers === undefined) {
            throw new Error('selected menu item offer undefined.');
        }
        const selectedOffer = selectedMenuItem.offers[0];
        debug('authorizing menu item...', selectedMenuItem.identifier, selectedOffer.identifier);
        const menuItemAuthorization = yield placeOrderTransactionService.createMenuItemEventReservationAuthorization({
            transactionId: transaction.id,
            eventType: foodEvent.typeOf,
            eventIdentifier: foodEvent.identifier,
            menuItemIdentifier: selectedMenuItem.identifier,
            offerIdentifier: selectedOffer.identifier,
            acceptedQuantity: 1,
            organizationIdentifier: selectedRestaurant.identifier
        });
        debug('menu item authorized.', menuItemAuthorization);
        menuItemAuthorizations.push(menuItemAuthorization);
        // 口座検索
        const accounts = yield personService.findAccounts({ personId: 'me' });
        if (accounts.length === 0) {
            throw new Error('Account not found.');
        }
        const pecorinoAuthorization = yield placeOrderTransactionService.createPecorinoAuthorization({
            transactionId: transaction.id,
            price: menuItemAuthorizations.reduce((a, b) => a + b.result.price, 0),
            fromAccountId: accounts[0].id
        });
        debug('pecorino authorized.', pecorinoAuthorization);
        // 連絡先追加
        const contact = yield personService.getContacts({ personId: 'me' });
        yield placeOrderTransactionService.setCustomerContact({
            transactionId: transaction.id,
            contact: contact
        });
        debug('contact set.', contact);
        // tslint:disable-next-line:no-magic-numbers
        yield wait(Math.floor(durationInMillisecond / 2));
        // 注文確定
        const order = yield placeOrderTransactionService.confirm({
            transactionId: transaction.id
        });
        debug('transaction confirmed.', order);
        return { transaction, order };
    });
}
exports.main = main;
function wait(waitInMilliseconds) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => setTimeout(resolve, waitInMilliseconds));
    });
}
