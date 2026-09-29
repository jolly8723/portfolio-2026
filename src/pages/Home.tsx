import type { ReactNode } from 'react';
import { DitherFill } from '../fx/DitherFill';
import { MaskIcon } from '../components/MaskIcon';
import { Polaroid } from '../components/Polaroid';
import { DOC_LINKS, EXPERIENCE, EXPERIMENTS, NAME, SOCIAL_LINKS, WORK, type Role, type Social } from '../content';
import { reveal } from '../reveal';
import styles from './Home.module.css';

/*
 * Case studies and links are intentionally static for now — hover states only.
 * The polaroids are interactive (shake to develop).
 */

function IconChip({ item }: { item: Social }) {
  return (
    <span className={styles.iconChip} title={item.label} aria-label={item.label} role="img">
      <MaskIcon src={item.icon} color={item.color} />
    </span>
  );
}

function Header() {
  return (
    <header className={styles.header}>
      <p className={styles.nameChip} {...reveal(0)}>
        {NAME}
      </p>
      <div className={styles.links}>
        <div className={styles.linkGroup} {...reveal(1)}>
          {DOC_LINKS.map((l) => (
            <IconChip key={l.id} item={l} />
          ))}
        </div>
        <div className={styles.linkGroup} {...reveal(2)}>
          {SOCIAL_LINKS.map((l) => (
            <IconChip key={l.id} item={l} />
          ))}
        </div>
      </div>
    </header>
  );
}

function Intro() {
  const lines: ReactNode[] = [
    <>A Product designer from Delhi, India.</>,
    <>I am about to graduate with a degree in Geophysics from IIT Roorkee.</>,
    <>
      I have been building products and visual identities since 2023, both as an intern and a freelance product and
      interaction designer.
    </>,
    <>I’ve been dabbling with AI since the past 4 months and I have never looked back at a Figma-native process since.</>,
    <>
      I have not had much impactful projects to work on, considering I’ve been mostly an intern till one internship ago.
      But I would like to change that. So, if you think my skills might be of good use to you,{' '}
      <span className={styles.inlineLink}>hit me up :3</span> !
    </>,
  ];
  return (
    <ul className={styles.bullets}>
      {lines.map((line, i) => (
        <li key={i} {...reveal(3 + i)}>
          {line}
        </li>
      ))}
    </ul>
  );
}

function Section({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle} {...reveal(0)}>
          {title}
        </h2>
        <p {...reveal(1)}>{description}</p>
      </div>
      {children}
    </section>
  );
}

function Logo({ logo }: { logo: Role['logo'] }) {
  if (typeof logo === 'string') {
    return (
      <span className={styles.logo}>
        <img src={logo} alt="" width={36} height={36} />
      </span>
    );
  }
  return (
    <span className={styles.logo}>
      <img src={logo.light} alt="" width={36} height={36} data-scheme-only="light" />
      <img src={logo.dark} alt="" width={36} height={36} data-scheme-only="dark" />
    </span>
  );
}

function Experience() {
  return (
    <Section title="Experience" description="I have worked across the board - from visual identity to product thinking.">
      <div className={styles.roles}>
        {EXPERIENCE.map((role, i) => (
          <div key={role.company} className={styles.role} {...reveal(2 + i)}>
            <div className={styles.roleMain}>
              <Logo logo={role.logo} />
              <div className={styles.roleText}>
                <p className={styles.roleTitle}>{role.title}</p>
                <p className={styles.small}>{role.company}</p>
              </div>
            </div>
            <p className={`${styles.small} ${styles.period}`}>{role.period}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Work() {
  return (
    <Section title="Work" description="Some shipped, some unshipped, some personal projects.">
      <div className={styles.workGrid}>
        {WORK.map((p, i) => (
          <article key={p.title} className={styles.workCard} {...reveal(2 + i)}>
            <div className={styles.workImage}>
              {p.image && <img src={p.image} alt="" loading="lazy" decoding="async" />}
            </div>
            <p className={styles.cardTitle}>{p.title}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function Experiments() {
  return (
    <Section title="Experiments" description="Visual and motion experiments.">
      <div className={styles.experimentRow}>
        {EXPERIMENTS.map((p, i) => (
          <article key={p.title} className={styles.experimentCard} {...reveal(2 + i)}>
            <div className={styles.experimentThumb} />
            <p className={styles.cardTitle}>{p.title}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function HireMe() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle} {...reveal(0)}>
          Why you should hire me...
        </h2>
        <div className={styles.prose}>
          <p {...reveal(1)}>
            I like to watch and perform standup comedy. Haven’t published anything yet, but let me know if you want to
            watch me perform. Make sure you laugh once I perform, which is a bigger task than me getting hired.
          </p>
          <p {...reveal(2)}>
            And I love to think and discuss. I am clear with my thoughts and words. I think in systems.
          </p>
          <div {...reveal(3)}>
            <p>Other than that, I like -</p>
            <ul className={styles.bullets}>
              <li>Working with remote teams</li>
              <li>Art, Podcasts, films, anime, music (I take immense pride in my watchlists and playlists)</li>
            </ul>
          </div>
        </div>
      </div>
      <Polaroids />
    </section>
  );
}

/** Positions are the unrotated boxes derived from the Figma frame (content box = 590px wide). */
const POLAROIDS = [
  { left: 22.3, top: 9.9, rotate: -4.64, src: '/assets/polaroids/p1.jpg', alt: 'A string-lit alley at night' },
  { left: 287, top: 9.9, rotate: 4.45, src: '/assets/polaroids/p3.jpg', alt: 'Someone standing under a waterfall rainbow' },
  { left: -175.3, top: 56, rotate: 3.48, src: '/assets/polaroids/p2.jpg', alt: 'A red scarf draped on an antler' },
  { left: 494.8, top: 56, rotate: 0, src: '/assets/polaroids/p4.jpg', alt: 'A fjord seen from a cliff' },
];

function Polaroids() {
  return (
    <div className={styles.polaroids}>
      <div className={styles.polaroidStage}>
        {POLAROIDS.map((p, i) => (
          <Polaroid
            key={p.src}
            src={p.src}
            alt={p.alt}
            rotate={p.rotate}
            index={i}
            style={{ left: p.left, top: p.top }}
          />
        ))}
        <p className={styles.shakeChip} {...reveal(4)}>
          Shake to reveal
        </p>
      </div>
    </div>
  );
}

function Contact() {
  return (
    <section className={styles.contact} {...reveal(0)}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Ight, let’s talk!</h2>
        <p>If I have managed to impress/convince/humour you, just shoot me a mail. </p>
      </div>
      <span className={styles.copyMail}>
        <DitherFill />
        <span className={styles.copyMailLabel}>Copy Mail</span>
      </span>
    </section>
  );
}

export function Home() {
  return (
    <main className={styles.panel}>
      <div className={styles.glassNoise} aria-hidden="true" />
      <Header />
      <div className={styles.body}>
        <div className={styles.upper}>
          <div className={styles.stack32}>
            <Intro />
            <Experience />
            <Work />
            <Experiments />
          </div>
          <HireMe />
        </div>
        <Contact />
      </div>
    </main>
  );
}
