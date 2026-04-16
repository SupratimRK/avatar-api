# Avatar API Documentation

A deterministic avatar delivery API powered by Cloudflare Workers. It maps user identifiers to a consistent set of high-quality avatar assets.

## Endpoint

`GET /`

Returns an avatar image based on the provided query parameters.

## Query Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | *Optional* | A unique identifier for the user. Used to deterministically select one of 50 avatars. |
| `gender` | `string` | `boy` (if ID provided) | The gender theme for the avatar. Supported: `boy`, `girl`. |
| `format` | `string` | `webp` | The image file format. Supported: `webp`, `png`, `avif`. |

## Behavior and Fallbacks

### Deterministic Selection
When an `id` is provided, the API uses a `SHA-256` hash to map the string to an integer between 1 and 50. This ensures that the same `id` always returns the same avatar for a given gender.

### Missing Parameters
- **No `id` and No `gender`**: Returns a completely random avatar (random gender and random image).
- **No `id` but `gender` Provided**: Returns a deterministic "default" avatar for that specific gender.
- **Invalid Gender/Format**: Falls back to `boy` and `webp` respectively.

## Examples

### Get a deterministic avatar for a user
`GET https://avatarapi.smrk.workers.dev/?id=user_123&gender=girl`

### Get a PNG version of an avatar
`GET https://avatarapi.smrk.workers.dev/?id=user_123&format=png`

### Get a random avatar
`GET https://avatarapi.smrk.workers.dev/`

## Technical Details
- **Assets**: 100+ unique avatar combinations (50 boys, 50 girls).
- **Caching**: Images are served with `Cache-Control: public, max-age=31536000, immutable`.
- **Latency**: Sub-millisecond processing on the Cloudflare Edge.
