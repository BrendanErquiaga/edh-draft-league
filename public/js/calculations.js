"use strict";

var playerElo = {},
    defaultElo = 1000,
    ratingDivider = 400,
    ratingExponent = 10,
    kValue = 50,
    win_SValue = 1.25,
    firstKill_SValue = 0.75,
    secondKill_SValue = 0.5,
    thirdKill_SValue = 0,
    firstVote_SValue = 0,
    secondVote_SValue = 1.5,
    thirdVote_SValue = 2.5,
    kValue_winElo = 75,
    kValue_voteElo = 75,
    kValue_killElo = 75,
    sValue_win = 1,
    sValue_lose = 0,
    sValue_vote = 0.25,
    sValue_kill = 0.33,
    provisionalGamesCount = 5,
    provisionalGameKValueMultiplier = 2,
    podScalingMultiplier = 0.5;

function recalculatePlayerElo(){
  var newEloObject = {},
      newEloDeltadMatchResults = [];

  playedPodsData = [];//Reset played pods count

  matchResultsSnapshot.forEach(function(obj) {
    var matchResult = obj.val();

    newEloObject = calculateNewPlayerAggregateElo(newEloObject, matchResult);

    newEloDeltadMatchResults[obj.key] = getEloUpdatedMatchResult(newEloObject, matchResult);
  });

  saveUpdatedMatchResults(newEloDeltadMatchResults);
  savePlayerElo(newEloObject);
}

function calculateNewPlayerAggregateElo(eloObjectToEdit, matchResult) {
  var playerIds = [],
      tempEloObject = eloObjectToEdit,
      podScaling = getPodScalingValue(matchResult.podId);

  if(tempEloObject === null){
    tempEloObject = {};
  }

  for(var i = 0; i < matchResult.players.length; i++){
    playerIds.push(matchResult.players[i]);

    if(tempEloObject[playerIds[i]] === undefined){
      tempEloObject[playerIds[i]] = getBaseAggregateEloObject();
    }
  }

  tempEloObject = calculateNewPlayerWinElo(tempEloObject, matchResult, playerIds, podScaling);
  tempEloObject = calculateNewPlayerVoteElo(tempEloObject, matchResult, playerIds, podScaling);
  tempEloObject = calculateNewPlayerKillElo(tempEloObject, matchResult, playerIds, podScaling);

  tempEloObject = calculateAggregatedElo(tempEloObject);

  return tempEloObject;
}

function getPodScalingValue(podId) {
  var podScaling = 1;

  if(playedPodsData[podId] !== undefined){
    playedPodsData[podId].playedCount = playedPodsData[podId].playedCount + 1;
    for(var i = 1; i < playedPodsData[podId].playedCount; i++){
      podScaling = podScaling * podScalingMultiplier;
    }
    //console.log("!This pod has been played: " + playedPodsData[podId].playedCount + ' times. Heres the multiplier: ' + podScaling);
  } else {
    playedPodsData[podId] = {};
    playedPodsData[podId].playedCount = 1;
  }
  savePodScalingData();

  return podScaling;
}

function calculateAggregatedElo(eloObjectToEdit) {
  var tempEloObject = eloObjectToEdit;

  $.each(eloObjectToEdit,function(playerId, playerEloObject) {
    var newEloRating = Math.floor((playerEloObject.winElo + playerEloObject.voteElo + playerEloObject.killElo) / 3);

    playerEloObject.eloDelta = Math.floor(newEloRating - playerEloObject.currentElo);

    playerEloObject.currentElo = newEloRating;

    playerEloObject = calculateNewEloHighLows(playerEloObject);
  });

  return tempEloObject;
}

function calculateNewPlayerWinElo(eloObjectToEdit, matchResult, playerIds, podScaling) {
  var averageElo = getAverageEloForMatch(eloObjectToEdit, matchResult, "winElo");

  $.each(eloObjectToEdit,function(playerId, playerEloObject) {
    if($.inArray(playerId, matchResult.players) !== -1){
      var expectedScore = getExpectedScore(playerEloObject.winElo, averageElo),
          sValue = getSValue_Win(playerId, matchResult),
          newEloRating = 0;

      playerEloObject.provisionalGamesLeft--;

      if(playerEloObject.provisionalGamesLeft <= 0){
        newEloRating = Math.floor(playerEloObject.winElo + (kValue_winElo * podScaling) * (sValue - expectedScore));
      } else {
        newEloRating = Math.floor(playerEloObject.winElo + ((kValue_winElo * provisionalGameKValueMultiplier) * podScaling) * (sValue - expectedScore));
      }

      playerEloObject.winElo = newEloRating;
    }
  });

  return eloObjectToEdit;
}

