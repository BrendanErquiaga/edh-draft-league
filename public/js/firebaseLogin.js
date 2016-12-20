'use strict';

var currentUserId,
    userQueuedCards,
    notificationToken;

// Retrieve Firebase Messaging object.
const messaging = firebase.messaging();

// Bindings on load.
window.addEventListener('load', function() {
    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(onAuthStateChanged);

    setupNotifications();
});

function setupNotifications() {
  messaging.requestPermission()
    .then(function() {
      getMessagingToken();
    })
    .catch(function(err){
      console.log('You didnt give me permissions for notifications =/', err);
    });
}

function getMessagingToken(){
  messaging.getToken()
    .then(function(currentToken) {
      if (currentToken) {
        sendTokenToServer(currentToken);
      } else {
        console.log('No Instance ID token available. Request permission to generate one.');
      }
    })
    .catch(function(err) {
      console.log('An error occurred while retrieving token. ', err);
    });
}

function sendTokenToServer(token) {
  notificationToken = token;
  if(currentUserId !== null && currentUserId !== undefined){
    firebase.database().ref('users/' + currentUserId).update({
        fcm_token: token
    });
  }
}

/**
 * Triggers every time there is a change in the Firebase auth state (i.e. user signed-in or user signed out).
 */
function onAuthStateChanged(user) {
    // We ignore token refresh events.
    if (user && currentUserId === user.uid) {
        return;
    }

    if (user) {
        currentUserId = user.uid;
        saveUserData(user.uid, user.displayName, user.email, user.photoURL);
        updateReferencesWithUserId();
        updateLoggedInUserUI();
        //Hit the DB -> startDatabaseQueries();
        //Display Logged In State
        //Update autodraft button based on users status
    } else {
        currentUserId = null;
        //Prompt Login
    }
}

function updateLoggedInUserUI(){

}

// Saves basic user data
function saveUserData(loggedInUserId, name, email, imageUrl) {
    firebase.database().ref('users/' + loggedInUserId).update({
        username: name,
        email: email,
        profile_picture: imageUrl
    });
}

function updateReferencesWithUserId(){
  firebase.database().ref('queuedUserCards/' + currentUserId + '/').on('value', function(snapshot) {
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
  if($(document.body).hasClass('draft')) {
    updateQueuedCardsUI();
  }
}
