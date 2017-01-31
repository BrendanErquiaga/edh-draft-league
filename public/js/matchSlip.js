"use strict";

var recentlyDraftedCardArrayLimit,
    selectedPlayers = [],
    killRecords = [],
    voteRecords = [],
    winnerId = '';

$(document).ready(function() {
    requirejs(['./utils', './firebaseUtils', './slip'], function() {
        pageReady();
    });
});

function pageReady() {
    killRecords = [];
    voteRecords = [];

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
        return;
    }
    else if($.inArray(newPlayerId, selectedPlayers) !== -1){
        console.log('We already had that player');
        return;
    }

    selectedPlayers.push(newPlayerId);

    $(playerInputObject).addClass('inactive');

    updatePlayerResultsIcon(selectedPlayers.length, $(playerInputObject).attr('src'),true);
}

function resetResultsData() {
    $('.killIconsContainer').each(function(i, obj) {
        $(obj).text('');
    });

    $('.killCount').each(function(i, obj) {
        $(obj).html('')
    });

    $('.voteIconsContainer').each(function(i, obj) {
        $(obj).text('');
    });

    $('.voteCount').each(function(i, obj) {
        $(obj).html('')
    });

    $('.winIconContainer').each(function(i, obj) {
        $(obj).text('');
    });

    $('.resultsIncrementer').each(function(i, obj) {
        $(obj).addClass('inactive');
    });

    $('#player-icon-selection').children('input').each(function(i, obj) {
        $(obj).removeClass('inactive');
    });

    $('#matchSlipNotes').val("");

    updatePlayerResultsIcon(1, '/img/unknown.jpg',false);
    updatePlayerResultsIcon(2, '/img/unknown.jpg',false);
    updatePlayerResultsIcon(3, '/img/unknown.jpg',false);
    updatePlayerResultsIcon(4, '/img/unknown.jpg',false);

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

    var killCount = 0;

    killRecords.push(selectedPlayers[playerNumber - 1]);

    for (var i = 0; i < killRecords.length; i++) {
       if(killRecords[i] == selectedPlayers[playerNumber - 1]){
         killCount++;
       }
    }

    $('#player' + playerNumber + 'ResultsDiv .killCount').html('x ' + killCount);

    if(killCount > 0){
        $('#player' + playerNumber + 'ResultsDiv .killIncrement').removeClass('inactive');
    }
}

function addVoteToPlayer(playerNumber) {
    if(selectedPlayers.length < 4 || voteRecords.length >= voteLimit){
        return;
    }

    if(voteRecords.length >= 2){
        var voteCount = { };
        for (var i = 0, j = voteRecords.length; i < j; i++) {
           voteCount[voteRecords[i]] = (voteCount[voteRecords[i]] || 0) + 1;
        }

        if(voteCount[selectedPlayers[playerNumber - 1]] === voteLimit - 1){
            console.log('You cant vote for the same player more than allowed times');
            return;
        }
    }

    voteRecords.push(selectedPlayers[playerNumber - 1]);

    var voteCount = 0;


    for (var i = 0; i < voteRecords.length; i++) {
       if(voteRecords[i] == selectedPlayers[playerNumber - 1]){
         voteCount++;
       }
    }

    $('#player' + playerNumber + 'ResultsDiv .voteCount').html('x ' + voteCount);

    if(voteCount > 0){
        $('#player' + playerNumber + 'ResultsDiv .voteIncrement').removeClass('inactive');
    }
}

function addWinToPlayer(playerNumber) {
    if(selectedPlayers.length < 4 || winnerId !== ''){
        return;
    }

    winnerId = selectedPlayers[playerNumber - 1];

    $('#player' + playerNumber + 'ResultsDiv .winIncrement').removeClass('inactive');

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
    resultsObject.players = selectedPlayers.sort();
    resultsObject.killRecords = killRecords.sort();
    resultsObject.voteRecords = voteRecords.sort();
    resultsObject.winnerId = winnerId;
    resultsObject.podId = getCombinedStringFromArray(resultsObject.players).hashCode();
    resultsObject.notes = $('#matchSlipNotes').val();

    saveUnapprovedMatchResult(resultsObject);

    $('#submittedSlipDisplay').html(getTableResultsRow(1,resultsObject));
    $('#MatchSlip-Modal').fadeToggle('200');
    resetResultsData();
}

