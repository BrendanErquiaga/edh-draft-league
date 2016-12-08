'use strict';

// Bindings on load.
window.addEventListener('load', function() {
    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(onAuthStateChanged);
});

/**
 * Triggers every time there is a change in the Firebase auth state (i.e. user signed-in or user signed out).
 */
function onAuthStateChanged(user) {
    // We ignore token refresh events.
    if (user && userId === user.uid) {
        return;
    }

    if (user) {
        userId = user.uid;
        saveUserData(user.uid, user.displayName, user.email, user.photoURL);
        updateReferencesWithUserId();
        //Hit the DB -> startDatabaseQueries();
        //Display Logged In State
        //Update autodraft button based on users status
    } else {
        userId = null;
        //Prompt Login
    }
}

function getFirebaseData() {
    draftedCardRef = firebase.database().ref('draftedUserCards');
    queuedCardRef = firebase.database().ref('queuedUserCards');

    firebase.database().ref('users').on('value', function(snapshot) {
        usersSnapshot = snapshot.val();
    });

    firebase.database().ref('draftedUserCards').on('value', function(snapshot) {
        updateDraftedCardData(snapshot);
    });

    queuedCardRef.on('value', function(snapshot){
      queuedCardSnapshot = snapshot;
    });

    firebase.database().ref('banList').once('value').then(function(snapshot) {
        bannedCardList = snapshot.val();
    });

    //Should be last because it attempts to autodraft
    firebase.database().ref('turns').on('value', function(snapshot){
        updateTurnOrderData(snapshot);
    });
}

/*
~~~~~~~FIREBASE UPDATE~~~~~~~~~~
*/

function updateReferencesWithUserId(){
  firebase.database().ref('queuedUserCards/' + userId + '/').on('value', function(snapshot) {
      updateQueuedCardData(snapshot);
  });
}

function updateQueuedCardData(snapshot){
  userQueuedCards = snapshot.val();
  //Change turnOrder to array, makes life easier
  if(userQueuedCards !== null){
    userQueuedCards = Object.values(userQueuedCards);
  } else {
    userQueuedCards = [];
  }

  //TODO: Move UI code out
  updateQueuedCardUI();
}

function updateTurnOrderData(snapshot){
  turnOrderObject = snapshot.val();
  //Change turnOrder to array, makes life easier
  turnOrderObject.turnOrder = Object.values(turnOrderObject.turnOrder);

  //TODO: Move Autodraft code out?
  attemptToAutoDraft();
}

function updateDraftedCardData(snapshot) {
  draftedCardsSnapshot = snapshot;
  updatePickedCardUI();
}

/*
~~~~~~~FIREBASE Save~~~~~~~~~~
*/

// Saves basic user data
function saveUserData(userId, name, email, imageUrl) {
    firebase.database().ref('users/' + userId).update({
        username: name,
        email: email,
        profile_picture: imageUrl
    });
}

function saveAutoDraftStatus(autoDraftEnabled){
  firebase.database().ref('users/' + userId).update({
    autoDraft: autoDraftEnabled
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

  queuedCardSnapshot.forEach(function(childSnapshot) {
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

  console.log(newQueueObject);

  if(newQueueObject !== null) {
    queuedCardRef.set(newQueueObject);
  }
}

function savePickedCardToFirebase(cardObject, idToUse){
  var newCardRef = draftedCardRef.child(idToUse).push();
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
}

function saveCardToUserQueue(card){
  userQueuedCards.push(card);

  firebase.database().ref('queuedUserCards/').child(userId).set(userQueuedCards);
}