# Agent Guidelines for WinCC OA GraphQL Server

## Build/Lint/Test Commands

- **Install dependencies**: `npm install`
- **Development server**: `npm run dev` (runs `node index.js`)
- **Production server**: `npm run start` (runs with WinCC OA bootstrap)
- **Test**: `npm run test` (runs `node test-graphql.js` - note: test file may not exist)
- **Single test**: No specific single test command available - create individual test files as needed

## Code Style Guidelines

### Imports and Modules
- Use CommonJS `require()` syntax
- Group imports: external libraries first, then local modules
- Use destructuring for imports: `const { ApolloServer } = require('@apollo/server')`

### Variables and Constants
- Use `const` for constants and immutable variables
- Use `let` for mutable variables
- Use descriptive names in camelCase
- Use PascalCase for class names and constructor functions

### Functions
- Use arrow functions for callbacks and short functions
- Use regular functions for complex logic or when `this` context is needed
- Prefer async/await over promises for asynchronous code

### Strings and Formatting
- Use template literals for string interpolation: `` `Hello ${name}` ``
- No semicolons at end of statements
- Consistent indentation with 2 spaces

### Error Handling
- Use try/catch blocks for synchronous errors
- Use proper logging with the custom logger (info, error, warn, debug)
- Respect LOG_LEVEL environment variable for log verbosity
- Throw descriptive error messages

### Naming Conventions
- Variables: camelCase (`userId`, `tokenStore`)
- Constants: UPPER_SNAKE_CASE (`JWT_SECRET`, `TOKEN_EXPIRY_MS`)
- Functions: camelCase (`generateToken`, `createCommonResolvers`)
- Files: kebab-case (`common.js`, `alerting.js`)

### Environment Variables
- Load from `.env` file in script directory
- Use descriptive environment variable names
- Provide sensible defaults
- Log configuration on startup for debugging

### Security
- Never log sensitive information (passwords, tokens, secrets)
- Use environment variables for all configuration
- Implement proper authentication and authorization
- Validate all inputs and handle edge cases

### Comments
- Use single-line comments (`//`) for explanations
- Comment complex logic and non-obvious code
- Avoid redundant comments that just restate the code

### GraphQL Specific
- Separate schema (.gql) and resolvers (.js) files
- Use descriptive resolver function names
- Handle GraphQL errors appropriately
- Implement proper type checking and validation