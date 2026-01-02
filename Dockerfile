# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.3 AS base
WORKDIR /app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
COPY package.json bun.lock ./
COPY . .
RUN BUN_POSTINSTALL=enable bun install --frozen-lockfile

# Copy project files into the image

# [Optional] tests & build
# Test stage
FROM install AS test
ENV NODE_ENV=test
# Run tests and generate a report
RUN bun test --reporter=junit --reporter-outfile=test-results.xml

# Build stage
FROM install AS build
ENV NODE_ENV=production
RUN bun run build

# Copy production dependencies and source code into final image
FROM oven/bun:1.3-alpine AS runtime
WORKDIR /app

# Copy necessary files from the 'install' stage to the 'runtime' stage
# COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/.output .

# Set user and expose port
USER bun
EXPOSE 3000/tcp

# Run the app
ENTRYPOINT [ "sh", "-c", "bun run /app/server/index.mjs" ]
