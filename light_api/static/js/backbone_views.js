function removeHash () {
    history.pushState("", document.title, window.location.pathname
        + window.location.search);
}


function facebookGetMe(){
    FB.api('/v2.1/me?fields=id,email', function(response) {
        var facebook_id = response.id;
        var facebookEmail = response.email || '';
        var parseUser = Parse.User.current();
        parseUser.set("facebook_id", facebook_id);
        parseUser.set("facebook_email", facebookEmail);
        parseUser.save()
    });
    updateProfilePicture();
}


function updateProfilePicture() {
    FB.api('/v2.1/me/picture?redirect=false', function(response){
        var profilePictureUrl = response.data.url;
        /*
        $('.profile-circular').css({'background-image':'url(' + profilePictureUrl +')'});
        $('.profile-circular').show();
        */
    });
}


var CHANNEL_STATES = {
    NO_EDIT: 1,
    EDIT_EXISTING: 2,
    EDIT_NEW: 3
};

var PLAYLIST_STATES = {
    UPLOAD_NOT_ALLOWED: 1,
    UPLOAD_GRAY: 2,
    UPLOAD_PRIMARY: 3
};


var PlayingSong = Backbone.Model.extend({
    constructor: function (){
        var attrs = [{
            'track_url': "https://s3.amazonaws.com/lobbdawg/audio_files/bensound-scifi.mp3",
            'artwork_url': "https://s3.amazonaws.com/lobbdawg/audio_files/album_default.jpg",
            'song_name': 'Moose',
            'artist_name': 'BenSound.com',
            'analysis_json': defaultJson
        }];
        Backbone.Model.apply(this, attrs);
    }
});


Song = Backbone.Model.extend({
});


SongCollection = Backbone.Collection.extend({
    url: function(){
        if(!Parse.User.current() || !Parse.User.current().get('access_token')){
            return null;
        }
        var encodedParams = $.param({
            username: Parse.User.current().get('username'),
            access_token: Parse.User.current().get('access_token')
        });
        return '/api/songs/?' + encodedParams;
    },
    model: Song
});


User = Backbone.Model.extend({
    url: function(){
        if(!Parse.User.current()){
            return null;
        }
        var encodedParams = $.param({
             username: Parse.User.current().get('username'),
             access_token: Parse.User.current().get('access_token')
        });
        return '/api/user/?' + encodedParams;
    },
    initialize: function(){
        this.listenTo(this, 'sync', function(){
        });
    },
    save: function(attrs, options) {
        this.set("username", Parse.User.current().get("username"));
        this.set("access_token", Parse.User.current().get("access_token"));
        Backbone.Model.prototype.save.call(this, attrs, options);
    }
});


PlayListView = Backbone.View.extend({
    el: $("#playlist-area"),
    events: {
        "click .upload": "clickChooseFile",
        "change #upfile": "uploadFileChanged",
        "click .playable-song": "songClick",
    },
    initialize: function(model, songCollection, playingSong){
        this.model = model;
        this.playingSong = playingSong;
        this.template = _.template($("#playlist-view").html());
        this.songCollection = songCollection;
        this.updateState();
        this.listenTo(this.model, "change", this.updateState);
        this.listenTo(this.songCollection, "sync", this.render);
        this.listenTo(this.songCollection, "add", this.render);
        this.listenTo(this.songCollection, "sync", this.setFirstSong);

        this.formData = new FormData();
        this.filename = "";
        this.fileUploaded = false;
        this.firstSongLoaded = false;
    },
    setFirstSong: function(){
        if(this.songCollection.length == 0){
            return;
        }
        if(this.firstSongLoaded){
            return;
        }

        var self = this;
        setTimeout(function(){
            var selectedSong = self.songCollection.models[0];
            self.playingSong.set("track_url", selectedSong.get("track_url"));
            self.playingSong.set("artwork_url", selectedSong.get("artwork_url"));
            self.playingSong.set("song_name", selectedSong.get("track_name"));
            self.playingSong.set("artist_name", selectedSong.get("artist_name"));
            self.playingSong.set("analysis_json", selectedSong.get("analysis_json"));
            self.playingSong.trigger("methalop");
            self.firstSongLoaded = true;
        }, 500);
    },
    songClick: function(evt){
        var idString = evt.target.id;
        var splitArray = idString.split("_");
        var selectedSong = null;
        if(splitArray[0] === "song"){
            var songId = parseInt(splitArray[1], 10);
            if(!songId){
            // FIXME this is pretty hacky...it's weird onclick event handlers for empty strings
                songId = $($(evt.target)[0]).children()[0].id;
            }

            for(var i=0; i<this.songCollection.length; i++){
                var model = this.songCollection.models[i];
                if(model.get("id") === songId){
                    selectedSong = model;
                    break;
                }
            }
        }
        this.playingSong.set("track_url", selectedSong.get("track_url"));
        this.playingSong.set("artwork_url", selectedSong.get("artwork_url"));
        this.playingSong.set("song_name", selectedSong.get("track_name"));
        this.playingSong.set("artist_name", selectedSong.get("artist_name"));
        this.playingSong.set("analysis_json", selectedSong.get("analysis_json"));
        this.playingSong.trigger("methalop");
        //alert("trigger");
    },
    clickChooseFile: function(){
        this.$("#upfile").click();
        this.$(".upload").hide();
    },
    uploadFileChanged: function(){
        // need to double check this on iphone
        var file = this.$('input[name="upfile"]')[0].files[0];

        if (!(typeof file === "undefined")){
            this.filename = file.name;
            this.formData = new FormData();
            this.formData.append('file', file);
            this.fileUploaded = true;
        }
        this.render();
        var self = this;

        var username = Parse.User.current().get('username');
        var access_token = Parse.User.current().get('access_token');
        this.formData.append('username', username);
        this.formData.append('access_token', access_token);
        this.$(".upload").addClass("btn-black");
        this.$(".loader").show();
        $.ajax({
            url: '/api/upload_video/',
            data: self.formData,
            cache: false,
            contentType: false,
            processData: false,
            type: 'POST',
            timeout: 60000 * 3, // sets timeout to 60 seconds
            success: function(response){
                self.$(".upload").show();
                self.songCollection.add(response);
                self.$(".loader").hide();
                self.$(".upload").removeClass("btn-black");
            },
            error: function(data){
                self.$(".loader").hide();
                self.$(".upload").removeClass("btn-black");
                alert("fail")
            }
        });
    },
    updateState: function(){
        if(typeof this.model.get("username") === "undefined"){
            this.playlistState = PLAYLIST_STATES.UPLOAD_NOT_ALLOWED;
        } else if(this.model.get("channel_name") === null){
            this.playlistState = PLAYLIST_STATES.UPLOAD_GRAY;
        } else {
            this.playlistState = PLAYLIST_STATES.UPLOAD_PRIMARY;
        }
        this.render();
    },
    render: function(){
        console.log(this.songCollection.toJSON());
        var renderData = {
            songCollection: this.songCollection.toJSON(),
            filename: this.filename,
            fileUploaded: this.fileUploaded,
            playlistState: this.playlistState
        };
        this.$el.html(this.template(renderData));
        return this;
    }
});


