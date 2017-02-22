'use strict';

var usersSnapshot,
    draftDataObject,
    draftMasterObject,
    draftedCardsRef,
    draftedCardsSnapshot,
    queuedCardsRef,
    queuedCardsSnapshot,
    recentlyDraftCardsRef,
    recentlyDraftCards,
    bannedCardList,
    turnOrderObject,
    leagueDataObject,
    resultsToApproveSnapshot,
    playerStatsSnapshot,
    playerEloSnapshot,
    matchResultsSnapshot,
    waiverWireData,
    waiverWirePairsSnapshot,
    playedPodsData;

function getFirebaseData() {
    if(!dataScriptLoaded && !userScriptLoaded){
      dataScriptLoaded = true;
      return;
    }

    firebase.database().ref('users').on('value', function(snapshot) {
        updateUsersSnapshot(snapshot);
    });

    draftedCardsRef = firebase.database().ref('draftedUserCards');
    queuedCardsRef = firebase.database().ref('queuedUserCards');
    if(recentlyDraftedCardArrayLimit !== undefined && recentlyDraftedCardArrayLimit > 0){
      recentlyDraftCardsRef = firebase.database().ref('recentlyDraftedCards').limitToLast(recentlyDraftedCardArrayLimit);

      recentlyDraftCardsRef.on('value', function(snapshot) {
        updateRecentlyDraftedCards(snapshot);
      });
    }

    firebase.database().ref('draftedUserCards').on('value', function(snapshot) {
        updateDraftedCardData(snapshot);
    });

    queuedCardsRef.on('value', function(snapshot){
      queuedCardsSnapshot = snapshot;
    });

    firebase.database().ref('banList').once('value').then(function(snapshot) {
        bannedCardList = snapshot.val();
    });

    firebase.database().ref('draftData').on('value', function(snapshot) {
        updateDraftDataObject(snapshot);
    });

    //Admin only section
    if($(document.body).hasClass('admin')) {
      firebase.database().ref('draftMaster').on('value', function(snapshot) {
          updateDraftMasterObject(snapshot);
      });

      firebase.database().ref('playerStats').on('value', function(snapshot) {
          updatePlayerStatsSnapshot(snapshot);
      });
    }

    //Standings only section
    if($(document.body).hasClass('standings')) {
      firebase.database().ref('playerStats').on('value', function(snapshot) {
          updatePlayerStatsSnapshot(snapshot);
      });
    }

    firebase.database().ref('playerElo').on('value', function(snapshot) {
        updatePlayerEloSnapshot(snapshot);
    });

    firebase.database().ref('waiverWirePairs').on('value', function(snapshot) {
        updateWaiverWirePairsSnapshot(snapshot);
    });

    firebase.database().ref('matchResults').on('value', function(snapshot) {
        updatematchResultsSnapshot(snapshot);
    });

    firebase.database().ref('leagueData').on('value', function(snapshot) {
        updateLeagueDataObject(snapshot);
    });

    firebase.database().ref('resultsWaitingApproval').on('value', function(snapshot) {
        updateApprovableResultsObject(snapshot);
    });

    firebase.database().ref('waiverWireData').on('value', function(snapshot) {
        updateWaiverWireDataSnapshot(snapshot);
    });

    firebase.database().ref('playedPodsData').on('value', function(snapshot) {
        updatePlayedPodsSnapshot(snapshot);
    });

    //Should be last because it attempts to autodraft
    firebase.database().ref('turns').on('value', function(snapshot){
        updateTurnOrderData(snapshot);
    });

    messaging.onMessage(function(payload){
      handleNotification(payload);
    })

    $('.loadingSection').hide();
}

/*
~~~~~~~NOTIFICATIONS~~~~~~~~~~
*/
function handleNotification(payload) {
  if(payload.data.type === "PickNotification"){
      $("#notification-message").html(payload.notification.title);
      $("#notification-title").html(payload.notification.body);
  } else {
      $("#notification-message").html(payload.notification.body);
      $("#notification-title").html(payload.notification.title);
  }

  $("#Notification-Modal").fadeIn('200');
}

/*
~~~~~~~FIREBASE UPDATE~~~~~~~~~~
*/

function updatePlayedPodsSnapshot(snapshot) {
  playedPodsData = snapshot.val();

  if(playedPodsData === null){
    playedPodsData = [];
  }
}

function updateWaiverWirePairsSnapshot(snapshot) {
  waiverWirePairsSnapshot = snapshot;
}

function updateWaiverWireDataSnapshot(snapshot) {
  waiverWireData = snapshot.val();

  if($(document.body).hasClass('waiver') || $(document.body).hasClass('admin')) {
    updateWaiverWireData();
  }
}

function updatePlayerEloSnapshot(snapshot) {
  playerEloSnapshot = snapshot;

  if($(document.body).hasClass('standings')) {
    updateEloStandingsChart();
  } else if($(document.body).hasClass('waiver')) {
    updateWaiverWireOrder();
  }
}

