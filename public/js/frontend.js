// Simple Accordions
function simpleAccordions() {
	$('.accordion-content').hide();
	$('body').find('.accordion-toggle').click(function(){
	$(this).toggleClass('open-accordion closed-accordion');
	$(this).next().slideToggle('fast');
	//$(".accordion-content").not($(this).next()).slideUp('fast');
	});
}

// Smooth scrolling on internal (same-page) links
function smoothScroll() {
	$('a[href*="#"]:not([href="#"])').click(function() {
		var navHeight = $('.nav').height();
		if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
			var target = $(this.hash);
			target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
			if (target.length) {
				target = target.offset().top + window.scrollY - navHeight;
				$('html, body').animate({
					scrollTop: target
				}, 1000);
				return false;
			}
		}
	});
}

// Queue Re-Ordering via slip.js
function queueHandler() {
	var list = $('#queuedCards')[0];
	console.log(list);

	list.addEventListener('slip:afterswipe', function(e){
		//e.target.parentNode.appendChild(e.target);
		e.target.remove();
	}, false);

	list.addEventListener('slip:reorder', function(e){
		e.target.parentNode.insertBefore(e.target, e.detail.insertBefore);
		return false;
	}, false);

	return new Slip(list);
}

// Document Ready
$(document).ready(function(){
	simpleAccordions();
	smoothScroll();
	queueHandler();
});