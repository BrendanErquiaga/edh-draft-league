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
		if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
			var target = $(this.hash);
			target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
			if (target.length) {
				target = target.offset().top + window.scrollY;
				$('html, body').animate({
					scrollTop: target
				}, 1000);
				return false;
			}
		}
	});
}

// Sticky Nav with debounce
function stickyNav() {
	// Hides sticky nav; if JS is disabled it will still be there
	$('.stickynav').hide();

	// Debounce JS for scroll events
	function debounce(func, wait, immediate) {
		var timeout;
		return function() {
			var context = this, args = arguments;
			var later = function() {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	};
	var myEfficientFn = debounce(function() {
		if (($('a[name="Intro"]').offset().top) < 0){
			$('.stickynav').fadeIn('fast');
		} else {
			$('.stickynav').fadeOut('fast');
		}
	}, 100);
	// Scroll event handler, passes to debounce
	if($('body').find('div.stickynav').length){
		window.addEventListener('scroll', myEfficientFn);
	}
}

// Document Ready
$(document).ready(function(){
	simpleAccordions();
	stickyNav();
	smoothScroll();
});