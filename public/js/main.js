'use strict';

var draftedCardRef,
    draftedCardsSnapshot,
    loggedInUserDraftedCardListRef,
    loggedInUserId;

function saveCardForUser(pickingUserId, card) {
  if(!cardIsFree(card)){
    return;//Someone already had that card, do something about that
  }

  var newCardRef = loggedInUserDraftedCardListRef.push();
  newCardRef.set({
    cardName: card,
    pickTime: Date.now(),
  });

  console.log('userId: ' + pickingUserId + ' should have picked: ' + card + ' at: ' + Date.now());
}

function catchInput(){
  $('#card-submit').on('click', function(e){
    saveCardInInputField();
		clearCardInputField();
  });

  $('#form-card').keypress(function(event){
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if(keycode == '13'){
      saveCardInInputField();
      clearCardInputField();
    }
  });
}

function saveCardInInputField() {
  saveCardForUser(loggedInUserId, $('#form-card').val());
}

function clearCardInputField() {
  $('#form-card').val('');
}

$(document).ready(function() {
    draftedCardRef = firebase.database().ref('draftedUserCards/');
    draftedCardRef.on('value', function(snapshot) {
      updateDraftedCardData(snapshot);
    });

    catchInput();
});

/**
 * Triggers every time there is a change in the Firebase auth state (i.e. user signed-in or user signed out).
 */
function onAuthStateChanged(user) {
  // We ignore token refresh events.
  if (user && loggedInUserId === user.uid) {
    return;
  }

  if (user) {
    loggedInUserId = user.uid;
    writeUserData(user.uid, user.displayName, user.email, user.photoURL);
    updatePageData();
    //Hit the DB -> startDatabaseQueries();
    //Display Logged In State
  } else {
    loggedInUserId = null;
    //Prompt Login
  }
}

//Update references for things like draftedCards
function updatePageData(){
  loggedInUserDraftedCardListRef = firebase.database().ref('draftedUserCards/' + loggedInUserId);
}

// Bindings on load.
window.addEventListener('load', function() {
  // Listen for auth state changes
  firebase.auth().onAuthStateChanged(onAuthStateChanged);
});

// Saves basic user data
function writeUserData(userId, name, email, imageUrl) {
  firebase.database().ref('users/' + userId).set({
    username: name,
    email: email,
    profile_picture : imageUrl
  });
}

function updateDraftedCardData(snapshot){
  draftedCardsSnapshot = snapshot;
}

function cardIsFree(card) {
  var someoneHasCard = false;
  draftedCardsSnapshot.forEach(function(childSnapshot){
    var key = childSnapshot.key;
    var val = childSnapshot.val();
    childSnapshot.forEach(function(cardObjectSnapshot){
      if(cardObjectSnapshot.val().cardName == card){
        someoneHasCard = true;
        return 'MONKEYS';
      }
    });
  });

  if(someoneHasCard){
    return false;
  }
  else {
    return true;
  }
}
