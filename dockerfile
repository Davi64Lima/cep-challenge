# ---------- Base: define versões e diretório ----------
FROM node:22-alpine AS base
WORKDIR /app
ENV CI=true
# Evita instalar devtools desnecessárias
RUN apk add --no-cache dumb-init
# Define timezone opcional (comente se não quiser)
# RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/UTC /etc/localtime

# ---------- Dependencies: instala deps com cache eficiente ----------
FROM base AS deps
# Copia apenas manifests para cachear instalação
COPY package*.json ./
# Ajuste se usar pnpm/yarn
RUN npm ci --legacy-peer-deps

# ---------- Build: compila a aplicação ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Se seu build usa variáveis, exporte-as no build args e use aqui
RUN npm run build

# ---------- Production: imagem final mínima ----------
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copia só o que é necessário para runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

# Segurança básica (não roda como root)
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp
USER nodeusr

EXPOSE 3000
# HEALTHCHECK será feito pelo compose, então não define aqui
CMD ["npm", "run", "start:prod"]