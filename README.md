# Online C++ Compiler

A web-based C++ playground. Users write code in the browser, run it against custom input and save snippets to their account. Untrusted code is compiled and executed inside short-lived, locked-down Docker containers.

## Features

- Compile and run C++98 through C++23 with custom standard input
- Clear result classification: success, compilation error, runtime error, time limit, memory limit and output limit
- Account registration and login with argon2id password hashing and JWT sessions
- Personal snippet library backed by MongoDB
- OpenAPI documentation served at `/api-docs`

## Architecture

```
src/
├── config/             Environment validation (zod) and logger setup
├── domain/             Core types: users, snippets, executions, C++ standards
├── errors/             Typed application errors mapped to HTTP responses
├── repositories/       Persistence interfaces
├── services/           Use cases: auth, snippets, executions, hashing, tokens
├── lib/                Framework-agnostic utilities (concurrency limiter)
├── infrastructure/
│   ├── database/       Mongoose connection and models
│   ├── repositories/   MongoDB implementations of the repository interfaces
│   ├── process/        Shell-free child process runner with timeouts and output caps
│   └── sandbox/        Docker-based code runner
├── http/               Express routes, request schemas, middleware
├── docs/               OpenAPI document generated from the request schemas
├── app.ts              Express application factory
├── container.ts        Composition root wiring concrete implementations
└── server.ts           Process entry point with graceful shutdown
```

Dependencies point inwards: services depend only on domain types and interfaces, while MongoDB and Docker live behind those interfaces in `infrastructure/`. The HTTP layer receives its services through `createApp`, which keeps the application fully testable with in-memory implementations.

## Execution sandbox

Every execution runs in its own container, created from `SANDBOX_IMAGE` and removed afterwards:

| Control | Setting |
| --- | --- |
| Network | `--network none` |
| Filesystem | read-only root, small `nosuid`/`nodev` tmpfs for the workspace and `/tmp` |
| User | unprivileged `65534:65534` |
| Privileges | all capabilities dropped, `no-new-privileges` |
| Resources | memory (swap disabled), CPU quota, PID limit, open file limit |
| Time | separate compile and run limits enforced inside the container and on the host |
| Output | stdout and stderr capped at `SANDBOX_MAX_OUTPUT_BYTES` |
| Kernel isolation | optional gVisor via `SANDBOX_RUNTIME=runsc` |

Source code and program input are streamed over stdin; Docker is invoked without a shell, so user data never reaches a command line. Concurrent executions are bounded by a queue (`SANDBOX_MAX_CONCURRENCY`, `SANDBOX_MAX_QUEUE`) and each user is rate limited. Memory limit violations are detected from the container's cgroup OOM counter. Containers carry a label and a maximum lifetime, and any leftovers are removed when the server starts.

For production deployments, installing [gVisor](https://gvisor.dev/docs/user_guide/install/) and setting `SANDBOX_RUNTIME=runsc` is strongly recommended.

## API

All endpoints are under `/api`. Successful responses use `{ "data": ... }` and errors use `{ "error": { "code", "message", "details?" } }`.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | | Service and database health |
| POST | `/auth/register` | | Create an account |
| POST | `/auth/login` | | Start a session (HttpOnly cookie, token also returned for API clients) |
| POST | `/auth/logout` | | Clear the session cookie |
| GET | `/auth/me` | ✓ | Current user |
| GET | `/snippets` | ✓ | List own snippets |
| POST | `/snippets` | ✓ | Create a snippet |
| GET | `/snippets/:id` | ✓ | Get a snippet |
| PATCH | `/snippets/:id` | ✓ | Update title, source or standard |
| DELETE | `/snippets/:id` | ✓ | Delete a snippet |
| POST | `/executions` | ✓ | Compile and run `{ source, stdin?, standard? }` |

Authenticated requests accept either the `token` cookie or an `Authorization: Bearer <token>` header.

## Configuration

Configuration is read from environment variables and validated at startup. See [`.env.example`](.env.example) for a complete template.

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `production` or `test` |
| `PORT` | `3000` | HTTP port |
| `LOG_LEVEL` | `info` | pino log level |
| `TRUST_PROXY` | `0` | Number of trusted reverse proxy hops |
| `CORS_ORIGINS` | empty | Comma-separated list of allowed cross-origin callers |
| `MONGODB_URI` | required | MongoDB connection string |
| `JWT_SECRET` | required | At least 32 characters |
| `JWT_EXPIRES_IN_SECONDS` | `86400` | Session lifetime |
| `SANDBOX_IMAGE` | `gcc:14` | Compiler image |
| `SANDBOX_RUNTIME` | empty | Container runtime, for example `runsc` |
| `SANDBOX_MAX_CONCURRENCY` | `4` | Parallel executions |
| `SANDBOX_MAX_QUEUE` | `32` | Waiting executions before returning 503 |
| `SANDBOX_COMPILE_TIMEOUT_MS` | `10000` | Compilation time limit |
| `SANDBOX_RUN_TIMEOUT_MS` | `3000` | Execution time limit |
| `SANDBOX_MEMORY_MB` | `512` | Memory limit per container |
| `SANDBOX_CPUS` | `1` | CPU quota per container |
| `SANDBOX_PIDS_LIMIT` | `64` | Process limit per container |
| `SANDBOX_MAX_OUTPUT_BYTES` | `65536` | Output cap per stream |
| `RATE_LIMIT_AUTH_PER_15_MIN` | `20` | Login and registration attempts per IP |
| `RATE_LIMIT_EXECUTIONS_PER_MIN` | `20` | Executions per user |

## Development

Requirements: Node.js 20.12+, Docker and a MongoDB instance.

```bash
npm install
cp .env.example .env
docker run -d --name mongo -p 27017:27017 mongo:8
npm run dev
```

The server loads `.env` automatically, pulls the sandbox image if it is missing and serves the frontend at http://localhost:3000.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start with automatic reload |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript without emitting |
| `npm test` | Unit and API tests |

### Tests

`npm test` runs unit and API tests without external services. Infrastructure tests against a real MongoDB and Docker daemon are enabled with environment variables:

```bash
MONGODB_TEST_URI=mongodb://localhost:27017/online-compiler-test \
SANDBOX_TEST_IMAGE=gcc:14 \
npm test
```

## Deployment

`docker-compose.yml` runs the application together with MongoDB. The application container talks to the host Docker daemon to create sandboxes, so it runs as a non-root user that only belongs to the Docker socket group, with a read-only filesystem and no capabilities.

```bash
export JWT_SECRET="$(openssl rand -base64 48)"
export DOCKER_GID="$(stat -c %g /var/run/docker.sock)"
docker compose up -d --build
```

Access to the Docker socket is equivalent to root access on the host. Run the service on a dedicated host or VM, keep the sandbox image up to date and prefer the gVisor runtime.
