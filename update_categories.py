#!/usr/bin/env python3
"""
Update all blog post categories from 40 categories to 5 focused categories
"""

import os
import re

# Category mapping from old to new
category_mapping = {
    'buddhism': 'Dharma Writings',
    'buddhist': 'Dharma Writings', 
    'buddha': 'Dharma Writings',
    'dharma': 'Dharma Writings',
    'bodhisattva': 'Dharma Writings',
    'bodhicitta': 'Dharma Writings',
    'chenrezig': 'Dharma Writings',
    'dalai-lama': 'Dharma Writings',
    'dzogchen': 'Dharma Writings',
    'buddha-nature': 'Dharma Writings',
    'enlightenment': 'Dharma Writings',
    'moksha': 'Dharma Writings',
    'suffering': 'Dharma Writings',
    
    'fiction': 'Creative Writing',
    'poetry': 'Creative Writing',
    
    'holographic-universe': 'Consciousness & Philosophy',
    'oneness': 'Consciousness & Philosophy',
    'universe': 'Consciousness & Philosophy',
    'sentient': 'Consciousness & Philosophy',
    'thoughts': 'Consciousness & Philosophy',
    'ideas': 'Consciousness & Philosophy',
    'creator': 'Consciousness & Philosophy',
    
    'meditation': 'Practice & Inner Life',
    'mindfulness': 'Practice & Inner Life',
    'compassion': 'Practice & Inner Life',
    'yoga': 'Practice & Inner Life',
    'martial-arts': 'Practice & Inner Life',
    'dream': 'Practice & Inner Life',
    'everyday-magic': 'Practice & Inner Life',
    
    'hindu': 'Other',
    'christianity': 'Other',
    'uncategorized': 'Other',
    'memes': 'Other',
    'technology': 'Other',
    'politics': 'Other',
    'web-20': 'Other',
    'links': 'Other',
    'hell': 'Other',
    'military': 'Other',
    'petition': 'Other'
}

def update_post_categories(filepath):
    """Update categories in a single blog post file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Find the frontmatter section
    if not content.startswith('---'):
        return False
        
    parts = content.split('---', 2)
    if len(parts) < 3:
        return False
    
    frontmatter = parts[1]
    body = parts[2]
    
    # Process the frontmatter line by line
    new_lines = []
    in_categories = False
    categories_found = set()
    
    for line in frontmatter.split('\n'):
        if line.startswith('categories:'):
            new_lines.append(line)
            in_categories = True
        elif in_categories:
            if line.startswith('  - '):
                # Extract the category
                old_cat = line.replace('  - ', '').strip().strip('"').strip("'")
                new_cat = category_mapping.get(old_cat, old_cat)
                
                # Only add if we haven't already added this category
                if new_cat not in categories_found:
                    categories_found.add(new_cat)
                    new_lines.append(f'  - "{new_cat}"')
            elif not line.startswith('  '):
                # End of categories section
                in_categories = False
                new_lines.append(line)
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    
    # Reconstruct the file
    new_content = '---' + '\n'.join(new_lines) + '---' + body
    
    # Write back
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    return True

def main():
    posts_dir = '/Users/mattw/code/hologramthoughts-astro/src/content/blog'
    
    updated = 0
    failed = 0
    
    print("Updating blog post categories...")
    print("=" * 50)
    
    for filename in os.listdir(posts_dir):
        if filename.endswith('.md'):
            filepath = os.path.join(posts_dir, filename)
            try:
                if update_post_categories(filepath):
                    updated += 1
                    print(f"✓ Updated: {filename}")
                else:
                    failed += 1
                    print(f"✗ Failed: {filename}")
            except Exception as e:
                failed += 1
                print(f"✗ Error in {filename}: {str(e)}")
    
    print("=" * 50)
    print(f"Summary: {updated} files updated, {failed} failed")
    print("\nNew category structure:")
    print("  - Dharma Writings")
    print("  - Creative Writing")
    print("  - Consciousness & Philosophy")
    print("  - Practice & Inner Life")
    print("  - Other")

if __name__ == "__main__":
    main()
