# Reading Plan Metadata

`normalizeDays` converts raw plan definitions into a normalized form. Each day contains an array of `Reading` objects and optional metadata in a `_meta` object. Both readings and `_meta` support the following optional fields:

- `title`
- `note`
- `prayer`
- `discussion`
- `translation`
- `image`
- `link`
- `tags`

## Example

```json
{
  "readings": [
    {
      "ref": "John 3:16",
      "title": "Memory Verse",
      "note": "For God so loved",
      "prayer": "Thank you for Your love",
      "translation": "NIV",
      "image": "https://example.com/john316.png",
      "link": "https://bible.example/john3-16",
      "tags": ["gospel", "love"]
    }
  ],
  "_meta": {
    "title": "The Gospel",
    "note": "Focus on God's love today",
    "prayer": "Pray for your community",
    "discussion": "Share what this verse means to you",
    "link": "https://devotional.example/gospel",
    "tags": ["core", "salvation"]
  }
}
```

`formatDay` renders these fields when present:

```
Day 1: The Gospel
• John 3:16 (NIV)
  Note: For God so loved
  Prayer: Thank you for Your love
Note: Focus on God's love today
Prayer: Pray for your community
Discussion: Share what this verse means to you
Link: https://devotional.example/gospel
Tags: core, salvation
```
