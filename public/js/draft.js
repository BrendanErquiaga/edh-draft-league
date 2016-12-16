"use strict";

var recentlDraftedCardArrayLimit = 10;

$(document).ready(function() {
    requirejs(['./utils','./firebaseUtils'], function(){
          pageReady();
     });
});

function pageReady(){
  getFirebaseData();

  catchDraftPageInput();

  initTypeAhead();

  $.getJSON(allcardsLocation, function(data) {
      allcardsLocal = data;
  });
}

function pickCardForUser(card) {
    if (cardIsBanned(card)) {
        console.log('Card is banned. (Cant Draft)');
        return; //Don't draft a card if it's banned
    }

    if (!cardIsFree(card)) {
      console.log('Someone already had that card. (Cant Draft)');
      return; //Someone already had that card, do something about that
    }

    savePickedCardToFirebase(getCardObject(card), userId);

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

function pickOrQueueCard(card){
  if(!cardStringIsValid()){
    return;
  }

  if(currentUsersTurn()){
    pickCardForUser(card);
  }
  else {
    console.log('Its not your turn, so I put the card in your queue');
    queueCardForUser(card);
  }
}

function cardStringIsValid(card) {
  // if(validCardRegEx.test(card)) {
  //   console.log('A+');
  //   return true;
  // }

  //TODO: DO THIS

  return true;
}

function catchDraftPageInput() {
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

    $('#globalSubscribeSwitch').change(function(){
      saveGlobalSubscribeStatus(this.checked);
    });
}

function clearCardInputField() {
    $('#form-card').val('');
}

/*
~~~~~~~UI UPDATE~~~~~~~~~~
*/

//TODO: Right now this just clears the whole list every time, should only do that on load
function updateRecentlyDraftedCardsUI(){
  var recentlyDraftedUL = $("#recentlyDraftedList");

  recentlyDraftedUL.empty();

  for(var i = 0; i < recentlyDraftCards.length; i++){
    recentlyDraftedUL.append('<li>' +
      usersSnapshot[recentlyDraftCards[i].drafterId].username + ' - ' +
      recentlyDraftCards[i].name + '</li>');
  }
}

//TODO: Right now this just clears the whole list every time, should only do that on load
function updateQueuedCardsUI(){
  var queuedCardsUL = $("#queuedCards");

  queuedCardsUL.empty();

  for(var i = 0; i < userQueuedCards.length; i++){
    queuedCardsUL.append('<li>' + userQueuedCards[i] + '</li>');
  }

  $('#userQueuedCardCountIndicator').html(userQueuedCards.length);
}

//TODO: Right now this just clears the whole list every time, should only do that on load
function updatePickedCardsUI(){
  var pickedCardUL = $("#pickedCards"),
      pickedCardCount = 0;
  pickedCardUL.empty();

  draftedCardsSnapshot.forEach(function(childSnapshot) {
      var key = childSnapshot.key;
      var val = childSnapshot.val();
      if(key === userId){
        childSnapshot.forEach(function(cardObjectSnapshot) {
            pickedCardUL.append('<li>' + cardObjectSnapshot.val().name + '</li>');
            pickedCardCount++;
        });
      }
  });

  $('#userPickedCardCountIndicator').html(pickedCardCount);
}

function matchAutoDraftSwitch() {
  if(usersSnapshot[userId].autoDraft === true){
    $('#autoDraftSwitch').prop('checked', true);
  }
}

function matchGlobalSubscribeSwitch() {
  if(usersSnapshot[userId].globallySubscribed === true){
    $('#globalSubscribeSwitch').prop('checked', true);
  }
}

function updateDraftInfoUI() {
  if(draftDataObject !== null && draftDataObject !== undefined){
    $('#roundNumberIndicator').html(draftDataObject.roundNumber);
    $('#cardsDraftedIndicator').html(draftDataObject.draftedCardCount);
  }
  if(turnOrderObject !== null && turnOrderObject !== undefined){
    updateRoundTracker();
  }
}

function updateRoundTracker() {
  var turnedOrderUL = $('#turnOrderList');
  turnedOrderUL.empty();

  for(var i = 0; i < turnOrderObject.turnOrder.length;i++){
    var liClass = '';
    if(i === turnOrderObject.turnIndex){
      liClass = 'activePlayer';
    }

    turnedOrderUL.append('<li class="' + liClass + '">' + usersSnapshot[turnOrderObject.turnOrder[i]].username + '</li>');
  }

  if(turnOrderObject.ascendingTurnOrder){
    $('#roundTrackerDirection').attr("src","img/icons/arrow-down.svg");
  }
  else {
    $('#roundTrackerDirection').attr("src","img/icons/arrow-up.svg");
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
                    cb(
                      matches.sort(function(a, b){
                        return a.length - b.length;
                      })
                    );
                };
            };
            retrievedData = localStorage.getItem("mtgjsonLocation");
            cards = JSON.parse(retrievedData);
            $('#userInput .typeahead').typeahead({
                hint: false,
                highlight: true,
                minLength: 2
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
