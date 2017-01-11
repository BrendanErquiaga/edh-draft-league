
'use strict';

var senderKey = "AAAAWRkfbzA:APA91bEhDBDOSArAdhSpI_SFiWh2K-1S7m0Te2OL_Av7JKMdsBXY26rcc7KsaL-lVqN-uzIHU-Xl6wBIrpmoXCe5_O6tNtu1mye5kgX3LbvimYpZ0Ul3hhNsLPvPtoFiOVmZk6rp9SJq2T7oB15Bl_jdEyfHCyJ-dA",
    allcardsLocal,
    allcardsLocation = "/js/json/allcards.json",
    lowercaseCardNamesLocal,
    lowercaseCardNamesLocation = "/js/json/cardnames_lc.json",
    cardNamesLocal,
    cardNamesLocation = "/js/json/cardnames.json",
    killIconLocation = "img/icons/kill_icon.png",
    voteIconLocation = "img/icons/vote_icon.png",
    winIconLocation = "img/icons/win_icon.png",
    denyMatchResultIcon = "img/icons/cross.png",
    approveMatchResultIcon = "img/icons/checkmark.png",
    killLimit = 3,
    voteLimit = 4;

function getNextDrafterId() {
    return turnOrderObject.turnOrder[turnOrderObject.turnIndex];
}

function getDisplayNameFromID(userId) {
  return usersSnapshot[userId].username;
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
    if (turnOrderObject.turnOrder[turnOrderObject.turnIndex] === currentUserId) {
        console.log('Its your turn! Draft away!');

        return true;
    }

    return false;
}

function getNextCardFromUsersQueue(currentUserIdToUse) {
    var cardName;
    queuedCardsSnapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        if (key === currentUserIdToUse) {
            cardName = childSnapshot.child("0").val();
            return;
        }
    });

    return cardName;
}

function getLastCardDraftedString() {
  var lastDraftObject = recentlyDraftCards[recentlyDraftCards.length - 1];
  return usersSnapshot[lastDraftObject.drafterId].username + ' picked: ' + lastDraftObject.name;
}

function getTokenForNextDrafter() {
  return usersSnapshot[getNextDrafterId()].fcm_token;
}

function getCardObject(card) {
    var tempCard = {};

    if(card.includes('//')){
      return getSplitCardObject(card);
    }

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

function getSplitCardObject(splitCardName) {
  var splitNames = splitCardName.split('//'),
      firstHalf, secondHalf;

  firstHalf = getCardObject(splitNames[0].trim());
  secondHalf = getCardObject(splitNames[1].trim());

  return combineCardObjects(firstHalf, secondHalf, splitCardName);
}

function combineCardObjects(firstHalf, secondHalf, combinedName){
  var newCardObject = {};

  newCardObject.name = combinedName;
  newCardObject.cmc = firstHalf.cmc  + secondHalf.cmc;
  newCardObject.manaCost = firstHalf.manaCost + " // " + secondHalf.manaCost;
  newCardObject.colorIdentity = firstHalf.colorIdentity;
  newCardObject.type = firstHalf.type;
  newCardObject.types = firstHalf.types;

  return newCardObject;
}

function getConvertedCardName(cardName) {
  var cardNameIndex = $.inArray(cardName.toLowerCase(), lowercaseCardNamesLocal);

  if(cardNameIndex > -1){
    return cardNamesLocal[cardNameIndex];
  }

  return false;
}

function getAPIValidCardName(cardName) {
  var tempName = cardName.toLowerCase();

  tempName = tempName.split(' ').join('-');
  tempName = tempName.split(',').join('');

  return tempName;
}

function getImageURLFromAPIData(cardAPIData) {
  var editionID = 0;

  if(cardAPIData.editions.length > 2){
    editionID = Math.floor(cardAPIData.editions.length/2);
  }
  var multiverse_id = cardAPIData.editions[editionID].multiverse_id;

  return "http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=" + multiverse_id + "&type=card";
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
        incrementRoundCounter();
    }

    //console.log(tempTurnOrderObject);

    saveTurnOrderObject(tempTurnOrderObject);
    //TODO: increment pick number
    sendTurnAdvancedNotification();
}

/*
~~~~~~~Notifications~~~~~~~~~~
*/

function sendTurnAdvancedNotification() {
    //Don't double notify someone who is globablly subbed
    if(usersSnapshot[getNextDrafterId()].globallySubscribed !== true){
      sendTargetdTurnNotification();
    }
    sendGlobalTurnNotification();
}

function sendTargetdTurnNotification(){
  $.ajax({
      type: 'POST',
      beforeSend: function(request) {
          request.setRequestHeader("Authorization", "key=" + senderKey);
      },
      url: 'https://fcm.googleapis.com/fcm/send',
      data: JSON.stringify(getNextTurnNotificationObject()),
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

function sendGlobalTurnNotification(){
  $.ajax({
      type: 'POST',
      beforeSend: function(request) {
          request.setRequestHeader("Authorization", "key=" + senderKey);
      },
      url: 'https://fcm.googleapis.com/fcm/send',
      data: JSON.stringify(getGroupTurnNotificationObject()),
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

function manageGlobalSubscribe(requestType) {
    var requestUrl = "https://iid.googleapis.com/iid/v1/" + notificationToken + "/rel/topics/draft";

    $.ajax({
        type: requestType,
        beforeSend: function(request) {
            request.setRequestHeader("Authorization", "key=" + senderKey);
        },
        url: requestUrl,
        success: function(response) {
            //console.log('We did a thing, you wanted to be subbed: ', requestType, response);
        },
        failure: function(response) {
            console.log('Failed to sub/unsub you', response);
        },
        contentType: "application/json",
        dataType: 'json'
    });
}

function getGroupTurnNotificationObject() {
  var newNotificationObject = getNextTurnNotificationObject();
  newNotificationObject.to = "/topics/draft";
  newNotificationObject.notification.body = usersSnapshot[getNextDrafterId()].username + ' is up next.';

  return newNotificationObject;
}

function getNextTurnNotificationObject() {
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

function removeCardFromUserQueue(cardToRemove){
  var index = userQueuedCards.indexOf(cardToRemove.innerHTML);    // <-- Not supported in <IE9
  if (index !== -1) {
      userQueuedCards.splice(index, 1);
  }

  updateUserQueuedCards();
}

//If the user moves a card in their queue, make sure firebase has the new order
function userMovedQueuedCard() {
  var newUserQueue = [];

  $("#queuedCards li").each(function(index){
    newUserQueue.push($(this).text());
  });

  if(newUserQueue.toString() === userQueuedCards.toString()){
    //console.log('You didnt really move anything...');
    return;
  }

  userQueuedCards = newUserQueue;

  updateUserQueuedCards();
}

function getCombinedStringFromArray(stringArray) {
  var tempString = '';

  for(var i = 0; i < stringArray.length; i++){
    tempString += stringArray[i].toString();
  }

  return tempString;
}

String.prototype.hashCode = function() {
  var hash = 0, i, chr, len;
  if (this.length === 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

function getDateString(timeStampString) {
  return new Date(timeStampString).toDateString();
}
