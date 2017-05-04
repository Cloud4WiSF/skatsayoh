// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth' : {
        'clientID'        : '251840548555589', // your App ID
        'clientSecret'    : 'fda9fd21cb4c4a8a435877239bb67b7b', // your App Secret
        'callbackURL'     : 'http://localhost:3000/auth/callback/facebook',//'http://skatsayoh.herokuapp.com/auth/callback/facebook',
        'profileURL': 'https://graph.facebook.com/v2.5/me?fields=first_name,last_name,email'

    },

    'twitterAuth' : {
        'consumerKey'        : '6mFcbRSvFK0zvcJV2ownCDZ8F',
        'consumerSecret'     : '6CqmDudCFM8756Flb9koPTBTiPU0vqxuY5AR5KWCBLl2h5CvVS',
        'callbackURL'        : 'http://localhost:3000/auth/callback/twitter'//'http://skatsayoh.herokuapp.com/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID'         : '242371238686-ka8bfn7ov7i8abbqttdfkbfmjh97rorn.apps.googleusercontent.com',
        'clientSecret'     : 'ioguUm5wBd9owyElkEcKe1EL',
        'callbackURL'      : 'http://localhost:3000/auth/callback/google'
    }

};
