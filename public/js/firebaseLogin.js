'use strict';

var userId,
    userQueuedCards;

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

// Saves basic user data
function saveUserData(userId, name, email, imageUrl) {
    firebase.database().ref('users/' + userId).update({
        username: name,
        email: email,
        profile_picture: imageUrl
    });
}

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
