

module.exports = function(app, passport) {


// normal routes ===============================================================

    // show the home page (will also have our login links)
    app.get('/', function(req, res) {
        res.render('index.ejs');
    });

    // PROFILE SECTION =========================
    app.get('/profile', isLoggedIn, function(req, res) {
        
        // Clone res
        var clone = JSON.parse(JSON.stringify(req.user));
        var User = Parse.Object.extend("User");
        var query = new Parse.Query(User);

        if(clone.local) 
            query.equalTo("local.email", clone.local.email);

        if(clone.facebook) 
            query.equalTo("facebook.token", clone.facebook.token);
        
        if(clone.twitter) 
            query.equalTo("twitter.token", clone.twitter.token);

        if(clone.google) 
            query.equalTo("google.token", clone.google.token);
        
        query.first({
          success: function(user) {
            var clone = JSON.parse(JSON.stringify(user));
            res.render('profile.ejs', {
                user : clone
            });
          },
          error: function(err) {
            console.log("[PROFILE DEBUG] Error!");
          }
        });
    });

    // LOGOUT ==============================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

// =============================================================================
// AUTHENTICATE (FIRST LOGIN) ==================================================
// =============================================================================

    // locally --------------------------------
        // LOGIN ===============================
        // show the login form
        app.get('/login', function(req, res) {
            res.render('login.ejs', { message: req.flash('loginMessage') });
        });

        // process the login form
        app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

        // SIGNUP =================================
        // show the signup form
        app.get('/signup', function(req, res) {
            res.render('signup.ejs', { message: req.flash('signupMessage') });
        });

        // process the signup form
        app.post('/signup', passport.authenticate('local-signup', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/signup', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

    // facebook -------------------------------

        // send to facebook to do the authentication
        app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

        // handle the callback after facebook has authenticated the user
        app.get('/auth/callback/facebook',
            passport.authenticate('facebook', {
                successRedirect : '/profile',
                failureRedirect : '/'
            }));

    // twitter --------------------------------

        // send to twitter to do the authentication
        app.get('/auth/twitter', passport.authenticate('twitter', { scope : 'email' }));

        // handle the callback after twitter has authenticated the user
        app.get('/auth/callback/twitter',
            passport.authenticate('twitter', {
                successRedirect : '/profile',
                failureRedirect : '/'
            }));


    // google ---------------------------------

        // send to google to do the authentication
        app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

        // the callback after google has authenticated the user
        app.get('/auth/callback/google',
            passport.authenticate('google', {
                successRedirect : '/profile',
                failureRedirect : '/'
            }));

// =============================================================================
// AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
// =============================================================================

    // locally --------------------------------
        app.get('/connect/local', function(req, res) {
            res.render('connect-local.ejs', { message: req.flash('loginMessage') });
        });
        app.post('/connect/local', passport.authenticate('local-signup', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/connect/local', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

    // facebook -------------------------------

        // send to facebook to do the authentication
        app.get('/connect/facebook', passport.authorize('facebook', { scope : 'email' }));

        // handle the callback after facebook has authorized the user
        app.get('/connect/callback/facebook',
            passport.authorize('facebook', {
                successRedirect : '/profile',
                failureRedirect : '/'
            }));

    // twitter --------------------------------

        // send to twitter to do the authentication
        app.get('/connect/twitter', passport.authorize('twitter', { scope : 'email' }));

        // handle the callback after twitter has authorized the user
        app.get('/connect/callback/twitter',
            passport.authorize('twitter', {
                successRedirect : '/profile',
                failureRedirect : '/'
            }));


    // google ---------------------------------

        // send to google to do the authentication
        app.get('/connect/google', passport.authorize('google', { scope : ['profile', 'email'] }));

        // the callback after google has authorized the user
        app.get('/connect/callback/google',
            passport.authorize('google', {
                successRedirect : '/profile',
                failureRedirect : '/'
            }));

// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, just remove the token
// for local account, remove email and password
// user account will stay active in case they want to reconnect in the future

    // local -----------------------------------
    app.get('/unlink/local', isLoggedIn, function(req, res) {
        var user = req.user;
        // user.set("local", {});
        // user.local.token = undefined;
        // user.save(function(err) {
        //     res.redirect('/profile');
        // });
        user.save({ 
            "local" : null
        }, {
            useMasterKey: true,
            success: function(u) {
                res.redirect('/profile');
            },
            error: function(error) {
                res.redirect('/profile');
            }
        });
    });

    // facebook -------------------------------
    app.get('/unlink/facebook', isLoggedIn, function(req, res) {
        var user = req.user;
        // user.set("facebook", {});
        // user.facebook.token = undefined;
        // user.save(function(err) {
        //     res.redirect('/profile');
        // });
        user.save({ 
            "facebook" : null
        }, {
            useMasterKey: true,
            success: function(u) {
                res.redirect('/profile');
            },
            error: function(error) {
                res.redirect('/profile');
            }
        });
    });

    // twitter --------------------------------
    app.get('/unlink/twitter', isLoggedIn, function(req, res) {
        var user = req.user;
        // user.set("twitter", {});
        // // user.twitter.token = undefined;
        // user.save(function(err) {
        //     res.redirect('/profile');
        // });

        user.save({ 
            "twitter" : null
        }, {
            useMasterKey: true,
            success: function(u) {
                res.redirect('/profile');
            },
            error: function(error) {
                res.redirect('/profile');
            }
        });
    });

    // google ---------------------------------
    app.get('/unlink/google', isLoggedIn, function(req, res) {
        var user = req.user;
        //user.google.token = undefined;
        // user.save(function(err) {
        //     res.redirect('/profile');
        // });

        user.save({ 
            "google" : null 
        }, {
            useMasterKey: true,
            success: function(u) {
                res.redirect('/profile');
            },
            error: function(error) {
                res.redirect('/profile');
            }
        });
    });


};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}

/*
Some idea to check user is logged in via server
Parse.Cloud.beforeSave("MyClass", function(request, response) {
  Parse.Session.current().then(function(session) {
    if (session.get('restricted')) {
      response.error('write operation not allowed');
    }
    response.success();
  });
});
*/