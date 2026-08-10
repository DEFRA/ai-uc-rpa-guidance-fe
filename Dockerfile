ARG PARENT_VERSION=3.0.10-node24.16.0
ARG PORT=3000
ARG PORT_DEBUG=9229

# Overrideable scratch context to allow the inclusion of any custom root CAs we
# need to trust, left empty here by default.
FROM scratch AS ca-bundle

FROM defradigital/node-development:${PARENT_VERSION} AS development
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node-development:${PARENT_VERSION}

USER root

# Optionally trust a corporate/TLS-inspecting proxy CA. `ca-bundle` is empty
# unless a build context overrides it with a directory of PEM certificates (the
# orchestrator's compose files pass CA_BUNDLE_DIR), so this is a no-op by
# default. A build context is used rather than a build secret because BuildKit
# hashes context contents: the layer rebuilds when — and only when — the
# certificates change.
# Node ignores the system trust store, so the certificates are appended to both
# it and the file the base image already points NODE_EXTRA_CA_CERTS at.
COPY --from=ca-bundle . /tmp/ca-bundle/
RUN find /tmp/ca-bundle -type f \( -name '*.crt' -o -name '*.pem' \) -exec cat {} + \
      | awk '/BEGIN CERTIFICATE/{b=""} {b=b $0 ORS} /END CERTIFICATE/{if (!seen[b]++) printf "%s", b}' \
      | tee -a /usr/local/share/ca-certificates/internal-ca.crt \
      >> /etc/ssl/certs/ca-certificates.crt && \
    rm -rf /tmp/ca-bundle

USER node

ENV TZ="Europe/London"

ARG PORT
ARG PORT_DEBUG
ENV PORT=${PORT}
EXPOSE ${PORT} ${PORT_DEBUG}

COPY --chown=node:node --chmod=755 package*.json ./
RUN npm install --ignore-scripts
COPY --chown=node:node --chmod=755 . .
RUN npm run build

CMD [ "npm", "run", "start:dev" ]

FROM development AS production_build

ENV NODE_ENV=production

RUN npm run build

FROM defradigital/node:${PARENT_VERSION} AS production
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node:${PARENT_VERSION}

ENV TZ="Europe/London"

# Add curl to template.
# CDP PLATFORM HEALTHCHECK REQUIREMENT
USER root
RUN apk add --no-cache curl
USER node

COPY --from=production_build /home/node/package*.json ./
COPY --from=production_build /home/node/src ./src/
COPY --from=production_build /home/node/.public/ ./.public/

RUN npm ci --omit=dev

ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD [ "node", "src" ]