function updatePlayerStatsSnapshot(snapshot){
  playerStatsSnapshot = snapshot;

  if($(document.body).hasClass('standings')) {
    updatePlayerStatsTable();
  }
}

function updatematchResultsSnapshot(snapshot) {
  matchResultsSnapshot = snapshot;

  if($(document.body).hasClass('standings')) {
    updateMatchRecordsTable();
  }
}

function updateApprovableResultsObject(snapshot) {
  resultsToApproveSnapshot = snapshot;

  if($(document.body).hasClass('admin')) {
    updateResultsToApproveUI();
  }
}

function updateLeagueDataObject(snapshot){
  leagueDataObject = snapshot.val();

  if($(document.body).hasClass('admin')) {
    updateLeagueDataUI();
  } else if ($(document.body).hasClass('match-slip') || $(document.body).hasClass('pod-generator')) {
    updateMatchSlipPlayerIcons();
  }
}

function updateDraftDataObject(snapshot){
  draftDataObject = snapshot.val();

  if($(document.body).hasClass('draft')) {
    updateDraftInfoUI();
  }
}

function updateRecentlyDraftedCards(snapshot){
  recentlyDraftCards = snapshot.val();

  if(recentlyDraftCards !== null){
    recentlyDraftCards = Object.values(recentlyDraftCards);
  } else {
    recentlyDraftCards = [];
  }

  if($(document.body).hasClass('draft') || $(document.body).hasClass('drafted-cards')) {
    updateRecentlyDraftedCardsUI();
  }
}

function updateTurnOrderData(snapshot){
  turnOrderObject = snapshot.val();
  //Change turnOrder to array, makes life easier
  turnOrderObject.turnOrder = Object.values(turnOrderObject.turnOrder);

  if($(document.body).hasClass('admin')) {
    attemptToAutoDraft();
  }

  if($(document.body).hasClass('draft')) {
    updateTurnSpecificUI();
  }
}

function updateUsersSnapshot(snapshot) {
  usersSnapshot = snapshot.val();

  if($(document.body).hasClass('draft')) {
    matchAutoDraftSwitch();
    matchGlobalSubscribeSwitch();
  }

  if ($(document.body).hasClass('admin')) {
    if (usersSnapshot[currentUserId].leagueAdmin) {
        displayAdminSection();
    }
  }

  if (usersSnapshot[currentUserId].leagueId !== null && usersSnapshot[currentUserId].leagueId !== undefined) {
    $('.authenticatedUserSection').show();
    $('.nonLeagueSection').hide();
  } else {
    $('.nonLeagueSection').show();
    $('.authenticatedUserSection').hide();
  }
}

function updateDraftMasterObject(snapshot) {
  draftMasterObject = snapshot.val();

  if($(document.body).hasClass('admin')) {
    attemptToAutoDraft();
  }
}

function updateDraftedCardData(snapshot) {
  draftedCardsSnapshot = snapshot;

  if($(document.body).hasClass('draft')) {
    updatePickedCardsUI();
  } else if($(document.body).hasClass('decklists')) {
    updateDeckListUI();
  }
}

/*
~~~~~~~FIREBASE Save~~~~~~~~~~
*/

function savePlayerElo(newEloObject) {
  firebase.database().ref('playerElo').set(newEloObject);
}

function savePlayerStats(newStatsObject) {
  firebase.database().ref('playerStats').set(newStatsObject);
}

function saveApprovedMatchResult(approvedMatchResult) {
  var newApprovedResult = firebase.database().ref('matchResults').push();

  newApprovedResult.set({
      submissionDate: approvedMatchResult.submissionDate,
      submittingPlayerName: approvedMatchResult.submittingPlayerName,
      players: approvedMatchResult.players,
      killRecords: approvedMatchResult.killRecords,
      voteRecords: approvedMatchResult.voteRecords,
      winnerId: approvedMatchResult.winnerId,
      podId: approvedMatchResult.podId,
      playerEloDelta: approvedMatchResult.playerEloDelta
  });
}

function removeUnapprovedMatchResult(matchResultKey) {
  firebase.database().ref('resultsWaitingApproval').child(matchResultKey).remove();
}

function saveUnapprovedMatchResult(matchResult) {
  var newUnapprovedResult = firebase.database().ref('resultsWaitingApproval').push();
  newUnapprovedResult.set({
      submissionDate: matchResult.submissionDate,
      submittingPlayerName: matchResult.submittingPlayerName,
      players: matchResult.players,
      killRecords: matchResult.killRecords,
      voteRecords: matchResult.voteRecords,
      winnerId: matchResult.winnerId,
      podId: matchResult.podId,
      notes: matchResult.notes
  });
}

function saveGlobalSubscribeStatus(globalSubscribeEnabled) {
  firebase.database().ref('users/' + currentUserId).update({
    globallySubscribed: globalSubscribeEnabled
  });

  if(globalSubscribeEnabled){
    manageGlobalSubscribe('POST');
  }
  else {
    manageGlobalSubscribe('DELETE');
  }
}

