$(document).ready(function(){
	$('#close').click(function(event){
		$('.modal-title').text('');
	});
	$('#delete').click(function(event){
		$('.modal-title').text('');
	});
	$(document).mouseup(function(e){
		var container = $('#myModal');
		if (!container.is(e.target) && container.has(e.target).length === 0){
			$('.modal-title').text('');
			$('#myModal').modal('hide');
		}

	});
	$(document).on("click", ".textContainer", function(event){
		console.log('postnippet clicked');
		var url = event.target.getElementsByTagName("a")[0].href;
		if(url.indexOf('h') >= 0){


			$.ajax({
				url: "/oembed",
				dataType: "json",
				type: 'POST',
				contentType: 'application/json',
				data : JSON.stringify({
					"url" : url
				}),
				success: function(data){
					console.log(data.oembed);
					console.log(data.success);
					//console.log(data.height);
					var oembed = data.oembed;
					$('#container').html(oembed);
					$('iframe').css("maxWidth", "100%");
					//console.log(document.getElementsByTagName('iframe')[0].innerHTML);
					$('.modal-title').text(data.title)
					$('#myModal').modal('show');
				}
			});
		
		}
	});
	$(document).on("click", '.vote', function(event){
		event.stopPropagation();
		console.log(event.target.id);
		$.ajax({
			url: "/like",
			dataType: "json",
			
			type: 'POST',
			contentType: 'application/json',
			data : JSON.stringify({
				"id" : event.target.id
			}),
			success: function(data){
				console.log(data.success);
				if (data.success == 'liked'){
					$(event.target).attr("src", "/images/icon-triangle-active.png");

					var votes = parseFloat($(event.target.parentNode).find('p').text()) + 1;
					$(event.target).find("p").text(votes);
					$(event.target).removeClass("vote");					
					$(event.target).addClass("unvote");
					$(event.target.parentNode).find('p').text(votes);
				}

			},
			error: function(xhr, textStatus, errorThrown){
				console.log(xhr);
				console.log(textStatus);
				console.log(errorThrown);
			}
		});
	});
	$(document).on("click", '.unvote', function(event){
		console.log('unvote clicked');
		console.log(event.target.id);
		event.stopPropagation();
		$.ajax({
			url: "/unlike",
			dataType: "json",
			type: 'POST',
			contentType: 'application/json',
			data: JSON.stringify({
				"id" : event.target.id
			}),
			success: function(data){
				if (data.success == 'unliked'){
					$(event.target).attr("src", "/images/icon-triangle.png");
					var votes = parseFloat($(event.target.parentNode).find('p').text()) - 1;
					$(event.target).find("p").text(votes);
					$(event.target).removeClass("unvote");
					$(event.target).addClass("vote");
					$(event.target.parentNode).find('p').text(votes);
					
				}
			},
			error: function(xhr, textStatus, errorThrown){
				console.log(xhr);
				console.log(textStatus);
				console.log(errorThrown);
			}
		});
	});
	$(window).on('load resize', function(){
		$('.textContainer').css("width", ($(window).width() * 0.9 - 30 - 60) + 'px');
	});
});