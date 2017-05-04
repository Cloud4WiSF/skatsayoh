var bodyParser  = require('body-parser');
var express     = require('express');
var Parse       = require('parse/node');
var router      = express.Router();

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

var LocalStrategy    = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy  = require('passport-twitter').Strategy;
var GoogleStrategy   = require('passport-google-oauth').OAuth2Strategy;
var bcrypt   = require('bcrypt-nodejs');

Parse.initialize('APPLICATION_ID', 'JAVASCRIPT_KEY', 'MASTER_KEY');
Parse.serverURL = 'http://localhost:3000/parse'; //'http://skatsayoh.herokuapp.com/parse';
Parse.User.enableUnsafeCurrentUser();

// load the auth variables
var configAuth = require('./auth'); // use this one for testing

module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    /*
      Initilize passport user serialization
      */
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        var query = new Parse.Query('User');
        query.get(id, {
          success: function(user) {
            return done(null, user);
          },
          error: function(object, error) {
            return done(error, user);
          }
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, email, password, done) {
        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

        // asynchronous
        // process.nextTick(function() { // Encountered error if uncommented -- FIX ME!!
            console.log("[LOCAL-SIGNUP DEBUG] Checking user [" + JSON.stringify(req.user) + "]");
            // console.log("[LOCAL-SIGNUP DEBUG] Checking user local " + JSON.stringify(req.user.local));

            // if the user is not already logged in:
            if (!req.user) {
                var User = Parse.Object.extend("User");
                var query = new Parse.Query(User);
                query.equalTo("local.email", email);
                query.first({
                  success: function(user) {
                    // check to see if theres already a user with that email
                    console.log("[LOCAL-SIGNUP DEBUG] Found User: " + JSON.stringify(user));
                    if (user) {
                        console.log("[LOCAL-SIGNUP DEBUG] Theres already a user with that email.")
                        return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
                    } else {
                        console.log("[LOCAL-SIGNUP DEBUG] Adding new user...");
                        var local = { 
                            'email': email, 
                            'password' : bcrypt.hashSync(password, bcrypt.genSaltSync(8), null)
                        };

                        var newUser = new Parse.User();
                        newUser.set("username", email);
                        newUser.set("password", bcrypt.hashSync(password, bcrypt.genSaltSync(8), null));
                        newUser.set("local", local);

                        newUser.signUp(null, {
                          success: function(user) {
                            return done(null, user);
                          },
                          error: function(user, error) {
                            return done(error);
                          }
                        });
                    }
                  },
                  error: function(object, error) {
                    console.log("[LOCAL-SIGNUP DEBUG] Adding new user...");
                    var local = { 
                        'email': email, 
                        'password' : bcrypt.hashSync(password, bcrypt.genSaltSync(8), null) 
                    };

                    var newUser = new Parse.User();
                    newUser.set("username", email);
                    newUser.set("password", bcrypt.hashSync(password, bcrypt.genSaltSync(8), null));
                    newUser.set("local", local); 
                    newUser.signUp(null, {
                        success: function(user) {
                            console.log("[LOCAL-SIGNUP DEBUG] Successfully signing up user " + JSON.stringify(user));
                            return done(null, user);
                        },
                        error: function(user, error) {
                            console.log("[LOCAL-SIGNUP DEBUG] Failed signing up user " + JSON.stringify(error));
                            return done(error);
                        }
                    });
                  }
                });

            } else if ( !req.user.local ) {
                var User = Parse.Object.extend("User");
                var query = new Parse.Query(User);
                query.equalTo("local.email", email);
                query.first({
                  success: function(user) {
                    // check to see if theres already a user with that email
                    if (user) {
                        /*
                            But what if the user wants to link his existing account?
                            Linking Users:
                            user._linkWith('twitter', myAuthData).then(function(user){
                                // user
                            });
                        */
                        console.log("[LOCAL-SIGNUP DEBUG] Theres already a user with that email.")
                        return done(null, false, req.flash('loginMessage', 'That email is already taken.'));
                    } else {
                        var local = { 
                            "email": email, 
                            "password" : bcrypt.hashSync(password, bcrypt.genSaltSync(8), null) 
                        };

                        var updateUser = req.user;
                        console.log("[LOCAL-SIGNUP DEBUG] updateUser: " + JSON.stringify(updateUser));
                        updateUser.save({ 
                            "local" : local
                        }, { 
                            useMasterKey : true,
                            success: function(u) {
                                console.log("[LOCAL-SIGNUP DEBUG] Successfuly updating user " + JSON.stringify(user));
                                return done(null, u);
                            },  
                            error: function(error) {
                                console.log("[LOCAL-SIGNUP DEBUG] Error updating user " + JSON.stringify(error));
                                return done(error);
                            }
                        });
                    }
                  },
                  error: function(object, error) {
                    console.log("[LOCAL-SIGNUP DEBUG] Error at if(!req.user.local) { ... } " + JSON.stringify(error));
                    return done(error);
                  }
                });


                // ...presumably they're trying to connect a local account
                // BUT let's check if the email used to connect a local account is being used by another user
                // User.findOne({ 'local.email' :  email }, function(err, user) {
                //     if (err)
                //         return done(err);
                    
                //     if (user) {
                //         return done(null, false, req.flash('loginMessage', 'That email is already taken.'));
                //         // Using 'loginMessage instead of signupMessage because it's used by /connect/local'
                //     } else {
                //         var user = req.user;
                //         user.local.email = email;
                //         user.local.password = user.generateHash(password);
                //         user.save(function (err) {
                //             if (err)
                //                 return done(err);
                            
                //             return done(null,user);
                //         });
                //     }
                // });
            } else {
                console.log("[LOCAL-SIGNUP DEBUG] User is logged in and already has a local account. Ignore signup. " +
                    "(You should log out before trying to create a new account, user!)");
                return done(null, req.user);
            }

        // });

    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, email, password, done) {
        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

        // asynchronous
        // process.nextTick(function() { // Encountered error if uncommented -- FIX ME!!

            console.log("Local Loging called!");

            var User = Parse.Object.extend("User");
            var query = new Parse.Query(User);
            query.equalTo("local.email", email);
            query.first({
              success: function(user) {
                console.log("Found User! " + JSON.stringify(user));
                console.log("user:" + user.get("local").email); //+ ", with " + this.local.password);
                // return done(null, user);
                if(!bcrypt.compareSync(password, user.get("local").password)){
                    console.log("Incorrect password");
                    return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
                }
                else {
                    console.log("Correct password");
                    return done(null, user);
                }
              },
              error: function(object, error) {
                console.log("User not found: " + JSON.stringify(error));
                return done(null, false, req.flash('loginMessage', 'No user found. ' + error));
              }
            });

            // User.findOne({ 'local.email' :  email }, function(err, user) {
            //     // if there are any errors, return the error
            //     if (err)
            //         return done(err);

            //     // if no user is found, return the message
            //     if (!user)
            //         return done(null, false, req.flash('loginMessage', 'No user found.'));

            //     if (!user.validPassword(password))
            //         return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));

            //     // all is well, return user
            //     else
            //         return done(null, user);
            // });
        // });

    }));

    // =========================================================================
    // FACEBOOK ================================================================
    // =========================================================================
    var fbStrategy = configAuth.facebookAuth;
    fbStrategy.passReqToCallback = true;  // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    passport.use(new FacebookStrategy(fbStrategy,
    function(req, token, refreshToken, profile, done) {

        // asynchronous
        // process.nextTick(function() { // Encountered error if uncommented -- FIX ME!!
        if(!req.user) {
            console.log("[FB DEBUG] Called FB callback!");
            var User = Parse.Object.extend("User");
            var query = new Parse.Query(User);
            query.equalTo("facebook.id", profile.id);
            query.first({
                success: function(user) {
                    console.log("[FB DEBUG] User:"+ JSON.stringify(user));
                    if(user) {
                        console.log("[FB DEBUG] User does exists: " + JSON.stringify(user));

                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.get("facebook").token) {
                            var fb = { 
                                "token": token,  
                                "name": profile.name.givenName + ' ' + profile.name.familyName,
                                "email": (profile.emails[0].value || '').toLowerCase()
                            };

                            user.save({ "facebook" : fb }, {
                                useMasterKey: true,
                                success: function(u) {
                                    console.log("[FB DEBUG] Successfully re-linked user accounts [" + JSON.stringify(user) + "]");
                                    return done(null, u);
                                },
                                error: function(error) {
                                    console.log("[FB DEBUG] Failed re-linking user accounts [" + JSON.stringify(error) + "]");
                                    return done(error);
                                }
                            });
                        }
                        else 
                            return done(null, user);
                        
                    } else {
                        console.log("[FB DEBUG] User does not exists");
                        var fb = { 
                            "id" : profile.id, 
                            "token": token,
                            "name": profile.name.givenName + ' ' + profile.name.familyName,
                            "email": (profile.emails[0].value || '').toLowerCase() 
                        };
                        console.log("[FB DEBUG] Writing in " + JSON.stringify(fb));

                        var newUser = new Parse.User();
                        newUser.set("username", profile.id);
                        newUser.set("password", token);
                        newUser.set("facebook", fb);
                        newUser.signUp(null, {
                          success: function(user) {
                            console.log("[FB DEBUG] Successfully signup user [" + JSON.stringify(user) + "]");
                            return done(null, user);
                          },
                          error: function(user, error) {
                            console.log("[FB DEBUG] Failed signing up user [" + JSON.stringify(error) + "]");
                            return done(error);
                          }
                        });
                    }
                },
                error: function (err) {
                    console.log("[FB DEBUG] err:" + err);
                    return done(err);
                }
            });
        } else {
            console.log("[FB DEBUG] User already exists and is logged in, we have to link");
            
            // user already exists and is logged in, we have to link accounts
            var updateUser = req.user;
            var facebook = { 
                "id" : profile.id,
                "token": token,
                "name": profile.name.givenName + ' ' + profile.name.familyName,
                "email": (profile.emails[0].value || '').toLowerCase()
            };

            updateUser.save({ 
                "facebook": facebook 
            }, {
                useMasterKey: true,
                success: function(user) {
                    console.log("[FB DEBUG] Successfully linking user accounts [" + JSON.stringify(user) + "]");
                    return done(null, user);
                },
                error: function(error) {
                    console.log("[FB DEBUG] Failed linking user accounts [" + JSON.stringify(error) + "]");
                    return done(error);
                }
            });
        }
        // });
    }));

    // =========================================================================
    // TWITTER =================================================================
    // =========================================================================
    passport.use(new TwitterStrategy({

        consumerKey     : configAuth.twitterAuth.consumerKey,
        consumerSecret  : configAuth.twitterAuth.consumerSecret,
        callbackURL     : configAuth.twitterAuth.callbackURL,
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

    },
    function(req, token, tokenSecret, profile, done) {

        // asynchronous
        // process.nextTick(function() { // Encountered error if uncommented -- FIX ME!!
            // check if the user is already logged in
            if (!req.user) {
                var User = Parse.Object.extend("User");
                var query = new Parse.Query(User);
                query.equalTo("twitter.id", profile.id);
                query.find({
                  success: function(user) {
                    // check to see if theres already a user with that email
                    if (user) {
                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.get("twitter").token) {
                            var twitter = {
                                "token": token,
                                "username": profile.username,
                                "displayName": profile.displayName
                            };

                            user.save({ 
                                "twitter" : twitter 
                            }, {
                                useMasterKey: true,
                                success: function(user) {
                                    console.log("[TWITTER DEBUG] Successfully re-linked user [" + JSON.stringify(user) + "]");
                                    return done(null, user);
                                },
                                error: function(error) {
                                    console.log("[TWITTER DEBUG] Failed re-linking user [" + JSON.stringify(error) + "]");
                                    return done(error);
                                }
                            });
                        }
                        else 
                            return done(null, user);

                    } else {
                        var twitter = {
                            "id": profile.id,
                            "token": token,
                            "username": profile.username,
                            "displayName": profile.displayName
                        };

                        var newUser = new Parse.User();
                        newUser.set("twitter", twitter);
                        newUser.set("username", profile.id);
                        newUser.set("password", token);
                        newUser.signUp(null, {
                          success: function(user) {
                            console.log("[TWITTER DEBUG] Successfully signed up user [" + JSON.stringify(user) + "]");
                            return done(null, user);
                          },
                          error: function(user, error) {
                            console.log("[TWITTER DEBUG] Failed signing up user [" + JSON.stringify(error) + "]");
                            return done(error);
                          }
                        });
                    }
                  },
                  error: function(object, error) {
                    console.log("[TWITTER DEBUG] ERROR [" + JSON.stringify(error) + "]");
                    return done(error);
                  }
                });

                // User.findOne({ 'twitter.id' : profile.id }, function(err, user) {
                //     if (err)
                //         return done(err);

                //     if (user) {
                //         // if there is a user id already but no token (user was linked at one point and then removed)
                //         if (!user.twitter.token) {
                //             user.twitter.token       = token;
                //             user.twitter.username    = profile.username;
                //             user.twitter.displayName = profile.displayName;

                //             user.save(function(err) {
                //                 if (err)
                //                     return done(err);
                                    
                //                 return done(null, user);
                //             });
                //         }

                //         return done(null, user); // user found, return that user
                //     } else {
                //         // if there is no user, create them
                //         var newUser                 = new User();

                //         newUser.twitter.id          = profile.id;
                //         newUser.twitter.token       = token;
                //         newUser.twitter.username    = profile.username;
                //         newUser.twitter.displayName = profile.displayName;

                //         newUser.save(function(err) {
                //             if (err)
                //                 return done(err);
                                
                //             return done(null, newUser);
                //         });
                //     }
                // });

            } else {
                var twitter = {
                    "id": profile.id,
                    "token": token,
                    "username": profile.username,
                    "displayName": profile.displayName
                };

                // user already exists and is logged in, we have to link accounts
                var user = req.user; // pull the user out of the session
                user.save({
                    "twitter" : twitter
                }, {
                    useMasterKey: true,
                    success: function(user) {
                        console.log("[TWITTER DEBUG] Successfully linked user [" + JSON.stringify(user) + "]");
                        return done(null, user);
                    },
                    error: function(error) {
                        console.log("[TWITTER DEBUG] Failed linking user [" + JSON.stringify(error) + "]");
                        return done(error);
                    }
                });

                // user.save(function(err) {
                //     if (err)
                //         return done(err);
                        
                //     return done(null, user);
                // });
            }

        //});

    }));

    // =========================================================================
    // GOOGLE ==================================================================
    // =========================================================================
    passport.use(new GoogleStrategy({

        clientID        : configAuth.googleAuth.clientID,
        clientSecret    : configAuth.googleAuth.clientSecret,
        callbackURL     : configAuth.googleAuth.callbackURL,
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

    },
    function(req, token, refreshToken, profile, done) {

        // asynchronous
        //process.nextTick(function() {

            // check if the user is already logged in
            if (!req.user) {
                var User = Parse.Object.extend("User");
                var query = new Parse.Query(User);
                query.equalTo("google.id", profile.id);
                query.first({
                  success: function(user) {
                    console.log("[GOOGLE DEBUG] User:"+ JSON.stringify(user));
                    // check to see if theres already a user with that email
                    if (user) {
                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.get("google").token) {
                            console.log("00000");
                            var google = {
                                "token": token,
                                "name": profile.displayName,
                                "email": (profile.emails[0].value || '').toLowerCase()
                            };

                            user.save({
                                "google": google
                            }, {
                                useMasterKey: true,
                                success: function(user) {
                                    console.log("[GOOGLE DEBUG] Successfully updated user info [" + JSON.stringify(user) + "]");
                                    return done(null, user);
                                },
                                error: function(error) {
                                    console.log("[GOOGLE DEBUG] Failed updating user info [" + JSON.stringify(error) + "]");
                                    return done(error);
                                }
                            });
                        }
                        else {
                            console.log("11111");
                            return done(null, user);
                        }

                    } else {
                        console.log("[GOOGLE DEBUG] User does not exists..Creating user..");
                        var google = {
                            "id": profile.id,
                            "token": token,
                            "name": profile.displayName,
                            "email": (profile.emails[0].value || '').toLowerCase()
                        };

                        var newUser = new Parse.User();
                        newUser.set("google", google);
                        newUser.set("username", profile.id);
                        newUser.set("password", token);
                        newUser.signUp(null, {
                          success: function(user) {
                            console.log("[GOOGLE DEBUG] Successfully created user [" + JSON.stringify(user) + "]");
                            return done(null, user);
                          },
                          error: function(user, error) {
                            console.log("[GOOGLE DEBUG] Failed creating user [" + JSON.stringify(error) + "]");
                            return done(error);
                          }
                        });
                    }
                  },
                  error: function(object, error) {
                    console.log("[GOOGLE DEBUG] ERROR [" + JSON.stringify(error) + "]");
                    return done(error);
                  }
                });


                // User.findOne({ 'google.id' : profile.id }, function(err, user) {
                //     if (err)
                //         return done(err);

                //     if (user) {

                //         // if there is a user id already but no token (user was linked at one point and then removed)
                //         if (!user.google.token) {
                //             user.google.token = token;
                //             user.google.name  = profile.displayName;
                //             user.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                //             user.save(function(err) {
                //                 if (err)
                //                     return done(err);
                                    
                //                 return done(null, user);
                //             });
                //         }

                //         return done(null, user);
                //     } else {
                //         var newUser          = new User();

                //         newUser.google.id    = profile.id;
                //         newUser.google.token = token;
                //         newUser.google.name  = profile.displayName;
                //         newUser.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                //         newUser.save(function(err) {
                //             if (err)
                //                 return done(err);
                                
                //             return done(null, newUser);
                //         });
                //     }
                // });

            } else {

                // user already exists and is logged in, we have to link accounts
                var google = {
                    "id": profile.id,
                    "token": token,
                    "name": profile.displayName,
                    "email": (profile.emails[0].value || '').toLowerCase()
                };

                // user already exists and is logged in, we have to link accounts
                var user = req.user; // pull the user out of the session
                user.save({
                    "google" : google
                }, {
                    useMasterKey: true,
                    success: function(user) {
                        console.log("[GOOGLE DEBUG] Successfully linked user [" + JSON.stringify(user) + "]");
                        return done(null, user);
                    },
                    error: function(error) {
                        console.log("[GOOGLE DEBUG] Failed linking user [" + JSON.stringify(error) + "]");
                        return done(error);
                    }
                });

                // var user               = req.user; // pull the user out of the session

                // user.google.id    = profile.id;
                // user.google.token = token;
                // user.google.name  = profile.displayName;
                // user.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                // user.save(function(err) {
                //     if (err)
                //         return done(err);
                        
                //     return done(null, user);
                // });

            }

    //    });

    }));

 };