function saveAutoDraftStatus(autoDraftEnabled){
  firebase.database().ref('users/' + currentUserId).update({
    autoDraft: autoDraftEnabled
  });
}

function saveMasterDrafterStatus(){
  firebase.database().ref('draftMaster').update({
    draftMasterId: draftMasterId
  });
}

function saveMasterDraftDelayTime(delayTime) {
  firebase.database().ref('draftMaster').update({
    delayTime: delayTime
  });
}

function saveTurnOrderObject(tempTurnOrderObject){
  firebase.database().ref('turns/').set({
    ascendingTurnOrder: tempTurnOrderObject.ascendingTurnOrder,
    turnIndex: tempTurnOrderObject.turnIndex,
    turnOrder: tempTurnOrderObject.turnOrder
  });
}

//TODO: Don't delete entire queue object... seems excessive
function cleanOutQueuedCards(cardLastPicked, drafterName){
  var newQueueObject = {};

  queuedCardsSnapshot.forEach(function(childSnapshot) {
      var key = childSnapshot.key;
      var val = childSnapshot.val();
      newQueueObject[key] = Object.values(val);
      childSnapshot.forEach(function(cardObjectSnapshot) {
          if (cardObjectSnapshot.val() === cardLastPicked) {
              //console.log(cardLastPicked + ' was in ' + key + 's queue, I am removing it');
              sendQueuePickedNotification(key,cardLastPicked,drafterName);
              newQueueObject[key].splice($.inArray(cardLastPicked,newQueueObject[key]),1);
          }
      });
  });

  //console.log(newQueueObject);

  if(newQueueObject !== null) {
    queuedCardsRef.set(newQueueObject);
  }
}

function savePickedCardToFirebase(cardObject, idToUse){
  var newCardRef = draftedCardsRef.child(idToUse).push(),
      cardPickTime = Date.now();
  newCardRef.set({
      name: cardObject.name,
      type: cardObject.type,
      types: cardObject.types,
      cmc: cardObject.cmc,
      manaCost: cardObject.manaCost,
      colorIdentity: cardObject.colorIdentity,
      pickTime: cardPickTime
  });

  cleanOutQueuedCards(cardObject.name, usersSnapshot[idToUse].username);
  saveRecentlyPickedCards(cardObject.name, idToUse, cardPickTime);
  incrementCardsDraftedCounter();
}

function removeDraftedCardFromFirebase(cardKey, userId) {
  var cardToRemoveRef = draftedCardsRef.child(userId).child(cardKey);

  cardToRemoveRef.remove();
}

function incrementCardsDraftedCounter() {
  var newCount = 0;

  if(draftDataObject !== undefined && draftDataObject !== null){
    newCount = draftDataObject.draftedCardCount;
  }
  newCount++;

  firebase.database().ref('draftData').update({
    draftedCardCount: newCount
  });
}

function incrementRoundCounter(){
  var newCount = 0;

  if(draftDataObject !== undefined && draftDataObject !== null){
    newCount = draftDataObject.roundNumber || 0;
  }
  newCount++;

  firebase.database().ref('draftData').update({
    roundNumber: newCount
  });
}

function saveRecentlyPickedCards(cardName, drafterId, cardPickTime) {
  var newCardRef = firebase.database().ref('recentlyDraftedCards').push();
  newCardRef.set({
    name: cardName,
    drafterId: drafterId,
    pickTime: cardPickTime
  });
}

function saveCardToUserQueue(card){
  userQueuedCards.push(card);

  firebase.database().ref('queuedUserCards/').child(currentUserId).set(userQueuedCards);
}

function updateUserQueuedCards() {
  firebase.database().ref('queuedUserCards/').child(currentUserId).set(userQueuedCards);
}

function saveWaiverWirePairToUser(waiverPair){
    var newPairRef = firebase.database().ref('waiverWirePairs').child(currentUserId).push();
    newPairRef.set({
        cardToPickUp: waiverPair.cardToPickUp,
        cardToDrop: waiverPair.cardToDrop
    });
}

function clearWaiverWiresForUser(){
    var newPairRef = firebase.database().ref('waiverWirePairs').child(currentUserId).set({});
}

function removeWaiverWirePairFromFirebase(waiverPairKey, userId) {
  var waiverPairToRemove = firebase.database().ref('waiverWirePairs').child(userId).child(waiverPairKey);

  waiverPairToRemove.remove();
}

function saveNewWaiverWireDate(dateString) {
  firebase.database().ref('waiverWireData/').set({
    nextWireDate: dateString
  });
}

function saveNewBanList(banList) {
  firebase.database().ref('/').update({
    banList: banList
  });
}

function savePodScalingData() {
    firebase.database().ref('playedPodsData').set(playedPodsData);
}

/*
~~~~~~~FIREBASE NOTIFICATIONS~~~~~~~~~~
*/

// messaging.onMessage(function(payload){
//   console.log('onMessage: ', payload);
// })
