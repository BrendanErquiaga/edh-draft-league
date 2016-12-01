'use strict';

var userCardsRef,
    loggedInUserId;

function saveCardForUser(pickingUserId, card) {
  // firebase.database().ref('userCards/' + userId).set({
  //   last_card: card,
  //   last_card_picktime: Date.now()
  // });

  var newCardRef = userCardsRef.push();
  newCardRef.set({
    cardPicked: card,
    pickTime: Date.now(),
    userId: pickingUserId
  });

  console.log('userId: ' + pickingUserId + ' should have picked: ' + card + ' at: ' + Date.now());
}

function catchInput(){
  $('#card-submit').on('click', function(e){
    saveCardForUser(loggedInUserId, $('#form-card').val());
		$('#form-card').val('');
  });
}

$(document).ready(function() {
    userCardsRef = firebase.database().ref('userCards/');

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
    //Display Logged In State
    //Save User Data -> writeUserData(user.uid, user.displayName, user.email, user.photoURL);
    //Hit the DB -> startDatabaseQueries();
  } else {
    // Set currentUID to null.
    loggedInUserId = null;
    //Prompt Login
  }
}

// Bindings on load.
window.addEventListener('load', function() {
  // Listen for auth state changes
  firebase.auth().onAuthStateChanged(onAuthStateChanged);
});