// // load all the things we need
// require('dotenv').config();

// var bodyParser  = require('body-parser');
// var express     = require('express');
// var Parse       = require('parse/node');
// var router      = express.Router();


// router.use(bodyParser.urlencoded({ extended: true }));
// router.use(bodyParser.json());
// var ParseStrategy = require('passport-parse');

// var LocalStrategy    = require('passport-local').Strategy;
// var FacebookStrategy = require('passport-facebook').Strategy;
// var TwitterStrategy  = require('passport-twitter').Strategy;
// var GoogleStrategy   = require('passport-google-oauth').OAuth2Strategy;
// var bcrypt   = require('bcrypt-nodejs');

// Parse.initialize('APPLICATION_ID', 'JAVASCRIPT_KEY', 'MASTER_KEY');
// Parse.serverURL = 'http://skatsayoh.herokuapp.com/parse';//process.env.SERVER_URL;
// Parse.User.enableUnsafeCurrentUser();
// // load up the user model
// //var User       = require('../app/models/user');

// // load the auth variables
// var configAuth = require('./auth'); // use this one for testing

// var parseStrategy = new ParseStrategy({parseClient: Parse});

// module.exports = function(passport) {
//     passport.use(parseStrategy);

//     // =========================================================================
//     // passport session setup ==================================================
//     // =========================================================================
//     // required for persistent login sessions
//     // passport needs ability to serialize and unserialize users out of session

    


