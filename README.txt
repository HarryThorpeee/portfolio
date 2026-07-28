Harry Thorpe - portfolio
========================

To publish: drag this whole folder onto netlify.com/drop
(or connect it to a Git repo and point Netlify/Cloudflare Pages at it).

Files
-----
index.html            Homepage
about.html            About
aimee.html            Aimee, EE's virtual assistant
aimee-vision.html     Aimee Vision
orkestra.html         Orkestra
mom-i-see-war.html    Mom, I See War
myjeenie.html         myJeenie
big-give.html         The Big Give

styles.css            All styling, shared by every page
main.js               Navigation, zoom transition, carousel
assets/               Images, video, and the Orkestra marketing embed
_redirects            Netlify rule for clean URLs (/orkestra not /orkestra.html)

How navigation works
--------------------
Every page is a real HTML file, so direct links, refreshes and search
engines all work normally. When JavaScript is available, main.js
intercepts clicks between pages, fetches the next page in the
background, and swaps it in - which keeps the zoom transition running
inside a single document, exactly as before. If JavaScript fails or is
blocked, links fall back to ordinary page loads and nothing breaks.

Editing
-------
Shared chrome (nav, footer) is repeated in each HTML file, so a change
there needs making in all eight. Everything else is per-page.
