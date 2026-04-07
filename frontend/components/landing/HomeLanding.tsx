'use client';

import { useRouter } from 'next/navigation';
import styles from './HomeLanding.module.css';

const STEPS: readonly { label: string; text: string }[] = [
  {
    label: 'Estimate',
    text: 'Get an estimate based on real DVF transaction data from your area.',
  },
  {
    label: 'Get matched',
    text: 'Your property is matched with qualified buyers — no public listing needed.',
  },
  {
    label: 'Sell discreetly',
    text: 'An agent coordinates the transaction. No spam, no unnecessary visits.',
  },
];

export default function HomeLanding() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-heading">
        <h1 id="hero-heading" className={styles.headline}>
          Find a buyer before your property goes public
        </h1>
        <p className={styles.subtitle}>
          OffMarket connects serious sellers with qualified buyers — before the property ever hits
          the market.
        </p>
        <p className={styles.badge} role="status">
          <span aria-hidden>🔵</span>{' '}
          <span>11 buyers are actively looking in Toulon this month</span>
        </p>
        <div className={styles.heroCtas}>
          <button
            type="button"
            className={styles.primaryCta}
            onClick={() => router.push('/getEstimates')}
          >
            Estimate my property
          </button>
          <button
            type="button"
            className={styles.secondaryCta}
            onClick={() => router.push('/buyerSearch')}
          >
            I&apos;m looking to buy
          </button>
        </div>
      </section>

      <section className={styles.steps} aria-labelledby="steps-heading">
        <h2 id="steps-heading" className={styles.visuallyHidden}>
          Three steps
        </h2>
        <ol className={styles.stepList}>
          {STEPS.map((step, index) => (
            <li key={step.label} className={styles.stepCard}>
              <div className={styles.stepNumber}>{index + 1}</div>
              <h3 className={styles.stepLabel}>{step.label}</h3>
              <p className={styles.stepText}>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.audienceBlocks}>
        <section className={styles.block} aria-labelledby="seller-heading">
          <h2 id="seller-heading" className={styles.blockTitle}>
            Sell without going public
          </h2>
          <ul className={styles.pointList}>
            <li>
              <strong>Discretion</strong> — no public listing, no unsolicited calls
            </li>
            <li>
              <strong>Qualified buyers</strong> — AI-matched on your criteria
            </li>
            <li>
              <strong>Speed</strong> — off-market buyers are serious with defined projects
            </li>
          </ul>
          <button
            type="button"
            className={styles.blockCta}
            onClick={() => router.push('/getEstimates')}
          >
            Get my free estimate
          </button>
        </section>

        <section className={styles.block} aria-labelledby="buyer-heading">
          <h2 id="buyer-heading" className={styles.blockTitle}>
            Access properties before anyone else
          </h2>
          <ul className={styles.pointList}>
            <li>
              <strong>Exclusivity</strong> — properties that have never been publicly listed
            </li>
            <li>
              <strong>Matching</strong> — custom alerts based on your criteria
            </li>
            <li>
              <strong>Zero competition</strong> — no bidding wars, no last-minute overbids
            </li>
          </ul>
          <button
            type="button"
            className={styles.blockCta}
            onClick={() => router.push('/buyerSearch')}
          >
            See available properties
          </button>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerPlaceholder} title="Coming soon">
            Legal mentions
          </span>
          <span className={styles.footerSep} aria-hidden>
            |
          </span>
          <span className={styles.footerPlaceholder} title="Coming soon">
            Contact
          </span>
          <span className={styles.footerSep} aria-hidden>
            |
          </span>
          <span>© OffMarket 2026</span>
        </div>
      </footer>
    </div>
  );
}
