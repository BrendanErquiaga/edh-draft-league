'use strict';

var userId,
    userQueuedCards;

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
        //updateUIForPushEnabled(currentToken);
      } else {
        // Show permission request.
        console.log('No Instance ID token available. Request permission to generate one.');
        // Show permission UI.
        //updateUIForPushPermissionRequired();
        setTokenSentToServer(false);
      }
    })
    .catch(function(err) {
      console.log('An error occurred while retrieving token. ', err);
      setTokenSentToServer(false);
    });
}

function sendTokenToServer(token) {
  console.log('Token! ', token);
}

function setTokenSentToServer(tokenSentToServer) {
  console.log('I sent the token to the server. ',tokenSentToServer);
}

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
  if($(document.body).hasClass('draft')) {
    updateQueuedCardUI();
  }
}
