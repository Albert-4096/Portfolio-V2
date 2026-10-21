// Entry for /vendor/motion-kit.min.js. Only what js/motion.js uses, so esbuild can tree-shake the rest.
// anime.js: SVG drawing, text scramble, staggers. Motion: viewport triggers, WAAPI fills and gesture springs.
export { animate, stagger, createDrawable, scrambleText } from 'animejs';
export { animateMini, inView, press, spring } from 'motion';
