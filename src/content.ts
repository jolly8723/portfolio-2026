export const NAME = 'Rahul Ranjan';

export interface Social {
  id: string;
  label: string;
  icon: string;
  /** CSS colour (usually a theme token) for the icon glyph. */
  color: string;
}

export const DOC_LINKS: Social[] = [
  { id: 'resume', label: 'Résumé', icon: '/assets/icons/file-minus.svg', color: 'var(--icon-doc)' },
  { id: 'email', label: 'Email', icon: '/assets/icons/envelope.svg', color: 'var(--icon-doc)' },
];

export const SOCIAL_LINKS: Social[] = [
  { id: 'github', label: 'GitHub', icon: '/assets/icons/github.svg', color: 'var(--icon-github)' },
  { id: 'linkedin', label: 'LinkedIn', icon: '/assets/icons/linkedin.svg', color: 'var(--icon-linkedin)' },
  { id: 'x', label: 'X', icon: '/assets/icons/x.svg', color: 'var(--icon-x)' },
  { id: 'spotify', label: 'Spotify', icon: '/assets/icons/spotify.svg', color: 'var(--icon-spotify)' },
];

export interface Role {
  title: string;
  company: string;
  period: string;
  /** Either one logo, or per-colour-scheme variants that crossfade on theme change. */
  logo: string | { light: string; dark: string };
}

export const EXPERIENCE: Role[] = [
  {
    title: 'Founding Designer',
    company: 'Gödel Earth',
    period: 'July’26 - Present',
    logo: { light: '/assets/logos/godel-light.svg', dark: '/assets/logos/godel-dark.svg' },
  },
  { title: 'Design Intern', company: 'Alt.Inc', period: 'July’26 - Present', logo: '/assets/logos/alt.png' },
  { title: 'Product Design Intern', company: 'CheQ', period: 'July’26 - Present', logo: '/assets/logos/cheq.png' },
  { title: 'Product Design Intern', company: 'Graphy', period: 'July’26 - Present', logo: '/assets/logos/graphy.png' },
  {
    title: 'Product and Motion Design Intern',
    company: 'Matiks',
    period: 'July’26 - Present',
    logo: '/assets/logos/matiks.png',
  },
];

export interface Project {
  title: string;
  image?: string;
}

export const WORK: Project[] = [
  { title: 'Manual → Digital Ticketing Solution', image: '/assets/work/ticketing.png' },
  { title: 'Telegram Communities', image: '/assets/work/godel.png' },
  { title: 'Gödel Earth Visual Identity', image: '/assets/work/godel.png' },
  { title: 'Dhandha AI', image: '/assets/work/dhandha.png' },
];

export const EXPERIMENTS: Project[] = [{ title: 'Asciiflux' }, { title: 'Pick a gift' }, { title: 'Pick a level' }];
