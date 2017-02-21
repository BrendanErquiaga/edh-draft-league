"use strict";

var recentlyDraftedCardArrayLimit = 0,
    chartBarBackgroundColors = [
      'rgba(255, 99, 132, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(151, 255, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(111, 64, 255, 0.7)',
      'rgba(10, 162, 43, 0.7)',
      'rgba(245, 66, 101, 0.7)',
      'rgba(96, 207, 255, 0.7)'
    ];

$(document).ready(function() {
    requirejs(['./utils', './firebaseUtils', './calculations'], function() {
        pageReady();
    });
});

function pageReady() {
    getFirebaseData();
}

function updateEloStandingsChart() {
    var eloData = [],
        chartLabels = [],
        sortedPlayerElo = [];

    $('#eloStandings').replaceWith('<canvas id="eloStandings"></canvas>');//Delete the old chart

    sortedPlayerElo = createWaiverWireOrder();

    for(var i = sortedPlayerElo.length - 1; i >= 0; i--){
      eloData.push(sortedPlayerElo[i].currentElo);
      chartLabels.push(usersSnapshot[sortedPlayerElo[i].key].username.substr(0, usersSnapshot[sortedPlayerElo[i].key].username.indexOf(' ')));
    }

    var ctx = $("#eloStandings");
    var eloStandingsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                data: eloData,
                backgroundColor: chartBarBackgroundColors,
                borderColor: "#000",
                borderWidth: 1
            }]
        },
        options: {
            title: {
                display: true,
                text: 'ELO Rating',
                fontColor: "#222"
            },
            maintainAspectRatio: true,
            responsive: true,
            legend: {
                display: false,
            },
            tooltips: {
                enabled: true,
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        fontColor: "#222"
                    },
                    gridLines: {
                        show: true,
                        color: "rgba(80, 80, 80, 0.5)",
                    }
                }],
                xAxes: [{
                    ticks: {
                        beginAtZero: true,
                        fontColor: "#222"
                    },
                    gridLines: {
                        show: true,
                        color: "rgba(80, 80, 80, 0.5)",
                    }
                }]
            }
        }
    });
}

function updatePlayerStatsTable() {
  var statsTable = $(".standings-table table");

  statsTable.empty();

  playerStatsSnapshot.forEach(function(obj) {
    statsTable.append(getPlayerStatsTableRow(obj.key, obj.val()));
  });

  $(statsTable).prepend('<tr class="data-header-fixed"><th class="cell-players">Players</th><th class="cell-games">Games</th><th class="cell-wins">Wins</th><th class="cell-kills">Kills</th><th class="cell-votes">Votes</th><th class="cell-votes">Win %</th><th class="cell-votes">KPG</th><th class="cell-votes">VPG</th></tr>');
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
    var baseRowObject = $('<tr>', {class: 'data-row'}),
        playerNameCell = $('<td>', {class: 'cell-players'}),
        playerGameCountCell = $('<td>', {class: 'cell-games'}),
        playerWinCountCell = $('<td>', {class: 'cell-wins'}),
        playerKillCountCell = $('<td>', {class: 'cell-kills'}),
        playerVoteCountCell = $('<td>', {class: 'cell-votes'}),
        playerWinPercentCell = $('<td>', {class: 'cell-votes'}),
        playerKPGCell = $('<td>', {class: 'cell-votes'}),
        playerVPGCell = $('<td>', {class: 'cell-votes'});

    playerNameCell.html(usersSnapshot[playerId].username);
    playerGameCountCell.html(playerStatObject.gamesPlayed);
    playerWinCountCell.html(playerStatObject.gamesWon);
    playerKillCountCell.html(playerStatObject.kills);
    playerVoteCountCell.html(playerStatObject.votesEarned);
    playerWinPercentCell.html(getWinPercentage(playerStatObject.gamesPlayed, playerStatObject.gamesWon));
    playerKPGCell.html(getKillsPerGame(playerStatObject.gamesPlayed, playerStatObject.kills));
    playerVPGCell.html(getVotesPerGame(playerStatObject.gamesPlayed, playerStatObject.votesEarned));

    baseRowObject.append(playerNameCell);
    baseRowObject.append(playerGameCountCell);
    baseRowObject.append(playerWinCountCell);
    baseRowObject.append(playerKillCountCell);
    baseRowObject.append(playerVoteCountCell);
    baseRowObject.append(playerWinPercentCell);
    baseRowObject.append(playerKPGCell);
    baseRowObject.append(playerVPGCell);

    return baseRowObject;
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

    if(killCount < killLimit && result.killRecords !== undefined){
      for(var killerIdIndex = 0; killerIdIndex < result.killRecords.length; killerIdIndex++){
        if(result.killRecords[killerIdIndex] === playerId){
          cellString += "K,";
          killCount++;
        }
      }
    }

    if(voteCount < voteLimit && result.voteRecords !== undefined){
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
        eloDeltaCell = $('<td>', {}),
        eloDeltaValue = 0;

    if(result.playerEloDelta !== undefined){
      eloDeltaValue = result.playerEloDelta[playerId];
      if(eloDeltaValue > 0){
        $(eloDeltaCell).addClass('positiveEloValue');
      }
      else if(eloDeltaValue < 0) {
        $(eloDeltaCell).addClass('negativeEloValue');
      }
    }

    eloDeltaCell.html(eloDeltaValue);
    eloRow.append(eloDeltaCell);
    eloCellTable.append(eloRow);
  }

  eloCell.append(eloCellTable);
  baseTableItem.append(eloCell);

  return baseTableItem;
}

function getWinPercentage(gamesPlayed, gamesWon) {
  var winPercentage = gamesWon / gamesPlayed;
  winPercentage = Math.round(winPercentage * 100);

  return winPercentage.toString() + '%';
}

function getKillsPerGame(gamesPlayed, totalKills) {
  return Math.round((totalKills / gamesPlayed) * 100) / 100;
}

function getVotesPerGame(gamesPlayed, totalVotes) {
  return Math.round((totalVotes / gamesPlayed) * 100) / 100;
}
