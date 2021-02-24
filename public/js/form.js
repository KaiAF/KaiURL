$("#form-desc").submit(function(event, type) {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(this));
    stuff(event, "desc", formData)
});
$("#form-nickname").submit(function(event, type) {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(this));
    stuff(event, "nickname", formData)
});
$("#form-twitter").submit(function(event, type) {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(this));
    stuff(event, "twitter", formData)
});
$("#form-youtube").submit(function(event, type) {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(this));
    stuff(event, "youtube", formData)
});
$("#form-discord").submit(function(event, type) {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(this));
    stuff(event, "discord", formData)
});
$("#form-glimesh").submit(function(event, type) {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(this));
    stuff(event, "glimesh", formData)
});

// Log in page / register page

$("#form-register").submit(function(event, type) {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(this));
    rl(formData, "register")
});

$("#form-login").submit(function(event, type) {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(this));
    rl(formData, "login")
});

// Shrink url

$("#form-shrink").submit(function(event, type) {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(this));
    shrink(formData, false)
});

$("#form-shrink-private").submit(function(event, type) {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(this));
    shrink(formData, true)
});

function stuff(event, type, formData) {
    fetch("/account/edit?type=" + type,
      {   method: 'POST',
          mode : 'same-origin',
          credentials: 'same-origin' ,
          body : formData
      }).then((r) => r.json()).then((b) => {
        if (b.OK == true) {
            return window.location.reload(1);
        } else {
            var g = document.getElementById('error');
            if (g.innerText) {
                g.innerText = ""
                g.append(b.error);
            } else {
                return g.append(b.error);
            }
        }
      });
}

function rl(formData, type) {
    fetch("/api/" + type,
    {   method: 'POST',
        mode : 'same-origin',
        credentials: 'same-origin' ,
        body : formData
    }).then((r) => r.json()).then((b) => {
      if (b.OK == true) {
          return window.location.assign("/account")
      } else {
          var g = document.getElementById('error');
          if (g.innerText) {
              g.innerText = ""
              g.append(b.error);
          } else {
              return g.append(b.error);
          }
      }
    });
}

function shrink(formData, type) {
    let a;
    if (type == false) a = "/shrink";
    if (type == true) a = "/shrink/private"
    console.log(a);
    fetch(a,
    {   method: 'POST',
        mode : 'same-origin',
        credentials: 'same-origin' ,
        body : formData
    }).then((r) => r.json()).then((b) => {
      if (b.OK == true) {
          return window.location.assign("/shrink")
      } else {
          var g = document.getElementById('error');
          if (g.innerText) {
              g.innerText = ""
              g.append(b.error);
          } else {
              return g.append(b.error);
          }
      }
    });
}