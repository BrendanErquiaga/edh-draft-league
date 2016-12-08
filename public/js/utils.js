'use strict';

function getNextDrafterId(){
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
function currentUsersTurn(){
  if(turnOrderObject.turnOrder[turnOrderObject.turnIndex] === userId) {
    console.log('Its your turn! Draft away!');

    return true;
  }

  return false;
}

function getNextCardFromUsersQueue(autoDraftedUserId){
  var cardName;
  queuedCardSnapshot.forEach(function(childSnapshot) {
      var key = childSnapshot.key;
      if(key === autoDraftedUserId){
        cardName = childSnapshot.child("0").val();
        return;
      }
  });

  if(cardName === undefined || cardName === null){
    console.log('Well ' + autoDraftedUserId + ' didnt have a card in their queue, bad times');
  }

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

  if(tempTurnOrderObject.ascendingTurnOrder){
    tempTurnOrderObject.turnIndex++;
  }
  else {
    tempTurnOrderObject.turnIndex--;
  }

  //If we've reached the end of the array start counting down
  if(tempTurnOrderObject.turnIndex >= tempTurnOrderObject.turnOrder.length) {
    tempTurnOrderObject.ascendingTurnOrder = false;
    tempTurnOrderObject.turnIndex--;
    //console.log(' SNAKE FOR ' + tempTurnOrderObject.turnOrder[tempTurnOrderObject.turnIndex]);
  }//If we've reached the bottom of the array, move players & start counting up
  else if(tempTurnOrderObject.turnIndex < 0) {
    var firstPick = tempTurnOrderObject.turnOrder[0];
    tempTurnOrderObject.turnOrder.splice(0,1);
    tempTurnOrderObject.turnOrder.push(firstPick);
    tempTurnOrderObject.ascendingTurnOrder = true;
    tempTurnOrderObject.turnIndex = 0;
    //dataObject.misc.roundNumber++; TODO: Store round data somewhere
    //console.log('NEXT ROUND ' + tempTurnOrderObject.turnOrder);
  }

  //console.log(tempTurnOrderObject);

  saveTurnOrderObject(tempTurnOrderObject);
  //TODO: increment pick number
}

