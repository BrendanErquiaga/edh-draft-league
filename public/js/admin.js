'use strict';

var draftMasterId,
    currentlyDraftMaster = false,
    recentlyDraftedCardArrayLimit = 3,
    daysBetweenEachWireDate = 7,
    adminSectionShown = false,
    autoDraftDelay = 7000,
    autoDraftTimeout,
    waiverWireOrder = [],
    waiverWirePicks = [];

$(document).ready(function() {
    requirejs(['./utils','./firebaseUtils', './calculations'], function(){
          pageReady();
     });
});

function pageReady(){
  getFirebaseData();

  catchAdminPageInput();

  $.getJSON(allcardsLocation, function(data) {
      allcardsLocal = data;
  });

  //Use this to update the banList
  // $.getJSON(banListLocation, function(data) {
  //     banListLocal = data;
  //     updateBanList();
  // });
}

function catchAdminPageInput(){
  $('#draftMasterSwitch').change(function(){
    updateMasterDrafterStatus(this.checked);
  });

  $('#refreshAutoDraft').on('click', function(e) {
      attemptToAutoDraft();
  });

  $('#resultsToApprove').on('click',"input", function(e) {
      approveOrDenyMatchResult($(this));
  });

  $('#acceptWaiverWires').on('click', function(e) {
      acceptWaiverWires();
  });
}

function setupAutomaticWaiver() {
  var timeDifference = new Date(waiverWireData.nextWireDate).getTime() - Date.now();

  setTimeout(performAutoWaiver, timeDifference);
}

function performAutoWaiver() {
  if(currentlyDraftMaster){
    acceptWaiverWires();
    var nextWaiverDate = addDays(Date.now(), daysBetweenEachWireDate);
    saveNewWaiverWireDate(nextWaiverDate.toJSON());
    updateMasterDrafterStatus(false);
  }
  else {
    console.log("GTFO You aren't the Waiver Master");
  }
}

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function acceptWaiverWires() {
  var cardsPickedUp = [];
  waiverWirePicks = [];
  waiverWireOrder = createWaiverWireOrder();

  for(var i = 0; i < waiverWireOrder.length; i++){
    var waiverWireKeysToRemove = [];
    waiverWirePairsSnapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        if(key === waiverWireOrder[i].key){
          var pickedForThisUser = false;
          childSnapshot.forEach(function(waiverWireSnapshot) {
              var cardToPickUp = waiverWireSnapshot.val().cardToPickUp;

              if(!cardIsFree(cardToPickUp) || !cardIsFreeThisWire(cardsPickedUp, cardToPickUp)){
                waiverWireKeysToRemove.push(waiverWireSnapshot.key);
              }

              if(!pickedForThisUser && cardIsFreeThisWire(cardsPickedUp, cardToPickUp) && cardIsFree(cardToPickUp)){
                var waiverWirePickup = waiverWireSnapshot.val();
                waiverWirePickup.userId = waiverWireOrder[i].key;
                waiverWirePicks.push(waiverWirePickup);
                cardsPickedUp.push(cardToPickUp);
                pickedForThisUser = true;

                waiverWireKeysToRemove.push(waiverWireSnapshot.key);
              }
          });
        }
    });

    for(var j = 0; j < waiverWireKeysToRemove.length; j++){
      removeWaiverWirePairFromFirebase(waiverWireKeysToRemove[j], waiverWireOrder[i].key);
    }
  }

  processWaiverWirePicks();
}

function processWaiverWirePicks() {
  for(var i = 0; i < waiverWirePicks.length; i++){
    console.log(usersSnapshot[waiverWirePicks[i].userId].username + ': - ' + waiverWirePicks[i].cardToDrop + ', + ' + waiverWirePicks[i].cardToPickUp);
    removeCardFromUsersList(waiverWirePicks[i].cardToDrop,waiverWirePicks[i].userId);
    savePickedCardToFirebase(getCardObject(waiverWirePicks[i].cardToPickUp), waiverWirePicks[i].userId);
  }
}

function removeCardFromUsersList(cardToDrop, userId) {
  var cardToRemoveSnapshot = {};
  draftedCardsSnapshot.forEach(function(childSnapshot) {
      var key = childSnapshot.key;
      var val = childSnapshot.val();
      if(key === userId){
        var cardFound = false;
        childSnapshot.forEach(function(cardSnapshot) {
          if(!cardFound && cardSnapshot.val().name === cardToDrop){
            cardToRemoveSnapshot = cardSnapshot;
            cardFound = true;
          }
        });
      }
  });

  if(cardToRemoveSnapshot !== {}){
    removeDraftedCardFromFirebase(cardToRemoveSnapshot.key, userId);
  }
}

function cardIsFreeThisWire(wireCardsPickedUp, cardToPickUp) {
  if ($.inArray(cardToPickUp, wireCardsPickedUp) === -1) {
      return true;
  } else {
    return false;
  }
}

