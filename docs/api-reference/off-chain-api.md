# Off-chain API Reference

## Base URL

```
https://api.esustellar.com
```

## Endpoints

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

---

### GET /api/groups

List all savings groups.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | — | Filter by status (open, active, completed) |
| `limit` | number | 20 | Results per page |
| `offset` | number | 0 | Pagination offset |

**Response:**
```json
{
  "groups": [
    {
      "id": "abc123...",
      "admin": "GABC...",
      "contribution_amount": 10000000,
      "member_count": 10,
      "current_members": 5,
      "status": "open",
      "created_at": "2026-01-10T00:00:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/groups/:id

Get detailed information about a specific group.

**Response:**
```json
{
  "id": "abc123...",
  "admin": "GABC...",
  "contribution_amount": 10000000,
  "member_count": 10,
  "current_round": 3,
  "status": "active",
  "members": [
    {
      "address": "GDEF...",
      "joined_at": "2026-01-10T01:00:00Z",
      "payout_order": 1
    }
  ],
  "contributions": [
    {
      "round": 1,
      "contributor": "GDEF...",
      "amount": 10000000,
      "tx_hash": "abc123..."
    }
  ]
}
```

---

### GET /api/groups/:id/members

List members of a specific group.

**Response:**
```json
{
  "members": [
    {
      "address": "GDEF...",
      "joined_at": "2026-01-10T01:00:00Z",
      "payout_order": 1,
      "total_contributed": 30000000,
      "has_received_payout": false
    }
  ]
}
```

## Rate Limiting

API endpoints are rate-limited to 20 requests per second per IP.
Auth endpoints are limited to 5 requests per second.

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "No group found with the given ID"
  }
}
```
