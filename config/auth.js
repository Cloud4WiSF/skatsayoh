// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth' : {
        'clientID'        : '251840548555589', // your App ID
        'clientSecret'    : 'fda9fd21cb4c4a8a435877239bb67b7b', // your App Secret
        'callbackURL'     : '/auth/facebook/callback',
        'profileURL': 'https://graph.facebook.com/v2.5/me?fields=first_name,last_name,email'

    },

    'twitterAuth' : {
        'consumerKey'        : 'VmbDcf4SKw1Xv8ssHXmBZ7ed6',
        'consumerSecret'     : 'Q2Landfd0EGlXEA9BphMv56ZkQVg7UFmxrRYwE9bn0cwiXqtgj',
        'callbackURL'        : '/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID'         : 'your-secret-clientID-here',
        'clientSecret'     : 'your-client-secret-here',
        'callbackURL'      : '/auth/google/callback'
    }

};
