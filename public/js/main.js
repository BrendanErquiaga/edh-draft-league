'use strict';

var draftedCardsSnapshot,
    loggedInUserDraftedCardsRef,
    loggedInUserId,
    allcardsLocal,
    allcardsLocation = "/js/json/allcards.json",
    bannedCardList,
    turnOrderSnapshot;

// Bindings on load.
window.addEventListener('load', function() {
    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(onAuthStateChanged);
});

$(document).ready(function() {
    getFirebaseData();

    catchInput();

    initTypeAhead();

    $.getJSON(allcardsLocation, function(data) {
        allcardsLocal = data;
    });
});

function pickCardForUser(pickingUserId, card) {
    if (cardIsBanned(card)) {
        console.log('Card is banned');
        return; //Don't draft a card if it's banned
    }

    if (!cardIsFree(card)) {
      console.log('Someone already had that card');
      return; //Someone already had that card, do something about that
    }

    if(!currentUsersTurn()){
      console.log('Its not your turn sucka');
      return;
    }

    saveCardToFirebase(getCardObject(card))

    goToNextTurn();
}

function saveCardToFirebase(cardObject){
  var newCardRef = loggedInUserDraftedCardsRef.push();
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

function getCardObject(card) {
    var tempCard = {};

    if (allcardsLocal[card] === undefined) {
        console.log('We couldnt find ' + card + ' jackass, so we made a fake entry.');
        tempCard.name = card;
        tempCard.cmc = null;
        tempCard.manaCost = null;
        tempCard.colorIdentity = null;
        tempCard.type = null;
        tempCard.types = null;
        return tempCard;
    }

    tempCard.name = allcardsLocal[card].name;
    tempCard.cmc = allcardsLocal[card].cmc || null;
    tempCard.manaCost = allcardsLocal[card].manaCost || null;
    tempCard.colorIdentity = allcardsLocal[card].colorIdentity || null;
    tempCard.type = allcardsLocal[card].type || null;
    tempCard.types = allcardsLocal[card].types || null;

    return tempCard;
}

function goToNextTurn() {
  var tempTurnOrderObject = turnOrderSnapshot;

  if(tempTurnOrderObject.ascendingTurnOrder){
    tempTurnOrderObject.turnIndex++;
  }
  else {
    tempTurnOrderObject.turnIndex--;
  }

  //If we've reached the end of the array start counting down
  if(tempTurnOrderObject.turnIndex >= tempTurnOrderObject.turnOrder.length) {
    tempTurnOrderObject.ascendingTurnOrder = false;
    tempTurnOrderObject.turnIndex--;
    //console.log(' SNAKE FOR ' + tempTurnOrderObject.turnOrder[tempTurnOrderObject.turnIndex]);
  }//If we've reached the bottom of the array, move players & start counting up
  else if(tempTurnOrderObject.turnIndex < 0) {
    var firstPick = tempTurnOrderObject.turnOrder[0];
    tempTurnOrderObject.turnOrder.splice(0,1);
    tempTurnOrderObject.turnOrder.push(firstPick);
    tempTurnOrderObject.ascendingTurnOrder = true;
    tempTurnOrderObject.turnIndex = 0;
    //dataObject.misc.roundNumber++; TODO: Store round data somewhere
    //console.log('NEXT ROUND ' + tempTurnOrderObject.turnOrder);
  }

  //console.log(tempTurnOrderObject);

  saveTurnOrderObject(tempTurnOrderObject);
  //TODO: increment pick number
}

function saveTurnOrderObject(tempTurnOrderObject){
  firebase.database().ref('turns/').set({
    ascendingTurnOrder: tempTurnOrderObject.ascendingTurnOrder,
    turnIndex: tempTurnOrderObject.turnIndex,
    turnOrder: tempTurnOrderObject.turnOrder
  });
}

function catchInput() {
    $('#card-submit').on('click', function(e) {
        saveCardInInputField();
        clearCardInputField();
    });

    $('#form-card').keypress(function(event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '13') {
            saveCardInInputField();
            clearCardInputField();
        }
    });
}

function saveCardInInputField() {
    pickCardForUser(loggedInUserId, $('#form-card').val());
}

function clearCardInputField() {
    $('#form-card').val('');
}

function getFirebaseData() {
    firebase.database().ref('draftedUserCards/').on('value', function(snapshot) {
        updateDraftedCardData(snapshot);
    });

    firebase.database().ref('turns/').on('value', function(snapshot){
        updateTurnOrderData(snapshot);
    });

    firebase.database().ref('/banList').once('value').then(function(snapshot) {
        bannedCardList = snapshot.val();
    });
}

function updateDraftedCardData(snapshot) {
  draftedCardsSnapshot = snapshot;
}

function updateTurnOrderData(snapshot){
  turnOrderSnapshot = snapshot.val();
  //Change turnOrder to array, makes life easier
  turnOrderSnapshot.turnOrder = Object.values(turnOrderSnapshot.turnOrder);
}

//Update references for things like draftedCards
function updatePageData() {
    loggedInUserDraftedCardsRef = firebase.database().ref('draftedUserCards/' + loggedInUserId);
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

// Saves basic user data
function writeUserData(userId, name, email, imageUrl) {
    firebase.database().ref('users/' + userId).set({
        username: name,
        email: email,
        profile_picture: imageUrl
    });
}

function cardIsFree(card) {
    var someoneHasCard = false;
    draftedCardsSnapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        var val = childSnapshot.val();
        childSnapshot.forEach(function(cardObjectSnapshot) {
            if (cardObjectSnapshot.val().name == card) {
                someoneHasCard = true;
                return;
            }
        });
    });

    if (someoneHasCard) {
        return false;
    } else {
        return true;
    }
}

function cardIsBanned(card) {
    if ($.inArray(card, bannedCardList) !== -1) {
        return true;
    }
}

//Checks if it is the current users turn
function currentUsersTurn(){
  if(turnOrderSnapshot.turnOrder[turnOrderSnapshot.turnIndex] === loggedInUserId) {
    console.log('Its your turn! Draft away!');

    return true;
  }

  return false;
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