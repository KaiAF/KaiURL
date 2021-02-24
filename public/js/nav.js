function openNav() {
    document.getElementById("sideBar").style.width = "250px";
    document.getElementById("main").style.marginLeft = "250px";
    document.getElementById("nav").setAttribute("onClick", "closeNav()")
    document.getElementById("nav").innerHTML = '&#x2718;'

    setTimeout(() => {
      closeNav()
      clearTimeout()
    }, 6000);
  }

  function closeNav() {
    document.getElementById("sideBar").style.width = "0";
    document.getElementById("main").style.marginLeft= "0";
    document.getElementById("nav").setAttribute("onClick", "openNav()")
    document.getElementById("nav").innerHTML = "☰"
    clearTimeout()
  }