function calculateNewPlayerVoteElo(eloObjectToEdit, matchResult, playerIds, podScaling) {
  var averageElo = getAverageEloForMatch(eloObjectToEdit, matchResult, "voteElo");

  $.each(eloObjectToEdit,function(playerId, playerEloObject) {
    if($.inArray(playerId, matchResult.players) !== -1){
      var expectedScore = getExpectedScore(playerEloObject.voteElo, averageElo),
          sValue = getSValue_Vote(playerId, matchResult),
          newEloRating = 0;

      if(playerEloObject.provisionalGamesLeft <= 0){
        newEloRating = Math.floor(playerEloObject.voteElo + (kValue_voteElo * podScaling) * (sValue - expectedScore));
      } else {
        newEloRating = Math.floor(playerEloObject.voteElo + ((kValue_voteElo * provisionalGameKValueMultiplier) * podScaling) * (sValue - expectedScore));
      }

      playerEloObject.voteElo = newEloRating;
    }
  });

  return eloObjectToEdit;
}

function calculateNewPlayerKillElo(eloObjectToEdit, matchResult, playerIds, podScaling) {
  var averageElo = getAverageEloForMatch(eloObjectToEdit, matchResult, "killElo");

  $.each(eloObjectToEdit,function(playerId, playerEloObject) {
    if($.inArray(playerId, matchResult.players) !== -1){
      var expectedScore = getExpectedScore(playerEloObject.killElo, averageElo),
          sValue = getSValue_Kill(playerId, matchResult),
          newEloRating = 0;

      if(playerEloObject.provisionalGamesLeft <= 0){
        newEloRating = Math.floor(playerEloObject.killElo + (kValue_killElo * podScaling) * (sValue - expectedScore));
      } else {
        newEloRating = Math.floor(playerEloObject.killElo + ((kValue_killElo * provisionalGameKValueMultiplier) * podScaling) * (sValue - expectedScore));
      }

      playerEloObject.killElo = newEloRating;
    }
  });

  return eloObjectToEdit;
}

function getSValue_Win(playerId, matchResult) {
  return (playerId === matchResult.winnerId) ? sValue_win : sValue_lose;
}

function getSValue_Vote(playerId, matchResult) {
  var voteCount = 0;
  if(matchResult.voteRecords !== undefined && matchResult.voteRecords !== null){
    for(var voterIdIndex = 0; voterIdIndex < matchResult.voteRecords.length; voterIdIndex++){
      if(matchResult.voteRecords[voterIdIndex] === playerId){
        voteCount++;
      }
    }
  }

  return voteCount * sValue_vote;
}

function getSValue_Kill(playerId, matchResult) {
  var killCount = 0;
  if(matchResult.killRecords !== undefined && matchResult.killRecords !== null){
    for(var killerIdIndex = 0; killerIdIndex < matchResult.killRecords.length; killerIdIndex++){
      if(matchResult.killRecords[killerIdIndex] === playerId){
        killCount++;
      }
    }
  }

  return killCount * sValue_kill;
}

function getExpectedScore(playerRating, podAverageRating) {
  var expectedScore = -1 * (playerRating - podAverageRating);

  expectedScore = expectedScore / 400;

  expectedScore = Math.pow(ratingExponent, expectedScore) + 1;

  return 0.5 / expectedScore;
}

function getAverageEloForMatch(eloObjectToEdit, matchResult, eloName) {
  var totalElo = 0;

  $.each(eloObjectToEdit,function(playerId, playerEloObject) {
    if($.inArray(playerId, matchResult.players) !== -1){
      totalElo+= parseFloat(playerEloObject[eloName]) || 0;
    }
  });

  return (totalElo / matchResult.players.length);
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

function getBaseAggregateEloObject() {
  var tempBaseElo = {};

  tempBaseElo.currentElo = defaultElo;
  tempBaseElo.winElo = defaultElo;
  tempBaseElo.voteElo = defaultElo;
  tempBaseElo.killElo = defaultElo;
  tempBaseElo.maxElo = defaultElo;
  tempBaseElo.minElo = defaultElo;
  tempBaseElo.provisionalGamesLeft = provisionalGamesCount;
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
