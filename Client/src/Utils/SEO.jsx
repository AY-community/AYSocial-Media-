import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title, 
  description, 
  name = "AYSocial", 
  type = "website", 
  image, 
  url, 
  noIndex = false 
}) => {
  const siteTitle = title ? `${title} | ${name}` : name;
  const siteDescription = description ;
  const siteImage = image ;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={url || window.location.href} />

      {/* Open Graph / Facebook (Essential for WhatsApp/FB previews) */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:image" content={siteImage} />
      <meta property="og:url" content={url || window.location.href} />

      {/* Twitter Tags */}
      <meta name="twitter:creator" content="@YourTwitterHandle" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      <meta name="twitter:image" content={siteImage} />
    </Helmet>
  );
};

export default SEO;