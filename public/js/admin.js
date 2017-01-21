'use strict';

var draftMasterId,
    currentlyDraftMaster = false,
    recentlyDraftedCardArrayLimit = 3,
    adminSectionShown = false,
    autoDraftDelay = 7000,
    autoDraftTimeout;

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
  var newEloObject = calculateNewPlayerElo(playerEloSnapshot.val(),resultsToApproveSnapshot.val()[resultKey]);
  var newResultObject = getEloUpdatedMatchResult(newEloObject, resultsToApproveSnapshot.val()[resultKey]);
  saveApprovedMatchResult(newResultObject);
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

function denyMatchResult(resultKey) {
  removeUnapprovedMatchResult(resultKey);
}

function updateMasterDrafterStatus(masterDrafterClientEnabled){
  if(masterDrafterClientEnabled) {
    draftMasterId = Date.now();
    currentlyDraftMaster = true;
    saveMasterDrafterStatus();
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
    console.log(usersSnapshot[autoDraftedUserId].username + ' didnt have a card in their queue, dont draft');
    return;
  }

  if(!cardIsFree(cardToAutoDraft)){
    console.log('Well shit, autodraft tried to draft: ' + cardToAutoDraft + ' someone else has it, get the next one I guess?');
    //TODO: Remove card from queue
    return;
  }

  savePickedCardToFirebase(getCardObject(cardToAutoDraft), autoDraftedUserId);

  goToNextTurn();
}

/* ~~~~~~~~~~~~~~~ UI Updates ~~~~~~~~~~~~~~~ */

function displayAdminSection() {
  $("#adminOnlySection").css('display','inline');
  adminSectionShown = true;
}

function updateLeagueDataUI() {
  if(!adminSectionShown){
    return;
  }

  $("#leagueName").html(leagueDataObject[currentUserId].name);

  var leagueMembersUL = $("#leagueMembers");

  leagueMembersUL.empty();

  for(var i = 0; i < leagueDataObject[currentUserId].members.length; i++){
    leagueMembersUL.append('<li>' + getDisplayNameFromID(leagueDataObject[currentUserId].members[i]) + '</li>');
  }
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

    for(var killerIdIndex = 0; killerIdIndex < result.killRecords.length; killerIdIndex++){
      if(result.killRecords[killerIdIndex] === playerId){
        killCount++;
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

    for(var voterIdIndex = 0; voterIdIndex < result.voteRecords.length; voterIdIndex++){
      if(result.voteRecords[voterIdIndex] === playerId){
        voteCount++;
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

  return baseListItem;
}
