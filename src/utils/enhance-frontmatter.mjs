// Enhanced frontmatter processing plugin
export function remarkEnhanceFrontmatter() {
  return function (tree, file) {
    const frontmatter = file.data.astro.frontmatter;
    
    // Auto-generate excerpt if not provided
    if (!frontmatter.description && file.value) {
      const content = file.value
        .replace(/^---[\s\S]*?---/, '') // Remove frontmatter
        .replace(/#{1,6}\s+/g, '') // Remove markdown headers
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold formatting
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic formatting
        .replace(/`([^`]+)`/g, '$1') // Remove code formatting
        .replace(/\n+/g, ' ') // Replace newlines with spaces
        .trim();
      
      const excerpt = content.slice(0, 160);
      const lastSentence = excerpt.lastIndexOf('.');
      
      frontmatter.description = lastSentence > 100 
        ? excerpt.slice(0, lastSentence + 1)
        : excerpt + (content.length > 160 ? '...' : '');
    }
    
    // Ensure categories is always an array
    if (frontmatter.categories) {
      if (typeof frontmatter.categories === 'string') {
        frontmatter.categories = [frontmatter.categories];
      }
    } else {
      frontmatter.categories = ['uncategorized'];
    }
    
    // Ensure tags is always an array
    if (frontmatter.tags) {
      if (typeof frontmatter.tags === 'string') {
        frontmatter.tags = [frontmatter.tags];
      }
    } else {
      frontmatter.tags = [];
    }
    
    // Add publication year for filtering/grouping
    if (frontmatter.pubDate) {
      const date = new Date(frontmatter.pubDate);
      frontmatter.pubYear = date.getFullYear();
      frontmatter.pubMonth = date.getMonth() + 1;
    }
    
    // Calculate content complexity score
    const headingCount = (file.value.match(/^#{1,6}\s+/gm) || []).length;
    const paragraphCount = (file.value.match(/\n\s*\n/g) || []).length;
    const codeBlockCount = (file.value.match(/```/g) || []).length / 2;
    const listCount = (file.value.match(/^[-*+]\s+/gm) || []).length;
    
    frontmatter.complexity = {
      headings: headingCount,
      paragraphs: paragraphCount,
      codeBlocks: Math.floor(codeBlockCount),
      lists: listCount,
      score: headingCount * 2 + paragraphCount + codeBlockCount * 3 + listCount
    };
    
    // Determine content type based on analysis
    if (!frontmatter.contentType) {
      // Check for creative writing categories first
      if (frontmatter.categories.includes('fiction') || 
          frontmatter.categories.includes('Fiction') ||
          frontmatter.categories.includes('Creative Writing')) {
        frontmatter.contentType = 'story';
      } else if (frontmatter.categories.includes('poetry') || 
                 frontmatter.categories.includes('Poetry') ||
                 frontmatter.categories.includes('poem')) {
        frontmatter.contentType = 'poetry';
      } else if (headingCount > 3) {
        frontmatter.contentType = 'guide';
      } else if (frontmatter.complexity.score < 10) {
        frontmatter.contentType = 'reflection';
      } else {
        frontmatter.contentType = 'article';
      }
    }
  };
}
