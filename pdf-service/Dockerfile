# PDF service — Node 20 + Chromium do apt + Puppeteer-core
FROM node:20-bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		chromium \
		fonts-liberation \
		fonts-noto-color-emoji \
		ca-certificates \
		dumb-init \
	&& rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
	PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
	NODE_ENV=production \
	HOME=/tmp \
	XDG_CONFIG_HOME=/tmp/.config \
	XDG_CACHE_HOME=/tmp/.cache

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./

# Utilizador não-root, com home explícito em /tmp (escrevível em qualquer runtime, incl. Container Apps).
RUN groupadd -r app && useradd -r -g app -G audio,video -d /tmp -s /usr/sbin/nologin app \
	&& chown -R app:app /app
USER app

EXPOSE 8080

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
