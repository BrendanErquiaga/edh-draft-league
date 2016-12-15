'use strict';

var usersSnapshot,
    draftMasterObject,
    draftedCardsRef,
    draftedCardsSnapshot,
    queuedCardsRef,
    queuedCardsSnapshot,
    recentlyDraftCardsRef,
    recentlyDraftCards,
    allcardsLocal,
    allcardsLocation = "/js/json/allcards.json",
    bannedCardList,
    turnOrderObject;

function getFirebaseData() {
    draftedCardsRef = firebase.database().ref('draftedUserCards');
    queuedCardsRef = firebase.database().ref('queuedUserCards');
    recentlyDraftCardsRef = firebase.database().ref('recentlyDraftedCards');

    firebase.database().ref('users').on('value', function(snapshot) {
        updateUsersSnapshot(snapshot);
    });

    firebase.database().ref('draftedUserCards').on('value', function(snapshot) {
        updateDraftedCardData(snapshot);
    });

    queuedCardsRef.on('value', function(snapshot){
      queuedCardsSnapshot = snapshot;
    });

    recentlyDraftCardsRef.on('value', function(snapshot) {
      updateRecentlyDraftedCards(snapshot);
    });

    firebase.database().ref('banList').once('value').then(function(snapshot) {
        bannedCardList = snapshot.val();
    });

    firebase.database().ref('draftMaster').on('value', function(snapshot) {
        updateDraftMasterObject(snapshot);
    });

    //Should be last because it attempts to autodraft
    firebase.database().ref('turns').on('value', function(snapshot){
        updateTurnOrderData(snapshot);
    });

    messaging.onMessage(function(payload){
      alert(payload.notification.title + ' : ' + payload.notification.body);
    })
}

/*
~~~~~~~FIREBASE UPDATE~~~~~~~~~~
*/

function updateRecentlyDraftedCards(snapshot){
  recentlyDraftCards = snapshot.val();

  if(recentlyDraftCards !== null){
    recentlyDraftCards = Object.values(recentlyDraftCards);
  } else {
    recentlyDraftCards = [];
  }

  //TODO: Add UI elements for recently drafted cards
}

function updateTurnOrderData(snapshot){
  turnOrderObject = snapshot.val();
  //Change turnOrder to array, makes life easier
  turnOrderObject.turnOrder = Object.values(turnOrderObject.turnOrder);

  if($(document.body).hasClass('admin')) {
    attemptToAutoDraft();
  }
}

function updateUsersSnapshot(snapshot) {
  usersSnapshot = snapshot.val();

  if($(document.body).hasClass('draft')) {
    matchAutoDraftSwitch();
  }
}

function updateDraftMasterObject(snapshot) {
  draftMasterObject = snapshot.val();

  //TODO: Turn off any current draft masters
  if($(document.body).hasClass('admin')) {
    attemptToAutoDraft();
  }
}

function updateDraftedCardData(snapshot) {
  draftedCardsSnapshot = snapshot;

  if($(document.body).hasClass('draft')) {
    updatePickedCardUI();
  }
}

/*
~~~~~~~FIREBASE Save~~~~~~~~~~
*/

function saveAutoDraftStatus(autoDraftEnabled){
  firebase.database().ref('users/' + userId).update({
    autoDraft: autoDraftEnabled
  });
}

function saveMasterDrafterStatus(){
  firebase.database().ref('draftMaster').update({
    draftMasterId: draftMasterId
  });
}

function saveMasterDraftDelayTime(delayTime) {
  firebase.database().ref('draftMaster').update({
    delayTime: delayTime
  });
}

function saveTurnOrderObject(tempTurnOrderObject){
  firebase.database().ref('turns/').set({
    ascendingTurnOrder: tempTurnOrderObject.ascendingTurnOrder,
    turnIndex: tempTurnOrderObject.turnIndex,
    turnOrder: tempTurnOrderObject.turnOrder
  });
}

//TODO: Don't delete entire queue object... seems excessive
function cleanOutQueuedCards(cardLastPicked){
  var newQueueObject = {};

  queuedCardsSnapshot.forEach(function(childSnapshot) {
      var key = childSnapshot.key;
      var val = childSnapshot.val();
      newQueueObject[key] = Object.values(val);
      childSnapshot.forEach(function(cardObjectSnapshot) {
          if (cardObjectSnapshot.val() === cardLastPicked) {
              console.log(cardLastPicked + ' was in someones queue, I am removing it');
              newQueueObject[key].splice($.inArray(cardLastPicked,newQueueObject[key]),1);
          }
      });
  });

  //console.log(newQueueObject);

  if(newQueueObject !== null) {
    queuedCardsRef.set(newQueueObject);
  }
}

function savePickedCardToFirebase(cardObject, idToUse){
  var newCardRef = draftedCardsRef.child(idToUse).push();
  newCardRef.set({
      name: cardObject.name,
      type: cardObject.type,
      types: cardObject.types,
      cmc: cardObject.cmc,
      manaCost: cardObject.manaCost,
      colorIdentity: cardObject.colorIdentity,
      pickTime: Date.now()
  });

  cleanOutQueuedCards(cardObject.name);
  saveRecentlyPickedCards(cardObject.name, idToUse);
}

function saveRecentlyPickedCards(cardName, drafterId) {
  var newCardRef = recentlyDraftCardsRef.push();
  newCardRef.set({
    name: cardName,
    drafterId: drafterId
  });
}

function saveCardToUserQueue(card){
  userQueuedCards.push(card);

  firebase.database().ref('queuedUserCards/').child(userId).set(userQueuedCards);
}

/*
~~~~~~~FIREBASE NOTIFICATIONS~~~~~~~~~~
*/

// messaging.onMessage(function(payload){
//   console.log('onMessage: ', payload);
// })
