import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { readFileSync } from 'fs';
import path from 'path';
import { resolvers } from './resolvers';

export async function createGraphQLServer(app: any) {
  const typeDefs = readFileSync(
    path.join(__dirname, 'schema.graphql'),
    'utf8'
  );

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use('/graphql', expressMiddleware(server));
}