//     // used to serialize the user for the session
//     /*
//       Initilize passport user serialization
//       */
//     passport.serializeUser(function(user, done) {
//         done(null, user.id);
//     });

//     // used to deserialize the user
//     passport.deserializeUser(function(id, done) {
//         console.log(">>>>>>> " + id + ", " + done);
//         var query = new Parse.Query('User');
//         query.get(id, {
//           success: function(user) {
//             return done(null, user);
//           },
//           error: function(object, error) {
//             return done(error, user);
//           }
//         });

//         // User.findById(id, function(err, user) {
//         //     done(err, user);
//         // });
//     });

//     // =========================================================================
//     // LOCAL LOGIN =============================================================
//     // =========================================================================
//     passport.use('local-login', new LocalStrategy({
//         // by default, local strategy uses username and password, we will override with email
//         usernameField : 'email',
//         passwordField : 'password',
//         passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
//     },
//     function(req, email, password, done) {
//         if (email)
//             email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

//         console.log("Server>>>>>>>> " + Parse.serverURL);
//         // asynchronous
//         process.nextTick(function() {
//             var query = new Parse.Query('User');
//             query.get({ 'local.email' :  email }, {
//               success: function(user) {
//                 if(!bcrypt.compareSync(user.get('password'), this.local.password)){
//                     return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
//                 }
//                 else {
//                     return done(null, user);
//                 }
//               },
//               error: function(object, error) {
//                 return done(null, false, req.flash('loginMessage', 'No user found. ' + error))
//                 // return done(error);
//               }
//             });