ChannelView = Backbone.View.extend({
    el: $("#login-and-channel-area"),
    events: {
        "click .save": "save",
        "click .edit": "startEdit",
        "click .cancel": "cancelEdit"
    },
    initialize: function(model){
        this.model = model;
        this.template = _.template($("#channel-view").html());
        this.editState = CHANNEL_STATES.NO_EDIT;
        this.listenTo(this.model, "sync", this.updateState);
        this.oldChannel = null;
    },
    save: function(){
        var inputChannel = $("input").val();
        this.model.set("channel_name", inputChannel);
        this.model.save(null, {
            error: function(){
                alert("Someone else already reserved that channel name.  Pick a different one.  Better error message is in the works....");
            }
        });
    },
    updateState: function(){
        if(this.model.get("channel_name") === null){
            this.editState = CHANNEL_STATES.EDIT_NEW;
        } else {
            this.editState = CHANNEL_STATES.NO_EDIT;
        }

        this.updateGlobalPresence();
        this.render();
    },
    updateGlobalPresence: function(){
        if(this.model.get("channel_name") === this.oldChannel){
            return;
        }
        if(this.model.get("channel_name") !== null){
            beginSubscribe(this.oldChannel, this.model.get("channel_name"));
        }
        this.oldChannel = this.model.get("channel_name");
    },
    cancelEdit: function(){
        this.editState = CHANNEL_STATES.NO_EDIT;
        this.render();
    },
    startEdit: function(){
        this.editState = CHANNEL_STATES.EDIT_EXISTING;
        this.render();
    },
    render: function(options){
        var renderData = {
            editState: this.editState,
            channelName: this.model.get("channel_name")
        };
        this.$el.html(this.template(renderData));
        this.$("input").focus();
        if(this.model.get("channel_name") !== null){
            CHANNEL_NAME = (this.model.get("channel_name") || "").toLowerCase();
        }
        return this;
    }
});


LoginView = Backbone.View.extend({
    // TODO rename this to some other shit
    el: $("#login-and-channel-area"),
    events: {
        "click .fb-login-btn": "facebookLogin"
    },
    initialize: function(model, callback){
        this.model = model;
        this.template = _.template($("#login-view").html());
        this.callback = callback;
    },
    facebookLogin: function(){
        var self = this;
        this.$(".loader").show();
        Parse.FacebookUtils.logIn("email", {
            success: function(user) {
                self.$(".loader").hide();
                if (!user.existed()) {
                    // user signed up and logged in  through facebook
                    $.ajax({
                        url: '/api/signup/',
                        data: {
                            username: user.get("username"),
                            facebook: true
                        },
                        cache: false,
                        dataType: 'json',
                        traditional: true,
                        type: 'POST',
                        contentType: 'application/x-www-form-urlencoded;charset=utf-8',
                        success: function(response){
                            user.set("access_token", response.access_token);
                            user.save();
                            facebookGetMe()
                            self.callback();
                        },
                        error: function(data){
                            self.$(".loader").hide();
                            self.$(".loading-icon").hide();
                            self.$(".sign-up-continue").show();
                            alert("error");
                        }
                    });
                } else {
                    self.callback();
                }
            },
            error: function(user, error) {
                // User cancelled the Facebook login or didn't fully authorize
            }
        });
    },
    render: function(options){
        this.$el.html(this.template());
        return this;
    }
});


