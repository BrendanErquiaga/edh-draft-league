'use strict';

var currentUserId,
    userQueuedCards,
    notificationToken,
    dataScriptLoaded = false,
    userScriptLoaded = false;

// Retrieve Firebase Messaging object.
const messaging = firebase.messaging();

// Bindings on load.
window.addEventListener('load', function() {
    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(onAuthStateChanged);

    firebase.auth().getRedirectResult().then(function(result) {
    }).catch(function(error) {
        console.error(error);
    });
    document.getElementById('quickstart-sign-in').addEventListener('click', toggleSignIn, false);

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
 * Function called when clicking the Login/Logout button.
 */
function toggleSignIn() {
  if (!firebase.auth().currentUser) {
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/plus.login');
    firebase.auth().signInWithRedirect(provider);
  } else {
    firebase.auth().signOut();
  }
  document.getElementById('quickstart-sign-in').disabled = true;
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
        //Hit the DB -> startDatabaseQueries();
        handleLoggedInUserUI(user);

        if(dataScriptLoaded){
          getFirebaseData();
        } else {
          userScriptLoaded = true;
        }
    } else {
        currentUserId = null;
        handleNoUserUI();
    }

    document.getElementById('quickstart-sign-in').disabled = false;
}

function handleLoggedInUserUI(user) {
  document.getElementById('quickstart-sign-in-status').textContent = user.displayName;
  document.getElementById('userIcon').src = user.photoURL;
  document.getElementById('quickstart-sign-in').textContent = 'Sign out';

  $('.authenticatedUserSection').show();
}

function handleNoUserUI() {
  document.getElementById('quickstart-sign-in-status').textContent = 'Signed out';
  document.getElementById('quickstart-sign-in').textContent = 'Sign in';
  document.getElementById('userIcon').src = 'img/unknown.jpg';

  $('.authenticatedUserSection').hide();
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
