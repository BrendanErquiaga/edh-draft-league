"use strict";

var killIconLocation = "img/icons/kill_icon.png",
    voteIconLocation = "img/icons/vote_icon.png",
    winIconLocation = "img/icons/win_icon.png",
    recentlyDraftedCardArrayLimit,
    selectedPlayers = [],
    killRecords = [],
    voteRecords = [],
    winnerId = '',
    killLimit = 3,
    voteLimit = 4;

$(document).ready(function() {
    requirejs(['./utils', './firebaseUtils', './slip'], function() {
        pageReady();
    });
});

function pageReady() {
    getFirebaseData();

    catchMatchSlipPageInput();
}

function catchMatchSlipPageInput() {
    $('.killIncrement').on('click', function(e) {
        addKillToPlayer(getPlayerNumberFromInput($(this)));
    });

    $('.voteIncrement').on('click', function(e) {
        addVoteToPlayer(getPlayerNumberFromInput($(this)));
    });

    $('.winIncrement').on('click', function(e) {
        addWinToPlayer(getPlayerNumberFromInput($(this)));
    });

    $('#player-icon-selection').on('click',"input", function(e) {
        selectPlayer($(this));
    });

    $('#resultsResetButton').on('click', function(e) {
        resetResultsData();
    });

    $('#match-slip-submit').on('click', function(e) {
        submitMatchResults();
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

function getPlayerIdFromInput(inputObject){
    var firstInputObject = inputObject[0],
        objectID;

    if($(firstInputObject).attr('class') !== "playerSelectionIcon"){
        console.log('Not what I wanted?',firstInputObject.class);
        return false;
    }

    objectID = $(firstInputObject).attr('id');

    return objectID.replace('selectionIcon_', "");
}

function selectPlayer(playerInputObject) {
    if(selectedPlayers.length >= 4){
        console.log('We already have 4 players');
        return;
    }

    var newPlayerId = getPlayerIdFromInput(playerInputObject)

    if(newPlayerId === false){
        console.log('Something bad happened, abort');
        return;
    }
    else if($.inArray(newPlayerId, selectedPlayers) !== -1){
        console.log('We already had that player');
        return;
    }

    selectedPlayers.push(newPlayerId);

    $(playerInputObject).addClass('inactive');

    updatePlayerResultsIcon(selectedPlayers.length, $(playerInputObject).attr('src'));
}

function resetResultsData() {
    $('.killIconsContainer').each(function(i, obj) {
        $(obj).text('');
    });

    $('.voteIconsContainer').each(function(i, obj) {
        $(obj).text('');
    });

    $('.winIconContainer').each(function(i, obj) {
        $(obj).text('');
    });

    $('#player-icon-selection').children('input').each(function(i, obj) {
        $(obj).removeClass('inactive');
    });

    updatePlayerResultsIcon(1, '/img/icons/p1.png');
    updatePlayerResultsIcon(2, '/img/icons/p2.png');
    updatePlayerResultsIcon(3, '/img/icons/p3.png');
    updatePlayerResultsIcon(4, '/img/icons/p4.png');

    selectedPlayers = [];
    killRecords = [];
    voteRecords = [];
    winnerId = '';

    toggleResultsSubmittableUI(false);
}

function addKillToPlayer(playerNumber) {
    if(selectedPlayers.length < 4 || killRecords.length >= killLimit){
        return;
    }

    $('#player' + playerNumber + 'ResultsDiv .killIconsContainer').prepend($('<img>', {
        class: 'killIcon',
        src: killIconLocation
    }));

    killRecords.push(selectedPlayers[playerNumber - 1]);
}

function addVoteToPlayer(playerNumber) {
    if(selectedPlayers.length < 4 || voteRecords.length >= voteLimit){
        return;
    }

    $('#player' + playerNumber + 'ResultsDiv .voteIconsContainer').prepend($('<img>', {
        class: 'voteIcon',
        src: voteIconLocation
    }));

    voteRecords.push(selectedPlayers[playerNumber - 1]);

    //TODO: Make it so you can't vote the same player 4 times
}

function addWinToPlayer(playerNumber) {
    if(selectedPlayers.length < 4 || winnerId !== ''){
        return;
    }

    $('#player' + playerNumber + 'ResultsDiv .winIconContainer').prepend($('<img>', {
        class: 'winIcon',
        src: winIconLocation
    }));

    winnerId = selectedPlayers[playerNumber - 1];

    toggleResultsSubmittableUI(true);
}

function submitMatchResults() {
    if($('#match-slip-submit').hasClass('inactive')){
        console.log('Results not valid');
        return;
    }

    var resultsObject = {};

    resultsObject.submissionDate = Date.now();
    resultsObject.submittingPlayerName = usersSnapshot[currentUserId].username;
    resultsObject.players = selectedPlayers;
    resultsObject.killRecords = killRecords;
    resultsObject.voteRecords = voteRecords;
    resultsObject.winnerId = winnerId;

    addUnapprovedMatchResult(resultsObject);

    alert("Match Result Submitted: \n" + JSON.stringify(resultsObject));
    //TODO: Add Better Confirmation Feedback
    resetResultsData();
}

/* ~~~~~~~~~~~~~~~ UI Updates ~~~~~~~~~~~~~~~ */

//Use the leagues actual player icons
function updateMatchSlipPlayerIcons() {
  var leagueMembers = leagueDataObject[usersSnapshot[currentUserId].leagueId].members;

  $('#player-icon-selection').empty();

  //console.log(leagueMembers);
  $.each(leagueMembers, function (key, val){
    $('#player-icon-selection').prepend($('<input>', {
        type: 'image',
        src: usersSnapshot[val].profile_picture,
        class: 'playerSelectionIcon',
        id: 'selectionIcon_' + val
    }));
  });
}

function updatePlayerResultsIcon(index, imgSource) {
    var imageObject = $('#player' + index + 'ResultsDiv .playerResultsIcon');

    $(imageObject).attr('src', imgSource);
    $(imageObject).removeClass('inactive');
}

function toggleResultsSubmittableUI(resultsCanBeSubmitted) {
    if(resultsCanBeSubmitted){
        $('#match-slip-submit').removeClass('inactive');
    }
    else {
        $('#match-slip-submit').addClass('inactive');
    }
}
