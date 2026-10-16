// The seats on every page (see seats.css):
// - the seat of the page you're on reads Home, in white, and goes to the homepage
// - a list of sections (class="opens") becomes seats, two in a row: tapping one
//   opens its section under the row, tapping it again closes it, one at a time
// - seats you can choose (class="choose") turn white when chosen
// - words too wide for their seat step down the type scale until they fit;
//   a line too long (class="fit") steps down to 48 at most, then wraps
// - the screen takes the height that makes everything under it whole rows:
//   on the homepage (data-fit) it gives up to one row, to fit one more row
//   of seats; on the other pages it grows by up to a row, so there is no
//   gap between it and the first seats
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
    // the page scrolls inside the body, so measure from the body's top
    const topOf = el => el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;

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
        body.scrollTop += shift;
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
            word.querySelectorAll('.dots').forEach(d => d.removeAttribute('style'));
            // lines (film titles) don't go smaller than 48; they wrap instead
            const smallest = word.classList.contains('fit') ? 48 : 0;
            let size = parseFloat(getComputedStyle(word).fontSize);
            for (const step of scale) {
                if (step > size || step < smallest) continue;
                word.style.fontSize = step + 'px';
                size = step;
                if (word.scrollWidth <= word.clientWidth) return;
            }
            if (smallest) {
                word.classList.add('wraps');
                fillDots(word);
            }
        });
    }

    // in a line that wraps, the dots run from the end of the title's last
    // line to the date
    function fillDots(line) {
        const dots = line.querySelector('.dots');
        if (!dots) return;
        const title = line.firstElementChild;
        const date = line.lastElementChild;
        const range = document.createRange();
        range.selectNodeContents(title);
        const rects = range.getClientRects();
        const end = rects[rects.length - 1].right;
        const box = line.getBoundingClientRect();
        dots.style.left = end - box.left + 'px';
        dots.style.right = box.right - date.getBoundingClientRect().left + 'px';
    }

    // --- a screen that ends on the grid of rows ---
    // what's left of the phone under the screen is made a whole number of
    // rows: the homepage screen (data-fit) gets up to a row shorter, the
    // others up to a row taller
    const screen = document.querySelector('h1.screen');
    function fitHeight() {
        if (!screen) return;
        screen.style.height = '';
        screen.style.aspectRatio = '';
        const row = cssValue('--row');
        const usual = screen.offsetHeight;
        const gap = parseFloat(getComputedStyle(screen).marginBottom);
        const space = body.clientHeight - topOf(screen) - gap - parseFloat(getComputedStyle(seats).paddingBottom);
        const shrink = screen.hasAttribute('data-fit');
        const rows = Math.floor((space - usual + (shrink ? row : 0)) / row);
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
        const menuTop = body.clientHeight - parseFloat(getComputedStyle(seats).paddingBottom) - seats.querySelector('ul').offsetHeight;
        // (rows inside an open section move with it, so they are left alone)
        document.querySelectorAll('main .opens, main .seat-rows').forEach(rows => {
            if (rows.parentElement.closest('.opens')) return;
            rows.style.paddingTop = '';
            rows.style.paddingTop = ((menuTop - topOf(rows)) % row + row) % row + 'px';
        });
    }

    // --- empty seats ---
    // as many whole rows as fit (a little shorter than the other rows);
    // what's left over (less than a row) goes above them. Anything placed
    // between the empty seats and the pages (today's films on the homepage)
    // sits on the pages and takes its share. On longer pages there are none,
    // and the page scrolls.
    function fill() {
        filler.replaceChildren();
        filler.style.removeProperty('margin-top');
        const row = cssValue('--row');
        const empty = cssValue('--row-empty');
        const gap = parseFloat(getComputedStyle(filler).marginTop);
        const bottom = parseFloat(getComputedStyle(seats).paddingBottom);
        let last = filler;
        for (let el = filler.nextElementSibling; el && el !== seats; el = el.nextElementSibling) {
            if (el.getBoundingClientRect().height) last = el;
        }
        const between = last.getBoundingClientRect().bottom - filler.getBoundingClientRect().bottom;
        const space = body.clientHeight - topOf(filler) - between - bottom - pageRows * row;
        const rows = Math.floor(space / empty);
        if (rows <= 0) return;
        filler.style.marginTop = gap + space - rows * empty + 'px';
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

    // to begin with, open the section named in the address (#...), or today's
    // date on Spielzeiten, or the first one if the list says data-open="first"
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const wanted = [location.hash.slice(1), `d-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`];
    lists.forEach(list => {
        const sections = [...list.seatFor.keys()];
        const first = sections.find(s => s.id && wanted.includes(s.id))
            || (list.dataset.open === 'first' ? sections[0] : null);
        if (first) open(list, first, false);
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
