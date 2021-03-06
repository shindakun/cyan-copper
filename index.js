const express = require('express');
const bodyParser = require('body-parser');
const packages = require('./package.json');
const cookieParser = require('cookie-parser');
const hbs = require('express-hbs');
const session = require('express-session');
const path = require('path');
const logger = require('morgan');
const app = express();

const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;

const locations = require('./data/locations.json');
const areas = require('./data/areas.json');
const events = require('./data/events.json');

// the process.env values are set in .env
passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: process.env.TWITTER_CALLBACK_URL
},
function(token, tokenSecret, profile, cb) {
  return cb(null, profile);
}));
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '/views'))
app.engine('hbs', hbs.express4({
  partialsDir: path.join(__dirname, '/views/partials')
}));
app.use('/public', express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
  app.use(logger('dev'));
} else if (process.env.NODE_ENV === 'production') {
  app.use(logger('combined'));
}

app.use(cookieParser());
app.use(session({
  name: 'session',
  secret: 'session',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', function (request, response) {
  response.render('news');
});

app.get('/logoff', function (request, response) {
  request.logoff();
  response.clearCookie('twitterauth');
  response.redirect('/');
});

app.get('/auth/twitter', passport.authenticate('twitter'));

app.get('/login/twitter/return', passport.authenticate('twitter', {
  successRedirect: '/setcookie',
  failureRedirect: '/'
}));

let ensureAuthenticated = (request, response, next) => {
  if (request.isAuthenticated()) {
    return next();
  } else {
    response.redirect('/');
  }
};

app.get('/setcookie', ensureAuthenticated,
  function (request, response) {
    response.cookie('twitterauth', new Date());
    response.redirect('/success');
});

app.get('/success', ensureAuthenticated,
  function (request, response) {
    if (request.cookies['twitterauth']) {
      let char = {
        name: 'Steve',
        location: 'town'
      };
      request.session.char = char;
      response.render('locations', {
        char: request.session.char,
        travel: locations[char.location],
        description: areas[char.location]
      });
    }
});

const rand = (min, max) => 
  Math.random() * (max - min) + min;

app.get('/:loc', ensureAuthenticated, function (request, response) {
  // grab location from requested url.
  let orgDest = request.params.loc;
  let loc = request.params.loc;
  let ran = Math.floor(rand(0,2));

  if (ran === 1) {
//      loc = 'event';    
  }
    
  if (!locations.hasOwnProperty(loc)) {
    response.status('404').send('404 not found');  
  } else {
    let char = request.session.char;
    // check old char.location vs new to make sure we can actually move
    if (request.session.char.isEvent || loc === 'event' || loc === char.location || locations[loc].indexOf(char.location) !== -1) {
      console.log(loc);
      switch(loc) {
        case 'event':
          
          // Set actual destination
          if (!request.session.char.isEvent) {
            request.session.char.isEvent = true;
            request.session.char.dest = orgDest;            
          }

          // update our location to the new location.
          request.session.char.location = loc;
          request.session.char.eventid = 0;
          
          // render event view and send along the character and actions
          response.render('event', {
            char: request.session.char,
            travel: events[0].choices,
            description: events[0].description
          });
          break;
 /*         
          case 'fight':
            request.session.char.isEvent = false;
            response.render('event', {
              char: request.session.char,
              travel: locations[request.session.char.dest],
              description: events[0].results.fight
            });
            break;
          case 'flee':
            request.session.char.isEvent = false;
            response.render('event', {
              char: request.session.char,
              travel: locations[request.session.char.dest],
              description: events[0].results.flee
            });
            break;
*/
        default:
          // update our location to the new location.
          request.session.char.location = loc;

          // render default view and send along the character and travel locations    
          response.render('locations', {
            char: request.session.char,
            travel: locations[char.location],
            description: areas[char.location]
          });
      }
    } else {
      response.redirect(`/${char.location}`);
    }
  }
    
});

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

