import { GraphQLServer } from 'graphql-yoga'
import {authenticateGoogle} from './auth/authUtils'
const jwt = require('jsonwebtoken');


const typeDefs = `
type AuthResponse {
    token: String
    name: String
    email: String,
    image: String
  }
  input AuthInput {
    accessToken: String!
  }
  type Query {
    "A simple type for getting started!"
    hello: String
  }
  
  type Mutation {
    authGoogle(input: AuthInput!): AuthResponse
  }
`

const resolvers = {
    Query: {
        hello: () => 'world'
    },
    Mutation: {
        authGoogle: async (o: any, {input: {accessToken}}: any, {request, response}: any) => {
            
            request.body = {
                ...request.body,
                access_token: accessToken,
            };

            try {
                // data contains the accessToken, refreshToken and profile from passport
                //@ts-ignore
                const { data, info } = await authenticateGoogle(request, response);

                if (data) {

                    const generateJWT = (_data: any) => {
                        const today = new Date();
                        const expirationDate = new Date(today);
                        expirationDate.setDate(today.getDate() + 60);

                        return jwt.sign({
                            email: _data.email,
                            id: _data._id,
                            exp: parseInt((expirationDate.getTime() / 1000).toString(), 10),
                        }, 'secret');
                    };
                    
                    return ({
                        name: data.profile._json.name,
                        email: data.profile._json.email,
                        image: data.profile._json.picture,
                        token: generateJWT(data.profile._json),
                    });
                }

                if (info) {
                    console.log(info);
                    switch (info.code) {
                        case 'ETIMEDOUT':
                            return (new Error('Failed to reach Google: Try Again'));
                        default:
                            return (new Error('something went wrong'));
                    }
                }
                return (Error('server error'));
            } catch (error) {
                return error;
            }
        },
    }
}

const server = new GraphQLServer({
    typeDefs,
    resolvers,
    context: ({ req, res, ...rest }: any) => {
        // pass things down in context!
        return { req, res, ...rest };
      },

})

server.start(() => console.log("server start"))