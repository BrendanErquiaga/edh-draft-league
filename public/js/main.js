'use strict';

var draftedCardRef,
    draftedCardsSnapshot,
    loggedInUserDraftedCardListRef,
    loggedInUserId,
    allcardsLocal,
    allcardsLocation = "/js/json/allcards.json",
    bannedCardList;

function saveCardForUser(pickingUserId, card) {
  if(cardIsBanned(card)){
    console.log('Card is banned');
    return;//Don't draft a card if it's banned
  }

  if(!cardIsFree(card)){
    console.log('Someone already had that card');
    return;//Someone already had that card, do something about that
  }

  var newCardRef = loggedInUserDraftedCardListRef.push();
  var cardObject = getCardObject(card);
  newCardRef.set({
    name: cardObject.name,
    type: cardObject.type,
    types: cardObject.types,
    cmc: cardObject.cmc,
    manaCost: cardObject.manaCost,
    colorIdentity: cardObject.colorIdentity,
    pickTime: Date.now()
  });
}

function getCardObject(card){
  var tempCard = {};

  console.log(allcardsLocal[card]);

  tempCard.name = allcardsLocal[card].name || card;
  tempCard.cmc = allcardsLocal[card].cmc || null;
  tempCard.manaCost = allcardsLocal[card].manaCost || null;
  tempCard.colorIdentity = allcardsLocal[card].colorIdentity || null;
  tempCard.type = allcardsLocal[card].type || null;
  tempCard.types = allcardsLocal[card].types || null;

  return tempCard;
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
    getFirebaseData();

    catchInput();

    initTypeAhead();

    $.getJSON( allcardsLocation, function(data){
      allcardsLocal = data;
    });
});

function getFirebaseData(){
  draftedCardRef = firebase.database().ref('draftedUserCards/');
  draftedCardRef.on('value', function(snapshot) {
    updateDraftedCardData(snapshot);
  });

  firebase.database().ref('/banList').once('value').then(function(snapshot) {
    bannedCardList = snapshot.val();
  });
}

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
      if(cardObjectSnapshot.val().name == card){
        someoneHasCard = true;
        return;
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

function cardIsBanned(card){
  if($.inArray(card, bannedCardList) !== -1){
    return true;
  }
}

function initTypeAhead() {
  var retrievedData,
        cards;

  var typeaheadLaunch = function() {
      if ($('body').hasClass('draft')) {
          var substringMatcher = function(strs) {
              return function findMatches(q, cb) {
                  var matches, substrRegex;
                  matches = [];
                  substrRegex = new RegExp(q, 'i');
                  $.each(strs, function(i, str) {
                      if (substrRegex.test(str)) {
                          matches.push(str);
                      }
                  });

                  cb(matches);
              };
          };
          retrievedData = localStorage.getItem("mtgjsonLocation");
          cards = JSON.parse(retrievedData);
          $('#userInput .typeahead').typeahead({
              hint: false,
              highlight: true,
              minLength: 1
          }, {
              name: 'cards',
              limit: 10,
              source: substringMatcher(cards)
          });
      }
  };

  //Loads mtgjson object to client side for typeahead.js to reference
  var needRefresh = false;
  //var mtgjsonLocation = "http://andrewmaul.com/fun/draftleague2016/js/json/cardNames.json";
  var mtgjsonLocation = "js/json/cardnames.json";


  if (localStorage.getItem('mtgjsonLocation') == null) {
      needRefresh = true;
  }

  if (needRefresh) {
      $.getJSON(mtgjsonLocation, function(data) {
          // var localjson=[];
          // for (var key in data){
          //     localjson.push(data[key].name);
          // }
          localStorage.setItem('mtgjsonLocation', JSON.stringify(data));
          retrievedData = localStorage.getItem("mtgjsonLocation");
          if (retrievedData != null) {
              //initialize typeahead
              typeaheadLaunch();
          }
      });
  } else {
      typeaheadLaunch();
  }
}