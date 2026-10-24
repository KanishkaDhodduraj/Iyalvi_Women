# Iyalvi customer storefront

React and TypeScript storefront for the Iyalvi saree and kurti boutique. The storefront uses local product data, browser storage for favourites and cart contents, and a simulated customer session. No backend or payment processor is connected.

## Development

Requires Node 20+ and npm. Run `npm ci`, `npm run dev`, `npm run build`, `npm run lint`, and `npm test`.

`npm run images` creates 480, 960 and 1600 pixel WebP derivatives beside source images under `public/images` only.

## Routes

- `/` Home
- `/sarees` Saree collection
- `/kurtis` Kurti collection
- `/product/:slug` Product details
- `/wishlist` Favourites
- `/checkout` Protected checkout
- `/orders` Protected order list and tracking timeline
- `/account` Protected account details

## Image framing

Product and story images default to `object-position: 50% 0%` so the head and upper body remain visible. Each product supports a `focus` value. Add image-specific focus values in `src/data/assets.ts` when a particular source needs a different crop.

Banner files are discovered from `src/assets/banners/{home,sarees,kurtis}`. Pair files by name with `_Desktop` and `_Mobile` suffixes; a missing mobile file uses the desktop file.

## Content to replace before launch

- Diary customer names and story captions marked with the internal `isDemoName` flag.
- Review names, review text, and the current review portraits.
- Product names, descriptions, prices, availability, and catalogue photos.
- Store contact details in the footer.
- The simulated sign-in and sign-up behavior, which currently stores only name, email, and mobile in local storage.
- The simulated payment flow. It does not send or retain card details.
- Generated order numbers and the local order-tracking timeline.

## Privacy details

Passwords and card fields are held only in component memory and are not written to local storage. The local session stores only the customer's name, email, and mobile number. Order history stores a summary of purchased products and totals.