//             // User.findOne({ 'local.email' :  email }, function(err, user) {
//             //     // if there are any errors, return the error
//             //     if (err)
//             //         return done(err);

//             //     // if no user is found, return the message
//             //     if (!user)
//             //         return done(null, false, req.flash('loginMessage', 'No user found.'));

//             //     if (!user.validPassword(password))
//             //         return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));

//             //     // all is well, return user
//             //     else
//             //         return done(null, user);
//             // });
//         });

//     }));

//     // =========================================================================
//     // LOCAL SIGNUP ============================================================
//     // =========================================================================
//     passport.use('local-signup', new LocalStrategy({
//         // by default, local strategy uses username and password, we will override with email
//         usernameField : 'email',
//         passwordField : 'password',
//         passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
//     },
//     function(req, email, password, done) {
//         if (email)
//             email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

//         console.log("Server>>>>>>>> " + Parse.serverURL);
//         // asynchronous
//         process.nextTick(function() {
//             // if the user is not already logged in:
//             if (!req.user) {
//                 var query = new Parse.Query('User');
//                 query.get({ 'local.email' :  email }, {
//                   success: function(user) {
//                     // check to see if theres already a user with that email
//                     console.log(">>>Success");
//                     if (user) {
//                         return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
//                     } else {
//                         console.log('Adding new user...');
//                         var newUser = new Parse.User();
//                         newUser.set("local.email", email);
//                         newUser.set("local.password", bcrypt.hashSync(password, bcrypt.genSaltSync(8), null));

