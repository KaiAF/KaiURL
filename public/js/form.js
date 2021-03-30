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

$("#form-username-register").on("keyup", function(e) {
    var g = document.getElementById('error');
    if (e.target.value.length > 2) {
    fetch('/api/user/' + e.target.value, {
        method: 'get'
    }).then((r) => r.json()).then((b) => {
        if (b.OK == true) {
            g.innerText = "Username already exist."
        } else {
            g.innerText = ""
        }
    });
} else {
    if (e.target.value == "") {
        g.innerText = ""
    } else {
        g.innerText = `Username has to be 3 or more characters.`
    }
}
});

$("#form-register").submit(function(event, type) {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(this));
    let red;
    if (window.location.search == "?redirect=/kaipaste") red = '/kaipaste'
    if (window.location.search !== "?redirect=/kaipaste") red = '/account'
    rl(formData, "register", red)
});

$("#form-username").on("keyup", function(e) {
    var g = document.getElementById('error');
    if (e.target.value.length > 2) {
    fetch('/api/user/' + e.target.value, {
        method: 'get'
    }).then((r) => r.json()).then((b) => {
        if (b.OK == true) {
            g.innerText = ""
        } else {
            if (g.innerText) {
                g.innerText = ""
                g.append(b.error);
            } else {
                return g.append(b.error);
            }
        }
    });
} else {
    if (e.target.value == "") {
        g.innerText = ""
    } else {
        g.innerText = `Username has to be 3 or more characters.`
    }
}
});

$("#form-login").submit(function(event, type) {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(this));
    let red;
    if (window.location.search == "?redirect=/kaipaste") red = '/kaipaste'
    if (window.location.search !== "?redirect=/kaipaste") red = '/account'
    rl(formData, "login", red)
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

// Changelog

$('#form-changelogNew').submit(function(event, type) {
    event.preventDefault();
    const formData = new URLSearchParams(new FormData(this));
    changelogNew(formData)
});

// /api/dashboard

$('#form-api').submit(function(e) {
    e.preventDefault();
    const formData = new URLSearchParams(getCookies()); //new URLSearchParams(new FormData(this));
    fetch('/config.json', { method: 'get' }).then((r) => r.json()).then((b) => {
        let url = b.Url
        if (url == "https://www.kaiurl.xyz") url = "https://api.kaiurl.xyz";
        fetch(`${url}/url/key/generate`, {
            method: 'POST',
            body: formData
        }).then((r) => r.json()).then((b) => {
            if (b.OK == true) {
                window.location.reload(1);
            } else {
                var g = document.getElementById('error');
                if (g.innerText) {
                    g.innerText = "";
                    g.append(b.error || b.message);
                } else {
                    return g.append(b.error || b.message);
                }
            }
        });
    });
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

function rl(formData, type, q) {
    fetch(`/api/${type}?redirect=${q}`,
    {   method: 'POST',
        mode : 'same-origin',
        credentials: 'same-origin' ,
        body : formData
    }).then((r) => r.json()).then((b) => {
      if (b.OK == true) {
          if (b.redirect == "account") return window.location.assign("/account")
          if (b.redirect == "kaipaste") return window.location.assign("/kaipaste")
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

    fetch('/config.json', { method: 'get' }).then((r) => r.json()).then((re) => {
        let url = re.Url;
        if (url == "https://www.kaiurl.xyz") url = "https://api.kaiurl.xyz";
        fetch(`${url}:3000/url${a}`, {
            method: 'post',
            body : formData
        }).then((r) => r.json()).then((b) => {
            if (b.OK == true) {
                if (b.Latest_id) document.cookie = `Latest_id=${b.Latest_id}`
                return window.location.assign("/shrink");
            } else {
                var g = document.getElementById('error');
                if (g.innerText) {
                    g.innerText = ""
                    g.append(b.error);
                } else {
                    return g.append(b.error);
                };
            };
        });
    }).catch(e => { console.log(e); });
};

function changelogNew(f) {
    fetch('/changelog/new', {
        method: 'post',
        mode: 'same-origin',
        credentials: 'same-origin',
        body: f
    }).then((r) => r.json()).then((b) => {
        if (b.OK == true) {
            return window.location.assign('/changelog');
        } else {
            var g = document.getElementById('error');
            if (g.innerText) {
                g.innerText = "";
                g.append(b.error);
            } else {
                return g.append(b.error);
            }
        }
    })
};

function getCookies() {
    var cookies = document.cookie.split(';');
    var ret = '';
    for (var i = 1; i <= cookies.length; i++) {
        ret += cookies[i - 1];
    }
    return ret;
}