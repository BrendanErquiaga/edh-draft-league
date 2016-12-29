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
  saveApprovedMatchResult(resultsToApproveSnapshot.val()[resultKey]);
  removeUnapprovedMatchResult(resultKey);
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
