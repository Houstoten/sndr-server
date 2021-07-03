import {GraphQLServer} from 'graphql-yoga'

const typeDefs = `
type Query {
    info: String!
}
`

const resolvers = {
    Query:{
        info: () => 'INFO is here!'
    }
}

const server = new GraphQLServer({
    typeDefs,
    resolvers
})

server.start(() => console.log("server start"))