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
// tslint:disable-next-line:max-func-body-length
function main(durationInMillisecond) {
    return __awaiter(this, void 0, void 0, function* () {
        // 取引の進捗状況
        let progress = '';
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
        // const organizationService = new kwskfsapi.service.Organization({
        //     endpoint: <string>process.env.KWSKFS_API_ENDPOINT,
        //     auth: auth
        // });
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
        try {
            // フードイベント検索
            const foodEvents = yield eventService.search({
                eventType: kwskfsapi.factory.eventType.FoodEvent,
                identifiers: [],
                limit: 1
            });
            progress = `${foodEvents.length} foodEvents found.`;
            debug(progress);
            if (foodEvents.length === 0) {
                throw new Error('foodEvents not found.');
            }
            // フードイベント確定
            const foodEvent = foodEvents[0];
            progress = `foodEvent:${foodEvent.identifier}`;
            debug(progress);
            if (foodEvent.attendee === undefined) {
                throw new Error('event attendee undefined.');
            }
            progress = 'searching restaurants...';
            // レストラン検索
            // const restaurants = await organizationService.search({
            //     organizationType: kwskfsapi.factory.organizationType.Restaurant,
            //     identifiers: (<kwskfsapi.factory.organization.IOrganization[]>foodEvent.attendee).map((a) => a.identifier),
            //     limit: 100
            // });
            // if (restaurants.length === 0) {
            //     throw new Error('restaurants not found.');
            // }
            // 販売情報検索
            const restaurants = yield eventService.searchOffers({
                eventType: kwskfsapi.factory.eventType.FoodEvent,
                eventIdentifier: foodEvent.identifier
            });
            if (restaurants.length === 0) {
                throw new Error('restaurants not found.');
            }
            progress = `${restaurants.length} restaurants found.`;
            debug(progress);
            // レストラン選択
            const selectedRestaurant = restaurants[Math.floor(Math.random() * restaurants.length)];
            progress = 'starting transaction...';
            const transaction = yield placeOrderTransactionService.start({
                // tslint:disable-next-line:no-magic-numbers
                expires: moment().add(15, 'minutes').toDate(),
                sellerId: selectedRestaurant.id
            });
            progress = `transaction started. ${transaction.id}`;
            debug(progress);
            const menuItemAuthorizations = [];
            // tslint:disable-next-line:no-magic-numbers
            yield wait(Math.floor(durationInMillisecond / 2));
            // メニューアイテム選択
            const menuSections = selectedRestaurant.hasMenu[0].hasMenuSection;
            const selectedMenuSection = menuSections[Math.floor(Math.random() * menuSections.length)];
            const menuItems = selectedMenuSection.hasMenuItem;
            const selectedMenuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
            if (selectedMenuItem.offers === undefined) {
                throw new Error('selected menu item offer undefined.');
            }
            const selectedOffer = selectedMenuItem.offers[0];
            progress = `authorizing menu item... ${selectedMenuItem.identifier} ${selectedOffer.identifier}`;
            debug(progress);
            const menuItemAuthorization = yield placeOrderTransactionService.createMenuItemEventReservationAuthorization({
                transactionId: transaction.id,
                eventType: foodEvent.typeOf,
                eventIdentifier: foodEvent.identifier,
                menuItemIdentifier: selectedMenuItem.identifier,
                offerIdentifier: selectedOffer.identifier,
                acceptedQuantity: 1,
                organizationIdentifier: selectedRestaurant.identifier
            });
            progress = `menu item authorized. ${menuItemAuthorization.id}`;
            debug(progress);
            menuItemAuthorizations.push(menuItemAuthorization);
            // 口座検索
            progress = 'finding accounts...';
            const accounts = yield personService.findAccounts({ personId: 'me' });
            if (accounts.length === 0) {
                throw new Error('Account not found.');
            }
            progress = 'authorizing pecorino...';
            const pecorinoAuthorization = yield placeOrderTransactionService.createPecorinoAuthorization({
                transactionId: transaction.id,
                price: menuItemAuthorizations.reduce((a, b) => a + b.result.price, 0),
                fromAccountId: accounts[0].id
            });
            progress = `pecorino authorized. ${pecorinoAuthorization.id}`;
            debug(progress);
            // 連絡先追加
            const contact = yield personService.getContacts({ personId: 'me' });
            progress = 'setting customer contact...';
            yield placeOrderTransactionService.setCustomerContact({
                transactionId: transaction.id,
                contact: contact
                // contact: {
                //     givenName: 'もーしょん',
                //     familyName: 'たろう',
                //     telephone: '+819012345678',
                //     email: 'hello@motionpicture.jp'
                // }
            });
            progress = 'customer contact set.';
            debug(progress);
            // tslint:disable-next-line:no-magic-numbers
            yield wait(Math.floor(durationInMillisecond / 2));
            // 注文確定
            progress = 'confirming...';
            const order = yield placeOrderTransactionService.confirm({
                transactionId: transaction.id,
                sendEmailMessage: true
            });
            progress = `transaction confirmed. ${order.orderNumber}`;
            debug(progress);
            return { progress, transaction, order };
        }
        catch (error) {
            error.progress = progress;
            throw error;
        }
    });
}
exports.main = main;
function wait(waitInMilliseconds) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => setTimeout(resolve, waitInMilliseconds));
    });
}
