// The way from page to page (see seats.css), a row of seats at a time,
// behind the six pages: the top row of seats of the page you leave folds
// down into the second, the two into the third, and so on down into the six
// pages; then the seats of the new page unfold out of them, row by row,
// uncovering it as they come up.
// Seats are the empty rows, the seats on the page and the dividers; a page
// with none on screen gets a row of its own for the way (class="fold").
// The screens don't fold or fade: the old one stays until the new one takes
// its place at the end.
// Loaded in the <head> of every page, since it has to be ready before the
// page is shown.
(function () {
    const root = document.documentElement;
    const here = location.pathname.split('/').pop() || 'index.html';
    // how long each row takes (the same as the seats that open a section,
    // seats.js), and a row just for the way to fade
    const step = 62;
    const fade = 250;
    const easing = 'cubic-bezier(0.45, 0, 0.25, 1)';
    const seatsOnPage = '.filler li, main .seat, main .seat-rows li, main .divider, .fold li';

    const cssValue = name => parseFloat(getComputedStyle(root).getPropertyValue(name));
    const menuTop = () => document.querySelector('.seats').getBoundingClientRect().top;

    // each screen has a name of its own (screen-kino, ...), so it is pictured
    // by itself and stays put, and the old one never turns into the new one
    function nameScreen() {
        const screen = document.querySelector('h1.screen');
        if (screen) screen.style.viewTransitionName = 'screen-' + here.replace('.html', '');
    }

    // a row of seats just for the way, on a page with none on screen: the
    // top row under the screen
    function addFold() {
        const row = cssValue('--row');
        const screen = document.querySelector('h1.screen');
        const below = screen ? Math.max(0, screen.getBoundingClientRect().bottom) : 0;
        const rows = Math.max(1, Math.floor((menuTop() - below) / row));
        const fold = document.createElement('ul');
        fold.className = 'seat-rows fold';
        fold.setAttribute('aria-hidden', 'true');
        fold.style.top = menuTop() - rows * row + 'px';
        fold.append(document.createElement('li'), document.createElement('li'));
        document.body.append(fold);
    }

    // each seat on screen (above the six pages) gets a name of its own, so
    // it is pictured by itself and can move on its own; so does the word in
    // it (Heute), which stays behind and fades instead. Gives back, for each
    // seat, whether it has a word
    function nameSeats(prefix) {
        const bottom = menuTop();
        const onScreen = () => [...document.querySelectorAll(seatsOnPage)].filter(seat => {
            // (the two seats of a divider go with it)
            if (seat.parentElement.closest(seatsOnPage)) return false;
            const box = seat.getBoundingClientRect();
            return box.height && box.bottom > 0 && box.top < bottom;
        });
        let seats = onScreen();
        if (!seats.length) {
            addFold();
            seats = onScreen();
        }
        return seats.map((seat, i) => {
            seat.style.viewTransitionName = `${prefix}-${i}`;
            const word = seat.querySelector('button, a');
            const hasWord = Boolean(word && word.textContent.trim());
            if (hasWord) word.style.viewTransitionName = `${prefix}-word-${i}`;
            return hasWord;
        });
    }

    function unnameSeats() {
        document.querySelectorAll(seatsOnPage).forEach(seat => {
            seat.style.viewTransitionName = '';
            const word = seat.querySelector('button, a');
            if (word) word.style.viewTransitionName = '';
        });
        document.querySelectorAll('.fold').forEach(fold => fold.remove());
    }

    // leaving a page: name its screen and seats, and tell the next page
    // where you came from
    addEventListener('pageswap', e => {
        if (!e.viewTransition) return;
        nameScreen();
        const words = nameSeats('out');
        try {
            sessionStorage.setItem('fsk-from', here);
            sessionStorage.setItem('fsk-seats', JSON.stringify(words));
        } catch (err) {}
    });
    // (the Back button can show the page as it was left)
    addEventListener('pageshow', e => {
        if (e.persisted) unnameSeats();
    });

    addEventListener('pagereveal', e => {
        let from = null;
        let outWords = [];
        try {
            from = sessionStorage.getItem('fsk-from');
            outWords = JSON.parse(sessionStorage.getItem('fsk-seats')) || [];
            sessionStorage.removeItem('fsk-from');
            sessionStorage.removeItem('fsk-seats');
        } catch (err) {}
        const transition = e.viewTransition;
        if (!transition || !from || from === here) return;
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        // the seats of the page you left fold down, then those of this page
        // unfold, uncovering it as they come up
        nameScreen();
        const inWords = nameSeats('in');
        // (a row just for the way goes again once it is up)
        const standIn = Boolean(document.querySelector('.fold'));
        transition.finished.then(unnameSeats);

        transition.ready.then(() => {
            const row = cssValue('--row');
            const bottom = menuTop();
            const topOf = name => new DOMMatrixReadOnly(getComputedStyle(root, `::view-transition-group(${name})`).transform).m42;
            const outTops = outWords.map((_, i) => topOf('out-' + i));
            const inTops = inWords.map((_, i) => topOf('in-' + i));
            // the front: where the folded seats are at each step. It goes from
            // one row of seats to the next and on to the six pages, a row each
            // step, also where there are no seats in between (under the top
            // divider on Vorschau)
            const path = tops => {
                const rows = [...new Set(tops.map(Math.round))].sort((a, b) => a - b).filter(y => y < bottom - 1);
                const stops = rows.length ? [...rows, bottom] : [bottom - row, bottom];
                return stops.flatMap((y, i) => {
                    const next = stops[i + 1];
                    const between = [];
                    for (let at = y + row; next !== undefined && at < next - 1; at += row) between.push(at);
                    return [y, ...between];
                });
            };
            const foldPath = path(outTops);
            const unfoldPath = path(inTops).reverse();
            const unfoldSteps = unfoldPath.length - 1;
            const unfoldAt = (foldPath.length - 1) * step;
            const end = unfoldAt + unfoldSteps * step;

            // one keyframe per step
            const run = (pseudoElement, steps, delay, props) => root.animate(
                Array.from({ length: steps + 1 }, (_, i) => ({ ...props(i), offset: i / steps, easing })),
                { duration: steps * step, delay, fill: 'both', pseudoElement });

            // a seat stays in its place until the front reaches it, and from
            // then on moves with the front; its word fades during the step its
            // seat folds away in (or unfolds back into its place in)
            const seats = (picture, prefix, words, tops, front, delay, folding) => words.forEach((hasWord, i) => {
                const steps = front.length - 1;
                const at = n => Math.max(0, front[n] - tops[i]);
                run(`::view-transition-${picture}(${prefix}-${i})`, steps, delay,
                    n => ({ transform: `translateY(${at(n)}px)` }));
                if (!hasWord) return;
                const moving = Array.from({ length: steps }, (_, n) => n).filter(n => at(n) !== at(n + 1));
                const moves = (folding ? moving[0] : moving[moving.length - 1]) ?? 0;
                const shown = n => (folding ? n <= moves : n > moves) ? 1 : 0;
                run(`::view-transition-${picture}(${prefix}-word-${i})`, steps, delay, n => ({ opacity: shown(n) }));
            });

            seats('old', 'out', outWords, outTops, foldPath, 0, true);
            // the rest of the page you leave fades during the first step
            run('::view-transition-old(root)', foldPath.length - 1, 0, i => ({ opacity: i ? 0 : 1 }));

            seats('new', 'in', inWords, inTops, unfoldPath, unfoldAt, false);
            // the new page shows under the seats as they come up, and what's
            // above the first row in the last step
            run('::view-transition-new(root)', unfoldSteps, unfoldAt, i => ({
                clipPath: `inset(${i < unfoldSteps ? unfoldPath[i] : 0}px 0px 0px 0px)`
            }));
            if (standIn) {
                inWords.forEach((_, i) => root.animate([{ opacity: 1 }, { opacity: 0 }], {
                    duration: fade,
                    delay: end,
                    fill: 'forwards',
                    pseudoElement: `::view-transition-new(in-${i})`
                }));
            }

            // the screens: the old one stays where it is the whole way, and
            // the new one takes its place once the seats are in place
            root.animate([{ opacity: 0 }, { opacity: 0 }], {
                duration: end,
                pseudoElement: `::view-transition-new(screen-${here.replace('.html', '')})`
            });
        });
    });
})();