//                         newUser.signUp(null, {
//                           success: function(user) {
//                             return done(null, user);
//                           },
//                           error: function(user, error) {
//                             return done(error);
//                           }
//                         });
//                     }
//                   },
//                   error: function(object, error) {
//                     console.log(">>>Nope world");
//                     console.log('will try adding new user...');

//                     var newUser = new Parse.User();
//                     newUser.set("username", email);
//                     newUser.set("password", bcrypt.hashSync(password, bcrypt.genSaltSync(8), null));
//                     newUser.set("local.email", email);
//                     newUser.set("local.password", bcrypt.hashSync(password, bcrypt.genSaltSync(8), null));

//                     newUser.signUp(null, {
//                         success: function(user) {
//                             console.log(">>>yey world");
//                             return done(null, user);
//                         },
//                         error: function(user, error) {
//                             console.log(">>>Nope world agen " + JSON.stringify(error));
//                             return done(error);
//                         }
//                     });
//                   }
//                 });




//                 // User.findOne({ 'local.email' :  email }, function(err, user) {
//                 //     // if there are any errors, return the error
//                 //     if (err)
//                 //         return done(err);

//                 //     // check to see if theres already a user with that email
//                 //     if (user) {
//                 //         return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
//                 //     } else {

//                 //         // create the user
//                 //         var newUser            = new User();

//                 //         newUser.local.email    = email;
//                 //         newUser.local.password = newUser.generateHash(password);

//                 //         newUser.save(function(err) {
//                 //             if (err)
//                 //                 return done(err);

//                 //             return done(null, newUser);
//                 //         });
//                 //     }

//                 // });
//             // if the user is logged in but has no local account...
//             } else if ( !req.user.local.email ) {
//                 var query = new Parse.Query('User');
//                 query.get({ 'local.email' :  email }, {
//                   success: function(user) {
//                     // check to see if theres already a user with that email
//                     if (user) {
//                         return done(null, false, req.flash('loginMessage', 'That email is already taken.'));
//                     } else {

