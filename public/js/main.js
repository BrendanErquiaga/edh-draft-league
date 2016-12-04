'use strict';

var draftedCardRef,
    loggedInUserDraftedCardListRef,
    loggedInUserId;

function saveCardForUser(pickingUserId, card) {
  // if(!cardIsFree(card)){
  //   return;
  // }

  var newCardRef = loggedInUserDraftedCardListRef.push();
  newCardRef.set({
    cardName: card,
    pickTime: Date.now(),
  });

  //console.log('userId: ' + pickingUserId + ' should have picked: ' + card + ' at: ' + Date.now());
}

function catchInput(){
  $('#card-submit').on('click', function(e){
    saveCardForUser(loggedInUserId, $('#form-card').val());
		$('#form-card').val('');
  });
}

$(document).ready(function() {
    draftedCardRef = firebase.database().ref('draftedUserCards/');
    draftedCardRef.on('value', function(snapshot) {
      updateDraftedCardData(snapshot);
    });

    draftedCardRef.once("value")
      .then(function(snapshot) {
        snapshot.forEach(function(childSnapshot){
          var key = childSnapshot.key;
          var val = childSnapshot.val();
          childSnapshot.forEach(function(deepSnap){
            console.log(deepSnap.val());
          });
        });
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
  console.log('updateDraftedCardData');
  //console.log(snapshot.val());

  // if(!cardIsFree(snapshot.val())){
  //   return;
  // }
}

function cardIsFree(draftedCardSnapshot){
  // for(var key in cardName){
  //   if(cardName.hasOwnProperty(key)){
  //     var obj = cardName[key];
  //     for(var property in obj){
  //       if(obj.hasOwnProperty(property)){
  //         console.log('Object: ' + obj + ',Key: ' + key + ',Prop: ' + property);
  //         var subProperty = cardName[key][property];
  //         for(var property in subProperty){
  //           if(obj.hasOwnProperty(subProperty)){
  //             console.log('subProperty: ' + subProperty);
  //           }
  //         }
  //       }
  //     }
  //   }
  // }

  // draftedCardSnapshot.forEach(function(childSnapshot){
  //   console.log(childSnapshot.val());
  // });

  return true;
}
