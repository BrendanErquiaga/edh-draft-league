//This is just a reference file so we don't have to look this code up again
<script>
$.getJSON("js/json/allcards.json", function(data) {
cardNameArray = [];
splitCards = ["life // death","fire // ice","stand // deliver","spite // malice","pain // suffering","assault // battery","wax // wane","illusion // reality","night // day","order // chaos","bound // determined","crime // punishment","hide // seek","hit // run","odds // ends","pure // simple","research // development","rise // fall","supply // demand","trial // error","boom // bust","dead // gone","rough // tumble","alive // well","armed // dangerous","beck // call","catch // release","down // dirty","far // away","flesh // blood","give // take","profit // loss","protect // serve","ready // willing","toil // trouble","turn // burn","wear // tear","breaking // entering"];
$.each(data, function(key, val) {
    if(data[key].layout != "vanguard" && data[key].layout != "split" && data[key].layout != "token" && data[key].layout != "plane"){
        cardNameArray.push(key.toString().toLowerCase());
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