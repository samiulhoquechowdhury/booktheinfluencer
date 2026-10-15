export const NAV_LINKS = [
  { href: '/talent', label: 'Talent' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/corporate', label: 'Corporate' },
  { href: '/about', label: 'About' },
] as const;

export const FOOTER_LINKS = [
  {
    title: 'Discover',
    links: [
      { href: '/talent/singers', label: 'Singers' },
      { href: '/talent/djs', label: 'DJs' },
      { href: '/talent/comedians', label: 'Comedians' },
      { href: '/talent/speakers', label: 'Speakers & anchors' },
      { href: '/talent/creators', label: 'Creators' },
    ],
  },
  {
    title: 'Cities',
    links: [
      { href: '/guwahati/singers', label: 'Guwahati' },
      { href: '/kolkata/djs', label: 'Kolkata' },
      { href: '/mumbai/comedians', label: 'Mumbai' },
      { href: '/bengaluru/speakers', label: 'Bengaluru' },
      { href: '/delhi/creators', label: 'Delhi' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/how-it-works', label: 'How it works' },
      { href: '/corporate', label: 'Corporate' },
      { href: '/about', label: 'About' },
      { href: '/faq', label: 'FAQ' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/legal/terms', label: 'Terms' },
      { href: '/legal/privacy', label: 'Privacy' },
      { href: '/legal/cancellation', label: 'Cancellation & refunds' },
    ],
  },
] as const;