function getTableResultsRow(resultKey, result) {
  var baseTableItem = $('<tr>', { class: 'data-row', id: resultKey}),
      dateCell = $('<td>', { class: 'cell-date'}),
      playersCell = $('<td>', {class: 'cell-players'}),
      playerCellTable = $('<table>', {});

  dateCell.html(getDateString(result.submissionDate));

  baseTableItem.append(dateCell);

  for(var playerIndex = 0; playerIndex < result.players.length; playerIndex++){
    var playerId = result.players[playerIndex],
        playerRow = $('<tr>', {}),
        playerNameCell = $('<td>', {});

    if(result.winnerId === playerId){
      $(playerNameCell).addClass('winner');
    }

    playerNameCell.html(usersSnapshot[playerId].username);

    playerRow.append(playerNameCell);
    playerCellTable.append(playerRow);
  }

  playersCell.append(playerCellTable);
  baseTableItem.append(playersCell);

  var pointsCell = $('<td>', { class: 'cell-points'}),
      pointsCellTable = $('<table>', {}),
      killCount = 0,
      voteCount = 0;

  for(var playerIndex = 0; playerIndex < result.players.length; playerIndex++){
    var playerId = result.players[playerIndex],
        pointRow = $('<tr>', {}),
        pointStringCell = $('<td>', {}),
        cellString = '';

    if(killCount < killLimit){
      for(var killerIdIndex = 0; killerIdIndex < result.killRecords.length; killerIdIndex++){
        if(result.killRecords[killerIdIndex] === playerId){
          cellString += "K,";
          killCount++;
        }
      }
    }

    if(voteCount < voteLimit){
      for(var voterIdIndex = 0; voterIdIndex < result.voteRecords.length; voterIdIndex++){
        if(result.voteRecords[voterIdIndex] === playerId){
          cellString += "V,";
          voteCount++;
        }
      }
    }

    if(result.winnerId === playerId){
      cellString += "W,";
    }

    if(cellString === ''){
      cellString = '-';
    }
    else {
      cellString = cellString.slice(0, -1);//trim the trailing comma
    }

    pointStringCell.html(cellString);
    pointRow.append(pointStringCell);
    pointsCellTable.append(pointRow);
  }

  pointsCell.append(pointsCellTable);
  baseTableItem.append(pointsCell);

  var notesCell = $('<td>', { class: 'cell-notes'}),
      notesCellTable = $('<table>', {}),
      notesRow = $('<tr>', {}),
      notesDeltaCell = $('<td>', {});

  notesDeltaCell.html(result.notes);
  notesRow.append(notesDeltaCell);
  notesCellTable.append(notesRow);
  notesCell.append(notesCellTable);
  baseTableItem.append(notesCell);

  return baseTableItem;
}

/* ~~~~~~~~~~~~~~~ UI Updates ~~~~~~~~~~~~~~~ */

//Use the leagues actual player icons
function updateMatchSlipPlayerIcons() {
  if(usersSnapshot[currentUserId].leagueId === undefined || usersSnapshot[currentUserId].leagueId === null) {
    return;
  }

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

function updatePlayerResultsIcon(index, imgSource, active) {
    var imageObject = $('#player' + index + 'ResultsDiv .playerResultsIcon');

    $(imageObject).attr('src', imgSource);
    if(active){
      $(imageObject).removeClass('inactive');
    } else {
      $(imageObject).addClass('inactive');
    }
}

function toggleResultsSubmittableUI(resultsCanBeSubmitted) {
    if(resultsCanBeSubmitted){
        $('#match-slip-submit').removeClass('inactive');
    }
    else {
        $('#match-slip-submit').addClass('inactive');
    }
}
