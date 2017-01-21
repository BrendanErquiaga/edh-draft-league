var finishedArray = [];
var source  = $('body pre').innerText;
var indexVar = source.indexOf('"cards"');
var indexEnd;
source = source.slice(indexVar);

while (indexVar > 0 ) {
	indexVar = source.indexOf('"name"');
	source = source.slice(indexVar);
	indexVar = source.indexOf('"name"');
	indexEnd = source.indexOf('","');

	indexVar = indexVar + 8;
	finishedArray.push(source.slice(indexVar,indexEnd));
	source = source.slice(indexEnd);
	indexVar = source.indexOf('"name"');
}
var quotedAndCommaSeparated = '"' + finishedArray.join('","') + '"';
$('pre').remove();

$('body').append(quotedAndCommaSeparated);
$('body').append("--------------------------------------------------------");
$('body').append(quotedAndCommaSeparated.toLowerCase());


