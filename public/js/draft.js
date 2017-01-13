"use strict";

var recentlyDraftedCardArrayLimit = 3,
    slipOptionsObject = {
      minimumSwipeVelocity: 0.5
    };

$(document).ready(function() {
    requirejs(['./utils','./firebaseUtils', './slip'], function(){
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

  $.getJSON(cardNamesLocation, function(data) {
      cardNamesLocal = data;
  });

  $.getJSON(lowercaseCardNamesLocation, function(data) {
      lowercaseCardNamesLocal = data;
  });

	queueHandler();
}

/* ~~~~~~~~~~~~~~~ Front End Stuff ~~~~~~~~~~~~~~~~~~~~ */
// Queue Re-Ordering via slip.js
function queueHandler() {
	var list = $('#queuedCards')[0];
	//console.log(list);

	list.addEventListener('slip:afterswipe', function(e){
		//e.target.parentNode.appendChild(e.target);
    removeCardFromUserQueue(e.target);
		e.target.remove();
	}, false);

	list.addEventListener('slip:reorder', function(e){
		e.target.parentNode.insertBefore(e.target, e.detail.insertBefore);
    userMovedQueuedCard();
		return false;
	}, false);

	return new Slip(list, slipOptionsObject);
}

function pickCardForUser(card) {
  if(card === false){
    console.log('That isnt a valid card, Cant Draft');
    return;
  }

    savePickedCardToFirebase(getCardObject(card), currentUserId);

    goToNextTurn();
}

function queueCardForUser(card) {
  if(card === false){
    console.log('That isnt a valid card, Cant Queue');
    return;
  }

  if($.inArray(card, userQueuedCards) !== -1){
    console.log('You already had that card in your queue.');
    return;
  }

  saveCardToUserQueue(card);
}

function validateCard(card) {
  var convertedCardName = getConvertedCardName(card);

  if(convertedCardName === false){
    console.log('That wasnt a real card ?_?', card);
    return false;
  }

  if (cardIsBanned(convertedCardName)) {
      console.log('Card is banned. -_-');
      return false; //Don't draft a card if it's banned
  }

  if (!cardIsFree(convertedCardName)) {
    console.log('Someone already had that card. :(');
    return false; //Someone already had that card, do something about that
  }

  return convertedCardName;
}

function pickOrQueueCard(card){
  if(currentUsersTurn()){
    pickCardForUser(validateCard(card));
  }
  else {
    console.log('Its not your turn, so I put the card in your queue');
    queueCardForUser(validateCard(card));
  }
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
      if(key === currentUserId){
        childSnapshot.forEach(function(cardObjectSnapshot) {
            pickedCardUL.append('<li>' + cardObjectSnapshot.val().name + '</li>');
            pickedCardCount++;
        });
      }
  });

  $('#userPickedCardCountIndicator').html(pickedCardCount);
}

function matchAutoDraftSwitch() {
  if(usersSnapshot[currentUserId].autoDraft === true){
    $('#autoDraftSwitch').prop('checked', true);
  } else {
    $('#autoDraftSwitch').prop('checked', false);
  }
}

function matchGlobalSubscribeSwitch() {
  if(usersSnapshot[currentUserId].globallySubscribed === true){
    $('#globalSubscribeSwitch').prop('checked', true);
  } else {
    $('#globalSubscribeSwitch').prop('checked', false);
  }
}

function updateDraftInfoUI() {
  if(draftDataObject !== null && draftDataObject !== undefined){
    $('#roundNumberIndicator').html(draftDataObject.roundNumber);
    $('#cardsDraftedIndicator').html(draftDataObject.draftedCardCount);
  }
}

function updateTurnSpecificUI() {
  if(turnOrderObject !== null && turnOrderObject !== undefined){
    updateRoundTracker();
    updatePickOrQueueButton();
  }
}

function updatePickOrQueueButton() {
  var buttonString = 'Queue';

  if(turnOrderObject.turnOrder[turnOrderObject.turnIndex] === currentUserId){
    buttonString = 'Pick';
  }

  $('#card-submit').html(buttonString)
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
