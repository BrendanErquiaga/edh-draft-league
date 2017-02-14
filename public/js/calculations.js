"use strict";

var playerElo = {},
    defaultElo = 800,
    ratingDivider = 400,
    ratingExponent = 10,
    kValue = 50,
    win_SValue = 1.25,
    firstKill_SValue = 0.75,
    secondKill_SValue = 0.5,
    thirdKill_SValue = 0,
    firstVote_SValue = 0,
    secondVote_SValue = 1.5,
    thirdVote_SValue = 2.5;

function recalculatePlayerElo(){
  var newEloObject = {};

  matchResultsSnapshot.forEach(function(obj) {
    var matchResult = obj.val();

    newEloObject = calculateNewPlayerElo(newEloObject, matchResult);

    //TODO Save out Elo Delta
  });

  //console.log(newEloObject);
  savePlayerElo(newEloObject);
}

function calculateNewPlayerElo(eloObjectToEdit, matchResult) {
  var averageElo = 0,
      playerIds = [],
      tempEloObject = eloObjectToEdit;

  if(tempEloObject === null){
    tempEloObject = {};
  }

  for(var i = 0; i < matchResult.players.length; i++){
    playerIds.push(matchResult.players[i]);

    if(tempEloObject[playerIds[i]] === undefined){
      tempEloObject[playerIds[i]] = getBaseEloObject();
    }
  }

  averageElo = getAverageElo(tempEloObject);

  var convertedAverageRating = getConvertedRating(averageElo);

  $.each(tempEloObject,function(playerId, playerEloObject) {
    if($.inArray(playerId, matchResult.players) !== -1){
      var convertedPlayerRating = getConvertedRating(playerEloObject.currentElo),
          expectedScore = convertedPlayerRating / (convertedPlayerRating + convertedAverageRating),
          sValue = getSValue(playerId, matchResult),
          newEloRating = 0;

      newEloRating = Math.floor(playerEloObject.currentElo + kValue * (sValue - expectedScore));

      playerEloObject.eloDelta = Math.floor(newEloRating - playerEloObject.currentElo);

      playerEloObject.currentElo = newEloRating;

      playerEloObject = calculateNewEloHighLows(playerEloObject);
    }
  });

  return tempEloObject;
}

function calculateNewEloHighLows(playerEloObject) {
  var tempPlayerEloObject = playerEloObject;

  if(tempPlayerEloObject.currentElo < tempPlayerEloObject.minElo){
    tempPlayerEloObject.minElo = tempPlayerEloObject.currentElo;
  }
  else if(tempPlayerEloObject.currentElo > tempPlayerEloObject.maxElo){
    tempPlayerEloObject.maxElo = tempPlayerEloObject.currentElo;
  }

  return tempPlayerEloObject;
}

function getSValue(playerId, matchResult) {
  var temp_SValue = 0,
      killCount = 0,
      voteCount = 0;

  if(playerId === matchResult.winnerId){
    temp_SValue += win_SValue;
  }

  if(matchResult.killRecords !== undefined && matchResult.killRecords !== null){
    for(var killerIdIndex = 0; killerIdIndex < matchResult.killRecords.length; killerIdIndex++){
      if(matchResult.killRecords[killerIdIndex] === playerId){
        killCount++;
      }
    }
  }

  temp_SValue += getKill_SValue(killCount);

  if(matchResult.voteRecords !== undefined && matchResult.voteRecords !== null){
    for(var voterIdIndex = 0; voterIdIndex < matchResult.voteRecords.length; voterIdIndex++){
      if(matchResult.voteRecords[voterIdIndex] === playerId){
        voteCount++;
      }
    }
  }

  temp_SValue += getVote_SValue(voteCount);

  return temp_SValue;
}

function getKill_SValue(killCount) {
  switch (killCount) {
    case 1:
      return firstKill_SValue;
    case 2:
      return firstKill_SValue + secondKill_SValue;
    case 3:
      return firstKill_SValue + secondKill_SValue + thirdKill_SValue;
    default:
      return 0;
  }
}

function getVote_SValue(voteCount) {
  switch (voteCount) {
    case 1:
      return firstVote_SValue;
    case 2:
      return secondVote_SValue;
    case 3:
      return thirdVote_SValue;
    default:
      return 0;
  }
}

function getConvertedRating(eloValue) {
  var tempRating = eloValue / ratingDivider;

  return Math.pow(ratingExponent, tempRating);
}

function getAverageElo(eloArray) {
  var totalElo = 0,
      eloLength = Object.keys(eloArray).length;

  $.each(eloArray,function(index, val){
    totalElo+= parseFloat(val.currentElo) || 0;
  });

  return (totalElo / eloLength);
}

function getBaseEloObject() {
  var tempBaseElo = {};

  tempBaseElo.currentElo = defaultElo;
  tempBaseElo.maxElo = defaultElo;
  tempBaseElo.minElo = defaultElo;
  tempBaseElo.eloDelta = 0;

  return tempBaseElo;
}

//Gets new player records from every match matchResult
function recalculatePlayerStats() {
  var newStatsObject = {};

  matchResultsSnapshot.forEach(function(obj) {
    var matchResult = obj.val();

    newStatsObject = calculateNewPlayerStats(newStatsObject, matchResult);
  });

  savePlayerStats(getSortedStatsObject(newStatsObject));
}

function calculateNewPlayerStats(statsObjectToEdit, matchResult) {
  if(statsObjectToEdit === null){
    statsObjectToEdit = {};
  }

  for(var playerIndex = 0; playerIndex < matchResult.players.length; playerIndex++){
    var playerId = matchResult.players[playerIndex];

    if(statsObjectToEdit[playerId] === undefined){
      statsObjectToEdit[playerId] = getBasePlayerStatsObject();
    }
    statsObjectToEdit[playerId].gamesPlayed++;

    if(matchResult.killRecords !== undefined && matchResult.killRecords !== null){
      for(var killerIdIndex = 0; killerIdIndex < matchResult.killRecords.length; killerIdIndex++){
        if(matchResult.killRecords[killerIdIndex] === playerId){
          statsObjectToEdit[playerId].kills++;
        }
      }
    }

    if(matchResult.voteRecords !== undefined && matchResult.voteRecords !== null){
      for(var voterIdIndex = 0; voterIdIndex < matchResult.voteRecords.length; voterIdIndex++){
        if(matchResult.voteRecords[voterIdIndex] === playerId){
          statsObjectToEdit[playerId].votesEarned++;
        }
      }
    }

    if(matchResult.winnerId === playerId){
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
