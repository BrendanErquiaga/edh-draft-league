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
	$('.nav a[href*="#"]').click(function(){
		event.preventDefault();
	});
}

// Basic modal handling
function initModals() {
	// Requires button to have an id preceeded by "modal_"
	$('.modal-launch').click(function(){
		var target = $(this).attr('id');
		target = target.replace("modal_","");
		target = "#" + target;
		$(target).fadeToggle('200');
	});
	$('.modal-close').click(function(){
		$(this).parents('.modal').fadeToggle('200');
	});
}

// Resets draft ticker animation on click
function resetTicker() {
	$('.recentlyDrafted').click(function(){
		var target = $(this).find('.ticker')[0];
		target.style.webkitAnimation = 'none';
		setTimeout(function() {
			target.style.webkitAnimation = '';
		}, 10);
	})
}
// Document Ready
$(document).ready(function(){
	simpleAccordions();
	smoothScroll();
	initModals();
	resetTicker();
});