function approveOrDenyMatchResult(inputObject) {
  if($(inputObject).hasClass('approveMatchResultButton')){
    approveMatchResult($(inputObject).attr('id'));
  }
  else if ($(inputObject).hasClass('denyMatchResultButton')){
    denyMatchResult($(inputObject).attr('id'));
  }
}

function approveMatchResult(resultKey) {
  savePlayerStats(calculateNewPlayerStats(playerStatsSnapshot.val(),resultsToApproveSnapshot.val()[resultKey]));
  var newEloObject = calculateNewPlayerAggregateElo(playerEloSnapshot.val(),resultsToApproveSnapshot.val()[resultKey]);
  var newResultObject = getEloUpdatedMatchResult(newEloObject, resultsToApproveSnapshot.val()[resultKey]);
  saveApprovedMatchResult(getValidMatchResults(newResultObject));
  savePlayerElo(newEloObject);
  removeUnapprovedMatchResult(resultKey);
}

function getEloUpdatedMatchResult(eloObject, matchResult) {
  var tempResultObject = matchResult;

  tempResultObject.playerEloDelta = {};

  for(var playerIndex = 0; playerIndex < tempResultObject.players.length; playerIndex++){
    var playerId = tempResultObject.players[playerIndex];

    tempResultObject.playerEloDelta[playerId] = eloObject[playerId].eloDelta || 0;
  }

  return tempResultObject;
}

function getValidMatchResults(matchResult) {
  if(matchResult.voteRecords === undefined || matchResult.voteRecords === null){
    matchResult.voteRecords = {};
  }

  if(matchResult.killRecords === undefined || matchResult.killRecords === null){
    matchResult.killRecords = {};
  }

  return matchResult;
}

function denyMatchResult(resultKey) {
  removeUnapprovedMatchResult(resultKey);
}

function updateMasterDrafterStatus(masterDrafterClientEnabled){
  if(masterDrafterClientEnabled) {
    draftMasterId = Date.now();
    currentlyDraftMaster = true;
    saveMasterDrafterStatus();
    setupAutomaticWaiver();
  }
  else {
    currentlyDraftMaster = false;
  }
}

//Someone just picked a card, should the 'system' auto-draft?
function attemptToAutoDraft(){
  if(!currentlyDraftMaster || draftMasterObject.draftMasterId !== draftMasterId){
    //console.log('No auto drafting from you False Prism');
    $('#draftMasterSwitch').prop('checked', false);
    return;
  }

  clearTimeout(autoDraftTimeout);

  if(draftMasterObject.delayTime !== undefined){
    autoDraftTimeout = setTimeout(performAutoDraft, draftMasterObject.delayTime);
  }
  else {
    autoDraftTimeout = setTimeout(performAutoDraft, autoDraftDelay);
  }
}

function performAutoDraft(){
  var nextDraftId = getNextDrafterId();
  //console.log('User: ' + usersSnapshot[nextDraftId].username + ', Autodraft: ' + usersSnapshot[nextDraftId].autoDraft);

  if(usersSnapshot[nextDraftId].autoDraft){
    //The next drafter has auto-draft enabled, lets attempt to pick a card for them
    autoDraftCardForUser(nextDraftId);
  }
}

function autoDraftCardForUser(autoDraftedUserId){
  var cardToAutoDraft = getNextCardFromUsersQueue(autoDraftedUserId);

  if(cardToAutoDraft === undefined){
    $("#notification-message").html(usersSnapshot[autoDraftedUserId].username + ' didnt have a card in their queue, dont draft');
    $("#notification-title").html("Auto-Drafting Stopped");

    $("#Notification-Modal").fadeToggle('200');
    return;
  }

  if(!cardIsFree(cardToAutoDraft)){
    $("#notification-message").html('Tried to draft: ' + cardToAutoDraft + ' someone else has it, get the next one I guess?');
    $("#notification-title").html("Auto-Drafting Stopped");

    $("#Notification-Modal").fadeToggle('200');
    return;
  }

  savePickedCardToFirebase(getCardObject(cardToAutoDraft), autoDraftedUserId);

  goToNextTurn();
}

function updateBanList() {
  // for(var i = 0; i < banListLocal.length; i++){
  //   console.log(banListLocal[i]);
  // }

  saveNewBanList(banListLocal);
}

/* ~~~~~~~~~~~~~~~ UI Updates ~~~~~~~~~~~~~~~ */


