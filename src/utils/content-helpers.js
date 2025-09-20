import { getCollection } from 'astro:content';

export async function getEnhancedPosts() {
  const posts = await getCollection('blog');
  
  // Render all posts to get enhanced frontmatter
  const enhancedPosts = await Promise.all(
    posts.map(async (post) => {
      const { remarkPluginFrontmatter } = await post.render();
      return {
        ...post,
        ...remarkPluginFrontmatter,
        // Merge data with enhanced frontmatter
        data: {
          ...post.data,
          ...remarkPluginFrontmatter
        }
      };
    })
  );
  
  return enhancedPosts;
}

export async function getPostsByContentType(contentType) {
  const posts = await getEnhancedPosts();
  return posts.filter(post => post.contentType === contentType);
}

export async function getPostsByYear(year) {
  const posts = await getEnhancedPosts();
  return posts.filter(post => post.pubYear === year);
}

export async function getComplexPosts(minComplexity = 20) {
  const posts = await getEnhancedPosts();
  return posts.filter(post => post.complexity?.score >= minComplexity);
}

export async function getFeaturedPosts() {
  const posts = await getEnhancedPosts();
  return posts.filter(post => post.data.featured);
}

export async function getPostStats() {
  const posts = await getEnhancedPosts();
  
  const stats = {
    total: posts.length,
    totalWords: posts.reduce((sum, post) => sum + (post.wordCount || 0), 0),
    avgReadingTime: Math.round(posts.reduce((sum, post) => sum + (post.readingTime || 0), 0) / posts.length),
    contentTypes: {},
    yearlyBreakdown: {},
    complexityDistribution: {
      simple: 0,
      medium: 0,
      complex: 0
    }
  };
  
  posts.forEach(post => {
    // Content type stats
    const type = post.contentType || 'article';
    stats.contentTypes[type] = (stats.contentTypes[type] || 0) + 1;
    
    // Yearly stats
    const year = post.pubYear;
    if (year) {
      stats.yearlyBreakdown[year] = (stats.yearlyBreakdown[year] || 0) + 1;
    }
    
    // Complexity stats
    const complexity = post.complexity?.score || 0;
    if (complexity < 10) stats.complexityDistribution.simple++;
    else if (complexity < 25) stats.complexityDistribution.medium++;
    else stats.complexityDistribution.complex++;
  });
  
  return stats;
}
