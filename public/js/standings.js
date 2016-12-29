"use strict";

var recentlyDraftedCardArrayLimit = 0;

$(document).ready(function() {
    requirejs(['./utils', './firebaseUtils', './calculations'], function() {
        pageReady();
    });
});

function pageReady() {
    getFirebaseData();
}

function updatePlayerStatsTable() {
  var statsTable = $(".standings-table table");

  statsTable.empty();

  playerStatsSnapshot.forEach(function(obj) {
    statsTable.append(getPlayerStatsTableRow(obj.key, obj.val()));
  });
}

function updateMatchRecordsTable() {
  var matchRecordsTable = $(".match-table table");

  matchRecordsTable.empty();

  matchResultsSnapshot.forEach(function(obj) {
    matchRecordsTable.prepend(getTableResultsRow(obj.key, obj.val()));
  });

  $(matchRecordsTable).prepend('<tr class="data-header-fixed"><th class="cell-date">Date</th><th class="cell-players">Players</th><th class="cell-points">Points</th><th class="cell-elo">ELO Delta</th></tr>');
}

function getPlayerStatsTableRow(playerId, playerStatObject) {
  console.log('Player id:', playerId);
  console.log('Player stat object:', playerStatObject);
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

  var eloCell = $('<td>', { class: 'cell-elo'}),
      eloCellTable = $('<table>', {});

  for(var playerIndex = 0; playerIndex < result.players.length; playerIndex++){
    var playerId = result.players[playerIndex],
        eloRow = $('<tr>', {}),
        eloDeltaCell = $('<td>', {});

    eloDeltaCell.html('+50');
    eloRow.append(eloDeltaCell);
    eloCellTable.append(eloRow);
  }

  eloCell.append(eloCellTable);
  baseTableItem.append(eloCell);

  return baseTableItem;
}
