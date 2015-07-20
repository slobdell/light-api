function removeHash () {
    history.pushState("", document.title, window.location.pathname
        + window.location.search);
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


LoginView = Backbone.View.extend({
    events: {
        "click .sign-up-continue": "clickSubmit",
        "click .more-info": "clickMoreInfo",
        "click .facebook-button": "facebookLogin"
    },
    initialize: function(model, callback){
        this.model = model;
        this.template = _.template($("#sign-up-view").html());
        this.callback = callback;
    },
    clickMoreInfo: function(){
        this.$(".more-info").hide();
        mixpanel.track("Abort Signup; Try iOS");
        if(isMobile()){
            mixpanel.track("Mobile iOS Redirect");
            window.location.href = "https://itunes.apple.com/us/app/exercise-library/id982327127";
        } else {
            globalTextView.render();
        }
    },
    facebookLogin: function(){
        var self = this;
        Parse.FacebookUtils.logIn("email", {
            success: function(user) {
                globalTextView.render();
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
                            Backbone.history.navigate('!goal', {trigger: true});
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
    clickSubmit: function(){
        globalTextView.render();
        var email = this.$(".email-input").val();
        var password = this.$(".password-input").val();
        var isValidEmail = validateEmail(email);
        if(!isValidEmail){
            this.$(".error-area").html("Input a valid E-Mail address");
        }
        else if (password.length < 7){
            this.$(".error-area").html("Password needs to be at least 7 characters");
        }
        else {
            this.$(".loading-icon").show();
            this.$(".sign-up-continue").hide();
            var self = this;
            this.signUp(email, password, function(){
                self.$(".loading-icon").hide();
                self.$(".sign-up-continue").show();
                self.callback();
            });

        }
    },
    signUp: function(email, password, callback){
        email = email.toLowerCase();
        var user = new Parse.User();
        user.set("username", email);
        user.set("password", password);
        user.set("email", email);
        user.signUp(null, {
            success: function(user) {
                $.ajax({
                    url: '/api/signup/',
                    data: {
                        email: email,
                        username: email
                    },
                    cache: false,
                    dataType: 'json',
                    traditional: true,
                    type: 'POST',
                    contentType: 'application/x-www-form-urlencoded;charset=utf-8',
                    success: function(response){
                        user.set("access_token", response.access_token);
                        user.save();
                        if (_.isFunction(callback)) {
                            callback();
                        }
                        Backbone.history.navigate('!confirmation/' + email, {trigger: true});
                    },
                    error: function(data){
                        self.$(".loading-icon").hide();
                        self.$(".sign-up-continue").show();
                        alert("error");
                    }
                });
            },
            error: function(user, error) {
                self.$(".error-area").html(error.message);
                if (_.isFunction(callback)) {
                    callback();
                }
            }
        });
    },
    render: function(options){
        this.$el.html(this.template());
        return this.postRender(options);
    }
});


IndexRouter = Backbone.Router.extend({
    routes: {
        "": "defaultRoute"
    },
    updateLoginState: function(){
        this.loginStateView.updateLoginState();
    },
    initialize: function(){
        this.model = new User();
        this.loggedIn = false;
        this.globalView = new GlobalView();
        this.loginStateView = new LoginStateView(this.model);
        this.loginStateView.updateLoginState();
    },
    login: function(){
        var self = this;
        this.loginView = new LoginView(this.model, function(){
            self.loginStateView.updateLoginState();
        });
        this.loginView.render();
    },
    signup: function(){
        mixpanel.track("Sign Up Page"); // Step 2
        var self = this;
        this.signUpView = new SignUpView(this.model, function(){
            self.loginStateView.updateLoginState();
        });
        this.signUpView.render();
    },
    defaultRoute: function(path){
        removeHash();
        if(!Parse.User.current()){
            //used is not logged in
        } else {
            //user is logged in
        }
    }
});
