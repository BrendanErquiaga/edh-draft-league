"use strict";

//Gets new player records from every match result
function recalculatePlayerStats() {
  var newStatsObject = {};

  matchResultsSnapshot.forEach(function(obj) {
    var result = obj.val();

    newStatsObject = calulateNewPlayerStats(newStatsObject, result);
  });

  savePlayerStats(getSortedStatsObject(newStatsObject));
}

function calulateNewPlayerStats(statsObjectToEdit, result) {
  if(statsObjectToEdit === null){
    statsObjectToEdit = {};
  }

  for(var playerIndex = 0; playerIndex < result.players.length; playerIndex++){
    var playerId = result.players[playerIndex];

    if(statsObjectToEdit[playerId] === undefined){
      statsObjectToEdit[playerId] = getBasePlayerStatsObject();
    }
    statsObjectToEdit[playerId].gamesPlayed++;

    for(var killerIdIndex = 0; killerIdIndex < result.killRecords.length; killerIdIndex++){
      if(result.killRecords[killerIdIndex] === playerId){
        statsObjectToEdit[playerId].kills++;
      }
    }

    for(var voterIdIndex = 0; voterIdIndex < result.voteRecords.length; voterIdIndex++){
      if(result.voteRecords[voterIdIndex] === playerId){
        statsObjectToEdit[playerId].votesEarned++;
      }
    }

    if(result.winnerId === playerId){
      statsObjectToEdit[playerId].gamesWon++;
    }
  }

  return statsObjectToEdit;
}

function getSortedStatsObject(newStatsObject) {
    var keys = Object.keys(newStatsObject),
        tempObject = {};

    keys.sort();

    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];

      if($.inArray(k, Object.keys(usersSnapshot)) !== -1){
        tempObject[k] = newStatsObject[k];
      }
    }

    return tempObject;
}

function getBasePlayerStatsObject() {
  var tempStatsObject = {};

  tempStatsObject.gamesPlayed = 0;
  tempStatsObject.gamesWon = 0;
  tempStatsObject.kills = 0;
  tempStatsObject.votesEarned = 0;

  return tempStatsObject;
}