function updateAdminEloDisplay() {
  var currentEloListItem = $("#currentEloList"),
      playerNameList = $("#playerNames"),
      winEloListItem = $("#winEloList"),
      voteEloListItem = $("#voteEloList"),
      killEloListItem = $("#killEloList"),
      totalEloSum = 0,
      winEloSum = 0,
      voteEloSum = 0,
      killEloSum = 0;

  playerNameList.empty();
  currentEloListItem.empty();
  winEloListItem.empty();
  voteEloListItem.empty();
  killEloListItem.empty();

  playerNameList.append("<li><b>Players</b></li>");
  currentEloListItem.append("<li><b>Current</b></li>");
  winEloListItem.append("<li><b>Win</b></li>");
  voteEloListItem.append("<li><b>Vote</b></li>");
  killEloListItem.append("<li><b>Kill</b></li>");

  playerEloSnapshot.forEach(function(obj) {
    playerNameList.append("<li><b>" + usersSnapshot[obj.key].username + "</b></li>");
    currentEloListItem.append("<li>" + obj.val().currentElo + "</li>");
    winEloListItem.append("<li>" + obj.val().winElo + "</li>");
    voteEloListItem.append("<li>" + obj.val().voteElo + "</li>");
    killEloListItem.append("<li>" + obj.val().killElo + "</li>");
    totalEloSum += obj.val().currentElo;
    winEloSum += obj.val().winElo;
    voteEloSum += obj.val().voteElo;
    killEloSum += obj.val().killElo;
  });

  playerNameList.append("<li><b>Elo Sums</b></li>");
  currentEloListItem.append("<li><b>" + totalEloSum + "</b></li>");
  winEloListItem.append("<li><b>" + winEloSum + "</b></li>");
  voteEloListItem.append("<li><b>" + voteEloSum + "</b></li>");
  killEloListItem.append("<li><b>" + killEloSum + "</b></li>");
}

function displayAdminSection() {
  $("#adminOnlySection").css('display','inline');
  adminSectionShown = true;
}

function updateLeagueDataUI() {
  if(!adminSectionShown){
    return;
  }

  // $("#leagueName").html(leagueDataObject[currentUserId].name);
  //
  // var leagueMembersUL = $("#leagueMembers");
  //
  // leagueMembersUL.empty();
  //
  // for(var i = 0; i < leagueDataObject[currentUserId].members.length; i++){
  //   leagueMembersUL.append('<li>' + getDisplayNameFromID(leagueDataObject[currentUserId].members[i]) + '</li>');
  // }
}

function updateWaiverWireData() {
  //initializeClock('clockdiv', new Date(waiverWireData.nextWireDate));
  $("#waiverWireTime").html(new Date(waiverWireData.nextWireDate));
}

function updateResultsToApproveUI() {
  if(!adminSectionShown){
    return;
  }

  var resultsToApproveUL = $("#resultsToApprove");

  resultsToApproveUL.empty();

  resultsToApproveSnapshot.forEach(function(obj) {
      resultsToApproveUL.append(getApprovableResultsRow(obj.key, obj.val()));
  });
}

function getApprovableResultsRow(resultKey, result) {
  var tempResultsRow = getVisualResultsRow(resultKey, result);

  $(tempResultsRow).prepend($('<input>', {
    type: 'image',
    src: denyMatchResultIcon,
    class: 'denyMatchResultButton',
    id: resultKey
  }));

  $(tempResultsRow).append($('<input>', {
    type: 'image',
    src: approveMatchResultIcon,
    class: 'approveMatchResultButton',
    id: resultKey
  }));

  return tempResultsRow;
}

function getVisualResultsRow(resultKey, result) {
  var baseListItem = $('<li>', { class: 'playerResultRow', id: resultKey});

  for(var playerIndex = 0; playerIndex < result.players.length; playerIndex++){
    var playerId = result.players[playerIndex],
        killCount = 0,
        voteCount = 0,
        playerImage = $('<img>', {
            src: usersSnapshot[playerId].profile_picture,
            class: 'playerResultsIcon',
        });

    if(result.winnerId === playerId){
      $(playerImage).addClass('winner');
    }

    baseListItem.append(playerImage);

    if(result.killRecords !== undefined && result.killRecords !== null){
      for(var killerIdIndex = 0; killerIdIndex < result.killRecords.length; killerIdIndex++){
        if(result.killRecords[killerIdIndex] === playerId){
          killCount++;
        }
      }
    }

    if(killCount > 0){
      baseListItem.append($('<img>', {
            class: 'killIcon',
            src: killIconLocation
      }));

      if(killCount > 1){
        baseListItem.append('x' + killCount);
      }
    }

    if(result.voteRecords !== undefined && result.voteRecords !== null){
      for(var voterIdIndex = 0; voterIdIndex < result.voteRecords.length; voterIdIndex++){
        if(result.voteRecords[voterIdIndex] === playerId){
          voteCount++;
        }
      }
    }

    if(voteCount > 0){
      baseListItem.append($('<img>', {
            class: 'voteIcon',
            src: voteIconLocation
      }));

      if(voteCount > 1){
        baseListItem.append('x' + voteCount);
      }
    }

    if(result.winnerId === playerId){
      baseListItem.append($('<img>', {
            class: 'winIcon',
            src: winIconLocation
      }));
    }
    else if(killCount === 0 && voteCount === 0) {
      baseListItem.append('---');
    }
  }

  if(result.notes !== ''){
    baseListItem.append("Notes: '" + result.notes + "'");
  }

  return baseListItem;
}
