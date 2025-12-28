import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
    title?: string;
    description?: string;
    canonical?: string;
    image?: string;
}

const DEFAULT_TITLE = 'PictureMe.Now | AI Photo Booth & Creative Studio';
const DEFAULT_DESCRIPTION = 'Create stunning AI-powered photos and videos in seconds. The ultimate creative platform for individual creators and businesses.';
const DEFAULT_IMAGE = 'https://pictureme.now/og-image.png';

export const SEO = ({
    title,
    description = DEFAULT_DESCRIPTION,
    canonical,
    image = DEFAULT_IMAGE
}: SEOProps) => {
    const location = useLocation();
    const fullTitle = title ? `${title} | PictureMe.Now` : DEFAULT_TITLE;

    useEffect(() => {
        // Update Title
        document.title = fullTitle;

        // Update Meta Description
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.setAttribute('name', 'description');
            document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', description);

        // Update Open Graph Meta
        const updateMeta = (property: string, content: string) => {
            let meta = document.querySelector(`meta[property="${property}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('property', property);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        };

        updateMeta('og:title', fullTitle);
        updateMeta('og:description', description);
        updateMeta('og:image', image);
        updateMeta('og:url', window.location.origin + location.pathname);
        updateMeta('og:type', 'website');

        // Update Twitter Meta
        const updateTwitterMeta = (name: string, content: string) => {
            let meta = document.querySelector(`meta[name="${name}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('name', name);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        };

        updateTwitterMeta('twitter:card', 'summary_large_image');
        updateTwitterMeta('twitter:title', fullTitle);
        updateTwitterMeta('twitter:description', description);
        updateTwitterMeta('twitter:image', image);

    }, [fullTitle, description, image, location.pathname]);

    return null;
};
