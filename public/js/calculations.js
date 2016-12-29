"use strict";

//Gets new player records from every match result
function recalculatePlayerStats() {
  var newStatsObject = {};

  matchResultsSnapshot.forEach(function(obj) {
    var result = obj.val();

    for(var playerIndex = 0; playerIndex < result.players.length; playerIndex++){
      var playerId = result.players[playerIndex];

      if(newStatsObject[playerId] === undefined){
        newStatsObject[playerId] = getBasePlayerStatsObject();
      }

      newStatsObject[playerId].gamesPlayed++;

      for(var killerIdIndex = 0; killerIdIndex < result.killRecords.length; killerIdIndex++){
        if(result.killRecords[killerIdIndex] === playerId){
          newStatsObject[playerId].kills++;
        }
      }

      for(var voterIdIndex = 0; voterIdIndex < result.voteRecords.length; voterIdIndex++){
        if(result.voteRecords[voterIdIndex] === playerId){
          newStatsObject[playerId].votesEarned++;
        }
      }

      if(result.winnerId === playerId){
        newStatsObject[playerId].gamesWon++;
      }
    }
  });

  console.log(newStatsObject);
  savePlayerStats(newStatsObject);
}

function getBasePlayerStatsObject() {
  var tempStatsObject = {};

  tempStatsObject.gamesPlayed = 0;
  tempStatsObject.gamesWon = 0;
  tempStatsObject.votesEarned = 0;
  tempStatsObject.kills = 0;

  return tempStatsObject;
}
