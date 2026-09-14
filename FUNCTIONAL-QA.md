# Final destination configuration

- Main and footer DRINKS link to `#signature-drinks`.
- STORY links to `#brand-statement`; STORES links to `#find-your-chadoo`.
- MENU has no supplied page or menu file. Its existing inactive state is retained.
- For each location button in `index.html`, populate `data-stores-url` and
  `data-order-url` with approved URLs to enable VIEW STORES and ORDER NOW.
- Main ORDER NOW retains its placeholder until an ordering destination is supplied.
- Replace the footer's disabled INSTAGRAM label with a link when the official URL is supplied.

## Favicon

No standalone CHADOO leaf/logo or favicon exists in this repository; branding is
embedded in the campaign photographs. Do not invent or redraw it. When the approved
logo is supplied, export a favicon to `public/images/chadoo-favicon.png` and replace
the existing empty icon link in `index.html` with:

```html
<link rel="icon" type="image/png" href="/images/chadoo-favicon.png" />
```

## Assets

Below-fold imagery already uses lazy loading and asynchronous decoding. Existing
cup PNG transparency, lossless ingredient WebP images, final storefront/lifestyle
JPGs, and scrub-optimized Hero media are preserved. Unreferenced originals are not
loaded by the page. No extra image compression or video re-encoding is applied.
