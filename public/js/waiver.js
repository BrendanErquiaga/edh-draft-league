"use strict";

var recentlyDraftedCardArrayLimit = 0,
    slipOptionsObject = {
      minimumSwipeVelocity: 0.4
    },
    waiverWireOrder = [];

$(document).ready(function() {
    requirejs(['./utils','./firebaseUtils', './slip'], function(){
          pageReady();
     });
});

function pageReady(){
  getFirebaseData();

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

function updateWaiverWireData() {
  initializeClock('clockdiv', new Date(waiverWireData.nextWireDate));
}

function updateWaiverWireOrder() {
  createWaiverWireOrder();
  updateWaiverWireVisuals();
}

function createWaiverWireOrder() {
  playerEloSnapshot.forEach(function(childSnapshot) {
      var key = childSnapshot.key;
      var val = childSnapshot.val();

      val.key = key;

      waiverWireOrder.push(val);
  });

  waiverWireOrder = waiverWireOrder.sort(compareByElo);
}

function updateWaiverWireVisuals() {
  var waiverOrderDiv = $('.waiver-wire-order #player-icon-section');
  waiverOrderDiv.empty();

  for(var i = 0; i < waiverWireOrder.length;i++){
    var arrowSrc = '/img/icons/arrow-right.svg';

    waiverOrderDiv.append($('<img>', {
        src: usersSnapshot[waiverWireOrder[i].key].profile_picture,
        class: 'playerTurnIndicator ',
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

function compareByElo(a,b) {
  if(a.currentElo < b.currentElo){
    return -1;
  } else if(a.currentElo > b.currentElo) {
    return 1;
  } else {
    return 0;
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