//                         var newUser = new Parse.User();
//                         newUser.set("username", email);
//                         newUser.set("password", bcrypt.hashSync(password, bcrypt.genSaltSync(8), null));
//                         newUser.set("local.email", email);
//                         newUser.set("local.password", bcrypt.hashSync(password, bcrypt.genSaltSync(8), null));

//                         newUser.signUp(null, {
//                           success: function(user) {
//                             return done(null, user);
//                           },
//                           error: function(user, error) {
//                             return done(error);
//                           }
//                         });
//                     }
//                   },
//                   error: function(object, error) {
//                     return done(error);
//                   }
//                 });


//                 // ...presumably they're trying to connect a local account
//                 // BUT let's check if the email used to connect a local account is being used by another user
//                 // User.findOne({ 'local.email' :  email }, function(err, user) {
//                 //     if (err)
//                 //         return done(err);
                    
//                 //     if (user) {
//                 //         return done(null, false, req.flash('loginMessage', 'That email is already taken.'));
//                 //         // Using 'loginMessage instead of signupMessage because it's used by /connect/local'
//                 //     } else {
//                 //         var user = req.user;
//                 //         user.local.email = email;
//                 //         user.local.password = user.generateHash(password);
//                 //         user.save(function (err) {
//                 //             if (err)
//                 //                 return done(err);
                            
//                 //             return done(null,user);
//                 //         });
//                 //     }
//                 // });
//             } else {
//                 // user is logged in and already has a local account. Ignore signup. (You should log out before trying to create a new account, user!)
//                 return done(null, req.user);
//             }

//         });

//     }));

//     // =========================================================================
//     // FACEBOOK ================================================================
//     // =========================================================================
//     var fbStrategy = configAuth.facebookAuth;
//     fbStrategy.passReqToCallback = true;  // allows us to pass in the req from our route (lets us check if a user is logged in or not)
//     passport.use(new FacebookStrategy(fbStrategy,
//     function(req, token, refreshToken, profile, done) {

//         // asynchronous
//         process.nextTick(function() {

//             // check if the user is already logged in
//             if (!req.user) {

//                 var query = new Parse.Query('User');
//                 query.get({ 'facebook.id' : profile.id }, {
//                   success: function(user) {
//                     // check to see if theres already a user with that email
//                     console.log("Hello user: " + JSON.stringify(user));
//                     if (user) {
//                         // if there is a user id already but no token (user was linked at one point and then removed)
//                         if (!user.facebook.token) {
//                             user.save({
//                                 "facebook.token" : token,
//                                 "facebook.name": profile.name.givenName + ' ' + profile.name.familyName,
//                                 "facebook.email": (profile.emails[0].value || '').toLowerCase()
//                             }, {
//                                 success: function(u) {
//                                  return done(null, u);
//                               },
//                                 error: function(error) {
//                                 return done(error);
//                               }
//                             });
//                         }
//                     } else {

//                         var newUser = new Parse.User();
//                         newUser.set("username", profile.id);
//                         newUser.set("password", token);
//                         newUser.set("facebook.id", profile.id);
//                         newUser.set("facebook.token", token);
//                         newUser.set("facebook.name", profile.name.givenName + ' ' + profile.name.familyName);
//                         newUser.set("facebook.email", (profile.emails[0].value || '').toLowerCase());

//                         newUser.signUp(null, {
//                           success: function(user) {
//                             return done(null, user);
//                           },
//                           error: function(user, error) {
//                             return done(error);
//                           }
//                         });

//                         // Parse.FacebookUtils.init({ // this line replaces FB.init({
//                         //     appId      : '251840548555589', // Facebook App ID
//                         //     cookie     : true, // enable cookies to allow Parse to access the session
//                         //     xfbml      : true
//                         //  });

//                         //  Parse.FacebookUtils.logIn(null, {
//                         //      success: function(user) {
//                         //        console.log("im here>> " + JSON.stringify(user));
//                         //        console.log(">>User session token: " + user.attributes.sessionToken);
//                         //        return done(null, user);
//                         //      },
//                         //      error: function(user, error) {
//                         //        console.log("User cancelled the Facebook login or did not fully authorize. Error =" + error.message);
//                         //        return done(error);
//                         //      }
//                         //  });
//                     }
//                   },
//                   error: function(object, error) {

//                     console.log("FB errors>> " + JSON.stringify(error) + ", create new user");
//                     var newUser = new Parse.User();
//                     newUser.set("username", profile.id);
//                     newUser.set("password", token);
//                     newUser.set("facebook.id", profile.id);
//                     newUser.set("facebook.token", token);
//                     newUser.set("facebook.name", profile.name.givenName + ' ' + profile.name.familyName);
//                     newUser.set("facebook.email", (profile.emails[0].value || '').toLowerCase());

//                     newUser.signUp(null, {
//                       success: function(user) {
//                         return done(null, user);
//                       },
//                       error: function(user, error) {
//                         return done(error);
//                       }
//                     });

