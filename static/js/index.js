(function() {
  var socket = io();

  var html = {}
  var playlist = document.getElementById('playlist')
  var show = document.getElementById('show');
  var likes = document.getElementById('likes');


  socket.on('initiate songs', function (d) {
    console.log('Initiate songs');
    d.docs.map(function(obj){
      if (obj.song !== undefined) {
        var short = obj.song.replace( /\s/g, "");
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
          <div id="${short}" class="like"></div>
        </div>`
      }
      var hearts = document.querySelectorAll('.like');

      hearts.forEach(function(ob) {
        var heartId = document.getElementById(ob.id);

        heartId.addEventListener('click', function (event) {
          console.log(this, 'click');
          var img = this.parentNode.childNodes[1].innerHTML;
          var son = this.parentNode.childNodes[3].innerHTML;
          console.log(img, son);

          socket.emit('liked', {image: img, song: son})
        })
      })
    })
    socket.on('get liked songs', function (songs) {
      console.log('getting liked songs');
      console.log(songs, '[SONGSSS]');
      if (songs.liked !== '') {
        // likes.innerHTML = '';
        songs.forEach(function (e) {
          var songdiv = `<div class="liked-song">${e.img}${e.song}<div>`;
          likes.innerHTML += songdiv;
        })
      }
    })

    setInterval(function(){
      console.log('[CHEEECK]');
      socket.emit('check');
    }, 1000);
  })

  socket.on('redirect', function(destination) {
    window.location.href = '/';
  })

  socket.on('add song', function (doc) {
    console.log('add a new user song');
    if (doc.user.song !== undefined) {
      var short = doc.user.song.replace( /\s/g, "");

      playlist.innerHTML +=
      `<div class="info empty" id="${doc.user._id}">
        <div id="${doc.user._id}-image" class="image"><img src="${doc.user.albumImage}" alt=""></div>
        <div class="text">
          <p><strong>Artist: </strong> <span id="${doc.user._id}-artist">${doc.user.artist}</span></p>
          <p><strong>Song: </strong> <span id="${doc.user._id}-song">${doc.user.song}</span></p>
        </div>
        <div class="profile">
          <img src="${doc.user.profileImage}" alt="profile picture" class="profile-image">
          <p>${doc.user.userName}</p>
        </div>
        <div id="${short}" class="like"></div>
      </div>`
    }
  })

  socket.on('update song', function(song) {
    console.log('song haz changed');
    console.log(song, '[SONG]');
    song.map(function(nu) {
      console.log(nu, '[nu]');
      var short = nu.song.replace( /\s/g, "");
        playlist.innerHTML +=
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
        <div id="${short}" class="like"></div>

        </div>`
        socket.emit('update all')
    })
    var hearts = document.querySelectorAll('.like');
    console.log(hearts);
    hearts.forEach(function(ob) {
      var heartId = document.getElementById(ob.id);
      heartId.addEventListener('click', function (event) {
        console.log(this, 'click');
        var img = this.parentNode.childNodes[1].innerHTML;
        var son = this.parentNode.childNodes[3].innerHTML;
        console.log(img, son);

        socket.emit('liked', {image: img, song: son})
      })
    })
  })

  socket.on('show likes', function(el) {
    console.log('Update likes');
    console.log(el, 'WHAT?');
    likes.innerHTML = '';
    el.liked.forEach(function (e) {
      console.log(e, 'show');
      console.log(e.img);
      var songdiv = `<div class="liked-song">${e.img}${e.song}<div>`;

      likes.innerHTML += songdiv;

    })


  })
})();
