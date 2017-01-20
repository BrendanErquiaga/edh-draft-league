
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

  if(tempName.includes('//')){
    return tempName.split('//', 1);
  }

  tempName = tempName.split(' ').join('-');
  tempName = tempName.split(',').join('');
  tempName = tempName.split("'").join('');

  return tempName;
}

function getImageURLFromAPIData(cardAPIData) {
  var editionIndex = 0;

  while(cardAPIData.editions[editionIndex].multiverse_id == 0){
    editionIndex++;
  }
  var multiverse_id = cardAPIData.editions[editionIndex].multiverse_id;

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

function getUsedPodIDs(idsToCheck) {
  var alreadyUsedPodIDs = [];

  for(var i = 0; i < idsToCheck.length; i++){
    matchResultsSnapshot.forEach(function(obj) {
      if($.inArray(idsToCheck[i], alreadyUsedPodIDs) === -1 && obj.val().podId === idsToCheck[i]){
        alreadyUsedPodIDs.push(idsToCheck[i]);
      }
    });
  }

  return alreadyUsedPodIDs;
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

Array.prototype.diff = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};

function getDateString(timeStampString) {
  return new Date(timeStampString).toDateString();
}

function shuffle(array) {
  var m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

function k_combinations(set, k) {
	var i, j, combs, head, tailcombs;

	// There is no way to take e.g. sets of 5 elements from
	// a set of 4.
	if (k > set.length || k <= 0) {
		return [];
	}

	// K-sized set has only one K-sized subset.
	if (k == set.length) {
		return [set];
	}

	// There is N 1-sized subsets in a N-sized set.
	if (k == 1) {
		combs = [];
		for (i = 0; i < set.length; i++) {
			combs.push([set[i]]);
		}
		return combs;
	}

	// Assert {1 < k < set.length}

	// Algorithm description:
	// To get k-combinations of a set, we want to join each element
	// with all (k-1)-combinations of the other elements. The set of
	// these k-sized sets would be the desired result. However, as we
	// represent sets with lists, we need to take duplicates into
	// account. To avoid producing duplicates and also unnecessary
	// computing, we use the following approach: each element i
	// divides the list into three: the preceding elements, the
	// current element i, and the subsequent elements. For the first
	// element, the list of preceding elements is empty. For element i,
	// we compute the (k-1)-computations of the subsequent elements,
	// join each with the element i, and store the joined to the set of
	// computed k-combinations. We do not need to take the preceding
	// elements into account, because they have already been the i:th
	// element so they are already computed and stored. When the length
	// of the subsequent list drops below (k-1), we cannot find any
	// (k-1)-combs, hence the upper limit for the iteration:
	combs = [];
	for (i = 0; i < set.length - k + 1; i++) {
		// head is a list that includes only our current element.
		head = set.slice(i, i + 1);
		// We take smaller combinations from the subsequent elements
		tailcombs = k_combinations(set.slice(i + 1), k - 1);
		// For each (k-1)-combination we join it with the current
		// and store it to the set of k-combinations.
		for (j = 0; j < tailcombs.length; j++) {
			combs.push(head.concat(tailcombs[j]));
		}
	}
	return combs;
}

function combinations(set) {
	var k, i, combs, k_combs;
	combs = [];

	// Calculate all non-empty k-combinations
	for (k = 1; k <= set.length; k++) {
		k_combs = k_combinations(set, k);
		for (i = 0; i < k_combs.length; i++) {
			combs.push(k_combs[i]);
		}
	}
	return combs;
}
