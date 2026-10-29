import type { City, Domain } from "./types";

export const UNLOCK_TARGET = 100;

export const CITIES: City[] = [
  {
    slug: "delhi",
    name: "Delhi",
    blurb: "Delhi and the wider capital region.",
  },
  { slug: "noida", name: "Noida", blurb: "Noida and Greater Noida." },
  {
    slug: "gurugram",
    name: "Gurugram",
    blurb: "Gurugram and nearby business districts.",
  },
  {
    slug: "mumbai",
    name: "Mumbai",
    blurb: "Mumbai and the metropolitan region.",
  },
  { slug: "pune", name: "Pune", blurb: "Pune and Pimpri-Chinchwad." },
  {
    slug: "bangalore",
    name: "Bangalore",
    blurb: "Bangalore and its tech corridors.",
  },
  {
    slug: "hyderabad",
    name: "Hyderabad",
    blurb: "Hyderabad and Secunderabad.",
  },
  {
    slug: "chennai",
    name: "Chennai",
    blurb: "Chennai and the surrounding region.",
  },
];

export const DOMAINS: Domain[] = [
  {
    slug: "angel-investors",
    name: "Angel Investors",
    description:
      "Early-stage investors sharing deal flow, learnings and introductions.",
  },
  {
    slug: "vc",
    name: "VC",
    description: "Venture capital professionals and fund teams in your city.",
  },
  {
    slug: "startup-founders",
    name: "Startup Founders",
    description: "Founders and co-founders building companies locally.",
  },
  {
    slug: "coders",
    name: "Coders",
    description:
      "Software engineers and developers sharing code, tips and roles.",
  },
  {
    slug: "product-managers",
    name: "Product Managers",
    description:
      "Product people trading playbooks, questions and opportunities.",
  },
  {
    slug: "recruiters-hr",
    name: "Recruiters and HR",
    description:
      "Talent teams and recruiters connecting with local candidates.",
  },
  {
    slug: "sales-business-development",
    name: "Sales and Business Development",
    description:
      "Sales leaders and BD professionals sharing leads and tactics.",
  },
  {
    slug: "creators-influencers",
    name: "Creators and Influencers",
    description:
      "Content creators and influencers looking for brand opportunities.",
  },
  {
    slug: "residential-real-estate-builders",
    name: "Residential Real Estate Builders",
    description: "Builders, developers and brokers in residential real estate.",
  },
  {
    slug: "commercial-real-estate-builders",
    name: "Commercial Real Estate Builders",
    description: "Builders, developers and advisors in commercial real estate.",
  },
];
