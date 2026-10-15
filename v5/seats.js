// Tapping Menü slides the seats up with the menu inside. While the menu is up the word
// reads Home: on the homepage it slides the seats back down, on other pages it goes home.
// Moving to another page from the menu is animated in seats.css.
(function () {
    const menu = document.getElementById('menu');
    const menuLink = menu.querySelector('.menu-link');

    const onHomepage = !document.body.classList.contains('page');

    function showMenu(open) {
        menu.classList.toggle('open', open);
        menuLink.setAttribute('aria-expanded', open);
        menuLink.textContent = open ? 'Home' : 'Menü';
        menuLink.href = open ? 'index.html' : 'menu.html';
        document.body.classList.toggle('menu-open', open);
    }

    menuLink.addEventListener('click', e => {
        const open = menu.classList.contains('open');
        // with the menu up on another page, let the link take you home
        if (open && !onHomepage) return;
        e.preventDefault();
        showMenu(!open);
    });

    // leaving for another page: the word switches back to Menü straight away,
    // so it already reads Menü while the seats slide down onto the new page
    window.addEventListener('pageswap', () => {
        menuLink.textContent = 'Menü';
    });

    // coming back with the back button: show the page with the menu closed
    window.addEventListener('pageshow', e => {
        if (!e.persisted) return;
        menu.style.transition = 'none';
        showMenu(false);
        requestAnimationFrame(() => menu.style.transition = '');
    });

    window.fskMenu = showMenu;
})();
