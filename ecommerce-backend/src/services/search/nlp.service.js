const natural = require('natural');
const compromise = require('compromise');

class NLPService {

  /**
   * Parse natural language query
   * Example: "red shoes under 2000" -> { color: 'red', category: 'shoes', maxPrice: 2000 }
   */
  parseNaturalQuery(query) {
    const doc = compromise(query);
    const parsed = {
      keywords: [],
      filters: {}
    };

    // Extract price mentions
    const pricePatterns = [
      /under (\d+)/i,
      /below (\d+)/i,
      /less than (\d+)/i,
      /above (\d+)/i,
      /more than (\d+)/i,
      /between (\d+) and (\d+)/i,
      /(\d+) to (\d+)/i
    ];

    for (const pattern of pricePatterns) {
      const match = query.match(pattern);
      if (match) {
        if (pattern.source.includes('under') || pattern.source.includes('below') || pattern.source.includes('less')) {
          parsed.filters.maxPrice = parseInt(match[1]);
        } else if (pattern.source.includes('above') || pattern.source.includes('more')) {
          parsed.filters.minPrice = parseInt(match[1]);
        } else if (pattern.source.includes('between') || pattern.source.includes('to')) {
          parsed.filters.minPrice = parseInt(match[1]);
          parsed.filters.maxPrice = parseInt(match[2]);
        }
      }
    }

    // Extract colors
    const colors = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gray', 'grey'];
    const foundColors = colors.filter(color => 
      query.toLowerCase().includes(color)
    );
    if (foundColors.length > 0) {
      parsed.filters.colors = foundColors;
    }

    // Extract sizes
    const sizes = ['small', 'medium', 'large', 'xl', 'xxl', 's', 'm', 'l'];
    const foundSizes = sizes.filter(size => 
      new RegExp(`\\b${size}\\b`, 'i').test(query)
    );
    if (foundSizes.length > 0) {
      parsed.filters.sizes = foundSizes;
    }

    // Extract brand mentions (would need a predefined list)
    // This is a placeholder - in production, match against actual brands
    const brands = ['nike', 'adidas', 'puma', 'reebok', 'samsung', 'apple', 'sony'];
    const foundBrands = brands.filter(brand => 
      query.toLowerCase().includes(brand)
    );
    if (foundBrands.length > 0) {
      parsed.filters.brands = foundBrands;
    }

    // Extract remaining keywords (remove extracted parts)
    let cleanQuery = query;
    if (parsed.filters.maxPrice) {
      cleanQuery = cleanQuery.replace(/under \d+|below \d+|less than \d+/gi, '');
    }
    if (parsed.filters.minPrice) {
      cleanQuery = cleanQuery.replace(/above \d+|more than \d+/gi, '');
    }
    if (parsed.filters.colors) {
      parsed.filters.colors.forEach(color => {
        cleanQuery = cleanQuery.replace(new RegExp(color, 'gi'), '');
      });
    }
    if (parsed.filters.sizes) {
      parsed.filters.sizes.forEach(size => {
        cleanQuery = cleanQuery.replace(new RegExp(`\\b${size}\\b`, 'gi'), '');
      });
    }
    if (parsed.filters.brands) {
      parsed.filters.brands.forEach(brand => {
        cleanQuery = cleanQuery.replace(new RegExp(brand, 'gi'), '');
      });
    }

    parsed.keywords = cleanQuery.trim().split(/\s+/).filter(Boolean);

    return parsed;
  }

  /**
   * Extract intent from query
   */
  extractIntent(query) {
    const doc = compromise(query);

    // Check for comparison intent
    if (doc.has('compare|versus|vs')) {
      return 'compare';
    }

    // Check for recommendation intent
    if (doc.has('recommend|suggest|best')) {
      return 'recommend';
    }

    // Check for specific product search
    if (doc.has('(#Product|#Brand)')) {
      return 'specific_product';
    }

    // Default to general search
    return 'search';
  }

  /**
   * Spell correction
   */
  correctSpelling(query) {
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(query.toLowerCase());
    
    // This is a basic implementation
    // In production, use a proper spell checker or dictionary
    const corrected = tokens.map(token => {
      // Add your spell correction logic here
      return token;
    });

    return corrected.join(' ');
  }
}

module.exports = new NLPService();