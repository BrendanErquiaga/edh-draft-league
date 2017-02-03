"use strict";

var recentlyDraftedCardArrayLimit = 500;

$(document).ready(function() {
    requirejs(['./utils','./firebaseUtils', './slip'], function(){
          pageReady();
     });
});

function pageReady(){
  getFirebaseData();
}

/*
~~~~~~~UI UPDATE~~~~~~~~~~
*/

//TODO: Right now this just clears the whole list every time, should only do that on load
function updateRecentlyDraftedCardsUI(){
  var recentlyDraftedUL = $("#draftedCardList");

  $("#recentlyDraftedList").empty();

  for(var i = recentlyDraftCards.length - 1; i >= 0; i--){
    var pickTimeDate = new Date(recentlyDraftCards[i].pickTime);

    recentlyDraftedUL.append('<li><span class="drafter">'
    + usersSnapshot[recentlyDraftCards[i].drafterId].username + '</span> - <span class="card">'
    + recentlyDraftCards[i].name + '</span> - <span class="timestamp">'
    + pickTimeDate.toLocaleTimeString() + '</span></li>');
  }
}
