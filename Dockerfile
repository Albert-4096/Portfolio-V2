FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html sitemap.xml robots.txt /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY fonts /usr/share/nginx/html/fonts
COPY assets /usr/share/nginx/html/assets
