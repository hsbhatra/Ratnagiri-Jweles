# Research: two customers, one last piece

*Prepared 2026-10-26 for Module 4 (Cart) / Module 5 (Checkout). To be discussed and decided when Module 4 starts.*

## The problem

Stock = 1. Asha and Ben both have the ring in their cart and both press **Pay** within the same
second. If the shop only checks "is stock > 0?" and subtracts later, both checks pass, both pay,
and we've sold a piece we don't have (stock becomes −1). Then someone gets an apology and a refund.

For a handmade jewellery shop this matters more than for a big store: many pieces are one-of-a-kind,
so "stock = 1" is the normal case, not the rare one.

## How others handle it

| Who | What they do | Lesson |
|---|---|---|
| **Shopify** (engineering blog) | Stock is **not** held while items sit in a cart. It is **reserved for a few minutes when payment starts**, and only permanently deducted when payment succeeds. Reservation and deduction happen in one database transaction, so two buyers can't both take the last unit. | Hold stock at checkout, not in the cart; make the "take one" step atomic. |
| **Shopify merchants** (community thread) | With an *external* payment page, Shopify only checks stock before redirecting and deducts after payment returns — two simultaneous buyers both succeeded and stock went to −1. | The moment you check stock and the moment you take it must be the same step. A check followed later by a decrement is the bug. |
| **Big marketplaces** (system-design write-ups; Amazon/Flipkart internals are not public) | Commonly described pattern: a time-limited **reservation** (often ~10–15 min) while the customer pays; it becomes an order on success and is **released automatically** on failure or timeout. If something still goes wrong after payment, a **refund** is issued automatically (the "compensating action"). | Reservations need an expiry and an automatic release, plus a refund path for the rare leftover case. |
| **Razorpay** (docs) | A payment can be **authorized** (bank approved) before it is **captured** (money taken). With *manual capture*, a merchant captures only when ready; anything not captured within the set window (12 min – 3 days) is **refunded automatically**. | We can take the customer's money only after we've confirmed the piece is really theirs — and Razorpay refunds automatically otherwise. |

## Who gets the piece?

**Whoever reaches "Pay" first** — the first person to successfully reserve it. Not whoever added it
to their cart first (carts are wish lists; people leave items there for weeks), and not whoever's
bank happens to answer first. It's simple, fair, and easy to explain:

> "Someone is checking out this piece right now. If they don't finish within 15 minutes it comes
> back — we'll show it as available again."

## Proposed approach for RatnaGiri Jewels (free tools only)

1. **Cart (Module 4):** no stock is held. The cart always shows live stock and price; if a piece
   sells out, the cart says so before checkout.
2. **Press Pay (Module 5):** in **one atomic MongoDB operation** we subtract the quantity *only if
   enough is left* (`stock ≥ qty`, then `stock − qty`). If two people press Pay together, the database
   lets exactly one through; the other immediately sees "Just sold out / being checked out".
   A **reservation** record (order id, items, expires in 15 min) is created at the same time.
   *Tool: MongoDB Atlas (free) — atomic updates and multi-document transactions are included.*
3. **Payment succeeds** (confirmed by Razorpay's webhook, server-to-server): the reservation becomes a
   confirmed order and we **capture** the payment.
4. **Payment fails, or the customer walks away:** after 15 minutes the reservation expires and the
   stock is added back automatically. A small cleanup runs every minute on the server (kept awake by
   UptimeRobot) and also before every stock check, so a sleeping server can't strand stock.
   *Tools: plain Node timer + MongoDB; UptimeRobot (free).*
5. **Safety net — paid but too late** (e.g. bank confirmed after the 15 minutes and the piece is gone):
   with Razorpay **manual capture**, we simply don't capture → Razorpay refunds automatically, and the
   customer gets a clear email. No money is ever kept for a piece we can't deliver.
   *Tool: Razorpay capture settings (free feature of the account).*
6. **Made-to-order pieces** skip all of this — they can't run out.
7. **Admin view:** reserved quantities shown separately ("2 in stock, 1 being checked out").

## Open questions for when we start Module 4

- Reservation length: 10, 15 or 20 minutes? (International cards with 3-D Secure can take a while.)
- Should a customer be able to hold more than one of a one-of-a-kind piece? (Probably quantity max = stock.)
- Message wording when someone else is checking out the last piece.

## Sources

- Shopify Engineering — Scaling inventory reservations: https://shopify.engineering/scaling-inventory-reservations
- Shopify Community — Oversold inventory, two customers at the same time: https://community.shopify.com/t/oversold-inventory-2-customers-buy-at-the-same-time/128392
- Level Up Coding — flash-sale checkout patterns (illustrative, not Amazon internals): https://levelup.gitconnected.com/amazon-1-million-users-clicked-checkout-at-once-the-real-problem-wasnt-scaling-f7956a102f9c
- Razorpay — Payment capture settings: https://razorpay.com/docs/payments/payment-gateway/rainy-day/capture-settings/
- MongoDB inventory reservation pattern (OneUptime): https://oneuptime.com/blog/post/2026-03-31-mongodb-shopping-cart-inventory-reservation/view
