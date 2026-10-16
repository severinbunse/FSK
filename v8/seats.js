// The empty seats: when the page is shorter than the screen, rows of empty seats
// fill the space between the content and the six pages at the bottom. As many
// whole rows as fit, all rows stretched a little so the last one ends at the
// bottom of the screen. On longer pages there are none, and the page scrolls.
(function () {
    const root = document.documentElement;
    const filler = document.querySelector('.filler');
    const seats = document.querySelector('.seats');
    const pageRows = seats.querySelectorAll('li').length / 2;

    function fill() {
        filler.replaceChildren();
        root.style.removeProperty('--row');
        const min = parseFloat(getComputedStyle(root).getPropertyValue('--row-min'));
        const bottom = parseFloat(getComputedStyle(seats).paddingBottom);
        // the page scrolls inside the body, so measure from the body's top
        const top = filler.getBoundingClientRect().top - document.body.getBoundingClientRect().top + document.body.scrollTop;
        const space = document.body.clientHeight - top - bottom;
        const rows = Math.floor(space / min);
        if (rows <= pageRows) return;
        root.style.setProperty('--row', space / rows + 'px');
        for (let i = 0; i < (rows - pageRows) * 2; i++) {
            filler.append(document.createElement('li'));
        }
    }

    fill();
    window.addEventListener('resize', fill);
    window.addEventListener('load', fill);
    document.fonts.ready.then(fill);
})();
