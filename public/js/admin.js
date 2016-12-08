'use strict';

//Someone just picked a card, should the 'system' auto-draft?
function attemptToAutoDraft(){
  var nextDraftId = getNextDrafterId();
  console.log('User: ' + nextDraftId + ', Autodraft: ' + usersSnapshot[nextDraftId].autoDraft);

  if(usersSnapshot[nextDraftId].autoDraft){
    //The next drafter has auto-draft enabled, lets attempt to pick a card for them
    autoDraftCardForUser(nextDraftId);
  }
}

function autoDraftCardForUser(autoDraftedUserId){
  var cardToAutoDraft = getNextCardFromUsersQueue(autoDraftedUserId);

  if(!cardIsFree(cardToAutoDraft)){
    console.log('Well shit, autodraft tried to draft: ' + cardToAutoDraft + ' someone else has it, get the next one I guess?');
    //TODO: Remove card from queue
    return;
  }

  savePickedCardToFirebase(getCardObject(cardToAutoDraft), autoDraftedUserId);

  goToNextTurn();
}

