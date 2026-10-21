// Entry for /vendor/motion-kit.min.js. Only what js/motion.js uses, so esbuild can tree-shake the rest.
// anime.js: one-shot, hand-tuned moments. Motion: scroll-linked and gesture animations.
export { animate, stagger, createDrawable, scrambleText } from 'animejs';
export { animateMini, scroll, inView, press, spring } from 'motion';
