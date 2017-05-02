// server.js

// set up ======================================================================
// get all the tools we need
require('dotenv').config();
var express  = require('express');
var port     = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var ParseDashboard    = require('parse-dashboard');

var configDB = require('./config/database.js');

// configuration ===============================================================
mongoose.connect(configDB.url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

var api = new ParseServer({
  databaseURI: databaseUri || 'mongodb://heroku_xz7n8dv2:c5aregj2ep3e4jcabj157tam7u@ds119081.mlab.com:19081/heroku_xz7n8dv2', // 'mongodb://localhost:27017/dev',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || 'APPLICATION_ID',
  masterKey: process.env.MASTER_KEY || 'MASTER_KEY', //Add your master key here. Keep it secret!
  serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse'  // Don't forget to change to https if needed
});


var app = express();
// Serve the Parse API on the /parse URL prefix
app.use('/parse', api);
// var dashboard = new ParseDashboard({
//   "apps": [
//     {
//       "serverURL": 'http://skatsayoh.herokuapp.com/parse', //process.env.SERVER_URL || 'http://localhost:1337/parse',
//       "appId": process.env.APP_ID || 'APPLICATION_ID',
//       "masterKey": process.env.MASTER_KEY || 'MASTER_KEY',
//       "appName": process.env.APP_NAME || "Asherah"
//     }
//   ],
//   "users": [
//     {
//       "user":"aa",
//       "pass":"aa"
//     }
//   ],
//   "trustProxy": 1
// }, true);

// // Dashboard
// app.use('/dashboard', dashboard); // make the Parse Dashboard available at /dashboard

// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs'); // set up ejs for templating


// required for passport
app.use(session({
    secret: 'ilovescotchscotchyscotchscotch', // session secret
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session



// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// launch ======================================================================
app.listen(port);
console.log('The magic happens on port ' + port);
