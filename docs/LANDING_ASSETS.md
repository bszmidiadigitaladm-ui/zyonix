# Landing page assets

Everything in `public/landing/` is served as pre-optimized WebP with `unoptimized`
`next/image`, so the landing page never triggers the image-optimization CDN.

| File | What it is | How it was made |
|---|---|---|
| `art-shepherd/water/tomb/jonah.webp` | The four "Made with Zyonix" gallery pieces | Generated with `gpt-image-1` (the same model the Bible Art tool uses) from short scene prompts, no text in the image; resized to 720px wide |
| `hero-bg.webp` | Ribbon artwork behind the hero | `gpt-image-1`, abstract translucent teal ribbons on near-black, 1600px wide |
| `church-team.webp` | Photo in the "for the whole church" section | `gpt-image-1`; prompt forbids any printing/writing on clothing |
| `app-*.webp` | Product screenshots in the hero and tool showcase | Real captures of the running app (production build) signed in as a throwaway demo account seeded with realistic content; the `app-art-gen` shot is a real generation, not a mock-up. The demo account is deleted afterwards |

Guidelines when refreshing them:

- Keep the demo persona and content fictional; never capture a real customer's data.
- Export screenshots at 1400x926 (1360x900 viewport at 1.5x) so `AppFrame` and the
  tool showcase crop consistently.
- Don't add testimonials or user counts until there are real ones.
