# Claude Integration Guide
## SwissMenu AI - AI Assistant Integration & Usage

---

## 🎯 Overview

Claude serves as the primary AI assistant for the SwissMenu AI project, providing intelligent capabilities for menu generation, recipe creation, and natural language processing. This document outlines how Claude is integrated and utilized throughout the development and production phases.

## 🔑 Key Responsibilities

### 1. Menu Generation
- Generate personalized weekly meal plans based on user preferences
- Consider Swiss cultural context and local ingredients
- Balance nutritional requirements and dietary restrictions
- Optimize for budget constraints and cooking skill levels
- Adapt recipes for different household sizes

### 2. Recipe Processing
- Create detailed, step-by-step cooking instructions
- Convert recipes to structured data format
- Extract ingredient lists with precise measurements
- Validate recipe feasibility and complexity
- Suggest ingredient substitutions when needed

### 3. Product Matching
- Match recipe ingredients to Migros products
- Handle multilingual product descriptions (FR/DE/IT)
- Consider product availability and seasonality
- Optimize for price and quality balance
- Suggest alternative products when needed

### 4. Natural Language Processing
- Process user dietary preferences and restrictions
- Understand cooking skill levels and time constraints
- Handle multilingual user inputs (French primary)
- Provide natural language responses and explanations
- Process user feedback and recipe modifications

---

## 🛠️ Technical Integration

### API Configuration
```typescript
// src/lib/claude.ts
import { Configuration, OpenAIApi } from 'openai'

const configuration = new Configuration({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const claude = new OpenAIApi(configuration)
```

### Prompt Engineering
```typescript
// src/lib/prompts/menu-generation.ts
export const MENU_GENERATION_PROMPT = `
You are a Swiss culinary expert creating a weekly meal plan.
Consider the following parameters:

User Preferences:
- People: {peopleCount}
- Budget: CHF {budgetChf} per week
- Dietary: {dietaryRestrictions}
- Cuisine: {cuisinePreferences}
- Skill: {cookingSkill}

Requirements:
1. Create a 7-day meal plan
2. Focus on Swiss seasonal ingredients
3. Match Migros product availability
4. Stay within budget constraints
5. Respect dietary restrictions
6. Consider cooking skill level

Format response as structured JSON with:
- Daily meals
- Ingredient lists
- Cooking instructions
- Time estimates
- Difficulty ratings
`
```

---

## 📋 Implementation Guidelines

### 1. Menu Generation Flow
```typescript
async function generateWeeklyMenu(preferences: UserPreferences): Promise<WeeklyMenu> {
  // 1. Prepare context
  const context = buildMenuContext(preferences)
  
  // 2. Generate menu with Claude
  const completion = await claude.createCompletion({
    model: "claude-3-sonnet-20240229",
    prompt: MENU_GENERATION_PROMPT,
    temperature: 0.7,
    max_tokens: 2000,
    context: context
  })
  
  // 3. Process and validate response
  const menuData = parseMenuResponse(completion.data)
  
  // 4. Match with Migros products
  const menuWithProducts = await matchMigrosProducts(menuData)
  
  return menuWithProducts
}
```

### 2. Response Processing
- Validate JSON structure
- Check nutritional balance
- Verify budget constraints
- Ensure recipe completeness
- Validate product matches

### 3. Error Handling
- Handle API timeouts and errors
- Implement retry mechanisms
- Provide fallback options
- Log issues for analysis
- Maintain user experience

---

## 🔄 Continuous Improvement

### Feedback Loop
1. Collect user feedback on generated menus
2. Track recipe success rates
3. Monitor product match accuracy
4. Analyze budget adherence
5. Measure user satisfaction

### Prompt Optimization
- Regular prompt refinement
- A/B testing different approaches
- Performance metrics tracking
- User preference learning
- Context optimization

---

## 📊 Performance Metrics

### Response Times
- Menu generation: < 15 seconds
- Recipe modifications: < 5 seconds
- Product matching: < 3 seconds
- Error recovery: < 2 seconds

### Accuracy Targets
- Recipe feasibility: > 95%
- Product match accuracy: > 90%
- Budget adherence: > 95%
- Dietary compliance: 100%

---

## 🔒 Security & Privacy

### Data Handling
- No PII in prompts
- Secure API key management
- Rate limiting implementation
- Request/response logging
- Error tracking

### Compliance
- GDPR compliance
- Swiss data protection
- Secure data transmission
- Audit trail maintenance

---

## 📝 Development Guidelines

### Best Practices
1. **Prompt Management**
   - Keep prompts in separate files
   - Version control prompts
   - Document prompt changes
   - Test prompt variations

2. **Response Handling**
   - Validate all responses
   - Handle edge cases
   - Implement timeouts
   - Log response metrics

3. **Integration Testing**
   - Unit test prompt builders
   - Test response parsing
   - Validate error handling
   - Monitor performance

4. **Monitoring**
   - Track API usage
   - Monitor response times
   - Log error rates
   - Analyze user feedback

---

## 🚀 Deployment Considerations

### Production Setup
- Environment variable management
- API key rotation
- Rate limit configuration
- Error monitoring setup
- Performance tracking

### Scaling Strategy
- Response caching
- Request queuing
- Load balancing
- Fallback mechanisms
- Capacity planning

---

## 📚 Resources

### Documentation
- [Claude API Documentation](https://docs.anthropic.com/claude/reference)
- [Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [Best Practices](https://docs.anthropic.com/claude/docs/best-practices)

### Support
- Technical support channels
- Error reporting process
- Feature request workflow
- Documentation updates
- Training resources

---

*This document serves as the definitive guide for Claude integration in the SwissMenu AI project. All development work involving Claude should adhere to these guidelines and best practices.* 