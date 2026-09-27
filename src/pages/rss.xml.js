import rss from '@astrojs/rss';
import { publishedPosts, urlOf } from '../utils/posts';
import { metaDescription } from '../utils/deck';

export async function GET(context) {
  const posts = await publishedPosts();
  return rss({
    title: 'Hologram Thoughts',
    description: 'Twenty years of writing on consciousness, dharma, fatherhood, code, and the strange edges of culture, by Matthew Williamson.',
    site: context.site,
    xmlns: { atom: 'http://www.w3.org/2005/Atom', dc: 'http://purl.org/dc/elements/1.1/' },
    customData: [
      '<language>en-us</language>',
      '<atom:link href="https://hologramthoughts.com/rss.xml" rel="self" type="application/rss+xml" />',
      `<image><url>https://hologramthoughts.com/icon-512.png</url><title>Hologram Thoughts</title><link>https://hologramthoughts.com/</link></image>`,
    ].join(''),
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: metaDescription(post.data.description, post.body, 300),
      categories: post.data.categories,
      link: urlOf(post),
      customData: '<dc:creator>Matthew Williamson</dc:creator>',
    })),
  });
}
