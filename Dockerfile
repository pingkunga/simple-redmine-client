# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
COPY package.json bun.lockb ./
COPY . .
RUN bun install --frozen-lockfile

# Copy project files into the image

# [Optional] tests & build
ENV NODE_ENV=production
RUN bun run build

# Copy production dependencies and source code into final image
FROM oven/bun:1.0.18-alpine AS runtime
WORKDIR /app

# Copy necessary files from the 'install' stage to the 'runtime' stage
# COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/.output ./output

# Set user and expose port
USER bun
EXPOSE 3000/tcp

# Run the app
ENTRYPOINT [ "sh", "-c", "bun run /app/output/server/index.mjs" ]