//                     // Parse.FacebookUtils.init({ // this line replaces FB.init({
//                     //     appId      : '251840548555589', // Facebook App ID
//                     //     cookie     : true, // enable cookies to allow Parse to access the session
//                     //     xfbml      : true
//                     //  });

//                     //  Parse.FacebookUtils.logIn(null, {
//                     //      success: function(user) {
//                     //        console.log("im here>> " + JSON.stringify(user));
//                     //        console.log(">>User session token: " + user.attributes.sessionToken);
//                     //        return done(null, user);
//                     //      },
//                     //      error: function(user, error) {
//                     //        console.log("User cancelled the Facebook login or did not fully authorize. Error =" + error.message);
//                     //        return done(error);
//                     //      }
//                     //  });

//                     return done(error);
//                   }
//                 });

//                 // User.findOne({ 'facebook.id' : profile.id }, function(err, user) {
//                 //     if (err)
//                 //         return done(err);

//                 //     if (user) {

//                 //         // if there is a user id already but no token (user was linked at one point and then removed)
//                 //         if (!user.facebook.token) {
//                 //             user.facebook.token = token;
//                 //             user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
//                 //             user.facebook.email = (profile.emails[0].value || '').toLowerCase();

//                 //             user.save(function(err) {
//                 //                 if (err)
//                 //                     return done(err);
                                    
//                 //                 return done(null, user);
//                 //             });
//                 //         }

//                 //         return done(null, user); // user found, return that user
//                 //     } else {
//                 //         // if there is no user, create them
//                 //         var newUser            = new User();

//                 //         newUser.facebook.id    = profile.id;
//                 //         newUser.facebook.token = token;
//                 //         newUser.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
//                 //         newUser.facebook.email = (profile.emails[0].value || '').toLowerCase();

//                 //         newUser.save(function(err) {
//                 //             if (err)
//                 //                 return done(err);
                                
//                 //             return done(null, newUser);
//                 //         });
//                 //     }
//                 // });

//             } else {
//                 // user already exists and is logged in, we have to link accounts
//                 var user = req.user;
//                 user.save({
//                     "facebook.id": profile.id,
//                     "facebook.token" : token,
//                     "facebook.name": profile.name.givenName + ' ' + profile.name.familyName,
//                     "facebook.email": (profile.emails[0].value || '').toLowerCase()
//                 }, {
//                     success: function(u) {
//                      return done(null, u);
//                   },
//                     error: function(error) {
//                     return done(error);
//                   }
//                 });

//                 // var user            = req.user; // pull the user out of the session

//                 // user.facebook.id    = profile.id;
//                 // user.facebook.token = token;
//                 // user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
//                 // user.facebook.email = (profile.emails[0].value || '').toLowerCase();

//                 // user.save(function(err) {
//                 //     if (err)
//                 //         return done(err);
                        
//                 //     return done(null, user);
//                 // });
//             }
//         });

//     }));

//     // =========================================================================
//     // TWITTER =================================================================
//     // =========================================================================
//     passport.use(new TwitterStrategy({

//         consumerKey     : configAuth.twitterAuth.consumerKey,
//         consumerSecret  : configAuth.twitterAuth.consumerSecret,
//         callbackURL     : configAuth.twitterAuth.callbackURL,
//         passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

//     },
//     function(req, token, tokenSecret, profile, done) {

//         // asynchronous
//         process.nextTick(function() {

//             // check if the user is already logged in
//             if (!req.user) {

//                 var query = new Parse.Query('User');
//                 query.get({ 'twitter.id' : profile.id }, {
//                   success: function(user) {
//                     // check to see if theres already a user with that email
//                     if (user) {
//                         // if there is a user id already but no token (user was linked at one point and then removed)
//                         if (!user.twitter.token) {
//                             user.save({
//                                 "twitter.token" : token,
//                                 "twitter.username": profile.username,
//                                 "twitter.displayName": profile.displayName
//                             }, {
//                                 success: function(u) {
//                                  return done(null, u);
//                               },
//                                 error: function(error) {
//                                 return done(error);
//                               }
//                             });
//                         }
//                     } else {

//                         var newUser = new Parse.User();
//                         newUser.set("twitter.id", profile.id);
//                         newUser.set("twitter.token", token);
//                         newUser.set("twitter.name", profile.username);
//                         newUser.set("twitter.email", profile.displayName);

//                         newUser.signUp(null, {
//                           success: function(user) {
//                             return done(null, user);
//                           },
//                           error: function(user, error) {
//                             return done(error);
//                           }
//                         });
//                     }
//                   },
//                   error: function(object, error) {
//                     return done(error);
//                   }
//                 });

//                 // User.findOne({ 'twitter.id' : profile.id }, function(err, user) {
//                 //     if (err)
//                 //         return done(err);

//                 //     if (user) {
//                 //         // if there is a user id already but no token (user was linked at one point and then removed)
//                 //         if (!user.twitter.token) {
//                 //             user.twitter.token       = token;
//                 //             user.twitter.username    = profile.username;
//                 //             user.twitter.displayName = profile.displayName;

