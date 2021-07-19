import { isAuthenticated } from './rules/isAuthenticated'

import { shield } from 'graphql-shield'

export const permissions = shield({
    Query: {
        hello: isAuthenticated,
        getUserData: isAuthenticated,
    },
    Mutation: {
        setCurrentPosition: isAuthenticated
    }
});
