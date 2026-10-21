// Entry for /vendor/motion-kit.min.js. Only what js/motion.js and js/intro.js use, so esbuild can tree-shake the rest.
// anime.js: timelines, SVG drawing, text scramble, staggers, eases. Motion: viewport triggers, WAAPI fills and gesture springs.
export { animate, createTimeline, stagger, createDrawable, scrambleText, cubicBezier, eases } from 'animejs';
export { animateMini, inView, press, spring } from 'motion';
