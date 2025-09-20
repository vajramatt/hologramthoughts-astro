// Reading time calculation plugin for Astro markdown
export function remarkReadingTime() {
  return function (tree, file) {
    // Get the markdown content as text
    const textOnPage = file.value;
    
    // Count words (split by whitespace, filter empty strings)
    const wordsPerMinute = 200;
    const words = textOnPage.split(/\s+/).filter(word => word.length > 0).length;
    
    // Calculate reading time in minutes, minimum 1 minute
    const readingTime = Math.max(1, Math.ceil(words / wordsPerMinute));
    
    // Add reading time to frontmatter data
    file.data.astro.frontmatter.readingTime = readingTime;
    file.data.astro.frontmatter.wordCount = words;
  };
}
