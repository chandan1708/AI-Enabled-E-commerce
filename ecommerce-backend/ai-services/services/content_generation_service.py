import os
from openai import OpenAI
from anthropic import Anthropic

class ContentGenerationService:
    def __init__(self):
        # Initialize API clients
        self.openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.anthropic_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        
        # Choose which to use (can be configured)
        self.use_anthropic = os.getenv('USE_ANTHROPIC', 'false').lower() == 'true'
    
    def generate_product_description(self, product_data):
        """
        Generate product description from product attributes
        
        product_data should include:
        - name
        - category
        - brand
        - key_features (list)
        - specifications (dict)
        """
        try:
            prompt = self._build_description_prompt(product_data)
            
            if self.use_anthropic:
                description = self._generate_with_claude(prompt)
            else:
                description = self._generate_with_gpt(prompt)
            
            return {
                'description': description,
                'word_count': len(description.split())
            }
            
        except Exception as e:
            print(f"Error generating description: {e}")
            return {
                'description': self._generate_fallback_description(product_data),
                'word_count': 0,
                'error': str(e)
            }
    
    def generate_product_tags(self, product_data):
        """Generate SEO-friendly tags for a product"""
        try:
            prompt = f"""Generate 10-15 relevant, SEO-friendly tags for this product:
            
Product Name: {product_data.get('name', '')}
Category: {product_data.get('category', '')}
Brand: {product_data.get('brand', '')}
Description: {product_data.get('description', '')[:200]}

Return only the tags as a comma-separated list, no explanations."""

            if self.use_anthropic:
                response = self._generate_with_claude(prompt, max_tokens=200)
            else:
                response = self._generate_with_gpt(prompt, max_tokens=200)
            
            # Parse tags
            tags = [tag.strip() for tag in response.split(',')]
            tags = [tag for tag in tags if tag]  # Remove empty
            
            return {'tags': tags[:15]}
            
        except Exception as e:
            print(f"Error generating tags: {e}")
            return {'tags': [], 'error': str(e)}
    
    def generate_seo_title(self, product_data):
        """Generate SEO-optimized product title"""
        try:
            prompt = f"""Create an SEO-optimized product title (50-60 characters) for:

Product: {product_data.get('name', '')}
Category: {product_data.get('category', '')}
Brand: {product_data.get('brand', '')}
Key Features: {', '.join(product_data.get('key_features', [])[:3])}

Title should include brand, product type, and 1-2 key features.
Return only the title, no explanations."""

            if self.use_anthropic:
                title = self._generate_with_claude(prompt, max_tokens=100)
            else:
                title = self._generate_with_gpt(prompt, max_tokens=100)
            
            return {'title': title.strip()}
            
        except Exception as e:
            print(f"Error generating SEO title: {e}")
            return {'title': product_data.get('name', ''), 'error': str(e)}
    
    def generate_marketing_copy(self, product_data, style='professional'):
        """
        Generate marketing copy for product
        style: professional, casual, luxury, tech
        """
        try:
            style_prompts = {
                'professional': 'professional and informative',
                'casual': 'friendly and conversational',
                'luxury': 'elegant and premium',
                'tech': 'technical and detailed'
            }
            
            tone = style_prompts.get(style, 'professional')
            
            prompt = f"""Write compelling marketing copy in a {tone} tone for:

Product: {product_data.get('name', '')}
Category: {product_data.get('category', '')}
Key Features: {', '.join(product_data.get('key_features', []))}

Write 2-3 sentences that would make customers want to buy this product.
Focus on benefits, not just features."""

            if self.use_anthropic:
                copy = self._generate_with_claude(prompt, max_tokens=200)
            else:
                copy = self._generate_with_gpt(prompt, max_tokens=200)
            
            return {'marketing_copy': copy.strip()}
            
        except Exception as e:
            print(f"Error generating marketing copy: {e}")
            return {'marketing_copy': '', 'error': str(e)}
    
    def generate_category_description(self, category_name, product_count):
        """Generate description for a product category"""
        try:
            prompt = f"""Write a compelling category description for "{category_name}" 
that has {product_count} products. 

The description should be 100-150 words, SEO-friendly, and highlight:
- What types of products are in this category
- Who would benefit from these products
- Key features or benefits

Write in a professional yet engaging tone."""

            if self.use_anthropic:
                description = self._generate_with_claude(prompt)
            else:
                description = self._generate_with_gpt(prompt)
            
            return {'description': description.strip()}
            
        except Exception as e:
            print(f"Error generating category description: {e}")
            return {'description': '', 'error': str(e)}
    
    def _build_description_prompt(self, product_data):
        """Build prompt for product description generation"""
        features_text = '\n'.join([f"- {feature}" for feature in product_data.get('key_features', [])])
        
        specs_text = ''
        if product_data.get('specifications'):
            specs_text = '\n'.join([
                f"- {key}: {value}" 
                for key, value in product_data['specifications'].items()
            ])
        
        prompt = f"""Generate a comprehensive, SEO-friendly product description for an e-commerce website.

Product Name: {product_data.get('name', '')}
Category: {product_data.get('category', '')}
Brand: {product_data.get('brand', '')}

Key Features:
{features_text}

Specifications:
{specs_text}

Requirements:
- 150-200 words
- Include benefits, not just features
- Use persuasive language
- SEO-friendly with relevant keywords
- Professional tone
- Highlight what makes this product special

Write only the description, no headings or labels."""

        return prompt
    
    def _generate_with_gpt(self, prompt, max_tokens=500):
        """Generate content using OpenAI GPT"""
        response = self.openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional copywriter for an e-commerce platform."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
    
    def _generate_with_claude(self, prompt, max_tokens=500):
        """Generate content using Anthropic Claude"""
        response = self.anthropic_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=max_tokens,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        return response.content[0].text.strip()
    
    def _generate_fallback_description(self, product_data):
        """Generate basic description if AI fails"""
        name = product_data.get('name', 'this product')
        category = product_data.get('category', 'product')
        brand = product_data.get('brand', '')
        
        description = f"{name} is a high-quality {category}"
        if brand:
            description += f" from {brand}"
        
        description += ". "
        
        if product_data.get('key_features'):
            description += "Key features include: " + ", ".join(product_data['key_features'][:3]) + "."
        
        return description