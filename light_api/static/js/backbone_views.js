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
        console.log("this part worked");
        console.log(profilePictureUrl);
        /*
        $('.profile-circular').css({'background-image':'url(' + profilePictureUrl +')'});
        $('.profile-circular').show();
        */
    });
}


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


ChannelView = Backbone.View.extend({
    el: $("#login-and-channel-area"),
    events: {
    },
    initialize: function(model){
        this.model = model;
        this.template = _.template($("#channel-view").html());
    },
    render: function(options){
        this.$el.html(this.template());
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
                            console.log("finished with facebook stuff");
                        },
                        error: function(data){
                            self.$(".loading-icon").hide();
                            self.$(".sign-up-continue").show();
                            alert("error");
                        }
                    });
                } else {
                    // user logged in with facebook
                    Backbone.history.navigate('', {trigger: true});
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
            $('.profile-circular').hide();
            alert("need to add logout action");
            this.render();
            if(window.location.hash === ''){
                // already at home page
                Backbone.history.navigate('!login', {trigger: true});
            } else {
                Backbone.history.navigate('', {trigger: true});
            }
        } else {
            this.loggedInCallback();
        }
    },
    render: function(){
        if(this.authenticated){
            alert("render authenticated");
        } else {
            alert("render not authenticadted");
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
    },
    defaultRoute: function(path){
        removeHash();
        var self = this;
        this.loginView = new LoginView(this.model, function(){
            self.loginStateView.updateLoginState();
        });
        this.loginView.render();

        if(!Parse.User.current()){
            //used is not logged in
        } else {
            //user is logged in
        }
    }
});
