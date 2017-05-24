# Real time Spotify app
A real time depiction of what a Spotify user is listening to.
View demo on:
https://realtimespotify.herokuapp.com/

## Description
This app was created for the course Real Time Web of the minor Webdevelopment at the University of Applied Sciences Amsterdam. With this app users are able to view what others are listening to and like songs.

## Dependencies
- [Dot env](https://www.npmjs.com/package/dotenv)
- [EJS](https://www.npmjs.com/package/ejs)
- [Express](https://www.npmjs.com/package/express)
- [Query String](https://www.npmjs.com/package/querystring)
- [request](https://www.npmjs.com/package/request)
- [socket.io](https://www.npmjs.com/package/socket.io)
- [mongoose](https://www.npmjs.com/package/mongoose)
- [MongoDB](https://www.npmjs.com/package/mongodb)

## Install
1. Clone this repository
2. Open up your command line, navigate to the right folder and run `npm install`
3. Make a database on [mLab](https://mlab.com)
4. Make an account on [spotify's API website](https://developer.spotify.com/web-api/)
5. Create a `.env` file and give it the following variables:
```
CLIENT_ID=<your Spotify client id>
CLIENT_SECRET=<your Spotify client secret>
REDIRECT_URI=<your Spotify callback link>
MONGO=<your mLab URI>
```
6. run `node app.js`

## Features
- OAuth 
- Viewing your played songs
- Viewing songs played by other logged on users
- Liking songs

## OAuth
To access user-specific data my app uses OAuth to ask permission from the Spotify server. When the user clicks the 'Login with Spotify' button they will be directed to `/login`. If the user already has an access token for the declared `scope` (when the user has logged in before), they will be redirected to `/whatsplaying`. Otherwise they will be redirected:
```
res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
    }));
```
This takes the unique client_id that was specified by Spotify to let the user know what application is trying to access their profile. After the user logs in they will be redirected to the redirect URI I specified on the Spotify website.
The scope I declared determines what data I will have access to:
```
var scope = 'user-read-private user-read-email user-read-currently-playing user-read-playback-state user-read-recently-played';
```
If I change the scope the user will have to give permission again.

When the user has logged in and has been redirected to the redirect URI. The server puts a unique code in the URI which I can use to get the `access token` & `refresh token`. I use the node module `request` to call the API again and save `access_token` in my database. 
I can now use `userSchema.accessToken` anywhere in my app to get user-specific data from the Web API. After my app gets an `access token` it's redirected to `/whatsplaying`.

```javascript
var access_token = body.access_token;
var refresh_token = body.refresh_token;
userSchema = new user({accessToken: access_token})
userSchema.save(function(err){
  if (err) {
    return err
  }else {
    console.log('accessToken saved');
  }
})
```


## Spotify API
This app uses the Spotify Web API. This Web API lets applications fetch data from the Spotify music catalog and manage user’s playlists and saved music. I used it to find out what the user is currently listening to. I am using `request` to do API calls.
The API needs OAuth to get user-specific information on listened to songs, `headers` is necessary to get the right authorisation.
```javascript
docs.map(function (ob) {
  var options = {
    url: 'https://api.spotify.com/v1/me/player/currently-playing',
    headers: { 'Authorization': 'Bearer ' + ob.accessToken },
    json: true
  }

  request.get(options, function(error, response, body) {
    if(body.item !== undefined || body.item.album !== '') {
      ob.albumImage = body.item.album.images[2].url;
    }
    ob.song = body.item.name;

    body.item.artists.map(function (obj) {
      ob.artist = obj.name;
      userSchema.save(user, function(err) {
        if(err) console.log(err);
      })
    })
    socket.emit('add song', {user: userSchema});
  });
});
```
Using sockets` I am sending data to the client.

## Socket.io
To send data from the server to the client and back I use `socket.io`. 

I used `setInterval` to make sure data is checked every second, the Spotify API is not real time so polling is necessary.

In `index.js`:
```javascript
setInterval(function(){
  console.log('[Check]');
  socket.emit('check');
}, 1000);
```
`socket.emit` is sent to the server as an event. The server uses this data:

In `app.js`
```javascript
socket.on('check', function () {
    user.find({socketId: socket.id}, function(err, docs){ //use mongoose to filter the users to only get the client who sent it
      if(err) console.log(err);

      docs.map(function (nu) { // user.find returns an object, it needs to be mapped before it can be used.
        var options = { 
          url: 'https://api.spotify.com/v1/me/player/currently-playing',
          headers: { 'Authorization': 'Bearer ' + nu.accessToken },
          json: true
        }
        request.get(options, function(error, response, body) { // new api call
          if(body.item == null) { // if body.item is null (this happens when an ad is played on a non premium account)
            console.log('spotify ad');
          } else { 
            nu.newSong = body.item.name; // newSong is used to compare to the song that is currently in the user object.
            if(nu.newSong !== nu.song) {
              console.log('new Song');
              nu.albumImage = body.item.album.images[2].url;
              nu.song = body.item.name;

              body.item.artists.map(function (obj) {
                nu.artist = obj.name;
                nu.save(user, function(err) {
                  if(err) throw err;
                })
              })
              io.sockets.emit('update song', docs); //emit a new event to ALL clients
            } else {
              console.log('same song');
            }
          }
      })
    })
  })
});
```

In `index.js` on 'update song':
```javascript
song.map(function(nu) {
  console.log(nu, '[nu]');
  playlist.innerHTML += // adds to the innerHTML of a div on the client.
  `<div class="info empty" id="${nu._id}">
  <div id="${nu._id}-image" class="image"><img src="${nu.albumImage}" alt=""></div>
  <div class="text">
  <p><strong>Artist: </strong> <span id="${nu._id}-artist">${nu.artist}</span></p>
  <p><strong>Song: </strong> <span id="${nu._id}-song">${nu.song}</span></p>
  </div>
  <div class="profile">
  <img src="${nu.profileImage}" alt="profile picture" class="profile-image">
  <p>${nu.userName}</p>
  </div>
  <div id="${nu._id}-like" class="like"></div>
  </div>`
  socket.emit('update all')
})
```
## Wishlist
- Viewing songs that are liked by other users
- Playing songs from other users