MusicPlayerView = Backbone.View.extend({
    el: $("#music-player"),
    events: {
        "click .jp-play": "clickPlay",
        "click .jp-pause": "clickPause"
    },
    clickPause: function(evt){
        this.audio.pause();
        this.audio.load();
        this.togglePlay();
        stopFlashing();
    },
    clickPlay: function(evt){
        if(this.audio !== null){
            var self = this;
            $(this.audio).one("playing", function(){
                //start the stuff for when the audio has started playing
                self.audio.pause();
                startFlashing(self.audio, self.playingSong.get("analysis_json"));
            });
            this.audio.play();
            $("#play-loader").show();
            this.togglePlay();
        }
    },
    togglePlay: function(){
        if(this.paused){
            this.$(".jp-play").addClass("jp-pause");
            this.$(".jp-pause").removeClass("jp-play");
        } else {
            this.$(".jp-pause").addClass("jp-play");
            this.$(".jp-play").removeClass("jp-pause");
        }
        this.paused = !this.paused;
        this.delegateEvents();
    },
    initialize: function(playingSong){
        this.paused = true;
        this.playingSong = playingSong;
        this.listenTo(this.playingSong, "methalop", this.render);
        this.audio = null;
        if(this.playingSong.get("track_url")){
            this.audio = new Audio(this.playingSong.get("track_url"));
        }
        this.listenTo(this.playingSong, "methalop", this.updateAudioTrack);
        this.render();
    },
    updateAudioTrack: function(){
        if(this.audio !== null){
            if(!this.paused){
                this.audio.pause();
                this.togglePlay();
                stopFlashing();
            }
        }
        this.audio = new Audio(this.playingSong.get("track_url"));
    },
    render: function(){
        var artworkUrl = this.playingSong.get("artwork_url");
        if(!artworkUrl){
            artworkUrl = 'https://s3.amazonaws.com/lobbdawg/audio_files/album_default.jpg';
        }
        // TODO move to template
        var artistHTML = "<ul><li class='item-artist jp-playlist-current'>" + this.playingSong.get("artist_name") + "</li>";
        artistHTML += "<li class='item-song'>" + this.playingSong.get("song_name") + "</li></ul>";
        this.$(".song_title").html("<img src='" + artworkUrl +"'></img>" + artistHTML);
    }
});


LoginStateView = Backbone.View.extend({
    el: $("#login-state"),
    events: {
        "click a": "toggleLogInState"
    },
    initialize: function(model, loggedInCallback){
        this.model = model;
        this.loggedInCallback = loggedInCallback;
    },
    updateLoginState: function(){
        this.authenticated = (Parse.User.current() !== null);
        var self = this;
        if(this.authenticated){
            facebookGetMe();
            this.model.fetch({
                reset: true,
                success: function(){
                    self.loggedInCallback();
                },
                error: function(){
                    alert("error on update login");
                }
            });
        }
        this.render();
    },
    toggleLogInState:function(){
        if(this.authenticated){
            Parse.User.logOut()
            this.authenticated = false;
            //$('.profile-circular').hide();
            this.render();
            Backbone.history.navigate('!login', {trigger: true});
        } else {
            this.loggedInCallback();
        }
    },
    render: function(){
        if(this.authenticated){
            $(".top-nav").append("<li class='log-out menu-level-0'><a href='#'><span>Log Out</span></a></li>");
            $(".help").addClass("btn-black");
            var self = this;
            $(".log-out").on("click", function(){
                self.model.clear();
                self.toggleLogInState();
            });
        } else {
            $(".help").removeClass("btn-black");
            $(".log-out").remove();
        }
    }
});

IndexRouter = Backbone.Router.extend({
    routes: {
        "": "defaultRoute"
    },
    initialize: function(){
        this.model = new User();
        this.playingSong = new PlayingSong();
        this.musicPlayerView = new MusicPlayerView(this.playingSong);
        this.loggedIn = false;
        var self = this;
        this.channelView = new ChannelView(this.model);
        this.songCollection = new SongCollection();
        this.playListView = new PlayListView(this.model, this.songCollection, this.playingSong);
        this.loginStateView = new LoginStateView(this.model, function(){
            self.channelView.render();
            self.songCollection.fetch();
        });
        this.loginStateView.updateLoginState();
        this.loginView = new LoginView(this.model, function(){
            self.loginStateView.updateLoginState();
        });
    },
    defaultRoute: function(path){
        removeHash();
        this.loginView.render();
        this.playListView.render();

        if(!Parse.User.current()){
            //used is not logged in
        } else {
            //user is logged in
        }
    }
});
