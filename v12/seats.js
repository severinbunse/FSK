// The seats on every page (see seats.css):
// - the seat of the page you're on reads Home, in white, and goes to the homepage
// - a list of sections (class="opens") becomes seats, two in a row: tapping one
//   opens its section under the row, tapping it again closes it, one at a time
// - seats you can choose (class="choose") turn white when chosen
// - words too wide for their seat step down the type scale until they fit;
//   a line too long (class="fit") steps down to 48 at most, then wraps
// - the screen takes the height that makes everything under it whole rows,
//   the nearest to its usual height, the same on every page
// - rows of seats line up with the rows of the pages at the bottom
// - when the page is shorter than the screen, empty seats fill the space
//   between the content and the pages at the bottom
(function () {
    const root = document.documentElement;
    const body = document.body;
    const filler = document.querySelector('.filler');
    const seats = document.querySelector('.seats');
    const pageRows = seats.querySelectorAll('li').length / 2;

    const cssValue = name => parseFloat(getComputedStyle(root).getPropertyValue(name));
    // measured from the top of the page, and against the height of the
    // window (on the iPhone the one with Safari's bars showing, which stays
    // the same while they shrink and grow)
    const topOf = el => el.getBoundingClientRect().top - body.getBoundingClientRect().top;
    const height = () => root.clientHeight;

    // --- Home ---
    const here = location.pathname.split('/').pop() || 'index.html';
    seats.querySelectorAll('a').forEach(a => {
        if (a.getAttribute('href') !== here) return;
        a.textContent = 'Home';
        a.href = 'index.html';
        a.classList.add('home');
    });

    // --- sections as seats ---
    // each section's seat reads its data-seat, or else its first heading
    // (which is then taken out, since the seat says it already)
    const lists = [...document.querySelectorAll('.opens')].map(list => {
        const sections = [...list.children];
        const seatFor = new Map();
        list.replaceChildren();
        for (let i = 0; i < sections.length; i += 2) {
            const pair = sections.slice(i, i + 2);
            pair.forEach((section, j) => {
                let label = section.dataset.seat;
                if (!label) {
                    const heading = section.querySelector('h2, h3, h4');
                    label = heading.textContent;
                    heading.remove();
                }
                const seat = document.createElement('div');
                seat.className = j ? 'seat right' : 'seat';
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = label;
                button.setAttribute('aria-expanded', 'false');
                button.addEventListener('click', () => open(list, section, true));
                seat.append(button);
                list.append(seat);
                seatFor.set(section, seat);
            });
            // a seat on its own gets an empty one beside it
            if (pair.length === 1) {
                const empty = document.createElement('div');
                empty.className = 'seat right';
                list.append(empty);
            }
            // the sections of both seats sit under their row, hidden until opened
            list.append(...pair);
        }
        list.seatFor = seatFor;
        return list;
    });

    function open(list, section, tapped) {
        const opening = !section.classList.contains('open');
        // keep a tapped seat where it is on screen
        const seat = list.seatFor.get(section);
        const top = seat.getBoundingClientRect().top;
        list.seatFor.forEach((s, sec) => {
            const isOpen = opening && sec === section;
            sec.classList.toggle('open', isOpen);
            s.classList.toggle('open', isOpen);
            s.firstChild.setAttribute('aria-expanded', isOpen);
        });
        layout();
        if (!tapped) return;
        const shift = seat.getBoundingClientRect().top - top;
        root.scrollTop += shift;
    }

    // --- seats you can choose ---
    document.querySelectorAll('.choose button').forEach(button => {
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => {
            button.setAttribute('aria-pressed', button.getAttribute('aria-pressed') !== 'true');
        });
    });

    // --- words that fit their seat ---
    const scale = [60, 54, 48, 36, 30, 24, 21, 18];
    function fitWords() {
        document.querySelectorAll('.opens .seat button, .seats a, .seat-rows.tall span, .fit').forEach(word => {
            word.style.fontSize = '';
            word.classList.remove('wraps');
            // lines (film titles) don't go smaller than 48; they wrap instead
            const smallest = word.classList.contains('fit') ? 48 : 0;
            let size = parseFloat(getComputedStyle(word).fontSize);
            for (const each of scale) {
                if (each > size || each < smallest) continue;
                word.style.fontSize = each + 'px';
                size = each;
                if (word.scrollWidth <= word.clientWidth) return;
            }
            if (smallest) word.classList.add('wraps');
        });
    }

    // --- a screen that ends on the grid of rows ---
    // what's left of the phone under the screen is made a whole number of
    // rows: the screen gets up to half a row shorter or taller
    const screen = document.querySelector('h1.screen');
    function fitHeight() {
        if (!screen) return;
        screen.style.height = '';
        screen.style.aspectRatio = '';
        const row = cssValue('--row');
        const usual = screen.offsetHeight;
        const gap = parseFloat(getComputedStyle(screen).marginBottom);
        const space = height() - topOf(screen) - gap - parseFloat(getComputedStyle(seats).paddingBottom);
        const rows = Math.round((space - usual) / row);
        screen.style.aspectRatio = 'auto';
        screen.style.height = space - rows * row + 'px';
    }

    // --- rows in line with the pages at the bottom ---
    // each row of seats on the page gets a little space above it, so it sits on
    // the same grid as the rows at the bottom; open sections are made a whole
    // number of rows tall
    function align() {
        const row = cssValue('--row');
        lists.forEach(list => list.seatFor.forEach((seat, section) => {
            section.style.minHeight = '';
            if (section.classList.contains('open')) {
                section.style.minHeight = Math.ceil(section.offsetHeight / row) * row + 'px';
            }
        }));
        const menuTop = height() - parseFloat(getComputedStyle(seats).paddingBottom) - seats.querySelector('ul').offsetHeight;
        // (rows inside an open section move with it, so they are left alone)
        document.querySelectorAll('main .opens, main .seat-rows').forEach(rows => {
            if (rows.parentElement.closest('.opens')) return;
            rows.style.paddingTop = '';
            rows.style.paddingTop = ((menuTop - topOf(rows)) % row + row) % row + 'px';
        });
    }

    // --- empty seats ---
    // as many whole rows as fit between the content and the pages at the
    // bottom; what's left over (less than a row) goes above them. Longer
    // pages scroll, and end with one row of them.
    function fill() {
        // (measured without them; the same seats go back if as many fit)
        const before = [...filler.children];
        filler.replaceChildren();
        filler.style.removeProperty('margin-top');
        const row = cssValue('--row');
        const empty = cssValue('--row-empty');
        const gap = parseFloat(getComputedStyle(filler).marginTop);
        const bottom = parseFloat(getComputedStyle(seats).paddingBottom);
        const space = height() - topOf(filler) - bottom - pageRows * row;
        // (the space above them counts too: under seats that end on the grid
        // of rows, they follow straight on; under anything else they keep
        // their gap)
        const room = space + gap;
        let rows = Math.floor(room / empty);
        let above = room - rows * empty;
        if (above > 0.5 && above < gap) {
            rows -= 1;
            above += empty;
        }
        if (rows > 0) {
            filler.style.marginTop = above + 'px';
        } else {
            // a longer page ends with one row of them, in line with the
            // rows at the bottom
            rows = 1;
            const menuTop = height() - bottom - pageRows * row;
            // (measured from where it would be without its usual margin)
            const top = topOf(filler) - gap;
            filler.style.marginTop = ((menuTop - top) % row + row) % row + 'px';
        }
        if (before.length === rows * 2) {
            filler.append(...before);
            return;
        }
        for (let i = 0; i < rows * 2; i++) {
            filler.append(document.createElement('li'));
        }
    }

    function layout() {
        fitHeight();
        fitWords();
        align();
        fill();
    }

    // to begin with, all are closed, but for the section named in the
    // address (#...)
    const wanted = location.hash.slice(1);
    lists.forEach(list => {
        const named = [...list.seatFor.keys()].find(s => s.id && s.id === wanted);
        if (named) open(list, named, false);
    });

    layout();
    // pages call this after changing what's open (e.g. a film's still on Spielzeiten)
    window.fskLayout = layout;
    window.addEventListener('resize', layout);
    window.addEventListener('load', layout);
    document.fonts.ready.then(layout);
    // (Safari can report the fonts ready before they have arrived)
    document.fonts.addEventListener('loadingdone', layout);
    // a still that loads inside an open section changes its height
    document.addEventListener('load', e => {
        if (e.target.tagName === 'IMG') layout();
    }, true);
})();
