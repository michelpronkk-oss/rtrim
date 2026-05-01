import { SeoFaq } from "@/lib/seo-pages";

type FaqJsonLdProps = {
  faqs: SeoFaq[];
};

export function FaqJsonLd({ faqs }: FaqJsonLdProps) {
  const payload = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
