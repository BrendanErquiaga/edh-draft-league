"use strict";

var killIconLocation = "img/icons/kill_icon.png",
    voteIconLocation = "img/icons/vote_icon.png",
    winIconLocation = "img/icons/win_icon.png";

$(document).ready(function() {
    requirejs(['./utils','./firebaseUtils', './slip'], function(){
          pageReady();
     });
});

function pageReady(){
  //getFirebaseData();

  catchMatchSlipPageInput();
}

function catchMatchSlipPageInput() {
      $('.killIncrement').on('click', function(e) {
          addKillIconToPlayer(getPlayerNumberFromInput($(this)));
      });

      $('.voteIncrement').on('click', function(e) {
          addVoteIconToPlayer(getPlayerNumberFromInput($(this)));
      });

      $('.winIncrement').on('click', function(e) {
          addWinIconToPlayer(getPlayerNumberFromInput($(this)));
      });

    $('#resultsResetButton').on('click', function(e) {
        resetResultsData();
    });
}

function getPlayerNumberFromInput(inputObject) {
    var inputObjectParents = inputObject.parents(),
        valueToReturn = false;

    $.each(inputObjectParents, function(key, value) {
        var parentObjectId = $(value).attr('id');
        switch (parentObjectId) {
            case "player1ResultsDiv":
                valueToReturn = 1;
                return false;
            case "player2ResultsDiv":
                valueToReturn = 2;
                return false;
            case "player3ResultsDiv":
                valueToReturn = 3;
                return false;
            case "player4ResultsDiv":
                valueToReturn = 4;
                return false;
        }
    });

    return valueToReturn;
}

function resetResultsData() {
  $('.killIconsContainer').each(function(i, obj) {
    $(obj).text('');
    //console.log(obj);
  });

  $('.voteIconsContainer').each(function(i, obj) {
    $(obj).text('');
  });

  $('.winIconContainer').each(function(i, obj) {
    $(obj).text('');
  });
}

function addKillIconToPlayer(playerNumber) {
  $('#player' + playerNumber + 'ResultsDiv .killIconsContainer').prepend($('<img>',{class:'killIcon',src:killIconLocation}))
}

function addVoteIconToPlayer(playerNumber) {
  $('#player' + playerNumber + 'ResultsDiv .voteIconsContainer').prepend($('<img>',{class:'voteIcon',src:voteIconLocation}))
}

function addWinIconToPlayer(playerNumber) {
  $('#player' + playerNumber + 'ResultsDiv .winIconContainer').prepend($('<img>',{class:'winIcon',src:winIconLocation}))
}