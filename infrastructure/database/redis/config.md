# DalaSmart Redis Configuration

## Overview

Redis serves two roles in the DalaSmart platform:

1. **Cache** — hot data that is expensive to recompute (vehicle positions, crowding predictions, fare tables, session tokens)
2. **Pub/Sub** — real-time event fan-out between microservices (vehicle position updates → SSE live feed, payment retry queue, emergency alerts)

---

## Cluster Mode

### Topology

Run Redis in **cluster mode** with 3 primary shards and 3 replicas (one replica per primary). This provides:

- Horizontal write scalability across 3 shards
- Automatic failover (replica promoted within ~10 seconds of primary failure)
- No single point of failure

```
Primary 0  ←→  Replica 0   (slots 0–5460)
Primary 1  ←→  Replica 1   (slots 5461–10922)
Primary 2  ←→  Replica 2   (slots 10923–16383)
```

### Recommended Instance Sizing (Production)

| Node | Memory | CPU |
|------|--------|-----|
| Each primary | 4 GB | 2 vCPU |
| Each replica | 4 GB | 2 vCPU |

For local development a single-node Redis instance is sufficient (see `docker-compose.yml`).

### Configuration Parameters

```conf
# redis.conf (applied to each node)
maxmemory 3gb
maxmemory-policy allkeys-lru      # evict least-recently-used keys when memory is full
save ""                            # disable RDB snapshots for cache nodes
appendonly no                      # disable AOF for cache nodes
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000          # 5 s before a node is considered unreachable
hz 20                              # background task frequency (higher = faster expiry)
tcp-keepalive 300
```

> **Note**: For the pub/sub nodes (if separated), enable `appendonly yes` and `save "900 1"` to persist channel subscriptions across restarts.

---

## Key Naming Conventions

All keys follow the pattern: `<namespace>:<entity>:<id>[:<field>]`

### Session / Auth

| Key | Type | TTL | Description |
|-----|------|-----|-------------|
| `session:<userId>` | Hash | 24 h | JWT session metadata (device, IP, issued_at) |
| `refresh_token:<tokenHash>` | String | 7 d | Refresh token → userId mapping |
| `rate_limit:<clientType>:<ip>` | String (counter) | 1 min | Per-IP rate limit counter |

### Vehicle Positions (Cache)

| Key | Type | TTL | Description |
|-----|------|-----|-------------|
| `vehicle:pos:<vehicleId>` | Hash | 30 s | Latest GPS position fields (lat, lng, speed, heading, crowding, ts) |
| `vehicle:online` | Sorted Set | — | vehicleId → last_seen Unix timestamp; used to detect stale vehicles |
| `route:vehicles:<routeId>` | Set | 60 s | Set of vehicleId currently on a given route |

### Crowding Predictions (Cache)

| Key | Type | TTL | Description |
|-----|------|-----|-------------|
| `crowding:<vehicleId>` | String | 60 s | Predicted CrowdingLevel (green/orange/red/gray) |
| `crowding:stop:<stopId>` | Hash | 60 s | Map of vehicleId → predicted CrowdingLevel for vehicles approaching a stop |

### Fare Tables (Cache)

| Key | Type | TTL | Description |
|-----|------|-----|-------------|
| `fare:<routeId>` | Hash | 1 h | Flat fare and segment fares for a route |

### QR Payment Tokens (Deduplication)

| Key | Type | TTL | Description |
|-----|------|-----|-------------|
| `qr:used:<tokenId>` | String | 10 min | Set to "1" atomically on first use; prevents double-charging |

> **Atomicity**: Use `SET qr:used:<tokenId> 1 NX EX 600` to set the key only if it does not exist. A successful SET means the token is being used for the first time.

### Payment Retry Queue

| Key | Type | TTL | Description |
|-----|------|-----|-------------|
| `payment:retry:<transactionId>` | Hash | 5 min | Queued failed QR payment (payload, retry_count, next_retry_at) |
| `payment:retry:queue` | List | — | FIFO queue of transactionIds awaiting retry |

### Trip Sharing (Safety Module)

| Key | Type | TTL | Description |
|-----|------|-----|-------------|
| `trip_share:<tripId>` | Hash | 4 h | Live trip sharing state (passenger GPS, vehicle ID, ETA, contacts) |

### Offline Cache Pre-population (AI Engine)

| Key | Type | TTL | Description |
|-----|------|-----|-------------|
| `prefetch:<userId>` | Set | 24 h | Route IDs predicted to be needed by this passenger |

---

## Pub/Sub Channels

Redis Pub/Sub is used for real-time fan-out within the application zone. Kafka handles durable, cross-service event streaming; Redis Pub/Sub handles low-latency in-process fan-out (e.g., Fleet Tracker → SSE endpoint).

| Channel | Publisher | Subscribers | Payload |
|---------|-----------|-------------|---------|
| `vehicle.positions` | Fleet Tracker | SSE live feed handler, Crowding Predictor | `VehiclePosition` JSON |
| `fleet.alerts` | Fleet Tracker | Safety Module, Operator Dashboard SSE | `FleetAlert` JSON |
| `payment.completed` | Payment Service | Driver App earnings updater, Trust_Points worker | `Transaction` JSON |
| `emergency.triggered` | Safety Module | Operations team notifier, Audio uploader | `EmergencyEvent` JSON |
| `trip.deviation` | Fleet Tracker | Safety Module (passenger alert relay) | `FleetAlert` JSON |

### Channel Naming Convention

`<service>.<event_type>` — all lowercase, dot-separated.

---

## Cluster Client Configuration (Node.js example)

```typescript
import { Cluster } from 'ioredis';

const redis = new Cluster(
  [
    { host: 'redis-0', port: 6379 },
    { host: 'redis-1', port: 6379 },
    { host: 'redis-2', port: 6379 },
  ],
  {
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
      tls: process.env.NODE_ENV === 'production' ? {} : undefined,
    },
    clusterRetryStrategy: (times) => Math.min(times * 100, 3000),
    enableReadyCheck: true,
    scaleReads: 'slave',   // read from replicas to reduce primary load
  }
);
```

---

## Security

- **Authentication**: `requirepass` set via environment variable `REDIS_PASSWORD`
- **TLS**: Enabled in production using `tls-cert-file` / `tls-key-file` / `tls-ca-cert-file`
- **Network**: Redis nodes are in the private data zone subnet; not exposed to the public internet
- **ACLs**: Use Redis ACL to restrict each service to only the key patterns and commands it needs

```
# Example ACL for Payment Service
ACL SETUSER payment_service on >$PAYMENT_REDIS_PASSWORD
  ~qr:used:* ~payment:retry:* ~fare:*
  +SET +GET +DEL +EXPIRE +LPUSH +RPOP +HSET +HGET +HGETALL
  -DEBUG -CONFIG -SHUTDOWN
```
