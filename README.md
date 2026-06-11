# Mia Kulin — Singer & Vocalist

Official website for Mia Kulin. Built for booking inquiries, music promotion, and fan engagement.

## Structure

```
MiaKulin/
├── index.html      ← Main site (single page)
├── styles.css      ← All styles
├── script.js       ← Mobile nav + interactions
├── robots.txt      ← Search engine directives
├── sitemap.xml     ← SEO sitemap
├── llms.txt        ← AI discoverability
└── img/            ← Photos and media
```

## TODO

- [ ] Add bio text from Mia
- [ ] Add profile photo(s) to `img/`
- [ ] Replace `YOUR_EMAIL_HERE` in contact form with real email
- [ ] Add Spotify/SoundCloud embeds
- [ ] Add YouTube video embeds
- [ ] Set up custom domain
- [ ] Add Clarity tracking ID
- [ ] Deploy to Cloudflare Pages

## Deployment

Deploy to Cloudflare Pages connected to this repo, or:

```bash
npx wrangler pages deploy . --project-name=miakulin
```
