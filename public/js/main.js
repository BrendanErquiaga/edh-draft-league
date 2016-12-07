'use strict';

var draftedCardsSnapshot,
    userDraftedCardsRef,
    userQueuedCards,
    userId,
    allcardsLocal,
    allcardsLocation = "/js/json/allcards.json",
    bannedCardList,
    turnOrderObject;

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

function pickCardForUser(card) {
    if (cardIsBanned(card)) {
        console.log('Card is banned. (Cant Draft)');
        return; //Don't draft a card if it's banned
    }

    if (!cardIsFree(card)) {
      console.log('Someone already had that card. (Cant Draft)');
      return; //Someone already had that card, do something about that
    }

    savePickedCardToFirebase(getCardObject(card));

    //TODO: Remove card from everyones draft queues

    goToNextTurn();
}

function queueCardForUser(card) {
  if (cardIsBanned(card)) {
      console.log('Card is banned. (Cant Queue)');
      return; //Don't draft a card if it's banned
  }

  if (!cardIsFree(card)) {
    console.log('Someone already had that card. (Cant Queue)');
    return; //Someone already had that card, do something about that
  }

  if($.inArray(card, userQueuedCards) !== -1){
    console.log('You already had that card in your queue.');
    return;
  }

  saveCardToUserQueue(card);
}

function saveCardToUserQueue(card){
  userQueuedCards.push(card);

  firebase.database().ref('queuedUserCards/').child(userId).set(userQueuedCards);
}

function savePickedCardToFirebase(cardObject){
  var newCardRef = userDraftedCardsRef.push();
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
  var tempTurnOrderObject = turnOrderObject;

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

function pickOrQueueCard(card){
  if(currentUsersTurn()){
    pickCardForUser(card);
  }
  else {
    console.log('Its not your turn, so I put the card in your queue');
    queueCardForUser(card);
  }
}

function catchInput() {
    $('#card-submit').on('click', function(e) {
        pickOrQueueCard($('#form-card').val());
        clearCardInputField();
    });

    $('#form-card').keypress(function(event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '13') {
            pickOrQueueCard($('#form-card').val());
            clearCardInputField();
        }
    });

    $('#autoDraftSwitch').change(function(){
      saveAutoDraftStatus(this.checked);
    });
}

function saveCardInInputField() {
    pickCardForUser(userId, $('#form-card').val());
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

function saveAutoDraftStatus(autoDraftEnabled){
  firebase.database().ref('users/' + userId).update({
    autoDraft: autoDraftEnabled
  });
}

function updateDraftedCardData(snapshot) {
  draftedCardsSnapshot = snapshot;
  updatePickedCardUI();
}

function updateTurnOrderData(snapshot){
  turnOrderObject = snapshot.val();
  //Change turnOrder to array, makes life easier
  turnOrderObject.turnOrder = Object.values(turnOrderObject.turnOrder);
}

function updateQueuedCardData(snapshot){
  userQueuedCards = snapshot.val();
  //Change turnOrder to array, makes life easier
  if(userQueuedCards !== null){
    userQueuedCards = Object.values(userQueuedCards);
  } else {
    userQueuedCards = [];
  }

  updateQueuedCardUI();
}

//TODO: Right now this just clears the whole list every time, should only do that on load
function updateQueuedCardUI(){
  var queuedCardsUL = $("#queuedCards");
  queuedCardsUL.empty();

  for(var i = 0; i < userQueuedCards.length; i++){
    queuedCardsUL.append('<li>' + userQueuedCards[i] + '</li>');
  }
}

//TODO: Right now this just clears the whole list every time, should only do that on load
function updatePickedCardUI(){
  var pickedCardUL = $("#pickedCards");
  pickedCardUL.empty();

  draftedCardsSnapshot.forEach(function(childSnapshot) {
      var key = childSnapshot.key;
      var val = childSnapshot.val();
      if(key === userId){
        childSnapshot.forEach(function(cardObjectSnapshot) {
            pickedCardUL.append('<li>' + cardObjectSnapshot.val().name + '</li>');
        });
      }
  });
}

//Update references for things like draftedCards
function updatePageData() {
    userDraftedCardsRef = firebase.database().ref('draftedUserCards/' + userId);

    firebase.database().ref('queuedUserCards/' + userId + '/').on('value', function(snapshot) {
        updateQueuedCardData(snapshot);
    });
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
        writeUserData(user.uid, user.displayName, user.email, user.photoURL);
        updatePageData();
        //Hit the DB -> startDatabaseQueries();
        //Display Logged In State
    } else {
        userId = null;
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
  if(turnOrderObject.turnOrder[turnOrderObject.turnIndex] === userId) {
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