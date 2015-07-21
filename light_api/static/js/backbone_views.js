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
    },
    initialize: function(model){
        this.model = model;
        this.template = _.template($("#playlist-view").html());
        this.updateState();
        this.listenTo(this.model, "change", this.updateState);

        this.formData = new FormData();
        this.filename = "";
        this.fileUploaded = false;
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
        $.ajax({
            url: '/api/upload_video/',
            data: this.formData,
            cache: false,
            contentType: false,
            processData: false,
            type: 'POST',
            timeout: 60000, // sets timeout to 60 seconds
            success: function(response){
                alert("worked")
                self.$(".upload").show();
            },
            error: function(data){
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
        var renderData = {
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
    },
    save: function(){
        var inputChannel = $("input").val();
        this.model.set("channel_name", inputChannel);
        this.model.save(null, {
            error: function(){
                alert("Channel name already exists.  Pick a different one.")
            }
        });
    },
    updateState: function(){
        if(this.model.get("channel_name") === null){
            this.editState = CHANNEL_STATES.EDIT_NEW;
        } else {
            this.editState = CHANNEL_STATES.NO_EDIT;
        }
        this.render();
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
        Parse.FacebookUtils.logIn("email", {
            success: function(user) {
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
        this.loggedIn = false;
        var self = this
        this.channelView = new ChannelView(this.model);
        this.loginStateView = new LoginStateView(this.model, function(){
            self.channelView.render();
        });
        this.loginStateView.updateLoginState();
        this.loginView = new LoginView(this.model, function(){
            self.loginStateView.updateLoginState();
        });
        this.playListView = new PlayListView(this.model);
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
