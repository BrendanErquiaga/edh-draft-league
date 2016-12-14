'use strict';

var draftMasterId,
    currentlyDraftMaster = false;

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

  //TODO: Add Delay
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

  console.log('Trying to draft: ' + cardToAutoDraft);

  savePickedCardToFirebase(getCardObject(cardToAutoDraft), autoDraftedUserId);

  goToNextTurn();
}
