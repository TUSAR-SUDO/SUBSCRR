export type PostCategory = "Mindset" | "Psychology" | "Audits" | "How-To" | "Trials";

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO
  readMinutes: number;
  category: PostCategory;
  tags: string[];
  accent: string; // hex used for the card chip / highlights
  image: string; // /assets/blog/* hero image  image: string; // /assets/blog/* hero image
  imageAlt: string;
  featured?: boolean;
  body: string; // markdown-lite: ##, ###, **, -, >, `code`
}

export const CATEGORIES: PostCategory[] = ["Mindset", "Psychology", "Audits", "How-To", "Trials"];

export const posts: Post[] = [
  {
    slug: "the-200-wakeup-call",
    title: "The $200 Wake-Up Call: What We Found When We Audited Ourselves",
    excerpt:
      "We asked the whole team to screenshot their subscriptions and add them up. The average was $214 a month. Nobody guessed within $50 of their real number.",
    date: "2026-09-08",
    readMinutes: 6,
    category: "Mindset",
    tags: ["audit", "money habits", "true cost"],
    accent: "#FF2500",
    featured: true,
    image: "/assets/blog/wakeup-call.jpg",
    imageAlt: "Calculator, receipts and a pen — a personal subscription audit in progress",
    body: `Last month we did an experiment inside the team. Everyone opened their App Store subscriptions page, took a screenshot, and wrote down two numbers: what they *thought* they spent on subscriptions monthly, and what the screen said.

The gap was brutal.

## The numbers

Out of eleven people, the average guess was **$118 a month**. The average reality was **$214**. The closest person was off by $23. The furthest was off by $171 — she'd forgotten a meditation app, two streaming services, a cloud storage tier she upgraded during a launch, and a "free" trial that had been charging $14.99 for eight months.

Nobody was reckless. That's what made it interesting. Everyone we work with is financially literate. They budget. They know their rent to the dollar. Subscriptions are different because they're **invisible by design**: small, spread out across cards and app stores, and charged on cycles that never line up.

## Why the number is always worse than you think

Three forces stack against you:

- **Anchor drift.** You remember what you signed up to pay, not what you pay now. That "cheap" plan you upgraded twice? Your brain is still anchored to the launch price.
- **Cycle blindness.** An annual plan billed in March doesn't feel like it competes with the $12.99 you saw on Tuesday. Your mental model counts *recent charges*, not *recurring ones*.
- **The rounding effect.** $4.99 doesn't feel like money. It feels like a rounding error. But twelve rounding errors is a car payment.

## The honest math

Here's the exercise that started Subscrr: take your monthly total, divide by 30, and ask if you'd pay that amount **in cash, every single morning, for the same stuff**. $214 a month is $7.13 a day. Framed as a morning cash ritual, most people immediately cut three services.

The point isn't that subscriptions are bad. Two of the services on that list survived everyone's audit without debate — they're genuinely loved. The point is that the *default* is drift, and drift only moves in one direction.

## Do this today

1. Screenshot your App Store (and Google Play) subscriptions page.
2. Add up every charge, converting annual plans to monthly (divide by 12).
3. Cancel anything you haven't opened in 30 days. Don't decide later — the later you is the one who subscribed to most of this.

Or let Subscrr do it: the app turns that screenshot into a live ledger with the honest per-day number, and nudges you the day before anything renews.`,
  },
  {
    slug: "psychology-of-small-recurring-charges",
    title: "The Psychology of Small Recurring Charges",
    excerpt:
      "Why $4.99 feels free and $59.90 feels expensive — even though they're the same money. The mental quirks subscription businesses quietly exploit.",
    date: "2026-08-26",
    readMinutes: 7,
    category: "Psychology",
    tags: ["behavioral economics", "pricing", "habits"],
    accent: "#4C63C7",
    image: "/assets/blog/psychology.jpg",
    imageAlt: "Card tapping on a payment terminal — the moment a small charge feels free",
    body: `There's a reason almost every subscription is priced at $4.99, $9.99, or $14.99 and almost none at $58. The pricing isn't about the value of the service. It's about the *feel* of the charge.

## The pain-of-paying, on a dimmer

Behavioral economists call it the **pain of paying**: the little flinch you get when money leaves. Research going back decades shows the flinch scales with attention, not just amount. A charge you *see* hurts more than a charge you don't. Subscription businesses aren't evil — they've just learned to keep the lights low.

Three dimmer switches matter here:

- **Frequency.** $60 once a year flinches. $5 a month doesn't. Same money, twelve times less pain. Your subscription stack is full of services priced exactly where the flinch disappears.
- **Preparation.** A bill you expect hurts less than one that surprises you — but only if you actually expected it. Renewal dates you can't recall are permanent surprises.
- **Separation.** Every service on a different day of the month, on a different card, in a different currency. Separation is fragmentation, and fragmented spending is un-auditable by humans.

## Why you keep services you don't use

The sunk cost fallacy gets blamed for this, but the real culprit is usually **identity**. The language app isn't a subscription; it's "the kind of person who's learning Spanish." Cancelling feels like cancelling a plan to be that person. So it stays. Months pass. The charge becomes a fee for keeping the intention alive.

There's also **the cancellation maze** — hold music, retention offers, five clicks and a guilt trip. Companies know the maze doesn't stop everyone. It stops *enough*.

## What actually works

You can't willpower your way out of an architecture designed to be invisible. You change the architecture:

- **Aggregate first.** Everything in one list, one monthly number, one per-day figure. Attention is the whole game.
- **Make renewals loud.** A charge you're warned about the day before is a choice. A charge you discover is a leak.
- **Re-frame annually.** Multiply each monthly price by 12 before you decide anything. $7.99 is a coffee; $95.88 is a flight.

Subscrr does all three because they're the only three things that work. The app can't make your decisions for you — but it can make sure every decision is made with the lights on.`,
  },
  {
    slug: "12-subscriptions-you-forgot-you-pay-for",
    title: "12 Subscriptions You Probably Forgot You're Paying For",
    excerpt:
      "Cloud storage tiers, 'free' trials that graduated, duplicate streaming apps, and the gym you haven't visited since winter. The usual suspects, ranked.",
    date: "2026-08-12",
    readMinutes: 5,
    category: "Audits",
    tags: ["checklist", "cancel list", "cloud storage"],
    accent: "#0F7B6C",
    image: "/assets/blog/forgotten-subs.jpg",
    imageAlt: "Laptop and credit card in hand — reviewing online charges line by line",
    body: `Every subscription audit we've seen turns up the same cast of characters. If your monthly total feels higher than it should be, check these twelve before anything else — ordered by how often they turn up.

## The usual suspects

1. **Cloud storage creep.** You started on free, hit the 5GB wall, upgraded to the smallest tier. Then photos grew. Now you're two tiers deep at $9.99/mo and haven't cleared space since 2023.
2. **The graduated trial.** Signed up for a "free" trial, forgot to cancel, and the full price has been running quietly for months. Check the *start date* on every charge — anything older than 90 days that you never chose to pay is a prime suspect.
3. **Duplicate streamers.** Two music apps. Three video apps with one show each. If you can't name what you watched on each one last month, you have your answer.
4. **The gym, or the app-shaped gym.** Winter membership, summer guilt.
5. **App-store subscriptions hiding behind web ones.** You subscribed on the website *and* in the app at some point during a pricing change. Both survived.
6. **Domain and email renewals.** Annual, small, easy to forget: $12 here, $6 there. You're paying for a mailbox nobody has emailed in a year.
7. **News paywalls from one article.** You needed the article. You have the subscription. You haven't been back.
8. **Premium delivery memberships.** Worth it if you order weekly. You ordered twice last quarter.
9. **Kids' apps and games.** Small, colorful, renewing forever after a one-week enthusiasm spike.
10. **Insurance add-ons and device protection.** On a phone you're due to replace next month.
11. **The professional tool for the career move you didn't make.** The design suite, the course platform, the job-board Pro. Respect the intention — check the activity.
12. **Charity or org memberships from an event.** Signed up at a conference, renewed silently every year since.

## The 30-day rule

For each of the twelve, ask one question: **have I opened, used, or genuinely benefited from this in the last 30 days?** Not "would I use it someday." The someday-self is who subscribed to most of this list in the first place.

If the answer is no, cancel it today — not at renewal. Every one of these is refundable for exactly zero days after renewal, and most of them don't even send a reminder.

Keep the ones that survive. Add them to Subscrr, set the budget, and let the app warn you the day before anything renews. The next audit takes two minutes instead of an afternoon.`,
  },
  {
    slug: "screenshot-method-apple-subscriptions",
    title: "The Screenshot Method: Audit Every Apple Subscription in 60 Seconds",
    excerpt:
      "Apple puts every charge on one screen. Here's how to turn that screenshot into a complete subscription ledger — dates, amounts, cycles and all.",
    date: "2026-07-29",
    readMinutes: 4,
    category: "How-To",
    tags: ["apple", "ios", "import", "tutorial"],
    accent: "#B45309",
    image: "/assets/blog/screenshot-method.jpg",
    imageAlt: "Hand holding an iPhone — screenshotting the subscriptions screen",
    body: `The hardest part of any subscription audit is data entry. The good news: if you're on iPhone, Apple has already done it for you. Every subscription attached to your Apple ID lives on one screen. The trick is getting it off that screen and into something you can actually manage.

## Step 1 — Find the source of truth

Settings → your name → **Subscriptions**. (On older iOS: Settings → App Store → your profile.) This lists every active and expired subscription billed through Apple: the service, the plan, the price, and the next renewal date.

If you also subscribe to things on the web — a news site, a SaaS tool — grab those separately. The screenshot method covers the Apple-billed universe first.

## Step 2 — Screenshot it

One screenshot usually covers it; two if the list scrolls. Don't tidy it, don't transcribe it. The screenshot *is* the data.

## Step 3 — Drop it into Subscrr

Open Subscrr → **AI Spend** → upload the screenshot. The importer reads the merchant names, amounts, and billing cycles, and files each row as a subscription with the right color and icon. Check the review list, fix anything odd (the reader will flag low-confidence rows), and save.

Sixty seconds, start to finish, for what used to be a spreadsheet afternoon.

## Step 4 — Add the non-Apple stragglers

For anything billed outside the App Store, type it in manually — amount, cycle, currency. Subscrr normalizes everything to monthly and shows the honest total. This is usually where people find their second surprise: the non-Apple half of the stack is often bigger than the Apple half, precisely because no single screen ever showed it.

## Step 5 — Turn on the safety net

With the ledger complete, the last step is making sure it *stays* complete: set your monthly budget, and let the renewal reminders do their quiet work. The day-before nudge is the difference between "I meant to renew" and "what is this $9.99."

That's the whole method. One screenshot, one review, one safety net — and a number you can actually trust.`,
  },
  {
    slug: "free-trials-enjoy-escape",
    title: "Free Trials: How to Enjoy Them and Escape Them",
    excerpt:
      "Trials aren't a trap — they're a loan with a due date. A simple system for testing everything and paying for almost nothing.",
    date: "2026-07-14",
    readMinutes: 6,
    category: "Trials",
    tags: ["free trial", "reminders", "decision rules"],
    accent: "#7A4CC7",
    image: "/assets/blog/free-trials.jpg",
    imageAlt: "Calendar with a marked date — a trial's due date circled",
    body: `Free trials get blamed for a lot of subscription debt, but the trial itself isn't the villain. The villain is the **unmarked due date**. Trials are a loan: the service fronts you seven or thirty days, and the interest rate is the full monthly price, charged automatically the day you forget.

Treat it like a loan and it becomes harmless — even fun. Here's the system.

## Rule 1: The calendar rule

The moment you start a trial, the end date gets a reminder. Not a mental note, not "I'll remember" — an actual alert. Subscrr does this automatically: add the trial with its end date, and it warns you **before** conversion, the day the decision is due.

## Rule 2: The two-sessions rule

Decide in advance to judge a service after **two real sessions**, not "some point this week." Two sessions is enough for almost everything: a video platform, a fitness app, a design tool. If it hasn't earned a third session, it hasn't earned your card. Naming the rule *before* you start removes the negotiation your future self will try to have.

## Rule 3: The card-is-hot rule

Know exactly where the charge will land. A trial on your main card with alerts on is a controlled experiment. A trial on a card you don't check is a leap of faith. If a service demands a card you never use, that's a feature of the maze — navigate it consciously.

## Rule 4: The cancel-sooner exploit

Here's the trick most people miss: **cancelling a trial does not end the trial.** On essentially every major service, you can cancel on day two and keep full access until the original end date. Cancel-first-then-evaluate is strictly better than remember-to-cancel-later: you get the same free month with zero risk of the $14.99 graduation.

## Rule 5: The one-trial rule

One trial at a time, per category. Three streaming trials in one month guarantees you'll evaluate none of them and pay for at least one. Serial, not parallel.

## The mindset shift

With the system in place, trials flip from threat to tool. You can try *everything* — the app you're curious about, the premium tier, the new service everyone's discussing — because the escape hatch is pre-built. The decision happens on your calendar, not on a credit card statement.

Add the trial to Subscrr, mark the end date, get the nudge, decide. Enjoy the loan. Never pay the interest.`,
  },
  {
    slug: "the-per-day-trick",
    title: "The Per-Day Trick: The Only Price Tag That Tells the Truth",
    excerpt:
      "Monthly prices hide decisions. Annual prices hide magnitude. Per-day prices — what it costs you every single morning — make both impossible to ignore.",
    date: "2026-06-30",
    readMinutes: 5,
    category: "Mindset",
    tags: ["per-day", "framing", "true cost"],
    accent: "#FF2500",
    image: "/assets/blog/per-day-trick.jpg",
    imageAlt: "Morning coffee on a table — the daily cost of a subscription made visible",
    body: `Every price has a frame, and the frame decides how it feels. Subscription businesses choose your frames for you: **monthly** to make big things feel small, and **annual** to make it all feel committed. There's a third frame they never offer you, and it's the honest one.

## The three frames

- **Per month** hides magnitude. "$12.99" sounds like a price, not a budget line. Multiply by the size of your stack and the number stops feeling like a price at all.
- **Per year** hides frequency. $95.88 shows up once, hurts once, and vanishes for twelve months. Frequency is what makes habits, and annual framing erases it.
- **Per day** hides nothing. Divide any price by 365 and you get the cost of *waking up and choosing it again* — every single morning.

## Why per-day works

Per-day reframes a subscription as what it actually is: a daily purchase you've pre-authorized forever. Your $12.99 streaming plan is 43 cents a day. Your $9.99 cloud tier is 33 cents. Harmless numbers — until you add the stack. $214 a month is **$7.13 a day**, and $7.13 a day is a lunch you're buying every morning whether you're hungry or not.

The question changes with the frame. Not "is this service worth $12.99?" but "would I hand over 43 cents *in cash* this morning for this?" The cash question is remarkably hard to lie to.

## The stack per-day

The real power move is applying per-day to the **whole stack**, because that number is small enough to check daily and big enough to matter:

| Monthly total | Per day | What that is |
|---|---:|---|
| $50 | $1.64 | a coffee every day |
| $120 | $3.95 | a breakfast every day |
| $214 | $7.13 | lunch out, every day |
| $350 | $11.64 | brunch, daily |

Run your own stack through Subscrr and the app does this math live — monthly, annual, and the honest per-day number, updated the moment anything changes.

## Use it for decisions, not guilt

Per-day isn't an instrument for feeling bad. It's an instrument for **deciding**. Some services pass the cash test easily — they're worth every morning coin. Others fail it instantly, the moment you see them in daily currency. Keep the first kind without guilt. Cancel the second kind without ceremony.

That's the whole trick: one division, one honest question, asked in the frame nobody else will show you.`,
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getRelated(slug: string, limit = 3): Post[] {
  const current = getPost(slug);
  if (!current) return posts.slice(0, limit);
  return [...posts]
    .filter((p) => p.slug !== slug)
    .map((p) => ({
      p,
      score:
        (p.category === current.category ? 2 : 0) +
        p.tags.filter((t) => current.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p);
}
