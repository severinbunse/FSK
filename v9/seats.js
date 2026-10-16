// The empty seats: when the page is shorter than the screen, rows of empty seats
// fill the space between the content and the six pages at the bottom. As many
// whole rows as fit (a little shorter than the rows of the six pages); what's left over
// (less than a row) goes above them. On longer pages there are none, and the
// page scrolls.
(function () {
    // the seat of the page you're on reads Home, in white, and goes to the homepage
    const here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.seats a').forEach(a => {
        if (a.getAttribute('href') !== here) return;
        a.textContent = 'Home';
        a.href = 'index.html';
        a.classList.add('home');
    });

    const root = document.documentElement;
    const filler = document.querySelector('.filler');
    const seats = document.querySelector('.seats');
    const pageRows = seats.querySelectorAll('li').length / 2;

    function fill() {
        filler.replaceChildren();
        filler.style.removeProperty('margin-top');
        const style = getComputedStyle(root);
        const row = parseFloat(style.getPropertyValue('--row'));
        const empty = parseFloat(style.getPropertyValue('--row-empty'));
        const gap = parseFloat(getComputedStyle(filler).marginTop);
        const bottom = parseFloat(getComputedStyle(seats).paddingBottom);
        // the page scrolls inside the body, so measure from the body's top
        const top = filler.getBoundingClientRect().top - document.body.getBoundingClientRect().top + document.body.scrollTop;
        // anything placed between the empty seats and the six pages
        // (the days on Spielzeiten) sits on the six pages and takes its share
        let last = filler;
        for (let el = filler.nextElementSibling; el && el !== seats; el = el.nextElementSibling) {
            if (el.getBoundingClientRect().height) last = el;
        }
        const between = last.getBoundingClientRect().bottom - filler.getBoundingClientRect().bottom;
        const space = document.body.clientHeight - top - between - bottom;
        // the six pages take three full rows, the empty rows share the rest
        const rows = Math.floor((space - pageRows * row) / empty);
        if (rows <= 0) return;
        filler.style.marginTop = gap + space - pageRows * row - rows * empty + 'px';
        for (let i = 0; i < rows * 2; i++) {
            filler.append(document.createElement('li'));
        }
    }

    fill();
    window.fskFill = fill;
    window.addEventListener('resize', fill);
    window.addEventListener('load', fill);
    document.fonts.ready.then(fill);
})();
