'use strict';

var draftMasterId,
    currentlyDraftMaster = false,
    recentlyDraftedCardArrayLimit = 3,
    adminSectionShown = false;

$(document).ready(function() {
    requirejs(['./utils','./firebaseUtils'], function(){
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

  if(draftMasterObject.delayTime !== undefined){
    setTimeout(performAutoDraft, draftMasterObject.delayTime);
  }
  else {
    setTimeout(performAutoDraft, 3000);
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

  for(var i = 0; i < resultsToApproveList.length; i++){
    //resultsToApproveUL.append('<li>' + getResultsRow(resultsToApproveList[i]) + '</li>');
    resultsToApproveUL.append(getResultsRow(resultsToApproveList[i]));
  }
}

function getResultsRow(result) {
  var baseListItem = $('<li>', { class: 'playerResultRow'});

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
