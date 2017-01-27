//This is just a reference file so we don't have to look this code up again
<script>
$.getJSON("js/json/allcards.json", function(data) {
cardNameArray = [];
splitCards = ["Life // Death","Fire // Ice","Stand // Deliver","Spite // Malice","Pain // Suffering","Assault // Battery","Wax // Wane","Illusion // Reality","Night // Day","Order // Chaos","Bound // Determined","Crime // Punishment","Hide // Seek","Hit // Run","Odds // Ends","Pure // Simple","Research // Development","Rise // Fall","Supply // Demand","Trial // Error","Boom // Bust","Dead // Gone","Rough // Tumble","Alive // Well","Armed // Dangerous","Beck // Call","Catch // Release","Down // Dirty","Far // Away","Flesh // Blood","Give // Take","Profit // Loss","Protect // Serve","Ready // Willing","Toil // Trouble","Turn // Burn","Wear // Tear","Breaking // Entering"];
$.each(data, function(key, val) {
    if(data[key].layout != "vanguard" && data[key].layout != "split" && data[key].layout != "token" && data[key].layout != "plane"){
        cardNameArray.push(key.toString());
    }
});

console.log(cardNameArray);

var mergedArray = cardNameArray.concat(splitCards);

download(JSON.stringify(mergedArray), "test", JSON);
});

function download(data, filename, type) {
    var a = document.createElement("a"),
        file = new Blob([data], {
            type: type
        });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}
</script>