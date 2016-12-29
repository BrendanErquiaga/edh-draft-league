"use strict";

var recentlyDraftedCardArrayLimit = 0;

$(document).ready(function() {
    requirejs(['./utils', './firebaseUtils'], function() {
        pageReady();
    });
});

function pageReady() {
    getFirebaseData();
}

function updateMatchRecordsTable() {
  var matchTable = $(".match-table table");

  matchTable.empty();

  matchResultsObject.forEach(function(obj) {
    matchTable.prepend(getTableResultsRow(obj.key, obj.val()));
  });
}
