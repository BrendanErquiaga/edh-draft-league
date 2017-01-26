'use strict';

var recentlyDraftedCardArrayLimit;

$(document).ready(function() {
    requirejs(['./utils', './firebaseUtils'], function() {
        pageReady();
    });
});

function pageReady(){
  getFirebaseData();
}

function updateDeckListUI() {
  var counter = 0;

  draftedCardsSnapshot.forEach(function(childSnapshot) {
      counter++;
      var decklistUL = $("#player" + counter + "DeckSection .playerDecklist"),
          deckTitle = $("#player" + counter + "DeckSection .playerDeckTitle"),
          playerIcon = $("#player" + counter + "DeckSection .playerSelectionIcon"),
          key = childSnapshot.key;

      decklistUL.empty();
      deckTitle.html(usersSnapshot[key].username);
      playerIcon.attr('src', usersSnapshot[key].profile_picture);
      childSnapshot.forEach(function(cardObjectSnapshot) {
          decklistUL.append('<li>' + cardObjectSnapshot.val().name + '</li>');
      });
  });
}