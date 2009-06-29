function FavoritesAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	scene_helpers.addCommonSceneMethods(this);
}

FavoritesAssistant.prototype.setup = function() {

	this.scroller = this.controller.getSceneScroller();
	this.initAppMenu({ 'items':loggedin_appmenu_items });
	this.initTwit();

	this.setupCommonMenus({
		// viewMenuItems: [
		// 	{label: "Favorites", command:'scroll-top', 'class':"palm-header left", width:320}
		// ],
		cmdMenuItems: [
			{label:$L('Compose'),  icon:'compose', command:'compose', shortcut:'N'},
			{
				toggleCmd:'IGNORE',
				items: [
					{label:$L('My Timeline'), icon:'conversation', command:'my-timeline', shortcut:'T'},
					{label:$L('Favorites'), iconPath:'images/theme/menu-icon-favorite.png', command:'IGNORE', shortcut:'F', 'class':"palm-header left"},
					{label:$L('Search'),      icon:'search', command:'search', shortcut:'S'},
				]
			},
			{label:$L('Refresh'),   icon:'sync', command:'refresh', shortcut:'R'}					
		]
	});
	
	
	
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Luna.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	
	this.setupInlineSpinner('activity-spinner-favorites');
	
	this.refreshOnActivate = true;
}

FavoritesAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	
	// this.addPostPopup();


	var thisA = this; // for closures below
	
	var tts = sc.app.prefs.get('timeline-text-size');
	this.setTimelineTextSize('#favorites-timeline', tts);
	
	
	jQuery().bind('error_favorites_timeline_data', function(e, error_obj) {
		// error_obj.url
		// error_obj.xhr
		// error_obj.msg
		
		var err_msg = $L("There was an error retrieving your favorites");
		thisA.displayErrorInfo(err_msg, error_obj);
		
		
		/*
			Update relative dates
		*/
		sch.updateRelativeTimes('#favorites-timeline>div.timeline-entry .meta>.date', 'data-created_at');
		thisA.hideInlineSpinner('activity-spinner-favorites');
	});
	
	
	
	jQuery().bind('new_favorites_timeline_data', function(e, tweets) {
		
		/*
			Check to see if the returned query matches what we are using. If not, ignore.
		*/

		/*
			reverse the tweets for collection rendering (faster)
		*/
		var rendertweets = tweets;
		
		if (rendertweets && rendertweets.length > 0) {
		
			jQuery.each( rendertweets, function() {
			
				if (!thisA.getEntryElementByStatusId(this.id)) {
			
					this.text = makeItemsClickable(this.text);
				
					// we set this so the tweets come out as not marked new
					this.not_new = true;
				
					var itemhtml = sc.app.tpl.parseTemplate('tweet', this);
			
					/*
						make jQuery obj
					*/
					var jqitem = jQuery(itemhtml);
			
					/*
						attach data object to item html
					*/
					jqitem.data('item', this);
			
					/*
						save this tweet to Depot
					*/
					sc.app.Tweets.save(this);
			
			
					/*
						put item on timeline
					*/
					jQuery('#favorites-timeline').prepend(jqitem);
				} else {
					dump('Tweet ('+this.id+') already is in favorites timeline');
				}
			});
			
		}
		
		/*
			Update relative dates
		*/
		sch.updateRelativeTimes('#favorites-timeline>div.timeline-entry .meta>.date', 'data-created_at');
		thisA.hideInlineSpinner('activity-spinner-favorites');
		
	});
	
	jQuery('#favorites-timeline div.timeline-entry', this.scroller).live(Mojo.Event.tap, function(e) {
		var jqtarget = jQuery(e.target);

		e.stopImmediatePropagation();
		
		if (jqtarget.is('div.timeline-entry>.user') || jqtarget.is('div.timeline-entry>.user img')) {
			var userid = jQuery(this).attr('data-user-screen_name');
			Mojo.Controller.stageController.pushScene('user-detail', userid);
			return;
			
		} else if (jqtarget.is('.username.clickable')) {
			var userid = jqtarget.attr('data-user-screen_name');
			Mojo.Controller.stageController.pushScene('user-detail', userid);
			return;
			
		} else if (jqtarget.is('.hashtag.clickable')) {
			var hashtag = jqtarget.attr('data-hashtag');
			thisA.searchFor('#'+hashtag);
			return;
			
		} else if (jqtarget.is('div.timeline-entry .meta')) {
			var status_id = jqtarget.attr('data-status-id');
			var isdm = false;
			var status_obj = null;

			status_obj = thisA.getTweetFromModel(parseInt(status_id));

			if (jqtarget.parent().parent().hasClass('dm')) {
				isdm = true;
			}

			Mojo.Controller.stageController.pushScene('message-detail', {'status_id':status_id, 'isdm':isdm, 'status_obj':status_obj});
			return;
			
		} else if (jqtarget.is('div.timeline-entry a[href]')) {
			return;

		} else {
			var status_id = jQuery(this).attr('data-status-id');
			var isdm = false;
			var status_obj = null;

			if (jQuery(this).hasClass('dm')) {
				isdm = true;
			}
			
			Mojo.Controller.stageController.pushScene('message-detail', {'status_id':status_id, 'isdm':isdm, 'status_obj':status_obj});
			return;
		}
	});	
	
	
	
	if (this.refreshOnActivate) {
		this.refresh();
		this.refreshOnActivate = false;
	}
	

	
}


FavoritesAssistant.prototype.deactivate = function(event) {
	

	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	
	jQuery().unbind('new_favorites_timeline_data');
	jQuery().unbind('error_favorites_timeline_data');

	jQuery('#favorites-timeline div.timeline-entry', this.scroller).die(Mojo.Event.tap);
	
	
}

FavoritesAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}

FavoritesAssistant.prototype.getEntryElementByStatusId = function(id) {
	var el = jQuery('#favorites-timeline div.timeline-entry[data-status-id='+id+']', this.scroller).get(0);
	return el;
};


FavoritesAssistant.prototype.refresh = function(event) {
	this.getData();
}

FavoritesAssistant.prototype.getData = function() {
	sc.helpers.markAllAsRead('#favorites-timeline>div.timeline-entry');
	this.showInlineSpinner('activity-spinner-favorites', 'Loading favorite tweets…');
	
	this.twit.getFavorites();
};