(function() {
  var socket = io();

  var html = {}
  var playlist = document.getElementById('playlist')
  var play = document.getElementById('play');

  socket.on('new user', function(user){
    console.log(user, '[USER]');
    playlist.innerHTML +=
    `<div class="info empty" id="${user._id}">
      <div id="${user._id}-image" class="image"><img src="${user.albumImage}" alt=""></div>
      <div class="text">
        <p><strong>Artist: </strong> <span id="${user._id}-artist">${user.artist}</span></p>
        <p><strong>Song: </strong> <span id="${user._id}-song">${user.song}</span></p>
      </div>
      <div class="profile">
        <img src="${user.profileImage}" alt="profile picture" class="profile-image">
        <p>${user.userName}</p>
      </div>
      <div id="${user._id}-like" class="like"></div>
    </div>`
    console.log(playlist, '[PLAYLIST]');
    setInterval(function(){
      console.log('[CHEEECK]');
      socket.emit('check', user._id);
    }, 7000);
  })

  socket.on('all songs', function (docs) {
    console.log(docs, '[should be an object]');

    docs.map(function(obj){
      if (obj.song !== undefined) {
        console.log(playlist);
        console.log('It haz works');
        playlist.innerHTML +=
        `<div class="info empty" id="${obj._id}">
          <div id="${obj._id}-image" class="image"><img src="${obj.albumImage}" alt=""></div>
          <div class="text">
            <p><strong>Artist: </strong> <span id="${obj._id}-artist">${obj.artist}</span></p>
            <p><strong>Song: </strong> <span id="${obj._id}-song">${obj.song}</span></p>
          </div>
          <div class="profile">
            <img src="${obj.profileImage}" alt="profile picture" class="profile-image">
            <p>${obj.userName}</p>
          </div>
          <div id="${obj._id}-like" class="like"></div>
        </div>`
      }
    })
  })

  socket.on('check', function() {
    socket.emit('check song');
    console.log('[CHEEECK]');
  })

  socket.on('update song', function(song) {
    console.log(song);
    if (song.song !== undefined) {
      playlist.innerHTML +=
      `<div class="info empty" id="${song._id}">
        <div id="${song._id}-image" class="image"><img src="${song.albumImage}" alt=""></div>
        <div class="text">
          <p><strong>Artist: </strong> <span id="${song._id}-artist">${song.artist}</span></p>
          <p><strong>Song: </strong> <span id="${song._id}-song">${song.song}</span></p>
        </div>
        <div class="profile">
          <img src="${song.profileImage}" alt="profile picture" class="profile-image">
          <p>${song.userName}</p>
        </div>
        <div id="${song._id}-like" class="like"></div>
      </div>`
    }
  })

})();
