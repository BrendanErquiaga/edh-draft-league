'use strict';

var senderKey = "AAAAWRkfbzA:APA91bEhDBDOSArAdhSpI_SFiWh2K-1S7m0Te2OL_Av7JKMdsBXY26rcc7KsaL-lVqN-uzIHU-Xl6wBIrpmoXCe5_O6tNtu1mye5kgX3LbvimYpZ0Ul3hhNsLPvPtoFiOVmZk6rp9SJq2T7oB15Bl_jdEyfHCyJ-dA";

function getNextDrafterId() {
    return turnOrderObject.turnOrder[turnOrderObject.turnIndex];
}

function cardIsFree(card) {
    var someoneHasCard = false;
    draftedCardsSnapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        var val = childSnapshot.val();
        childSnapshot.forEach(function(cardObjectSnapshot) {
            if (cardObjectSnapshot.val().name == card) {
                someoneHasCard = true;
                return;
            }
        });
    });

    if (someoneHasCard) {
        return false;
    } else {
        return true;
    }
}

function cardIsBanned(card) {
    if ($.inArray(card, bannedCardList) !== -1) {
        return true;
    }
}

//Checks if it is the current users turn
function currentUsersTurn() {
    if (turnOrderObject.turnOrder[turnOrderObject.turnIndex] === userId) {
        console.log('Its your turn! Draft away!');

        return true;
    }

    return false;
}

function getNextCardFromUsersQueue(autoDraftedUserId) {
    var cardName;
    queuedCardsSnapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        if (key === autoDraftedUserId) {
            cardName = childSnapshot.child("0").val();
            return;
        }
    });

    return cardName;
}

function getCardObject(card) {
    var tempCard = {};

    if (allcardsLocal[card] === undefined) {
        console.log('We couldnt find ' + card + ' jackass, so we made a fake entry.');
        tempCard.name = card;
        tempCard.cmc = null;
        tempCard.manaCost = null;
        tempCard.colorIdentity = null;
        tempCard.type = null;
        tempCard.types = null;
        return tempCard;
    }

    tempCard.name = allcardsLocal[card].name;
    tempCard.cmc = allcardsLocal[card].cmc || null;
    tempCard.manaCost = allcardsLocal[card].manaCost || null;
    tempCard.colorIdentity = allcardsLocal[card].colorIdentity || null;
    tempCard.type = allcardsLocal[card].type || null;
    tempCard.types = allcardsLocal[card].types || null;

    return tempCard;
}

function goToNextTurn() {
    var tempTurnOrderObject = turnOrderObject;

    if (tempTurnOrderObject.ascendingTurnOrder) {
        tempTurnOrderObject.turnIndex++;
    } else {
        tempTurnOrderObject.turnIndex--;
    }

    //If we've reached the end of the array start counting down
    if (tempTurnOrderObject.turnIndex >= tempTurnOrderObject.turnOrder.length) {
        tempTurnOrderObject.ascendingTurnOrder = false;
        tempTurnOrderObject.turnIndex--;
        //console.log(' SNAKE FOR ' + tempTurnOrderObject.turnOrder[tempTurnOrderObject.turnIndex]);
    } //If we've reached the bottom of the array, move players & start counting up
    else if (tempTurnOrderObject.turnIndex < 0) {
        var firstPick = tempTurnOrderObject.turnOrder[0];
        tempTurnOrderObject.turnOrder.splice(0, 1);
        tempTurnOrderObject.turnOrder.push(firstPick);
        tempTurnOrderObject.ascendingTurnOrder = true;
        tempTurnOrderObject.turnIndex = 0;
        //dataObject.misc.roundNumber++; TODO: Store round data somewhere
        //console.log('NEXT ROUND ' + tempTurnOrderObject.turnOrder);
    }

    //console.log(tempTurnOrderObject);

    saveTurnOrderObject(tempTurnOrderObject);
    //TODO: increment pick number
    sendTurnAdvancedNotification();
}

function sendTurnAdvancedNotification() {
    $.ajax({
        type: 'POST',
        beforeSend: function(request) {
            request.setRequestHeader("Authorization", "key=" + senderKey);
        },
        url: 'https://fcm.googleapis.com/fcm/send',
        data: JSON.stringify(getNotificationObject()),
        success: function(response) {
            //console.log('We did it', response);
        },
        failure: function(response) {
            console.log('Well notification post failed', response);
        },
        contentType: "application/json",
        dataType: 'json'
    });
}

function getNotificationObject() {
  var notificationObject = {
      "notification": {
          "title": "Somone picked a card",
          "body": "Its your turn!",
          "icon": "/img/icons/badge_c_512.png"
      }
  };
  notificationObject.notification.title = getLastCardDraftedString();
  notificationObject.notification.body = "It's your turn to draft!";
  notificationObject.notification.icon = usersSnapshot[getNextDrafterId()].profile_picture;

  notificationObject.to = getTokenForNextDrafter();

  return notificationObject;
}

function getLastCardDraftedString() {
  var lastDraftObject = recentlyDraftCards[recentlyDraftCards.length - 1];
  return usersSnapshot[lastDraftObject.drafterId].username + ' picked ' + lastDraftObject.name;
}

function getTokenForNextDrafter() {
  return usersSnapshot[getNextDrafterId()].fcm_token;
}