// tslint:disable:insecure-random

/**
 * メニューアイテム注文取引シナリオ
 */
import * as kwskfsapi from '@motionpicture/kwskfs-api-nodejs-client';
import * as createDebug from 'debug';
import * as moment from 'moment';

const debug = createDebug('kwskfs-monitoring-jobs');

// tslint:disable-next-line:max-func-body-length
export async function main(durationInMillisecond: number) {
    // 取引の進捗状況
    let progress = '';

    const auth = new kwskfsapi.auth.OAuth2({
        domain: <string>process.env.KWSKFS_API_AUTHORIZE_SERVER_DOMAIN,
        clientId: <string>process.env.KWSKFS_API_CLIENT_ID,
        clientSecret: <string>process.env.KWSKFS_API_CLIENT_SECRET,
        redirectUri: 'https://localhost/signIn',
        logoutUri: 'https://localhost/signOut'
    });

    auth.setCredentials({
        refresh_token: <string>process.env.SCENARIO_REFRESH_TOKEN
    });

    // const organizationService = new kwskfsapi.service.Organization({
    //     endpoint: <string>process.env.KWSKFS_API_ENDPOINT,
    //     auth: auth
    // });
    const personService = new kwskfsapi.service.Person({
        endpoint: <string>process.env.KWSKFS_API_ENDPOINT,
        auth: auth
    });
    const eventService = new kwskfsapi.service.Event({
        endpoint: <string>process.env.KWSKFS_API_ENDPOINT,
        auth: auth
    });
    const placeOrderTransactionService = new kwskfsapi.service.transaction.PlaceOrder({
        endpoint: <string>process.env.KWSKFS_API_ENDPOINT,
        auth: auth
    });

    try {
        // フードイベント検索
        const foodEvents = await eventService.search({
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
        const restaurants = await eventService.searchOffers({
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
        const transaction = await placeOrderTransactionService.start({
            // tslint:disable-next-line:no-magic-numbers
            expires: moment().add(15, 'minutes').toDate(),
            sellerId: selectedRestaurant.id
        });
        progress = `transaction started. ${transaction.id}`;
        debug(progress);

        const menuItemAuthorizations = [];

        // tslint:disable-next-line:no-magic-numbers
        await wait(Math.floor(durationInMillisecond / 2));

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
        const menuItemAuthorization = await placeOrderTransactionService.createMenuItemEventReservationAuthorization({
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
        const accounts = await personService.findAccounts({ personId: 'me' });
        if (accounts.length === 0) {
            throw new Error('Account not found.');
        }

        progress = 'authorizing pecorino...';
        const pecorinoAuthorization = await placeOrderTransactionService.createPecorinoAuthorization({
            transactionId: transaction.id,
            price: menuItemAuthorizations.reduce(
                (a, b) => a + (<kwskfsapi.factory.action.authorize.offer.eventReservation.menuItem.IResult>b.result).price,
                0
            ),
            fromAccountId: accounts[0].id
        });
        progress = `pecorino authorized. ${pecorinoAuthorization.id}`;
        debug(progress);

        // 連絡先追加
        const contact = await personService.getContacts({ personId: 'me' });
        progress = 'setting customer contact...';
        await placeOrderTransactionService.setCustomerContact({
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
        await wait(Math.floor(durationInMillisecond / 2));

        // 注文確定
        progress = 'confirming...';
        const order = await placeOrderTransactionService.confirm({
            transactionId: transaction.id
        });
        progress = `transaction confirmed. ${order.orderNumber}`;
        debug(progress);

        return { progress, transaction, order };
    } catch (error) {
        error.progress = progress;
        throw error;
    }
}

async function wait(waitInMilliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, waitInMilliseconds));
}
