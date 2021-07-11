import "reflect-metadata";

import { GraphQLServer } from 'graphql-yoga'

import cookieParser from 'cookie-parser'
require('dotenv').config()

import { resolvers } from './resolvers'
import { middlewares } from './middlewares'
import { getClaims } from './utils'

import { PrismaClient } from '@prisma/client'

import { buildSchema } from 'type-graphql'

async function bootstrap() {

    const prisma = new PrismaClient()

    const schema = await buildSchema({
        resolvers,
    });

    const server = new GraphQLServer({
        //@ts-ignore
        schema,
        context: async ({ request, response, ...rest }: any) => ({
            request: { ...request, claims: await getClaims(request) },
            response,
            prisma,
            ...rest
        }),
        middlewares,
    });

    server.express.use(cookieParser())

    // Start the server
    server.start(
        { port: process.env.SERVER_PORT },
        () => console.log("server started on ", process.env.SERVER_PORT)
    )
}

bootstrap();
