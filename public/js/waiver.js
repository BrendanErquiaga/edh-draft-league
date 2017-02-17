"use strict";

var recentlyDraftedCardArrayLimit = 0,
    slipOptionsObject = {
      minimumSwipeVelocity: 0.4
    },
    waiverWireOrder = [],
    errorMessageResetTime = 7500,
    confirmationMessageResetTime = 7500,
    errorMessageTimeout,
    confirmationMessageTimeout;

$(document).ready(function() {
    requirejs(['./utils','./firebaseUtils', './slip'], function(){
          pageReady();
     });
});

function pageReady(){
  getFirebaseData();

  catchWaiverPageInput();

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
}

function catchWaiverPageInput() {
  $('#add-waiver-pair').on('click', function(e) {
      attemptToSaveWaiverPair();
  });

  $('#reset-waiver-pairs').on('click', function(e) {
      resetWaiverWires();
  });
}

function resetWaiverWires() {
  clearWaiverWiresForUser();
}

function attemptToSaveWaiverPair() {
  var cardToPickUp = $('#waiver-pick-up').val(),
      cardToDrop = $('#waiver-drop').val();

  cardToPickUp = validateCardToPickUp(cardToPickUp);
  cardToDrop = validateCardToDrop(cardToDrop);

  console.log('Pick Up: ' + cardToPickUp + '. Drop: ' + cardToDrop);
  if(cardToPickUp === false || cardToDrop === false){
    if(cardToPickUp === false){
      clearPickupInputField();
    }

    if(cardToDrop === false){
      clearDropInputField();
    }

    return;
  }

  createWaiverWirePair(cardToPickUp, cardToDrop);

  clearCardInputField();
}

function createWaiverWirePair(cardToPickUp, cardToDrop) {
  var waiverPair = {
    cardToPickUp: cardToPickUp,
    cardToDrop: cardToDrop
  };

  saveWaiverWirePairToUser(waiverPair);
}

function validateCardToPickUp(card) {
  if(card === null || card === undefined || card === ''){
    setErrorMessage('No card info found =/');
    return false;
  }

  var convertedCardName = getConvertedCardName(card);

  if(convertedCardName === false){
    setErrorMessage("?_? This isn't a real card " + card);
    return false;
  }

  if (cardIsBanned(convertedCardName)) {
      setErrorMessage('-_- ' + card + ' is banned. ');
      return false; //Don't draft a card if it's banned
  }

  if (!cardIsFree(convertedCardName)) {
    setErrorMessage(':( Someone already has ' + card);
    return false; //Someone already had that card, do something about that
  }

  return convertedCardName;
}

function validateCardToDrop(card) {
  if(card === null || card === undefined || card === ''){
    setErrorMessage('No card info found =/');
    return false;
  }

  var convertedCardName = getConvertedCardName(card);

  if(convertedCardName === false){
    setErrorMessage("?_? This isn't a real card " + card);
    return false;
  }

  if (cardIsBanned(convertedCardName)) {
      setErrorMessage('-_- ' + card + ' is banned. ');
      return false; //Don't draft a card if it's banned
  }

  if (!currentUserHasCard(convertedCardName)) {
    setErrorMessage(':( You dont have ' + card);
    return false; //You didn't have the card
  }

  return convertedCardName;
}

function clearCardInputField() {
    clearPickupInputField();
    clearDropInputField();
}

function clearDropInputField() {
  $('#waiver-drop').val('');
}

function clearPickupInputField() {
  $('#waiver-pick-up').val('');
}

function setErrorMessage(newMessage) {
    var previousHTML = $('#errorMessage').html();
    $('#errorMessage').html(previousHTML + ' ' + newMessage);
    clearTimeout(errorMessageTimeout);
    errorMessageTimeout = setTimeout(resetErrorMessage, errorMessageResetTime);
}

function setConfirmationMessage(newMessage) {
  var previousHTML = $('#confirmMessage').html();
  $('#confirmMessage').html(previousHTML + ' ' + newMessage);
  clearTimeout(confirmationMessageTimeout);
  confirmationMessageTimeout = setTimeout(resetConfirmationMessage, confirmationMessageResetTime);
}

function resetErrorMessage() {
  $('#errorMessage').html('');
}

function resetConfirmationMessage() {
  $('#confirmMessage').html('');
}

function resetErrorMessage() {
  $('#errorMessage').html('');
}

function updateWaiverWireData() {
  initializeClock('clockdiv', new Date(waiverWireData.nextWireDate));
}

function updateWaiverWireOrder() {
  waiverWireOrder = createWaiverWireOrder();
  updateWaiverWireVisuals();
}

function updateWaiverWirePairVisuals() {
  var waiverWireList = $("#waiver-wire-pairs");

  waiverWireList.empty();

  for(var i = 0; i < userWaiverWires.length; i++){
    waiverWireList.append('<li>Add: ' + userWaiverWires[i].cardToPickUp + ' , Drop: ' + userWaiverWires[i].cardToDrop + '</li>');
  }
}

function updateWaiverWireVisuals() {
  var waiverOrderDiv = $('.turn-order #player-icon-section');
  waiverOrderDiv.empty();

  for(var i = 0; i < waiverWireOrder.length;i++){
    var arrowSrc = '/img/icons/arrow-right.svg',
        imageClass = '';

    if(waiverWireOrder[i].key === currentUserId){
      imageClass = 'activePlayer';
    }

    waiverOrderDiv.append($('<img>', {
        src: usersSnapshot[waiverWireOrder[i].key].profile_picture,
        class: 'playerTurnIndicator ' + imageClass,
        id: 'selectionIcon_' + waiverWireOrder[i].key
    }));

    if(i !== waiverWireOrder.length - 1){
      waiverOrderDiv.append($('<img>', {
          src: arrowSrc,
          class: 'turnDirectionIndicator'
      }));
    }
  }
}

function getTimeRemaining(endtime) {
  var t = Date.parse(endtime) - Date.parse(new Date());
  var seconds = Math.floor((t / 1000) % 60);
  var minutes = Math.floor((t / 1000 / 60) % 60);
  var hours = Math.floor((t / (1000 * 60 * 60)) % 24);
  var days = Math.floor(t / (1000 * 60 * 60 * 24));
  return {
    'total': t,
    'days': days,
    'hours': hours,
    'minutes': minutes,
    'seconds': seconds
  };
}

function initializeClock(id, endtime) {
  var clock = document.getElementById(id);
  var daysSpan = clock.querySelector('.days');
  var hoursSpan = clock.querySelector('.hours');
  var minutesSpan = clock.querySelector('.minutes');
  var secondsSpan = clock.querySelector('.seconds');

  function updateClock() {
    var t = getTimeRemaining(endtime);

    daysSpan.innerHTML = t.days;
    hoursSpan.innerHTML = ('0' + t.hours).slice(-2);
    minutesSpan.innerHTML = ('0' + t.minutes).slice(-2);
    secondsSpan.innerHTML = ('0' + t.seconds).slice(-2);

    if (t.total <= 0) {
      clearInterval(timeinterval);
    }
  }

  updateClock();
  var timeinterval = setInterval(updateClock, 1000);
}



function initTypeAhead() {
    var retrievedData,
        cards;

    var typeaheadLaunch = function() {
        if ($('body').hasClass('draft') || $('body').hasClass('waiver')) {
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