//                 //             user.save(function(err) {
//                 //                 if (err)
//                 //                     return done(err);
                                    
//                 //                 return done(null, user);
//                 //             });
//                 //         }

//                 //         return done(null, user); // user found, return that user
//                 //     } else {
//                 //         // if there is no user, create them
//                 //         var newUser                 = new User();

//                 //         newUser.twitter.id          = profile.id;
//                 //         newUser.twitter.token       = token;
//                 //         newUser.twitter.username    = profile.username;
//                 //         newUser.twitter.displayName = profile.displayName;

//                 //         newUser.save(function(err) {
//                 //             if (err)
//                 //                 return done(err);
                                
//                 //             return done(null, newUser);
//                 //         });
//                 //     }
//                 // });

//             } else {
//                 // user already exists and is logged in, we have to link accounts
//                 var user                 = req.user; // pull the user out of the session

//                 // user.twitter.id          = profile.id;
//                 // user.twitter.token       = token;
//                 // user.twitter.username    = profile.username;
//                 // user.twitter.displayName = profile.displayName;

//                 user.save({
//                     "twitter.id" : profile.id,
//                     "twitter.token" : token,
//                     "twitter.username": profile.username,
//                     "twitter.displayName": profile.displayName
//                 }, {
//                     success: function(u) {
//                      done(null, u);
//                   },
//                     error: function(error) {
//                     done(error);
//                   }
//                 });

//                 // user.save(function(err) {
//                 //     if (err)
//                 //         return done(err);
                        
//                 //     return done(null, user);
//                 // });
//             }

//         });

//     }));

//     // =========================================================================
//     // GOOGLE ==================================================================
//     // =========================================================================
//     passport.use(new GoogleStrategy({

//         clientID        : configAuth.googleAuth.clientID,
//         clientSecret    : configAuth.googleAuth.clientSecret,
//         callbackURL     : configAuth.googleAuth.callbackURL,
//         passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

//     },
//     function(req, token, refreshToken, profile, done) {

//         // asynchronous
//         process.nextTick(function() {

//             // check if the user is already logged in
//             if (!req.user) {
//                 var query = new Parse.Query('User');
//                 query.get({ 'google.id' : profile.id }, {
//                   success: function(user) {
//                     // check to see if theres already a user with that email
//                     if (user) {
//                         // if there is a user id already but no token (user was linked at one point and then removed)
//                         if (!user.google.token) {
//                             user.save({
//                                 "google.token" : token,
//                                 "google.name": profile.displayName,
//                                 "google.email": (profile.emails[0].value || '').toLowerCase()
//                             }, {
//                                 success: function(u) {
//                                  return done(null, u);
//                               },
//                                 error: function(error) {
//                                 return done(error);
//                               }
//                             });
//                         }
//                     } else {

//                         var newUser = new Parse.User();
//                         newUser.set("google.id", profile.id);
//                         newUser.set("google.token", token);
//                         newUser.set("google.name", profile.username);
//                         newUser.set("google.email", profile.displayName);

//                         newUser.signUp(null, {
//                           success: function(user) {
//                             return done(null, user);
//                           },
//                           error: function(user, error) {
//                             return done(error);
//                           }
//                         });
//                     }
//                   },
//                   error: function(object, error) {
//                     return done(error);
//                   }
//                 });


//                 // User.findOne({ 'google.id' : profile.id }, function(err, user) {
//                 //     if (err)
//                 //         return done(err);

//                 //     if (user) {

//                 //         // if there is a user id already but no token (user was linked at one point and then removed)
//                 //         if (!user.google.token) {
//                 //             user.google.token = token;
//                 //             user.google.name  = profile.displayName;
//                 //             user.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

//                 //             user.save(function(err) {
//                 //                 if (err)
//                 //                     return done(err);
                                    
//                 //                 return done(null, user);
//                 //             });
//                 //         }

//                 //         return done(null, user);
//                 //     } else {
//                 //         var newUser          = new User();

//                 //         newUser.google.id    = profile.id;
//                 //         newUser.google.token = token;
//                 //         newUser.google.name  = profile.displayName;
//                 //         newUser.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

//                 //         newUser.save(function(err) {
//                 //             if (err)
//                 //                 return done(err);
                                
//                 //             return done(null, newUser);
//                 //         });
//                 //     }
//                 // });

//             } else {
//                 // user already exists and is logged in, we have to link accounts
//                 user.save({
//                     "google.id" : profile.id,
//                     "google.token" : token,
//                     "google.name": profile.displayName,
//                     "google.email": (profile.emails[0].value || '').toLowerCase()
//                 }, {
//                     success: function(u) {
//                      return done(null, u);
//                   },
//                     error: function(error) {
//                     return done(error);
//                   }
//                 });

//                 // var user               = req.user; // pull the user out of the session

//                 // user.google.id    = profile.id;
//                 // user.google.token = token;
//                 // user.google.name  = profile.displayName;
//                 // user.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

//                 // user.save(function(err) {
//                 //     if (err)
//                 //         return done(err);
                        
//                 //     return done(null, user);
//                 // });

//             }

//         });

//     }));

// };
