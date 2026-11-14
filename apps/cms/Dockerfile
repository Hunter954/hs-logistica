# CMS (Payload + Next). Contexto do build: a raiz do repositório.
#   docker build -f apps/cms/Dockerfile -t hs-cms .
FROM node:22.23.4-alpine AS base
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/cms/package.json apps/cms/
COPY apps/site/package.json apps/site/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile --filter cms...
COPY packages/types packages/types
COPY apps/cms apps/cms
# o importador da v2 lê o texto padrão do site
COPY apps/site/src/content/v2.ts apps/site/src/content/v2.ts
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter cms generate:importmap && pnpm --filter cms build

FROM node:22.23.4-alpine AS run
RUN apk add --no-cache libc6-compat && addgroup -S app && adduser -S app -G app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0
COPY --from=build --chown=app:app /repo/apps/cms/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/cms/.next/static ./apps/cms/.next/static
COPY --from=build --chown=app:app /repo/apps/cms/public ./apps/cms/public
# pasta de mídia só é usada sem bucket S3 configurado (não persiste entre deploys)
RUN mkdir -p apps/cms/media && chown app:app apps/cms/media
USER app
WORKDIR /app/apps/cms
EXPOSE 3001
ENV PORT=3001
CMD ["node", "server.js"]
