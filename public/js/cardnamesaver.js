//This is just a reference file so we don't have to look this code up again

$.getJSON("js/json/allcards.json", function(data) {
cardNameArray = [];
$.each(data, function(key, val) {
    cardNameArray.push(key.toString());
});

console.log(cardNameArray);

download(JSON.stringify(cardNameArray), "test", JSON);
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