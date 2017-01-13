"use strict";

var recentlyDraftedCardArrayLimit,
    podSize = 4,
    maxNumPods = 10,
    selectedPlayers = [];

$(document).ready(function() {
  requirejs(['./utils', './firebaseUtils'], function() {
      pageReady();
  });
});

function pageReady() {
  getFirebaseData();

  catchPodGenerationPageInput();
}

function catchPodGenerationPageInput() {
    $('#player-icon-selection').on('click',"input", function(e) {
        selectPlayer($(this));
    });

    $('#podRequestButton').on('click', function(e) {
        requestPods();
    });

    $('#podResetButton').on('click', function(e) {
        resetResultsData();
    });
}

function requestPods() {
  var generatedPodUL = $("#generatedPodSection ul");

  if(selectedPlayers.length < podSize){
    return;
  } else if (selectedPlayers.length === podSize) {
    generatedPodUL.empty();

    displayPod(selectedPlayers);
  } else {
    generatedPodUL.empty();

    var tempPlayers = k_combinations(selectedPlayers,podSize);

    tempPlayers = shuffle(tempPlayers);


    tempPlayers = getUnusedPods(tempPlayers);

    for(var i = 0; i < tempPlayers.length; i++){
      displayPod(tempPlayers[i]);
    }
  }
}

function getUnusedPods(podsToCheck) {
  var podIds = [],
      unusedPods = [],
      usedPodIds = [];

  for(var i = 0; i < podsToCheck.length; i++){
    podIds.push(getCombinedStringFromArray(podsToCheck[i].sort()).hashCode());
  }

  usedPodIds = getUsedPodIDs(podIds);

  for(var j = 0; j < podsToCheck.length; j++){
    if($.inArray(getCombinedStringFromArray(podsToCheck[j].sort()).hashCode(), usedPodIds) === -1) {
      unusedPods.push(podsToCheck[j]);
    }
  }

  return unusedPods;
}

function displayPod(podArray) {
  var generatedPodUL = $("#generatedPodSection ul"),
      podString = "",
      podId = getCombinedStringFromArray(podArray).hashCode();

  for(var i = 0; i < podArray.length; i++){
    podString += usersSnapshot[podArray[i]].username;
    if(i !== podArray.length - 1){
      podString += ", ";
    }
  }

  generatedPodUL.append('<li>' + podString + '</li>');
}

function getPlayerIdFromInput(inputObject){
    var firstInputObject = inputObject[0],
        objectID;

    if($(firstInputObject).attr('class') !== "playerSelectionIcon"){
        return false;
    }

    objectID = $(firstInputObject).attr('id');

    return objectID.replace('selectionIcon_', "");
}

function selectPlayer(playerInputObject) {
    var newPlayerId = getPlayerIdFromInput(playerInputObject)

    if(newPlayerId === false){
        return;
    }
    else if($.inArray(newPlayerId, selectedPlayers) !== -1){
        console.log('We already had that player');
        return;
    }

    selectedPlayers.push(newPlayerId);

    $(playerInputObject).addClass('inactive');

    //TODO Better update UI
}


function resetResultsData() {
    $('#player-icon-selection').children('input').each(function(i, obj) {
        $(obj).removeClass('inactive');
    });

    var generatedPodUL = $("#generatedPodSection ul");
    generatedPodUL.empty();

    selectedPlayers = [];
}

function updateMatchSlipPlayerIcons() {
  var leagueMembers = leagueDataObject[usersSnapshot[currentUserId].leagueId].members;

  $('#player-icon-selection').empty();

  //console.log(leagueMembers);
  $.each(leagueMembers, function (key, val){
    $('#player-icon-selection').prepend($('<input>', {
        type: 'image',
        src: usersSnapshot[val].profile_picture,
        class: 'playerSelectionIcon',
        id: 'selectionIcon_' + val
    }));
  });
}